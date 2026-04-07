import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const contactRouter = Router();

contactRouter.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: "Missing fields" });
  const m = await prisma.contactMessage.create({ data: { name, email, subject, message } });
  res.json({ ok: true, id: m.id });
});

contactRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } }));
});

contactRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.contactMessage.update({ where: { id: req.params.id }, data: { handled: req.body.handled } }));
});
