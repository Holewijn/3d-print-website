import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const inventoryRouter = Router();

inventoryRouter.get("/brands", async (_req, res) => {
  res.json(await prisma.filamentBrand.findMany({ where: { active: true } }));
});

inventoryRouter.post("/brands", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.filamentBrand.create({ data: req.body }));
});

inventoryRouter.put("/brands/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.filamentBrand.update({ where: { id: req.params.id }, data: req.body }));
});

inventoryRouter.delete("/brands/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.filamentBrand.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

inventoryRouter.post("/brands/:id/adjust", requireAuth, requireAdmin, async (req, res) => {
  const { delta } = req.body;
  const b = await prisma.filamentBrand.update({
    where: { id: req.params.id },
    data: { stockGrams: { increment: parseInt(delta, 10) } }
  });
  res.json(b);
});
