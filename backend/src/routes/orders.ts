import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";
import { getValidatedRate } from "../services/shipping";

export const ordersRouter = Router();

// ─── Public: create order from cart ────────────────────
ordersRouter.post("/", async (req: AuthedRequest, res) => {
  const { email, items, shippingName, shippingPhone, shippingAddr, shippingRateId } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Empty cart" });
  }
  if (!email) return res.status(400).json({ error: "Email required" });
  if (!shippingAddr || !shippingAddr.country) {
    return res.status(400).json({ error: "Shipping address required" });
  }

  // Resolve products + calculate subtotal & weight (server-side, never trust client)
  let subtotalCents = 0;
  let totalWeightG = 0;
  const orderItems = [];
  for (const it of items) {
    const p = await prisma.product.findUnique({ where: { id: it.productId } });
    if (!p || !p.active) return res.status(400).json({ error: `Product ${it.productId} unavailable` });
    if (p.stock < it.qty) return res.status(400).json({ error: `Not enough stock for ${p.name}` });
    const qty = Math.max(1, parseInt(it.qty, 10));
    subtotalCents += p.priceCents * qty;
    totalWeightG += (p.weightG || 100) * qty;
    orderItems.push({ productId: p.id, name: p.name, priceCents: p.priceCents, qty });
  }

  // Validate shipping rate server-side
  let shippingCents = 0;
  let shippingMethod = "";
  if (shippingRateId) {
    const rate = await getValidatedRate(shippingRateId, shippingAddr.country, subtotalCents, totalWeightG);
    if (!rate) return res.status(400).json({ error: "Invalid or unavailable shipping rate" });
    shippingCents = rate.costCents;
    shippingMethod = rate.name;
  }

  const totalCents = subtotalCents + shippingCents;

  const order = await prisma.order.create({
    data: {
      userId: req.user?.id || null,
      email,
      subtotalCents,
      shippingCents,
      totalCents,
      shippingName,
      shippingPhone,
      shippingAddr,
      shippingMethod,
      items: { create: orderItems },
    },
    include: { items: true },
  });

  res.json(order);
});

// ─── Public: get a single order (for thank-you page) ────
ordersRouter.get("/public/:id", async (req, res) => {
  const o = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, email: true, status: true, totalCents: true,
      subtotalCents: true, shippingCents: true, shippingMethod: true,
      createdAt: true, items: { select: { name: true, priceCents: true, qty: true } },
    },
  });
  if (!o) return res.status(404).json({ error: "Not found" });
  res.json(o);
});

// ─── Admin: list all orders ─────────────────────────────
ordersRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.order.findMany({
    include: { items: true, user: true },
    orderBy: { createdAt: "desc" },
  }));
});

ordersRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!o) return res.status(404).json({ error: "Not found" });
  if (req.user?.role !== "ADMIN" && o.userId !== req.user?.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(o);
});

ordersRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.order.update({ where: { id: req.params.id }, data: req.body }));
});
