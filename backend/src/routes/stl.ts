import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { prisma } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";

export const stlRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/lib/print3d/uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(8).toString("hex");
    cb(null, `${id}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_MB || "200") * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.stl$/i.test(file.originalname)) return cb(new Error("Only .stl files"));
    cb(null, true);
  },
});

stlRouter.post("/upload", upload.single("file"), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const buf = fs.readFileSync(req.file.path);
  const sha = crypto.createHash("sha256").update(buf).digest("hex");
  const upl = await prisma.stlUpload.create({
    data: {
      userId: req.user?.id || null,
      filename: req.file.originalname,
      storedPath: req.file.path,
      sizeBytes: req.file.size,
      sha256: sha,
    },
  });
  res.json(upl);
});

// ─── Viewer endpoint: serves the raw STL bytes ───
// Anyone with a valid upload ID can fetch — IDs are random 25-char cuids
// (effectively unguessable) and STL geometry isn't sensitive enough to
// require auth. The download endpoint below stays admin-only because it
// uses the original filename in the Content-Disposition.
stlRouter.get("/:id/file", async (req, res) => {
  const upl = await prisma.stlUpload.findUnique({ where: { id: req.params.id } });
  if (!upl) return res.status(404).json({ error: "Not found" });
  if (!fs.existsSync(upl.storedPath)) return res.status(404).json({ error: "File missing" });
  res.setHeader("Content-Type", "model/stl");
  res.setHeader("Cache-Control", "private, max-age=3600");
  fs.createReadStream(upl.storedPath).pipe(res);
});

// Admin-only: download with original filename
stlRouter.get("/:id/download", requireAuth, requireAdmin, async (req, res) => {
  const upl = await prisma.stlUpload.findUnique({ where: { id: req.params.id } });
  if (!upl) return res.status(404).json({ error: "Not found" });
  res.download(upl.storedPath, upl.filename);
});
