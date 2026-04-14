import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
// 1. IMPORT THE ENUMS
import { OrderStatus, Role } from "@prisma/client";

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

// 2. USE THE ENUM FOR STATUSES
const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID, 
  OrderStatus.IN_PRODUCTION, 
  OrderStatus.SHIPPED, 
  OrderStatus.COMPLETED
];

// ─── Main dashboard data — single call ────────────────
statsRouter.get("/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    const range = (req.query.range as string) || "month";
    const since = rangeStart(range);

    // ─── Metric 1: Revenue ───
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

    // ─── Metric 2: Quick revenue ───
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

    // ─── Metric 3: Conversion ───
    const quotesInRange = await prisma.quote.count({ where: { createdAt: { gte: since } } });
    const convertedQuotes = await prisma.quote.count({
      where: { createdAt: { gte: since }, status: "CONVERTED" },
    });
    const conversionRate = quotesInRange > 0 ? convertedQuotes / quotesInRange : 0;

    // ─── Metric 4: Customer growth (FIXED ROLE) ───
    const newCustomers = await prisma.user.count({
      where: { createdAt: { gte: since }, role: Role.CUSTOMER },
    });
    const totalCustomers = await prisma.user.count({ 
    where: { role: Role.CUSTOMER } 
    });

    // ... (Revenue over time logic remains the same) ...
    const revByDay = new Map<string, number>();
    for (const o of paidOrders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      revByDay.set(day, (revByDay.get(day) || 0) + (o.totalCents || 0));
    }
    const revenueOverTime: Array<{ date: string; cents: number }> = [];
    const dayMs = 86400000;
    const start = new Date(since); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
      const key = d.toISOString().slice(0, 10);
      revenueOverTime.push({ date: key, cents: revByDay.get(key) || 0 });
    }

    const ordersByDay = new Map<string, number>();
    for (const o of paidOrders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      ordersByDay.set(day, (ordersByDay.get(day) || 0) + 1);
    }
    const ordersPerDay = revenueOverTime.map((r) => ({
      date: r.date,
      count: ordersByDay.get(r.date) || 0,
    }));

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

    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, email: true, totalCents: true, status: true, createdAt: true },
    });

    const recentQuotes = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, email: true, totalCents: true, status: true, createdAt: true, material: true },
    });

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
      const total = agg._sum?.remainingGrams || 0; // FIXED Sum
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
        // 3. FIXED OPTIONAL CHAINING
        revenueTodayCents: revToday._sum?.totalCents || 0,
        revenueWeekCents: revWeek._sum?.totalCents || 0,
        revenueMonthCents: revMonth._sum?.totalCents || 0,
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

// ... (Rest of file remains unchanged, check CSV export for similar string/enum issues if needed)
