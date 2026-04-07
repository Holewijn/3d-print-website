import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";
import { getValidatedRate } from "../services/shipping";

export const ordersRouter = Router();

async function findUserIdByEmail(email: string | undefined | null): Promise<string | null> {
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  return u?.id || null;
}

ordersRouter.post("/", async (req: AuthedRequest, res) => {
  const { email, items, shippingName, shippingPhone, shippingAddr, shippingRateId } = req.body;

  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Empty cart" });
  if (!email) return res.status(400).json({ error: "Email required" });
  if (!shippingAddr || !shippingAddr.country) return res.status(400).json({ error: "Shipping address required" });

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

  let shippingCents = 0;
  let shippingMethod = "";
  if (shippingRateId) {
    const rate = await getValidatedRate(shippingRateId, shippingAddr.country, subtotalCents, totalWeightG);
    if (!rate) return res.status(400).json({ error: "Invalid or unavailable shipping rate" });
    shippingCents = rate.costCents;
    shippingMethod = rate.name;
  }

  const totalCents = subtotalCents + shippingCents;

  // Auto-link: prefer logged-in user, otherwise lookup by email
  const userId = req.user?.id || (await findUserIdByEmail(email));

  const order = await prisma.order.create({
    data: {
      userId,
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

// ─── Backfill: link past orders to user when they register/login ───
// Called by an internal hook (or manually). Sets userId on all orders/quotes
// where userId is null and email matches the user's email.
export async function linkPastOrdersForUser(userId: string, email: string) {
  const lower = email.toLowerCase().trim();
  await prisma.order.updateMany({
    where: { userId: null, email: { equals: lower, mode: "insensitive" } },
    data: { userId },
  });
  await prisma.quote.updateMany({
    where: { userId: null, email: { equals: lower, mode: "insensitive" } },
    data: { userId },
  });
}
