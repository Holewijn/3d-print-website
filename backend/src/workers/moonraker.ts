import { prisma } from "../db";
import { consumeFilament } from "../services/inventory";
import { getSetting } from "../services/settings";

interface PrintStats {
  state?: string;
  filename?: string;
  print_duration?: number;
  filament_used?: number; // mm
}

// Track per-printer state to detect transitions printing → complete
const lastState: Map<string, { state?: string; filename?: string; filamentUsedMm?: number }> = new Map();

export function startMoonrakerWorker() {
  const interval = 30_000;
  const tick = async () => {
    try {
      const printers = await prisma.printer.findMany({
        where: { active: true },
        include: { loadedSpool: { include: { material: true, color: true } } },
      });
      for (const p of printers) {
        try {
          const url = `${p.moonrakerUrl.replace(/\/$/, "")}/printer/objects/query?print_stats&heater_bed&extruder&display_status&toolhead`;
          const headers: Record<string, string> = {};
          if (p.apiKey) headers["X-Api-Key"] = p.apiKey;
          const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data: any = await r.json();

          await prisma.printer.update({
            where: { id: p.id },
            data: { lastStatus: data, lastSeenAt: new Date() },
          });

          const stats: PrintStats = data?.result?.status?.print_stats || {};
          const prev = lastState.get(p.id) || {};

          // Detect a finished print: state was "printing", now "complete"
          if (prev.state === "printing" && stats.state === "complete") {
            const filamentUsedMm = stats.filament_used || 0;
            const startMm = prev.filamentUsedMm || 0;
            const usedMmThisPrint = filamentUsedMm > startMm ? filamentUsedMm - startMm : filamentUsedMm;
            await handlePrintFinished(p, prev.filename || stats.filename, usedMmThisPrint);
          }

          // Update tracker
          lastState.set(p.id, {
            state: stats.state,
            filename: stats.filename,
            filamentUsedMm: stats.filament_used,
          });
        } catch (e: any) {
          await prisma.printer.update({
            where: { id: p.id },
            data: { lastStatus: { error: e.message } as any },
          });
        }
      }
    } catch (e) {
      console.error("[moonraker] worker error", e);
    }
  };
  setInterval(tick, interval);
  setTimeout(tick, 5000);
  console.log("[moonraker] worker started");
}

async function handlePrintFinished(printer: any, filename: string | undefined, usedMm: number) {
  if (!printer.loadedSpool) {
    console.warn(`[moonraker] ${printer.name} finished print but no spool loaded — skipping`);
    return;
  }

  const spool = printer.loadedSpool;
  const grams = mmToGrams(usedMm, spool.diameterMm, spool.material.densityGcm3);

  const mode = await getSetting<string>("inventory.deductionMode", "CONFIRM");

  // Try to find a matching active PrintJob on this printer
  const job = await prisma.printJob.findFirst({
    where: { printerId: printer.id, status: { in: ["PRINTING", "QUEUED"] } },
    orderBy: { startedAt: "desc" },
  });

  if (mode === "AUTO") {
    if (job) {
      await prisma.printJob.update({
        where: { id: job.id },
        data: { actualGrams: grams, status: "DONE", finishedAt: new Date() },
      });
      await consumeFilament({
        materialId: spool.materialId,
        colorId: spool.colorId,
        grams,
        reason: "PRINT_USED",
        printJobId: job.id,
        preferredSpoolId: spool.id,
        note: filename ? `Auto: ${filename}` : "Auto",
      });
    } else {
      // No matching job → still deduct, just no link
      await consumeFilament({
        materialId: spool.materialId,
        colorId: spool.colorId,
        grams,
        reason: "PRINT_USED",
        preferredSpoolId: spool.id,
        note: filename ? `Auto (no job): ${filename}` : "Auto (no job)",
      });
    }
    console.log(`[moonraker] AUTO deducted ${grams}g from ${spool.id}`);
  } else {
    // CONFIRM mode → mark job as PENDING_REVIEW with actualGrams set
    if (job) {
      await prisma.printJob.update({
        where: { id: job.id },
        data: { actualGrams: grams, status: "PENDING_REVIEW", finishedAt: new Date() },
      });
    } else {
      // Create a job retroactively so admin can review
      await prisma.printJob.create({
        data: {
          title: filename || `Untitled print on ${printer.name}`,
          printerId: printer.id,
          spoolId: spool.id,
          actualGrams: grams,
          finishedAt: new Date(),
          status: "PENDING_REVIEW",
        },
      });
    }
    console.log(`[moonraker] CONFIRM mode: ${grams}g pending review on ${printer.name}`);
  }
}

function mmToGrams(usedMm: number, diameterMm: number, densityGcm3: number): number {
  if (!usedMm || !diameterMm || !densityGcm3) return 0;
  const radiusCm = (diameterMm / 2) / 10;
  const lengthCm = usedMm / 10;
  const volumeCm3 = Math.PI * radiusCm * radiusCm * lengthCm;
  return Math.ceil(volumeCm3 * densityGcm3);
}
