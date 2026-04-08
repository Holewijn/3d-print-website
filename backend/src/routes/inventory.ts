import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { consumeFilament, recordPurchase, totalStockG } from "../services/inventory";

export const inventoryRouter = Router();

// ─── Brands ────────────────────────────────────────────
inventoryRouter.get("/brands", async (_req, res) => {
  res.json(await prisma.brand.findMany({ orderBy: { name: "asc" } }));
});
inventoryRouter.post("/brands", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.brand.create({ data: req.body }));
});
inventoryRouter.put("/brands/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.brand.update({ where: { id: req.params.id }, data: req.body }));
});
inventoryRouter.delete("/brands/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.brand.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Materials ─────────────────────────────────────────
inventoryRouter.get("/materials", async (_req, res) => {
  res.json(await prisma.material.findMany({ orderBy: { name: "asc" } }));
});
inventoryRouter.post("/materials", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.material.create({ data: req.body }));
});
inventoryRouter.put("/materials/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.material.update({ where: { id: req.params.id }, data: req.body }));
});
inventoryRouter.delete("/materials/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.material.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Colors ────────────────────────────────────────────
inventoryRouter.get("/colors", async (_req, res) => {
  res.json(await prisma.color.findMany({ orderBy: { name: "asc" } }));
});
inventoryRouter.post("/colors", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.color.create({ data: req.body }));
});
inventoryRouter.put("/colors/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.color.update({ where: { id: req.params.id }, data: req.body }));
});
inventoryRouter.delete("/colors/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.color.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Material+Color (list price + low-stock threshold) ─
inventoryRouter.get("/material-colors", async (_req, res) => {
  res.json(await prisma.materialColor.findMany({
    include: { material: true, color: true },
    orderBy: [{ material: { name: "asc" } }, { color: { name: "asc" } }],
  }));
});
inventoryRouter.post("/material-colors", requireAuth, requireAdmin, async (req, res) => {
  const { materialId, colorId, listPriceKgCents, lowStockGrams } = req.body;
  res.json(await prisma.materialColor.upsert({
    where: { materialId_colorId: { materialId, colorId } },
    update: { listPriceKgCents: +listPriceKgCents, lowStockGrams: +lowStockGrams },
    create: { materialId, colorId, listPriceKgCents: +listPriceKgCents, lowStockGrams: +lowStockGrams },
  }));
});
inventoryRouter.delete("/material-colors/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.materialColor.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Spools ────────────────────────────────────────────
inventoryRouter.get("/spools", requireAuth, requireAdmin, async (req, res) => {
  const where: any = {};
  if (req.query.materialId) where.materialId = req.query.materialId;
  if (req.query.colorId) where.colorId = req.query.colorId;
  if (req.query.status) where.status = req.query.status;
  res.json(await prisma.spool.findMany({
    where,
    include: { brand: true, material: true, color: true, loadedOnPrinter: true },
    orderBy: [{ status: "asc" }, { purchaseDate: "asc" }],
  }));
});

inventoryRouter.post("/spools", requireAuth, requireAdmin, async (req, res) => {
  const { brandId, materialId, colorId, diameterMm, initialGrams, pricePaidCents, supplier, purchaseDate, batchCode, notes } = req.body;
  const spool = await prisma.spool.create({
    data: {
      brandId, materialId, colorId,
      diameterMm: +(diameterMm || 1.75),
      initialGrams: +initialGrams,
      remainingGrams: +initialGrams,
      pricePaidCents: +pricePaidCents,
      supplier, batchCode, notes,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      status: "IN_STOCK",
    },
  });
  await recordPurchase(spool.id);
  res.json(spool);
});

inventoryRouter.put("/spools/:id", requireAuth, requireAdmin, async (req, res) => {
  const data: any = { ...req.body };
  if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
  if (data.diameterMm != null) data.diameterMm = +data.diameterMm;
  if (data.initialGrams != null) data.initialGrams = +data.initialGrams;
  if (data.remainingGrams != null) data.remainingGrams = +data.remainingGrams;
  if (data.pricePaidCents != null) data.pricePaidCents = +data.pricePaidCents;
  res.json(await prisma.spool.update({ where: { id: req.params.id }, data }));
});

inventoryRouter.delete("/spools/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.spool.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Manual adjust: change stock by delta with a reason
inventoryRouter.post("/spools/:id/adjust", requireAuth, requireAdmin, async (req, res) => {
  const { deltaGrams, reason, note } = req.body;
  const spool = await prisma.spool.findUnique({ where: { id: req.params.id } });
  if (!spool) return res.status(404).json({ error: "Not found" });

  const delta = parseInt(deltaGrams, 10);
  const newRemaining = Math.max(0, spool.remainingGrams + delta);

  await prisma.spool.update({
    where: { id: spool.id },
    data: {
      remainingGrams: newRemaining,
      status: newRemaining === 0 ? "EMPTY" : (delta < 0 && spool.status === "IN_STOCK" ? "IN_USE" : spool.status),
    },
  });

  // Cost: pro-rata of pricePaid
  const perG = spool.initialGrams ? spool.pricePaidCents / spool.initialGrams : 0;
  await prisma.filamentMovement.create({
    data: {
      spoolId: spool.id,
      deltaGrams: delta,
      reason: (reason || "MANUAL_ADJUST") as any,
      costCents: Math.round(Math.abs(delta * perG)),
      note: note || null,
    },
  });

  res.json({ ok: true });
});

// Mark spool as disposed (full write-off)
inventoryRouter.post("/spools/:id/dispose", requireAuth, requireAdmin, async (req, res) => {
  const spool = await prisma.spool.findUnique({ where: { id: req.params.id } });
  if (!spool) return res.status(404).json({ error: "Not found" });
  if (spool.remainingGrams > 0) {
    const perG = spool.initialGrams ? spool.pricePaidCents / spool.initialGrams : 0;
    await prisma.filamentMovement.create({
      data: {
        spoolId: spool.id,
        deltaGrams: -spool.remainingGrams,
        reason: "DISPOSED",
        costCents: Math.round(spool.remainingGrams * perG),
        note: req.body.note || "Disposed",
      },
    });
  }
  await prisma.spool.update({
    where: { id: spool.id },
    data: { remainingGrams: 0, status: "DISPOSED" },
  });
  res.json({ ok: true });
});

// Load/unload a spool onto a printer
inventoryRouter.post("/spools/:id/load", requireAuth, requireAdmin, async (req, res) => {
  const { printerId } = req.body;
  // Unload any other spool from this printer first
  await prisma.spool.updateMany({
    where: { loadedOnPrinterId: printerId },
    data: { loadedOnPrinterId: null },
  });
  const spool = await prisma.spool.update({
    where: { id: req.params.id },
    data: { loadedOnPrinterId: printerId, status: "IN_USE" },
  });
  res.json(spool);
});

inventoryRouter.post("/spools/:id/unload", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.spool.update({
    where: { id: req.params.id },
    data: { loadedOnPrinterId: null },
  }));
});

// ─── Movements (history) ───────────────────────────────
inventoryRouter.get("/movements", requireAuth, requireAdmin, async (req, res) => {
  const take = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const where: any = {};
  if (req.query.spoolId) where.spoolId = req.query.spoolId;
  if (req.query.reason) where.reason = req.query.reason;
  res.json(await prisma.filamentMovement.findMany({
    where,
    include: { spool: { include: { material: true, color: true, brand: true } } },
    orderBy: { createdAt: "desc" },
    take,
  }));
});

// ─── Alerts ────────────────────────────────────────────
inventoryRouter.get("/alerts", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.filamentAlert.findMany({
    include: { material: true, color: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  }));
});
inventoryRouter.post("/alerts/:id/read", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.filamentAlert.update({ where: { id: req.params.id }, data: { read: true } }));
});
inventoryRouter.post("/alerts/read-all", requireAuth, requireAdmin, async (_req, res) => {
  await prisma.filamentAlert.updateMany({ where: { read: false }, data: { read: true } });
  res.json({ ok: true });
});

