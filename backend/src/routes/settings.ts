import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const settingsRouter = Router();

// public read for site/* and seo/*
settingsRouter.get("/public", async (_req, res) => {
  const rows = await prisma.setting.findMany();
  const out: Record<string, any> = {};
  for (const r of rows) {
    if (r.key.startsWith("site.") || r.key.startsWith("seo.")) out[r.key] = r.value;
  }
  res.json(out);
});

settingsRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await prisma.setting.findMany();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

settingsRouter.put("/:key", requireAuth, requireAdmin, async (req, res) => {
  const r = await prisma.setting.upsert({
    where: { key: req.params.key },
    update: { value: req.body.value },
    create: { key: req.params.key, value: req.body.value }
  });
  res.json(r);
});
