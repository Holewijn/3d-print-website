import { Router } from "express";
import multer from "multer";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
// 1. Import PrintJobStatus from Prisma Client
import { PrintJobStatus } from "@prisma/client";
import {
  isAllowedGcode,
  storeGcode,
  deleteGcode,
  readGcode,
  uploadToMoonraker,
  startMoonrakerPrint,
} from "../services/gcodeStorage";

export const printQueueRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    if (!isAllowedGcode(file.originalname)) return cb(new Error("Only G-code files allowed"));
    cb(null, true);
  },
});

// ─── List ─────
printQueueRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await prisma.printJob.findMany({
    include: { quote: true, printer: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  }));
});

// ─── Create ───
printQueueRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  res.json(await prisma.printJob.create({ data: req.body }));
});

// ─── Update ───
printQueueRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id, createdAt, updatedAt, quote, printer, ...data } = req.body;
  res.json(await prisma.printJob.update({ where: { id: req.params.id }, data }));
});

// ─── Delete ───
printQueueRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const job = await prisma.printJob.findUnique({ where: { id: req.params.id } });
  if (job?.gcodeFilename) deleteGcode(job.gcodeFilename);
  await prisma.printJob.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Upload G-code to a print job ───
printQueueRouter.post("/:id/upload-gcode", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const job = await prisma.printJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Print job not found" });

    if (job.gcodeFilename) deleteGcode(job.gcodeFilename);

    const stored = storeGcode(req.file.buffer, req.file.originalname);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        gcodeFilename: stored.filename,
        gcodeOriginalName: stored.originalName,
        gcodeSizeBytes: stored.sizeBytes,
      },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─── Download stored G-code ───
printQueueRouter.get("/:id/gcode/download", requireAuth, requireAdmin, async (req, res) => {
  try {
    const job = await prisma.printJob.findUnique({ where: { id: req.params.id } });
    if (!job || !job.gcodeFilename) return res.status(404).json({ error: "No G-code attached" });
    const buf = readGcode(job.gcodeFilename);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${job.gcodeOriginalName || job.gcodeFilename}"`);
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Remove attached G-code ───
printQueueRouter.delete("/:id/gcode", requireAuth, requireAdmin, async (req, res) => {
  try {
    const job = await prisma.printJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Not found" });
    if (job.gcodeFilename) deleteGcode(job.gcodeFilename);
    await prisma.printJob.update({
      where: { id: job.id },
      data: {
        gcodeFilename: null,
        gcodeOriginalName: null,
        gcodeSizeBytes: null,
      },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Send to printer ───
printQueueRouter.post("/:id/send-to-printer", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { printerId, startNow } = req.body;
    if (!printerId) return res.status(400).json({ error: "printerId required" });

    const job = await prisma.printJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Print job not found" });
    if (!job.gcodeFilename || !job.gcodeOriginalName) {
      return res.status(400).json({ error: "No G-code attached to this print job" });
    }

    const printer = await prisma.printer.findUnique({ where: { id: printerId } });
    if (!printer) return res.status(404).json({ error: "Printer not found" });
    if (!printer.active) return res.status(400).json({ error: "Printer is disabled" });

    const remoteName = await uploadToMoonraker(
      { moonrakerUrl: printer.moonrakerUrl, apiKey: printer.apiKey },
      job.gcodeFilename,
      job.gcodeOriginalName,
    );

    if (startNow) {
      await startMoonrakerPrint(
        { moonrakerUrl: printer.moonrakerUrl, apiKey: printer.apiKey },
        remoteName,
      );
    }

    // 2. Use the Enum values here instead of raw strings
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        printerId: printer.id,
        status: startNow ? PrintJobStatus.PRINTING : PrintJobStatus.ASSIGNED,
        startedAt: startNow ? new Date() : job.startedAt,
      },
    });

    res.json({ ok: true, job: updated, remoteFilename: remoteName, started: !!startNow });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
