import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";
import { stlVolumeCm3, calculatePrice } from "../services/stl";
import { getSetting } from "../services/settings";
import { getEnergyPriceCentsKwh } from "../services/energy";
import { createMolliePayment } from "../services/mollie";

export const quotesRouter = Router();

async function findUserIdByEmail(email: string | undefined | null): Promise<string | null> {
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  return u?.id || null;
}

// ─── Public: list available material+color combos ─────
// Returns every priced combo with current stock info. Frontend can show
// out-of-stock combos with a badge but still let customer order.
quotesRouter.get("/available-combos", async (_req, res) => {
  const combos = await prisma.materialColor.findMany({
    include: { material: true, color: true },
    orderBy: [{ material: { name: "asc" } }, { color: { name: "asc" } }],
  });

  const out = [];
  for (const c of combos) {
    if (!c.material.active) continue;
    const agg = await prisma.spool.aggregate({
      where: {
        materialId: c.materialId,
        colorId: c.colorId,
        status: { in: ["IN_STOCK", "IN_USE"] },
      },
      _sum: { remainingGrams: true },
    });
    const stockG = agg._sum.remainingGrams || 0;
    out.push({
      materialId: c.materialId,
      materialName: c.material.name,
      materialDescription: c.material.description || null,
      densityGcm3: c.material.densityGcm3,
      colorId: c.colorId,
      colorName: c.color.name,
      colorHex: c.color.hex,
      listPriceKgCents: c.listPriceKgCents,
      inStock: stockG > 0,
      stockGrams: stockG,
    });
  }
  res.json(out);
});

// ─── Public: create a quote ───────────────────────────
quotesRouter.post("/", async (req: AuthedRequest, res) => {
  const { stlUploadId, email, materialId, colorId, infillPct, layerHeightMm, customerNote } = req.body;
  const upl = await prisma.stlUpload.findUnique({ where: { id: stlUploadId } });
  if (!upl) return res.status(404).json({ error: "STL not found" });

  let volumeCm3 = 0;
  try { volumeCm3 = stlVolumeCm3(upl.storedPath); } catch (e: any) {
    return res.status(400).json({ error: "Invalid STL: " + e.message });
  }

  if (!materialId) return res.status(400).json({ error: "Material required" });
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return res.status(400).json({ error: "Material not found" });

  // Color is OPTIONAL — if customer doesn't pick one, they must describe it in the note
  let color = null;
  let mc = null;
  if (colorId) {
    color = await prisma.color.findUnique({ where: { id: colorId } });
    if (!color) return res.status(400).json({ error: "Color not found" });
    mc = await prisma.materialColor.findUnique({
      where: { materialId_colorId: { materialId: material.id, colorId: color.id } },
    });
    if (!mc) return res.status(400).json({ error: "This material+color combination is not currently offered" });
  } else {
    // No color selected — require the customer to describe it in the note
    if (!customerNote || customerNote.trim().length < 3) {
      return res.status(400).json({
        error: "Please either pick a color or describe the desired color in the note field.",
      });
    }
    // Use the average/fallback list price for the material when color is unset
    const avg = await prisma.materialColor.findFirst({
      where: { materialId: material.id },
      orderBy: { listPriceKgCents: "desc" },
    });
    if (!avg) return res.status(400).json({ error: "No pricing available for this material yet — please contact us" });
    mc = avg;
  }

  const energyCents = await getEnergyPriceCentsKwh();
  const marginPct = await getSetting<number>("pricing.marginPct", 25);
  const machineCostHour = await getSetting<number>("pricing.defaultMachineCostHourCents", 200);
  const setupFeeCents = await getSetting<number>("pricing.setupFeeCents", 0);
  const minOrderCents = await getSetting<number>("pricing.minOrderCents", 500);

  const result = calculatePrice({
    volumeCm3,
    densityGcm3: material.densityGcm3,
    infillPct: infillPct ?? 20,
    layerHeightMm: layerHeightMm ?? 0.2,
    pricePerKgCents: mc.listPriceKgCents,
    energyPriceKwhCents: energyCents,
    printerWattage: 150,
    machineCostPerHourCents: machineCostHour,
    marginPct,
    printSpeedMmS: 60,
    setupFeeCents,
    minOrderCents,
  });

  const userId = req.user?.id || (await findUserIdByEmail(email));

  const quote = await prisma.quote.create({
    data: {
      userId,
      email: email || req.user?.email || "",
      stlUploadId,
      material: material.name,
      materialId: material.id,
      colorId: color?.id || null,
      infillPct: infillPct ?? 20,
      layerHeightMm: layerHeightMm ?? 0.2,
      volumeCm3: result.volumeCm3,
      weightG: result.weightG,
      printMinutes: result.printMinutes,
      energyKwh: result.energyKwh,
      materialCostCents: result.materialCostCents,
      energyCostCents: result.energyCostCents,
      machineCostCents: result.machineCostCents,
      marginCents: result.marginCents,
      totalCents: result.totalCents,
      customerNote: customerNote || null,
      status: "PRICED",
    },
  });
  res.json(quote);
});

