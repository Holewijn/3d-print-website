import { Router } from "express";
import { prisma } from "../db";
import { createMolliePayment, getMolliePayment } from "../services/mollie";
import { createInvoiceForOrder } from "../services/invoice";
import { sendInvoiceEmail } from "../services/email";

export const paymentsRouter = Router();

paymentsRouter.post("/create/:orderId", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "PENDING") return res.status(400).json({ error: "Order already processed" });

  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  try {
    const payment = await createMolliePayment({
      amountCents: order.totalCents,
      description: `Order ${order.id.slice(-8)}`,
      orderId: order.id,
      redirectUrl: `${base}/order/${order.id}/thanks`,
      webhookUrl: `${base}/api/payments/webhook`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { molliePaymentId: payment.id } });
    res.json({ checkoutUrl: payment._links?.checkout?.href, paymentId: payment.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

paymentsRouter.post("/webhook", async (req, res) => {
  const id = req.body?.id;
  if (!id) return res.status(400).send("missing id");
  try {
    const payment = await getMolliePayment(id);
    const order = await prisma.order.findUnique({
      where: { molliePaymentId: id },
      include: { items: true, quote: { include: { printJob: true } } },
    });
    if (!order) return res.status(404).send("no order");

    let newStatus = order.status;
    if (payment.status === "paid") newStatus = "PAID";
    else if (["canceled", "expired", "failed"].includes(payment.status)) newStatus = "CANCELLED";

    if (newStatus !== order.status) {
      await prisma.order.update({ where: { id: order.id }, data: { status: newStatus } });

      if (newStatus === "PAID") {
        for (const item of order.items) {
          if (item.productId) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.qty } },
            });
          }
        }

        if (order.quote && !order.quote.printJob) {
          await prisma.quote.update({
            where: { id: order.quote.id },
            data: { status: "CONVERTED" },
          });
          try {
            await prisma.printJob.create({
              data: {
                quoteId: order.quote.id,
                title: `Quote #${order.quote.id.slice(-8)} — ${order.quote.email}`,
                expectedGrams: order.quote.weightG ? Math.ceil(order.quote.weightG) : null,
                status: "QUEUED",
              },
            });
          } catch (err: any) {
            console.error("[payments] failed to create PrintJob from quote:", err.message);
          }
        }

        try {
          const invoice = await createInvoiceForOrder(order.id);
          // Mark the auto-generated invoice as paid (it was paid via this same Mollie payment)
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { paidAt: new Date(), molliePaymentId: id },
          });
          await sendInvoiceEmail(invoice).then(async () => {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { emailSent: true, emailSentAt: new Date() },
            });
          }).catch((err) => {
            console.error("[invoice] email failed:", err.message);
          });
        } catch (err: any) {
          console.error("[invoice] auto-create failed:", err.message);
        }
      }
    }

    res.send("ok");
  } catch (e: any) {
    console.error("Webhook error", e);
    res.status(500).send("error");
  }
});

// ─── Invoice webhook (for manual payment links) ─────────
// When admin generates a payment link for an existing invoice, this endpoint
// receives Mollie's payment update and marks the invoice as paid.
paymentsRouter.post("/invoice-webhook", async (req, res) => {
  const id = req.body?.id;
  if (!id) return res.status(400).send("missing id");
  try {
    const payment = await getMolliePayment(id);
    const invoice = await prisma.invoice.findFirst({
      where: { molliePaymentId: id },
      include: { order: true },
    });
    if (!invoice) return res.status(404).send("no invoice");

    if (payment.status === "paid" && !invoice.paidAt) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paidAt: new Date() },
      });
      // Also bump the order to PAID if it wasn't already
      if (invoice.order && invoice.order.status === "PENDING") {
        await prisma.order.update({
          where: { id: invoice.order.id },
          data: { status: "PAID" },
        });
      }
    }
    res.send("ok");
  } catch (e: any) {
    console.error("Invoice webhook error", e);
    res.status(500).send("error");
  }
});
