import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { prisma } from "../db";

export const IMAGE_DIR = process.env.IMAGE_DIR || "/var/lib/print3d/uploads/images";
fs.mkdirSync(IMAGE_DIR, { recursive: true });

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export interface ProcessedImage {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  webpFilename?: string;
  url: string;
  webpUrl?: string;
  createdAt: Date;
}

export function imageUrl(filename: string): string {
  return `/uploads/images/${filename}`;
}

export function isAllowed(mimeType: string): boolean {
  return ALLOWED.has(mimeType);
}

export async function processUpload(
  buf: Buffer,
  originalName: string,
  mimeType: string,
  alt?: string,
): Promise<ProcessedImage> {
  if (!isAllowed(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }
  const ext = EXT_MAP[mimeType] || "bin";
  const hex = crypto.randomBytes(10).toString("hex");
  const filename = `${hex}.${ext}`;
  const fullPath = path.join(IMAGE_DIR, filename);

  // Always store the original
  fs.writeFileSync(fullPath, buf);

  let width: number | undefined;
  let height: number | undefined;
  let webpFilename: string | undefined;

  // For raster formats, also generate an 800px-wide WebP derivative.
  // SVG is vector — skip processing, serve original.
  if (mimeType !== "image/svg+xml") {
    try {
      const meta = await sharp(buf).metadata();
      width = meta.width;
      height = meta.height;

      // Generate WebP derivative if image is wider than 800px or larger than 100KB
      if ((meta.width && meta.width > 800) || buf.length > 100 * 1024) {
        const webpName = `${hex}.webp`;
        const webpPath = path.join(IMAGE_DIR, webpName);
        await sharp(buf)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(webpPath);
        webpFilename = webpName;
      }
    } catch (e) {
      console.warn("[image] sharp processing failed:", (e as Error).message);
    }
  }

  const row = await prisma.mediaImage.create({
    data: {
      filename,
      originalName,
      mimeType,
      sizeBytes: buf.length,
      width: width || null,
      height: height || null,
      webpFilename: webpFilename || null,
      alt: alt || null,
    },
  });

  return {
    id: row.id,
    filename: row.filename,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width || undefined,
    height: row.height || undefined,
    webpFilename: row.webpFilename || undefined,
    url: imageUrl(row.filename),
    webpUrl: row.webpFilename ? imageUrl(row.webpFilename) : undefined,
    createdAt: row.createdAt,
  };
}

export async function listImages(): Promise<ProcessedImage[]> {
  const rows = await prisma.mediaImage.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    originalName: r.originalName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    width: r.width || undefined,
    height: r.height || undefined,
    webpFilename: r.webpFilename || undefined,
    url: imageUrl(r.filename),
    webpUrl: r.webpFilename ? imageUrl(r.webpFilename) : undefined,
    createdAt: r.createdAt,
  }));
}

export async function deleteImage(id: string): Promise<void> {
  const row = await prisma.mediaImage.findUnique({ where: { id } });
  if (!row) throw new Error("Image not found");
  // Delete files
  for (const f of [row.filename, row.webpFilename].filter(Boolean) as string[]) {
    try { fs.unlinkSync(path.join(IMAGE_DIR, f)); } catch {}
  }
  await prisma.mediaImage.delete({ where: { id } });
}