// ─── Public: submit a quote for admin approval ─────────
// Creates a ContactMessage in the inbox so admin gets a notification,
// with the full quote details and an STL download link embedded.
quotesRouter.post("/:id/submit-for-approval", async (req, res) => {
  try {
    const q = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { stlUpload: true, materialRef: true, colorRef: true },
    });
    if (!q) return res.status(404).json({ error: "Quote not found" });

    const base = process.env.PUBLIC_URL || "";
    const stlLink = q.stlUploadId ? `${base}/api/stl/${q.stlUploadId}/download` : null;
    const adminLink = `${base}/admin/quotes/`;

    const lines = [
      `A customer has submitted a quote for approval.`,
      ``,
      `─── Quote Details ───`,
      `Quote ID: #${q.id.slice(-8)}`,
      `Customer: ${q.email}`,
      `Material: ${q.materialRef?.name || q.material}`,
      `Color: ${q.colorRef?.name || "(not selected — see customer note)"}`,
      `Infill: ${q.infillPct}%`,
      `Layer Height: ${q.layerHeightMm}mm`,
      `Volume: ${q.volumeCm3} cm³`,
      `Weight: ${q.weightG} g`,
      `Print time: ${q.printMinutes ? Math.floor(q.printMinutes / 60) + "h " + (q.printMinutes % 60) + "m" : "—"}`,
      `Total price: €${((q.totalCents || 0) / 100).toFixed(2)}`,
      ``,
    ];
    if (q.customerNote) {
      lines.push(`─── Customer Note ───`);
      lines.push(q.customerNote);
      lines.push(``);
    }
    if (stlLink) {
      lines.push(`─── STL File ───`);
      lines.push(`Original filename: ${q.stlUpload?.filename || "unknown"}`);
      lines.push(`Download: ${stlLink}`);
      lines.push(``);
    }
    lines.push(`View in admin: ${adminLink}`);

    await prisma.contactMessage.create({
      data: {
        name: q.email.split("@")[0],
        email: q.email,
        subject: `Quote approval request — #${q.id.slice(-8)} (€${((q.totalCents || 0) / 100).toFixed(2)})`,
        message: lines.join("\n"),
      },
    });

    // Keep the quote in PRICED status — admin will manually move it forward
    res.json({ ok: true, quoteId: q.id });
  } catch (e: any) {
    console.error("submit-for-approval error", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Public: pay for a quote (creates Order + Mollie session) ─
quotesRouter.post("/:id/checkout", async (req: AuthedRequest, res) => {
  const q = await prisma.quote.findUnique({ where: { id: req.params.id } });
  if (!q || !q.totalCents) return res.status(400).json({ error: "Quote not priced" });
  if (q.status === "CONVERTED") return res.status(400).json({ error: "Quote already converted" });

  // Create the order linked to the quote + attach STL
  const order = await prisma.order.create({
    data: {
      userId: q.userId,
      email: q.email,
      totalCents: q.totalCents,
      subtotalCents: q.totalCents,
      shippingCents: 0,
      quoteId: q.id,
      stlUploadId: q.stlUploadId,
      items: { create: [{ name: `3D Print Quote #${q.id.slice(-8)}`, priceCents: q.totalCents, qty: 1 }] },
    },
  });

  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  try {
    const payment = await createMolliePayment({
      amountCents: order.totalCents,
      description: `Quote ${q.id.slice(-8)}`,
      orderId: order.id,
      redirectUrl: `${base}/order/${order.id}/thanks`,
      webhookUrl: `${base}/api/payments/webhook`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { molliePaymentId: payment.id } });
    res.json({ orderId: order.id, checkoutUrl: payment._links?.checkout?.href });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: list quotes ───────────────────────────────
quotesRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.quote.findMany({
    include: { stlUpload: true, user: true, materialRef: true, colorRef: true, printJob: true },
    orderBy: { createdAt: "desc" },
  }));
});

quotesRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const q = await prisma.quote.findUnique({
    where: { id: req.params.id },
    include: { stlUpload: true, materialRef: true, colorRef: true, printJob: true },
  });
  if (!q) return res.status(404).json({ error: "Not found" });
  if (req.user?.role !== "ADMIN" && q.userId !== req.user?.id) return res.status(403).json({ error: "Forbidden" });
  res.json(q);
});

quotesRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { status, adminNote, totalCents, marginCents } = req.body;
  res.json(await prisma.quote.update({ where: { id: req.params.id }, data: { status, adminNote, totalCents, marginCents } }));
});

// ─── Admin: convert to order (attaches STL) ───────────
quotesRouter.post("/:id/convert-to-order", requireAuth, requireAdmin, async (req, res) => {
  const q = await prisma.quote.findUnique({ where: { id: req.params.id } });
  if (!q || !q.totalCents) return res.status(400).json({ error: "Quote not priced" });
  const order = await prisma.order.create({
    data: {
      userId: q.userId,
      email: q.email,
      totalCents: q.totalCents,
      subtotalCents: q.totalCents,
      quoteId: q.id,
      stlUploadId: q.stlUploadId,
      items: { create: [{ name: `Print quote ${q.id.slice(-8)}`, priceCents: q.totalCents, qty: 1 }] },
    },
  });
  await prisma.quote.update({ where: { id: q.id }, data: { status: "CONVERTED" } });
  res.json(order);
});

// ─── Admin: manually send a quote to the print queue ──
quotesRouter.post("/:id/send-to-queue", requireAuth, requireAdmin, async (req, res) => {
  const q = await prisma.quote.findUnique({
    where: { id: req.params.id },
    include: { printJob: true },
  });
  if (!q) return res.status(404).json({ error: "Not found" });
  if (q.printJob) return res.status(400).json({ error: "Already in print queue" });
  const job = await prisma.printJob.create({
    data: {
      quoteId: q.id,
      title: `Quote #${q.id.slice(-8)} — ${q.email}`,
      expectedGrams: q.weightG ? Math.ceil(q.weightG) : null,
      status: "QUEUED",
    },
  });
  res.json(job);
});
