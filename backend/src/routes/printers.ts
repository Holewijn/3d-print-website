import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const printersRouter = Router();

printersRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.printer.findMany());
});

printersRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.printer.create({ data: req.body }));
});

printersRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.printer.update({ where: { id: req.params.id }, data: req.body }));
});

printersRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.printer.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

printersRouter.get("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const p = await prisma.printer.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json({ lastStatus: p.lastStatus, lastSeenAt: p.lastSeenAt });
});
