import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const pagesRouter = Router();

pagesRouter.get("/", async (_req, res) => {
  res.json(await prisma.page.findMany({ where: { published: true } }));
});

pagesRouter.get("/:slug", async (req, res) => {
  const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
  if (!page) return res.status(404).json({ error: "Not found" });
  res.json(page);
});

pagesRouter.put("/:slug", requireAuth, requireAdmin, async (req, res) => {
  const { title, content, seoTitle, seoDesc, published } = req.body;
  const page = await prisma.page.upsert({
    where: { slug: req.params.slug },
    update: { title, content, seoTitle, seoDesc, published },
    create: { slug: req.params.slug, title, content, seoTitle, seoDesc, published: published ?? true }
  });
  res.json(page);
});

pagesRouter.delete("/:slug", requireAuth, requireAdmin, async (req, res) => {
  await prisma.page.delete({ where: { slug: req.params.slug } });
  res.json({ ok: true });
});
