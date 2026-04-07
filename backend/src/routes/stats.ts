import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const statsRouter = Router();

statsRouter.post("/track", async (req, res) => {
  const { path, referrer } = req.body;
  await prisma.pageView.create({
    data: {
      path: path || "/",
      referrer,
      ua: req.headers["user-agent"]?.toString(),
      ip: req.ip
    }
  });
  res.json({ ok: true });
});

statsRouter.get("/summary", requireAuth, requireAdmin, async (_req, res) => {
  const since = new Date(Date.now() - 30 * 86400000);
  const [total, last30d, byPath, orders, quotes] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.groupBy({ by: ["path"], _count: { path: true }, orderBy: { _count: { path: "desc" } }, take: 10 }),
    prisma.order.count(),
    prisma.quote.count()
  ]);
  res.json({ total, last30d, topPaths: byPath, orders, quotes });
});
