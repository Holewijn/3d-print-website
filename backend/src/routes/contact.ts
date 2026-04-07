// REPLACE backend/src/routes/contact.ts with this version.
// Adds a public GET /api/contact/form-config endpoint that returns the form
// builder config (fields, submit text, success message) without requiring auth.

import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const contactRouter = Router();

// ─── Public: get form configuration ────────────────────
contactRouter.get("/form-config", async (_req, res) => {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["contactForm.fields", "contactForm.submitText", "contactForm.successMsg"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({
    fields: map["contactForm.fields"] || null,
    submitText: map["contactForm.submitText"] || null,
    successMsg: map["contactForm.successMsg"] || null,
  });
});

// ─── Public: submit a contact message ──────────────────
contactRouter.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: "Missing fields" });
  const m = await prisma.contactMessage.create({ data: { name, email, subject, message } });
  res.json({ ok: true, id: m.id });
});

// ─── Admin: list and manage messages ───────────────────
contactRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } }));
});

contactRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.contactMessage.update({ where: { id: req.params.id }, data: { handled: req.body.handled } }));
});