// ─── Stock summary by material+color ───────────────────
inventoryRouter.get("/summary", requireAuth, requireAdmin, async (_req, res) => {
  const combos = await prisma.materialColor.findMany({
    include: { material: true, color: true },
  });
  const out = [];
  for (const c of combos) {
    const total = await totalStockG(c.materialId, c.colorId);
    out.push({
      materialId: c.materialId,
      colorId: c.colorId,
      materialName: c.material.name,
      colorName: c.color.name,
      colorHex: c.color.hex,
      totalGrams: total,
      lowStockGrams: c.lowStockGrams,
      listPriceKgCents: c.listPriceKgCents,
      isLow: total < c.lowStockGrams,
    });
  }
  res.json(out);
});

// ─── Usage trends (last N days) ────────────────────────
inventoryRouter.get("/trends", requireAuth, requireAdmin, async (req, res) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);
  const since = new Date(Date.now() - days * 86400_000);
  const movements = await prisma.filamentMovement.findMany({
    where: { createdAt: { gte: since }, deltaGrams: { lt: 0 } },
    include: { spool: { include: { material: true, color: true } } },
  });

  const byDay: Record<string, number> = {};
  const byMaterial: Record<string, number> = {};
  let totalUsedG = 0;
  let totalCostCents = 0;

  for (const m of movements) {
    const day = m.createdAt.toISOString().slice(0, 10);
    const used = -m.deltaGrams;
    byDay[day] = (byDay[day] || 0) + used;
    const matName = m.spool.material.name;
    byMaterial[matName] = (byMaterial[matName] || 0) + used;
    totalUsedG += used;
    totalCostCents += m.costCents;
  }

  res.json({
    days,
    totalUsedG,
    totalCostCents,
    byDay: Object.entries(byDay).sort().map(([date, grams]) => ({ date, grams })),
    byMaterial: Object.entries(byMaterial).map(([name, grams]) => ({ name, grams })),
  });
});
