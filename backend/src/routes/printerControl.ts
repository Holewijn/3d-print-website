import { Router } from "express";
import multer from "multer";
import http from "http";
import https from "https";
import rateLimit from "express-rate-limit";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const printerControlRouter = Router();

// Tighter rate limit on G-code endpoint — max 60 commands/min per IP
const gcodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB gcode cap
  fileFilter: (_req, file, cb) => {
    if (!/\.(gcode|g|gco|ufp|bgcode)$/i.test(file.originalname)) {
      return cb(new Error("Only G-code files allowed"));
    }
    cb(null, true);
  },
});

// ─── Helper: fetch with Moonraker auth ──────────────────
async function mrFetch(
  printer: { moonrakerUrl: string; apiKey: string | null },
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${printer.moonrakerUrl.replace(/\/$/, "")}${path}`;
  const headers = new Headers(init.headers);
  if (printer.apiKey) headers.set("X-Api-Key", printer.apiKey);
  return fetch(url, { ...init, headers, signal: AbortSignal.timeout(15000) });
}

async function getPrinter(id: string) {
  const p = await prisma.printer.findUnique({ where: { id } });
  if (!p) throw Object.assign(new Error("Printer not found"), { status: 404 });
  if (!p.active) throw Object.assign(new Error("Printer is disabled"), { status: 400 });
  return p;
}

// ─── Status snapshot ────────────────────────────────────
printerControlRouter.get("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const r = await mrFetch(
      printer,
      "/printer/objects/query?print_stats&extruder&heater_bed&display_status&toolhead&virtual_sdcard&webhooks",
    );
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    const data: any = await r.json();
    const st = data?.result?.status || {};

    const ps = st.print_stats || {};
    const ext = st.extruder || {};
    const bed = st.heater_bed || {};
    const ds = st.display_status || {};
    const th = st.toolhead || {};
    const vsd = st.virtual_sdcard || {};
    const wh = st.webhooks || {};

    res.json({
      ok: true,
      printer: { id: printer.id, name: printer.name, webcamUrl: printer.webcamUrl },
      state: wh.state || "unknown",
      stateMessage: wh.state_message || "",
      print: {
        state: ps.state || "standby",
        filename: ps.filename || "",
        totalDuration: ps.total_duration || 0,
        printDuration: ps.print_duration || 0,
        filamentUsedMm: ps.filament_used || 0,
        progress: ds.progress || (vsd.progress || 0),
        message: ps.message || "",
      },
      extruder: {
        temperature: ext.temperature || 0,
        target: ext.target || 0,
        power: ext.power || 0,
      },
      heaterBed: {
        temperature: bed.temperature || 0,
        target: bed.target || 0,
        power: bed.power || 0,
      },
      toolhead: {
        position: th.position || [0, 0, 0, 0],
        homedAxes: th.homed_axes || "",
        maxAccel: th.max_accel || 0,
        maxVelocity: th.max_velocity || 0,
      },
      raw: { vsd },
    });

    // Best-effort: update lastSeenAt
    prisma.printer.update({
      where: { id: printer.id },
      data: { lastSeenAt: new Date(), lastStatus: data?.result?.status || {} },
    }).catch(() => {});
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message || "Moonraker unreachable" });
  }
});

// ─── Raw G-code script ──────────────────────────────────
printerControlRouter.post("/:id/gcode", requireAuth, requireAdmin, gcodeLimiter, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const script = (req.body?.script || "").toString().trim();
    if (!script) return res.status(400).json({ error: "script required" });
    const r = await mrFetch(printer, `/printer/gcode/script?script=${encodeURIComponent(script)}`, {
      method: "POST",
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: `Moonraker ${r.status}: ${txt}` });
    }
    const data = await r.json();
    res.json(data);
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Home axes ─────────────────────────────────────────
printerControlRouter.post("/:id/home", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const axes = (req.body?.axes || "").toString().toUpperCase();
    const script = axes ? `G28 ${axes.split("").join(" ")}` : "G28";
    const r = await mrFetch(printer, `/printer/gcode/script?script=${encodeURIComponent(script)}`, {
      method: "POST",
    });
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Emergency stop ─────────────────────────────────────
printerControlRouter.post("/:id/emergency-stop", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const r = await mrFetch(printer, "/printer/emergency_stop", { method: "POST" });
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

printerControlRouter.post("/:id/firmware-restart", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const r = await mrFetch(printer, "/printer/firmware_restart", { method: "POST" });
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Print controls ─────────────────────────────────────
printerControlRouter.post("/:id/print/start", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const filename = (req.body?.filename || "").toString();
    if (!filename) return res.status(400).json({ error: "filename required" });
    const r = await mrFetch(printer, `/printer/print/start?filename=${encodeURIComponent(filename)}`, {
      method: "POST",
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: `Moonraker ${r.status}: ${txt}` });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

printerControlRouter.post("/:id/print/pause", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const r = await mrFetch(printer, "/printer/print/pause", { method: "POST" });
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

printerControlRouter.post("/:id/print/resume", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const r = await mrFetch(printer, "/printer/print/resume", { method: "POST" });
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

printerControlRouter.post("/:id/print/cancel", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const r = await mrFetch(printer, "/printer/print/cancel", { method: "POST" });
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Temperature setpoints ──────────────────────────────
printerControlRouter.post("/:id/temp/extruder", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const target = parseFloat(req.body?.target);
    if (isNaN(target) || target < 0 || target > 350) return res.status(400).json({ error: "Invalid target" });
    const script = `SET_HEATER_TEMPERATURE HEATER=extruder TARGET=${target}`;
    await mrFetch(printer, `/printer/gcode/script?script=${encodeURIComponent(script)}`, { method: "POST" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

printerControlRouter.post("/:id/temp/bed", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const target = parseFloat(req.body?.target);
    if (isNaN(target) || target < 0 || target > 150) return res.status(400).json({ error: "Invalid target" });
    const script = `SET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=${target}`;
    await mrFetch(printer, `/printer/gcode/script?script=${encodeURIComponent(script)}`, { method: "POST" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── File listing (virtual_sdcard) ──────────────────────
printerControlRouter.get("/:id/files", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const r = await mrFetch(printer, "/server/files/list?root=gcodes");
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    const data: any = await r.json();
    res.json({ files: data?.result || [] });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── File upload (forwards to Moonraker) ───────────────
printerControlRouter.post("/:id/files/upload", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Forward to Moonraker's upload endpoint as multipart/form-data
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: "application/octet-stream" });
    formData.append("file", blob, req.file.originalname);
    formData.append("root", "gcodes");

    const url = `${printer.moonrakerUrl.replace(/\/$/, "")}/server/files/upload`;
    const headers: Record<string, string> = {};
    if (printer.apiKey) headers["X-Api-Key"] = printer.apiKey;
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: formData as any,
      signal: AbortSignal.timeout(120000), // 2 minutes for large gcodes
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: `Moonraker ${r.status}: ${txt}` });
    }
    const data = await r.json();
    res.json(data);
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── File delete ────────────────────────────────────────
printerControlRouter.delete("/:id/files/*", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    const filePath = (req.params as any)[0];
    const r = await mrFetch(printer, `/server/files/gcodes/${encodeURIComponent(filePath)}`, {
      method: "DELETE",
    });
    if (!r.ok) return res.status(502).json({ error: `Moonraker ${r.status}` });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});

// ─── Webcam proxy (MJPEG stream) ───────────────────────
// Pipes the raw bytes from the printer's camera through the backend.
// Uses native http/https instead of fetch because we want a long-lived
// byte stream, not a buffered response.
printerControlRouter.get("/:id/camera", requireAuth, requireAdmin, async (req, res) => {
  try {
    const printer = await getPrinter(req.params.id);
    if (!printer.webcamUrl) return res.status(404).json({ error: "No webcam configured for this printer" });

    const target = new URL(printer.webcamUrl);
    const mod: any = target.protocol === "https:" ? https : http;

    const proxyReq = mod.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: target.pathname + target.search,
        method: "GET",
        headers: { "User-Agent": "print3d-backend/1.0" },
      },
      (upstream: any) => {
        // Copy relevant headers (content-type is critical for MJPEG)
        const ct = upstream.headers["content-type"] || "multipart/x-mixed-replace; boundary=boundarydonotcross";
        res.setHeader("Content-Type", ct);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Connection", "close");
        upstream.pipe(res);
        upstream.on("error", () => { try { res.end(); } catch {} });
      },
    );

    proxyReq.on("error", (err: any) => {
      console.error("[camera-proxy] upstream error:", err.message);
      if (!res.headersSent) res.status(502).json({ error: "Camera unreachable" });
    });

    // When the admin closes the page, kill the upstream
    req.on("close", () => { try { proxyReq.destroy(); } catch {} });

    proxyReq.end();
  } catch (e: any) {
    res.status(e.status || 502).json({ error: e.message });
  }
});
