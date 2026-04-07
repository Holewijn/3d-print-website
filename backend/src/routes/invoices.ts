import { Router } from "express";
import fs from "fs";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";
import { createInvoiceForOrder, renderPackingSlip } from "../services/invoice";
import { sendInvoiceEmail } from "../services/email";

export const invoicesRouter = Router();

// ─── Admin: list all invoices ─────────────────────────
invoicesRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { order: true } }));
});

// ─── Admin: create invoice for an order ───────────────
invoicesRouter.post("/order/:orderId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const invoice = await createInvoiceForOrder(req.params.orderId);
    res.json(invoice);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Admin: regenerate PDF for an existing invoice ────
invoicesRouter.post("/:id/regenerate", requireAuth, requireAdmin, async (req, res) => {
  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: "Invoice not found" });
  // Delete the existing invoice row + PDF, then recreate
  if (inv.pdfPath) try { fs.unlinkSync(inv.pdfPath); } catch {}
  await prisma.invoice.delete({ where: { id: inv.id } });
  const fresh = await createInvoiceForOrder(inv.orderId);
  res.json(fresh);
});

// ─── Admin: email invoice to customer ─────────────────
invoicesRouter.post("/:id/email", requireAuth, requireAdmin, async (req, res) => {
  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: "Invoice not found" });
  try {
    await sendInvoiceEmail(inv);
    await prisma.invoice.update({ where: { id: inv.id }, data: { emailSent: true, emailSentAt: new Date() } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Customer: download own invoice PDF ───────────────
invoicesRouter.get("/:id/pdf", requireAuth, async (req: AuthedRequest, res) => {
  const inv = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { order: true },
  });
  if (!inv) return res.status(404).json({ error: "Not found" });
  if (req.user?.role !== "ADMIN" && inv.order.userId !== req.user?.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!inv.pdfPath || !fs.existsSync(inv.pdfPath)) {
    return res.status(404).json({ error: "PDF missing — try regenerating" });
  }
  res.download(inv.pdfPath, `invoice-${inv.number}.pdf`);
});

// ─── Admin: download packing slip for an order ────────
invoicesRouter.get("/order/:orderId/packing-slip", requireAuth, requireAdmin, async (req, res) => {
  try {
    const path = await renderPackingSlip(req.params.orderId);
    res.download(path, `packing-${req.params.orderId.slice(-8)}.pdf`);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Customer: list own invoices ──────────────────────
invoicesRouter.get("/me/list", requireAuth, async (req: AuthedRequest, res) => {
  const list = await prisma.invoice.findMany({
    where: { order: { userId: req.user!.id } },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, issuedAt: true, totalCents: true, paidAt: true, orderId: true },
  });
  res.json(list);
});
