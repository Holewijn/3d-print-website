import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  const where: any = { active: true };
  if (req.query.category) where.category = req.query.category;
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search as string, mode: "insensitive" } },
      { description: { contains: req.query.search as string, mode: "insensitive" } },
    ];
  }
  res.json(await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } }));
});

productsRouter.get("/categories", async (_req, res) => {
  const cats = await prisma.product.findMany({
    where: { active: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  res.json(cats.map((c) => c.category).filter(Boolean));
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
