import { prisma } from "../db";
import { sendMail } from "./email";
import { getSetting } from "./settings";

export type ConsumeReason = "PRINT_USED" | "FAILED_PRINT" | "DISPOSED" | "LOST" | "MANUAL_ADJUST";

interface ConsumeOpts {
  materialId: string;
  colorId: string;
  grams: number;
  reason: ConsumeReason;
  printJobId?: string;
  note?: string;
  // Optional: force the consumption to come from this specific spool
  // (used when Moonraker reports usage on a printer with a loaded spool).
  preferredSpoolId?: string;
}

interface ConsumeResult {
  totalConsumedG: number;
  totalCostCents: number;
  movements: Array<{ spoolId: string; grams: number; costCents: number }>;
}

/**
 * Consume `grams` of (material, color) using FIFO order.
 * Walks oldest spool first, draining each before moving to the next.
 * Creates one FilamentMovement per spool touched.
 * Marks spools as EMPTY when remainingGrams hits 0.
 * Triggers low-stock alert check at the end.
 */
export async function consumeFilament(opts: ConsumeOpts): Promise<ConsumeResult> {
  let remaining = Math.ceil(opts.grams);
  let totalCost = 0;
  const movements: ConsumeResult["movements"] = [];

  // 1. If a preferred spool is given, try to drain that first
  if (opts.preferredSpoolId) {
    const spool = await prisma.spool.findUnique({ where: { id: opts.preferredSpoolId } });
    if (spool && spool.remainingGrams > 0 && spool.materialId === opts.materialId && spool.colorId === opts.colorId) {
      const take = Math.min(remaining, spool.remainingGrams);
      const cost = pricePerGramCents(spool) * take;
      await applyMovement(spool.id, -take, cost, opts);
      movements.push({ spoolId: spool.id, grams: take, costCents: Math.round(cost) });
      totalCost += cost;
      remaining -= take;
    }
  }

  // 2. FIFO from remaining stock
  while (remaining > 0) {
    const spool = await prisma.spool.findFirst({
      where: {
        materialId: opts.materialId,
        colorId: opts.colorId,
        remainingGrams: { gt: 0 },
        status: { in: ["IN_STOCK", "IN_USE"] },
        id: opts.preferredSpoolId ? { not: opts.preferredSpoolId } : undefined,
      },
      orderBy: { purchaseDate: "asc" },
    });
    if (!spool) break; // out of stock — partial consumption

    const take = Math.min(remaining, spool.remainingGrams);
    const cost = pricePerGramCents(spool) * take;
    await applyMovement(spool.id, -take, cost, opts);
    movements.push({ spoolId: spool.id, grams: take, costCents: Math.round(cost) });
    totalCost += cost;
    remaining -= take;
  }

  // 3. Check thresholds
  await checkLowStockAlert(opts.materialId, opts.colorId);

  return {
    totalConsumedG: Math.ceil(opts.grams) - remaining,
    totalCostCents: Math.round(totalCost),
    movements,
  };
}

function pricePerGramCents(spool: { pricePaidCents: number; initialGrams: number }): number {
  if (!spool.initialGrams) return 0;
  return spool.pricePaidCents / spool.initialGrams;
}

async function applyMovement(spoolId: string, deltaGrams: number, costCents: number, opts: ConsumeOpts) {
  await prisma.spool.update({
    where: { id: spoolId },
    data: {
      remainingGrams: { increment: deltaGrams },
      status: deltaGrams < 0 ? undefined : undefined,
    },
  });
  // Mark empty if needed (need a fresh read)
  const fresh = await prisma.spool.findUnique({ where: { id: spoolId } });
  if (fresh && fresh.remainingGrams <= 0 && fresh.status !== "EMPTY") {
    await prisma.spool.update({ where: { id: spoolId }, data: { status: "EMPTY", remainingGrams: 0 } });
  } else if (fresh && fresh.status === "IN_STOCK") {
    await prisma.spool.update({ where: { id: spoolId }, data: { status: "IN_USE" } });
  }

  await prisma.filamentMovement.create({
    data: {
      spoolId,
      deltaGrams,
      reason: opts.reason as any,
      costCents: Math.round(Math.abs(costCents)),
      printJobId: opts.printJobId || null,
      note: opts.note || null,
    },
  });
}

/**
 * Add stock for a brand-new spool (PURCHASE movement).
 */
export async function recordPurchase(spoolId: string) {
  const spool = await prisma.spool.findUnique({ where: { id: spoolId } });
  if (!spool) throw new Error("Spool not found");
  await prisma.filamentMovement.create({
    data: {
      spoolId: spool.id,
      deltaGrams: spool.initialGrams,
      reason: "PURCHASE",
      costCents: spool.pricePaidCents,
      note: `Purchased from ${spool.supplier || "unknown supplier"}`,
    },
  });
}

/**
 * Total grams in stock for a material+color across all non-disposed spools.
 */
export async function totalStockG(materialId: string, colorId: string): Promise<number> {
  const agg = await prisma.spool.aggregate({
    where: {
      materialId,
      colorId,
      status: { in: ["IN_STOCK", "IN_USE"] },
    },
    _sum: { remainingGrams: true },
  });
  return agg._sum.remainingGrams || 0;
}

/**
 * Check the low-stock threshold for this material+color combo.
 * If total drops below threshold, create an alert and email admin (if SMTP set).
 * Suppresses duplicate alerts (one open alert per combo at a time).
 */
async function checkLowStockAlert(materialId: string, colorId: string) {
  const mc = await prisma.materialColor.findUnique({
    where: { materialId_colorId: { materialId, colorId } },
  });
  if (!mc || !mc.lowStockGrams) return;

  const total = await totalStockG(materialId, colorId);
  if (total >= mc.lowStockGrams) return;

  // Suppress if there's already an unread alert for this combo in the last 24h
  const since = new Date(Date.now() - 24 * 3600_000);
  const existing = await prisma.filamentAlert.findFirst({
    where: { materialId, colorId, read: false, createdAt: { gte: since } },
  });
  if (existing) return;

  const alert = await prisma.filamentAlert.create({
    data: { materialId, colorId, thresholdG: mc.lowStockGrams, currentG: total },
    include: { material: true, color: true },
  });

  // Email if SMTP configured
  try {
    const adminEmail = await getSetting<string>("alerts.email", "") || await getSetting<string>("company.email", "");
    if (adminEmail) {
      await sendMail({
        to: adminEmail,
        subject: `Low filament: ${alert.material.name} ${alert.color.name}`,
        html: `<p>Stock for <strong>${alert.material.name} ${alert.color.name}</strong> has dropped to <strong>${total}g</strong>, below the threshold of ${mc.lowStockGrams}g.</p><p>Time to reorder.</p>`,
      });
      await prisma.filamentAlert.update({ where: { id: alert.id }, data: { emailSent: true } });
    }
  } catch (e: any) {
    console.error("[alerts] email failed:", e.message);
  }
}

/**
 * Get the current FIFO list price (oldest spool's price) for a material+color.
 * Returns undefined if no stock — caller falls back to MaterialColor.listPriceKgCents.
 */
export async function fifoOldestPriceKgCents(materialId: string, colorId: string): Promise<number | undefined> {
  const oldest = await prisma.spool.findFirst({
    where: { materialId, colorId, remainingGrams: { gt: 0 }, status: { in: ["IN_STOCK", "IN_USE"] } },
    orderBy: { purchaseDate: "asc" },
  });
  if (!oldest) return undefined;
  if (!oldest.initialGrams) return undefined;
  return Math.round((oldest.pricePaidCents / oldest.initialGrams) * 1000);
}
