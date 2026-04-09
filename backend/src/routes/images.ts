import { Router } from "express";
import multer from "multer";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { processUpload, listImages, deleteImage, isAllowed } from "../services/images";

export const imagesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!isAllowed(file.mimetype)) {
      return cb(new Error(`Unsupported type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// Anyone authed can upload (admin requirement: tighten if needed)
imagesRouter.post("/upload", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const img = await processUpload(req.file.buffer, req.file.originalname, req.file.mimetype, req.body.alt);
    res.json(img);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

imagesRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await listImages());
});

imagesRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteImage(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});
