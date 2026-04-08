// backend/src/routes/quotes.ts — REPLACE the existing file
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";
import { stlVolumeCm3, calculatePrice } from "../services/stl";
import { getSetting } from "../services/settings";
import { getEnergyPriceCentsKwh } from "../services/energy";

export const quotesRouter = Router();

async function findUserIdByEmail(email: string | undefined | null): Promise<string | null> {
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  return u?.id || null;
}

quotesRouter.post("/", async (req: AuthedRequest, res) => {
  const { stlUploadId, email, materialId, colorId, infillPct, layerHeightMm } = req.body;
  const upl = await prisma.stlUpload.findUnique({ where: { id: stlUploadId } });
  if (!upl) return res.status(404).json({ error: "STL not found" });

  let volumeCm3 = 0;
  try { volumeCm3 = stlVolumeCm3(upl.storedPath); } catch (e: any) {
    return res.status(400).json({ error: "Invalid STL: " + e.message });
  }

  // Resolve material + color (both required for new pricing model)
  const material = materialId
    ? await prisma.material.findUnique({ where: { id: materialId } })
    : await prisma.material.findFirst({ where: { active: true, name: "PLA" } });
  if (!material) return res.status(400).json({ error: "Material not found" });

  const color = colorId ? await prisma.color.findUnique({ where: { id: colorId } }) : null;

  // Find the list price for this combo
  let pricePerKgCents = 2500;
  if (color) {
    const mc = await prisma.materialColor.findUnique({
      where: { materialId_colorId: { materialId: material.id, colorId: color.id } },
    });
    if (mc) pricePerKgCents = mc.listPriceKgCents;
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
    pricePerKgCents,
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
      status: "PRICED",
    },
  });
  res.json(quote);
});

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
      items: { create: [{ name: `Print quote ${q.id.slice(-8)}`, priceCents: q.totalCents, qty: 1 }] },
    },
  });
  await prisma.quote.update({ where: { id: q.id }, data: { status: "CONVERTED" } });
  res.json(order);
});
