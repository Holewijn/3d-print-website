import { Router } from "express";
import multer from "multer";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { buildExportWorkbook, importWorkbook } from "../services/inventoryIO";

export const inventoryIORouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB cap
  fileFilter: (_req, file, cb) => {
    if (!/\.(xlsx|xls)$/i.test(file.originalname)) return cb(new Error("Only .xlsx files"));
    cb(null, true);
  },
});

// ─── Export ──────────────────────────────────────────
// GET /api/inventory/export        → full data
// GET /api/inventory/export?empty=1 → blank template with example rows
inventoryIORouter.get("/export", requireAuth, requireAdmin, async (req, res) => {
  try {
    const empty = req.query.empty === "1" || req.query.empty === "true";
    const buf = await buildExportWorkbook(empty);
    const filename = empty ? "inventory-template.xlsx" : `inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Import ──────────────────────────────────────────
// POST /api/inventory/import           → dry run (returns summary, no DB writes)
// POST /api/inventory/import?commit=1  → real import
inventoryIORouter.post("/import", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const commit = req.query.commit === "1" || req.query.commit === "true";
    const summary = await importWorkbook(req.file.buffer, !commit);
    res.json({ dryRun: !commit, summary });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
