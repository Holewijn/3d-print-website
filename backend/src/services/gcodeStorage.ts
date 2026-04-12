import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";
import https from "https";
import { prisma } from "../db";

export const GCODE_DIR = process.env.GCODE_DIR || "/var/lib/print3d/uploads/gcode";
fs.mkdirSync(GCODE_DIR, { recursive: true });

const ALLOWED_EXT = /\.(gcode|g|gco|ufp|bgcode)$/i;

export function isAllowedGcode(filename: string): boolean {
  return ALLOWED_EXT.test(filename);
}

export interface StoredGcode {
  filename: string;       // disk filename (random hex)
  originalName: string;   // user-friendly name
  sizeBytes: number;
  fullPath: string;
}

export function storeGcode(buf: Buffer, originalName: string): StoredGcode {
  if (!isAllowedGcode(originalName)) {
    throw new Error(`Unsupported file type: ${originalName}`);
  }
  const ext = (originalName.match(ALLOWED_EXT)?.[1] || "gcode").toLowerCase();
  const hex = crypto.randomBytes(10).toString("hex");
  const filename = `${hex}.${ext}`;
  const fullPath = path.join(GCODE_DIR, filename);
  fs.writeFileSync(fullPath, buf);
  return { filename, originalName, sizeBytes: buf.length, fullPath };
}

export function deleteGcode(filename: string): void {
  if (!filename) return;
  try {
    fs.unlinkSync(path.join(GCODE_DIR, filename));
  } catch {}
}

export function readGcode(filename: string): Buffer {
  return fs.readFileSync(path.join(GCODE_DIR, filename));
}

export function gcodePath(filename: string): string {
  return path.join(GCODE_DIR, filename);
}

/**
 * Upload a stored gcode to a Moonraker printer's virtual_sdcard.
 * Returns the filename Moonraker assigns it (usually the same as originalName).
 */
export async function uploadToMoonraker(
  printer: { moonrakerUrl: string; apiKey: string | null },
  gcodeFilename: string,
  originalName: string,
): Promise<string> {
  const fullPath = gcodePath(gcodeFilename);
  if (!fs.existsSync(fullPath)) throw new Error(`G-code file not found: ${gcodeFilename}`);
  const buf = fs.readFileSync(fullPath);

  const formData = new FormData();
  const blob = new Blob([buf], { type: "application/octet-stream" });
  formData.append("file", blob, originalName);
  formData.append("root", "gcodes");

  const url = `${printer.moonrakerUrl.replace(/\/$/, "")}/server/files/upload`;
  const headers: Record<string, string> = {};
  if (printer.apiKey) headers["X-Api-Key"] = printer.apiKey;

  const r = await fetch(url, {
    method: "POST",
    headers,
    body: formData as any,
    signal: AbortSignal.timeout(120000), // 2 minutes for large files
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Moonraker upload failed (${r.status}): ${txt}`);
  }
  const data: any = await r.json();
  // Moonraker returns { result: { item: { path: "filename.gcode" } } }
  return data?.result?.item?.path || originalName;
}

export async function startMoonrakerPrint(
  printer: { moonrakerUrl: string; apiKey: string | null },
  filename: string,
): Promise<void> {
  const url = `${printer.moonrakerUrl.replace(/\/$/, "")}/printer/print/start?filename=${encodeURIComponent(filename)}`;
  const headers: Record<string, string> = {};
  if (printer.apiKey) headers["X-Api-Key"] = printer.apiKey;

  const r = await fetch(url, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Moonraker print start failed (${r.status}): ${txt}`);
  }
}
