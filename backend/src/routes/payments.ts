import { Router } from "express";
import { prisma } from "../db";
import { createMolliePayment, getMolliePayment } from "../services/mollie";

export const paymentsRouter = Router();

// ─── Create payment for an order ──────────────────────
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
    await prisma.order.update({
      where: { id: order.id },
      data: { molliePaymentId: payment.id },
    });
    res.json({ checkoutUrl: payment._links?.checkout?.href, paymentId: payment.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Mollie webhook ───────────────────────────────────
paymentsRouter.post("/webhook", async (req, res) => {
  const id = req.body?.id;
  if (!id) return res.status(400).send("missing id");
  try {
    const payment = await getMolliePayment(id);
    const order = await prisma.order.findUnique({
      where: { molliePaymentId: id },
      include: { items: true, quote: true },
    });
    if (!order) return res.status(404).send("no order");

    let newStatus = order.status;
    if (payment.status === "paid") newStatus = "PAID";
    else if (["canceled", "expired", "failed"].includes(payment.status)) newStatus = "CANCELLED";

    // Only act on transitions
    if (newStatus !== order.status) {
      await prisma.order.update({ where: { id: order.id }, data: { status: newStatus } });

      if (newStatus === "PAID") {
        // Decrement product stock for webshop items
        for (const item of order.items) {
          if (item.productId) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.qty } },
            });
          }
        }
        // Decrement filament stock if order has a linked quote
        if (order.quoteId) {
          const q = await prisma.quote.findUnique({ where: { id: order.quoteId } });
          if (q?.filamentBrandId && q.weightG) {
            await prisma.filamentBrand.update({
              where: { id: q.filamentBrandId },
              data: { stockGrams: { decrement: Math.ceil(q.weightG) } },
            });
          }
        }
      }
    }

    res.send("ok");
  } catch (e: any) {
    console.error("Webhook error", e);
    res.status(500).send("error");
  }
});
