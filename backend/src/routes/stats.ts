import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const statsRouter = Router();

// ─── Helpers ───────────────────────────────────────────
function rangeStart(range: string): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "today":    d.setHours(0, 0, 0, 0); return d;
    case "week":     d.setDate(d.getDate() - 7); return d;
    case "month":    d.setDate(d.getDate() - 30); return d;
    case "90days":   d.setDate(d.getDate() - 90); return d;
    case "year":     d.setFullYear(d.getFullYear() - 1); return d;
    case "all":      return new Date(2000, 0, 1);
    default:         d.setDate(d.getDate() - 30); return d;
  }
}

const PAID_STATUSES = ["PAID", "IN_PRODUCTION", "SHIPPED", "COMPLETED"];

// ─── Main dashboard data — single call ────────────────
// GET /api/stats/dashboard?range=month
statsRouter.get("/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    const range = (req.query.range as string) || "month";
    const since = rangeStart(range);

    // ─── Metric 1: Revenue (paid orders in range) ───
    const paidOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: PAID_STATUSES },
      },
      select: { id: true, totalCents: true, createdAt: true, quoteId: true, userId: true, email: true },
    });
    const revenueCents = paidOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    const ordersCount = paidOrders.length;
    const aov = ordersCount > 0 ? Math.round(revenueCents / ordersCount) : 0;

    // ─── Metric 2: Today / Week / Month quick revenue ───
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

    const [revToday, revWeek, revMonth] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { in: PAID_STATUSES } },
        _sum: { totalCents: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: weekAgo }, status: { in: PAID_STATUSES } },
        _sum: { totalCents: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthAgo }, status: { in: PAID_STATUSES } },
        _sum: { totalCents: true },
      }),
    ]);

    // ─── Metric 3: Conversion (quotes → orders in range) ───
    const quotesInRange = await prisma.quote.count({ where: { createdAt: { gte: since } } });
    const convertedQuotes = await prisma.quote.count({
      where: { createdAt: { gte: since }, status: "CONVERTED" },
    });
    const conversionRate = quotesInRange > 0 ? convertedQuotes / quotesInRange : 0;

    // ─── Metric 4: Customer growth (new users in range) ───
    const newCustomers = await prisma.user.count({
      where: { createdAt: { gte: since }, role: "USER" },
    });
    const totalCustomers = await prisma.user.count({ where: { role: "USER" } });

    // ─── Chart 1: Revenue over time (line) ───
    const revByDay = new Map<string, number>();
    for (const o of paidOrders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      revByDay.set(day, (revByDay.get(day) || 0) + (o.totalCents || 0));
    }
    // Fill empty days
    const revenueOverTime: Array<{ date: string; cents: number }> = [];
    const dayMs = 86400000;
    const start = new Date(since); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
      const key = d.toISOString().slice(0, 10);
      revenueOverTime.push({ date: key, cents: revByDay.get(key) || 0 });
    }

    // ─── Chart 2: Orders per day (bar) ───
    const ordersByDay = new Map<string, number>();
    for (const o of paidOrders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      ordersByDay.set(day, (ordersByDay.get(day) || 0) + 1);
    }
    const ordersPerDay = revenueOverTime.map((r) => ({
      date: r.date,
      count: ordersByDay.get(r.date) || 0,
    }));

    // ─── Chart 3: Traffic sources (pie) — faked from order metadata ───
    let srcQuote = 0, srcWebshop = 0, srcManual = 0;
    for (const o of paidOrders) {
      if (o.quoteId) srcQuote++;
      else if (o.userId) srcWebshop++;
      else srcManual++;
    }
    const trafficSources = [
      { name: "Quote checkout", value: srcQuote },
      { name: "Webshop", value: srcWebshop },
      { name: "Manual / Admin", value: srcManual },
    ].filter((s) => s.value > 0);

    // ─── Recent orders ───
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, email: true, totalCents: true, status: true, createdAt: true },
    });

    // ─── Recent quotes ───
    const recentQuotes = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, email: true, totalCents: true, status: true, createdAt: true, material: true },
    });

    // ─── Low stock filament combos ───
    const combos = await prisma.materialColor.findMany({
      include: { material: true, color: true },
    });
    const lowStock: any[] = [];
    for (const c of combos) {
      const agg = await prisma.spool.aggregate({
        where: {
          materialId: c.materialId,
          colorId: c.colorId,
          status: { in: ["IN_STOCK", "IN_USE"] },
        },
        _sum: { remainingGrams: true },
      });
      const total = agg._sum.remainingGrams || 0;
      if (total < c.lowStockGrams) {
        lowStock.push({
          materialName: c.material.name,
          colorName: c.color.name,
          colorHex: c.color.hex,
          totalGrams: total,
          lowStockGrams: c.lowStockGrams,
        });
      }
    }

    res.json({
      range,
      generatedAt: new Date().toISOString(),
      metrics: {
        revenueCents,
        revenueTodayCents: revToday._sum.totalCents || 0,
        revenueWeekCents: revWeek._sum.totalCents || 0,
        revenueMonthCents: revMonth._sum.totalCents || 0,
        ordersCount,
        aov,
        conversionRate,
        quotesInRange,
        convertedQuotes,
        newCustomers,
        totalCustomers,
      },
      charts: {
        revenueOverTime,
        ordersPerDay,
        trafficSources,
      },
      recentOrders,
      recentQuotes,
      lowStock,
    });
  } catch (e: any) {
    console.error("dashboard stats error", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── CSV export ────────────────────────────────────────
statsRouter.get("/orders-csv", requireAuth, requireAdmin, async (req, res) => {
  try {
    const range = (req.query.range as string) || "month";
    const since = rangeStart(range);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Order ID", "Date", "Email", "Status", "Subtotal (€)",
      "Shipping (€)", "Total (€)", "Items", "Quote ID", "Tracking Carrier", "Tracking Number",
    ];
    const lines = [headers.join(",")];
    for (const o of orders) {
      const itemsDesc = (o.items || [])
        .map((i: any) => `${i.qty}x ${i.name}`)
        .join(" | ")
        .replace(/"/g, "'");
      const row = [
        `"#${o.id.slice(-8)}"`,
        `"${o.createdAt.toISOString()}"`,
        `"${o.email || ""}"`,
        `"${o.status}"`,
        ((o.subtotalCents || 0) / 100).toFixed(2),
        ((o.shippingCents || 0) / 100).toFixed(2),
        ((o.totalCents || 0) / 100).toFixed(2),
        `"${itemsDesc}"`,
        `"${o.quoteId || ""}"`,
        `"${(o as any).trackingCarrier || ""}"`,
        `"${(o as any).trackingNumber || ""}"`,
      ];
      lines.push(row.join(","));
    }

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="orders-${range}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send("\ufeff" + csv); // BOM for Excel
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Legacy summary endpoint kept for backward compat ──
statsRouter.get("/summary", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [total, last30d, orders, quotes] = await Promise.all([
      prisma.pageView?.count?.() ?? 0,
      prisma.pageView?.count?.({ where: { createdAt: { gte: thirtyDaysAgo } } }) ?? 0,
      prisma.order.count(),
      prisma.quote.count(),
    ]);
    res.json({ total, last30d, orders, quotes, topPaths: [] });
  } catch {
    res.json({ total: 0, last30d: 0, orders: 0, quotes: 0, topPaths: [] });
  }
});
