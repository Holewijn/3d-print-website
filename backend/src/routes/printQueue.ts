import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { consumeFilament } from "../services/inventory";

export const printQueueRouter = Router();

// ─── List queue ────────────────────────────────────────
printQueueRouter.get("/", requireAuth, requireAdmin, async (req, res) => {
  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  res.json(await prisma.printJob.findMany({
    where,
    include: {
      quote: { include: { stlUpload: true, materialRef: true, colorRef: true } },
      printer: { include: { loadedSpool: { include: { material: true, color: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  }));
});

// ─── Create from quote ────────────────────────────────
printQueueRouter.post("/from-quote/:quoteId", requireAuth, requireAdmin, async (req, res) => {
  const q = await prisma.quote.findUnique({ where: { id: req.params.quoteId }, include: { printJob: true } });
  if (!q) return res.status(404).json({ error: "Quote not found" });
  if (q.printJob) return res.json(q.printJob);

  const job = await prisma.printJob.create({
    data: {
      quoteId: q.id,
      title: `Quote #${q.id.slice(-8)} — ${q.email}`,
      expectedGrams: q.weightG ? Math.ceil(q.weightG) : null,
      status: "QUEUED",
    },
  });
  res.json(job);
});

// ─── Create standalone (no quote) ─────────────────────
printQueueRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { title, expectedGrams, printerId, spoolId, notes } = req.body;
  res.json(await prisma.printJob.create({
    data: {
      title: title || "Manual print",
      expectedGrams: expectedGrams ? +expectedGrams : null,
      printerId: printerId || null,
      spoolId: spoolId || null,
      notes: notes || null,
      status: "QUEUED",
    },
  }));
});

// ─── Update (assign printer/spool, change status) ─────
printQueueRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { printerId, spoolId, status, notes, actualGrams } = req.body;
  const data: any = {};
  if (printerId !== undefined) data.printerId = printerId || null;
  if (spoolId !== undefined) data.spoolId = spoolId || null;
  if (status) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (actualGrams != null) data.actualGrams = +actualGrams;
  if (status === "PRINTING") data.startedAt = new Date();
  if (["DONE", "FAILED", "CANCELLED"].includes(status)) data.finishedAt = new Date();
  res.json(await prisma.printJob.update({ where: { id: req.params.id }, data }));
});

// ─── Confirm and deduct filament (used in CONFIRM mode or manually) ──
printQueueRouter.post("/:id/confirm", requireAuth, requireAdmin, async (req, res) => {
  const { actualGrams, success } = req.body;
  const job = await prisma.printJob.findUnique({
    where: { id: req.params.id },
    include: { quote: true, printer: { include: { loadedSpool: true } } },
  });
  if (!job) return res.status(404).json({ error: "Not found" });

  const grams = parseInt(actualGrams, 10);
  if (!grams || grams < 0) return res.status(400).json({ error: "Invalid actualGrams" });

  // Determine which material+color to deduct from
  let materialId = job.quote?.materialId || null;
  let colorId = job.quote?.colorId || null;

  // Fall back to the loaded spool on the printer
  const loadedSpool = job.printer?.loadedSpool;
  if (loadedSpool) {
    materialId = materialId || loadedSpool.materialId;
    colorId = colorId || loadedSpool.colorId;
  }
  if (!materialId || !colorId) {
    return res.status(400).json({ error: "Cannot determine material/color — assign a spool to the printer or set on quote" });
  }

  const result = await consumeFilament({
    materialId,
    colorId,
    grams,
    reason: success === false ? "FAILED_PRINT" : "PRINT_USED",
    printJobId: job.id,
    preferredSpoolId: loadedSpool?.id || job.spoolId || undefined,
    note: success === false ? "Failed print" : undefined,
  });

  await prisma.printJob.update({
    where: { id: job.id },
    data: {
      actualGrams: grams,
      status: success === false ? "FAILED" : "DONE",
      finishedAt: new Date(),
    },
  });

  res.json({ ok: true, ...result });
});

printQueueRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.printJob.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
