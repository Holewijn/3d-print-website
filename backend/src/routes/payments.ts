import { Router } from "express";
import { prisma } from "../db";
import { createMolliePayment, getMolliePayment } from "../services/mollie";

export const paymentsRouter = Router();

paymentsRouter.post("/create/:orderId", async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  const payment = await createMolliePayment({
    amountCents: order.totalCents,
    description: `Order ${order.id}`,
    orderId: order.id,
    redirectUrl: `${base}/order/${order.id}/thanks`,
    webhookUrl: `${base}/api/payments/webhook`
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { molliePaymentId: payment.id }
  });
  res.json({ checkoutUrl: payment._links?.checkout?.href, paymentId: payment.id });
});

paymentsRouter.post("/webhook", async (req, res) => {
  const id = req.body?.id;
  if (!id) return res.status(400).send("missing id");
  try {
    const payment = await getMolliePayment(id);
    const order = await prisma.order.findUnique({ where: { molliePaymentId: id } });
    if (!order) return res.status(404).send("no order");

    let status = order.status;
    if (payment.status === "paid") status = "PAID";
    else if (payment.status === "canceled" || payment.status === "expired" || payment.status === "failed") status = "CANCELLED";

    await prisma.order.update({ where: { id: order.id }, data: { status } });

    // Auto-deduct filament if PAID and order has a quote
    if (status === "PAID" && order.quoteId) {
      const q = await prisma.quote.findUnique({ where: { id: order.quoteId } });
      if (q?.filamentBrandId && q.weightG) {
        await prisma.filamentBrand.update({
          where: { id: q.filamentBrandId },
          data: { stockGrams: { decrement: Math.ceil(q.weightG) } }
        });
      }
    }

    res.send("ok");
  } catch (e: any) {
    console.error("Webhook error", e);
    res.status(500).send("error");
  }
});
