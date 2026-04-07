import { prisma } from "../db";

export function startMoonrakerWorker() {
  const interval = 30_000;
  const tick = async () => {
    try {
      const printers = await prisma.printer.findMany({ where: { active: true } });
      for (const p of printers) {
        try {
          const url = `${p.moonrakerUrl.replace(/\/$/, "")}/printer/objects/query?print_stats&heater_bed&extruder&display_status`;
          const headers: Record<string, string> = {};
          if (p.apiKey) headers["X-Api-Key"] = p.apiKey;
          const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          await prisma.printer.update({
            where: { id: p.id },
            data: { lastStatus: data, lastSeenAt: new Date() }
          });
        } catch (e: any) {
          await prisma.printer.update({
            where: { id: p.id },
            data: { lastStatus: { error: e.message } as any }
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
