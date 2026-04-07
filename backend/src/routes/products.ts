import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
  res.json(await prisma.product.findMany({ where: { active: true } }));
});

productsRouter.get("/:slug", async (req, res) => {
  const p = await prisma.product.findUnique({ where: { slug: req.params.slug } });
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

productsRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.product.create({ data: req.body }));
});

productsRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.product.update({ where: { id: req.params.id }, data: req.body }));
});

productsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
