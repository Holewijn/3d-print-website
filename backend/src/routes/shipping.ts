import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { calculateShippingOptions } from "../services/shipping";

export const shippingRouter = Router();

// ─── Public: calculate available shipping rates for a cart ───
shippingRouter.post("/calculate", async (req, res) => {
  const { country, subtotalCents, weightG } = req.body;
  const options = await calculateShippingOptions({
    country: country || "NL",
    subtotalCents: +(subtotalCents || 0),
    weightG: +(weightG || 0),
  });
  res.json({ options });
});

// ─── Admin: zones CRUD ───
shippingRouter.get("/zones", requireAuth, requireAdmin, async (_req, res) => {
  const zones = await prisma.shippingZone.findMany({
    include: { rates: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  res.json(zones);
});

shippingRouter.post("/zones", requireAuth, requireAdmin, async (req, res) => {
  const { name, countries, sortOrder, active } = req.body;
  const zone = await prisma.shippingZone.create({
    data: { name, countries: countries || [], sortOrder: sortOrder ?? 0, active: active ?? true },
  });
  res.json(zone);
});

shippingRouter.put("/zones/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, countries, sortOrder, active } = req.body;
  const zone = await prisma.shippingZone.update({
    where: { id: req.params.id },
    data: { name, countries, sortOrder, active },
  });
  res.json(zone);
});

shippingRouter.delete("/zones/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.shippingZone.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Admin: rates CRUD ───
shippingRouter.post("/zones/:zoneId/rates", requireAuth, requireAdmin, async (req, res) => {
  const { name, type, costCents, freeAboveCents, minOrderCents, sortOrder, active } = req.body;
  const rate = await prisma.shippingRate.create({
    data: {
      zoneId: req.params.zoneId,
      name, type: type || "FLAT",
      costCents: +(costCents || 0),
      freeAboveCents: freeAboveCents != null ? +freeAboveCents : null,
      minOrderCents: minOrderCents != null ? +minOrderCents : null,
      sortOrder: sortOrder ?? 0,
      active: active ?? true,
    },
  });
  res.json(rate);
});

shippingRouter.put("/rates/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, type, costCents, freeAboveCents, minOrderCents, sortOrder, active } = req.body;
  const rate = await prisma.shippingRate.update({
    where: { id: req.params.id },
    data: {
      name, type,
      costCents: costCents != null ? +costCents : undefined,
      freeAboveCents: freeAboveCents != null ? +freeAboveCents : null,
      minOrderCents: minOrderCents != null ? +minOrderCents : null,
      sortOrder, active,
    },
  });
  res.json(rate);
});

shippingRouter.delete("/rates/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.shippingRate.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
