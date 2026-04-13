import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
// Added generatePackingSlipPdf to the top-level import
import { 
  createInvoiceForOrder, 
  generateInvoicePdf, 
  generatePackingSlipPdf 
} from "../services/invoice";
import { sendInvoiceEmail } from "../services/email";
import { createInvoicePaymentLink, emailInvoicePaymentLink } from "../services/invoicePayment";
import { getMolliePayment } from "../services/mollie";
import path from "path";
import fs from "fs";

export const invoicesRouter = Router();

invoicesRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.invoice.findMany({
    include: { order: true },
    orderBy: { createdAt: "desc" },
  }));
});

invoicesRouter.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { order: { include: { items: true } } },
  });
  if (!invoice) return res.status(404).json({ error: "Not found" });
  res.json(invoice);
});

invoicesRouter.post("/order/:orderId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const invoice = await createInvoiceForOrder(req.params.orderId);
    res.json(invoice);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

invoicesRouter.get("/:id/pdf", requireAuth, requireAdmin, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { items: true } } },
    });
    if (!invoice) return res.status(404).json({ error: "Not found" });
    const pdfPath = await generateInvoicePdf(invoice);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="invoice-${invoice.number}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

invoicesRouter.post("/:id/email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    });
    if (!invoice) return res.status(404).json({ error: "Not found" });
    await sendInvoiceEmail(invoice);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { emailSent: true, emailSentAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

invoicesRouter.get("/order/:orderId/packing-slip", requireAuth, requireAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: "Not found" });
    
    // Removed the dynamic await import that was causing the TS2339 error
    const pdfPath = await generatePackingSlipPdf(order);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="packing-slip-${order.id.slice(-8)}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

invoicesRouter.post("/:id/payment-link", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await createInvoicePaymentLink(req.params.id);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

invoicesRouter.post("/:id/email-payment-link", requireAuth, requireAdmin, async (req, res) => {
  try {
    await emailInvoicePaymentLink(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

invoicesRouter.get("/:id/payment-status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: "Not found" });
    if (!invoice.molliePaymentId) return res.json({ status: "no-link", paidAt: null, checkoutUrl: null });

    const p = await getMolliePayment(invoice.molliePaymentId);

    if (p.status === "paid" && !invoice.paidAt) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paidAt: new Date() },
      });
    }

    res.json({
      status: p.status,
      paidAt: invoice.paidAt || (p.status === "paid" ? new Date() : null),
      checkoutUrl: p._links?.checkout?.href || null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

invoicesRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }

export async function generateInvoicePdf(invoice: any): Promise<string> {
  const company = await getCompanyInfo();
  const pdfPath = path.join(INVOICE_DIR, `invoice-${invoice.number}.pdf`);
  await renderInvoicePdf(invoice, company, pdfPath);
  return pdfPath;
}

export async function generatePackingSlipPdf(order: any): Promise<string> {
  return renderPackingSlip(order.id);
}
});
