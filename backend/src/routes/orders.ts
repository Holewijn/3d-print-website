import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";

export const ordersRouter = Router();

ordersRouter.post("/", async (req: AuthedRequest, res) => {
  const { email, items, shippingName, shippingAddr } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Empty cart" });

  let total = 0;
  const orderItems = [];
  for (const it of items) {
    const p = await prisma.product.findUnique({ where: { id: it.productId } });
    if (!p || !p.active) return res.status(400).json({ error: `Product ${it.productId} unavailable` });
    if (p.stock < it.qty) return res.status(400).json({ error: `Not enough stock for ${p.name}` });
    total += p.priceCents * it.qty;
    orderItems.push({ productId: p.id, name: p.name, priceCents: p.priceCents, qty: it.qty });
  }

  const order = await prisma.order.create({
    data: {
      userId: req.user?.id || null,
      email: email || req.user?.email || "",
      totalCents: total,
      shippingName,
      shippingAddr,
      items: { create: orderItems }
    },
    include: { items: true }
  });
  res.json(order);
});

ordersRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.order.findMany({ include: { items: true, user: true }, orderBy: { createdAt: "desc" } }));
});

ordersRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!o) return res.status(404).json({ error: "Not found" });
  if (req.user?.role !== "ADMIN" && o.userId !== req.user?.id) return res.status(403).json({ error: "Forbidden" });
  res.json(o);
});

ordersRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.order.update({ where: { id: req.params.id }, data: req.body }));
});
