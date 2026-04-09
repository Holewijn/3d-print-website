import * as XLSX from "xlsx";
import { prisma } from "../db";
import { recordPurchase } from "./inventory";

// ─── Sheet definitions ───────────────────────────────
// Each sheet has a fixed column order. Headers are case-insensitive on import.

const SHEETS = {
  Brands:    ["name", "websiteUrl", "logoUrl", "supportEmail", "notes", "active"],
  Materials: ["name", "densityGcm3", "printTempC", "bedTempC", "abrasive", "notes", "active"],
  Colors:    ["name", "hex", "swatchUrl"],
  Pricing:   ["material", "color", "listPriceKgCents", "lowStockGrams"],
  Spools:    ["brand", "material", "color", "diameterMm", "initialGrams", "remainingGrams", "pricePaidCents", "supplier", "purchaseDate", "batchCode", "notes"],
} as const;

// ─── EXPORT ──────────────────────────────────────────

export async function buildExportWorkbook(empty = false): Promise<Buffer> {
  const wb = XLSX.utils.book_new();

  // Brands
  const brandRows = empty ? [] : (await prisma.brand.findMany({ orderBy: { name: "asc" } })).map((b) => ({
    name: b.name,
    websiteUrl: b.websiteUrl || "",
    logoUrl: b.logoUrl || "",
    supportEmail: b.supportEmail || "",
    notes: b.notes || "",
    active: b.active,
  }));
  if (empty) brandRows.push({ name: "Polymaker", websiteUrl: "https://polymaker.com", logoUrl: "", supportEmail: "support@polymaker.com", notes: "Example row — delete before importing", active: true });
  appendSheet(wb, "Brands", SHEETS.Brands, brandRows);

  // Materials
  const matRows = empty ? [] : (await prisma.material.findMany({ orderBy: { name: "asc" } })).map((m) => ({
    name: m.name,
    densityGcm3: m.densityGcm3,
    printTempC: m.printTempC ?? "",
    bedTempC: m.bedTempC ?? "",
    abrasive: m.abrasive,
    notes: m.notes || "",
    active: m.active,
  }));
  if (empty) matRows.push({ name: "PLA", densityGcm3: 1.24, printTempC: 210, bedTempC: 60, abrasive: false, notes: "Example", active: true });
  appendSheet(wb, "Materials", SHEETS.Materials, matRows);

  // Colors
  const colorRows = empty ? [] : (await prisma.color.findMany({ orderBy: { name: "asc" } })).map((c) => ({
    name: c.name,
    hex: c.hex,
    swatchUrl: c.swatchUrl || "",
  }));
  if (empty) colorRows.push({ name: "Galaxy Purple", hex: "#5b21b6", swatchUrl: "" });
  appendSheet(wb, "Colors", SHEETS.Colors, colorRows);

  // Pricing
  const pricingRows = empty ? [] : (await prisma.materialColor.findMany({
    include: { material: true, color: true },
    orderBy: [{ material: { name: "asc" } }, { color: { name: "asc" } }],
  })).map((mc) => ({
    material: mc.material.name,
    color: mc.color.name,
    listPriceKgCents: mc.listPriceKgCents,
    lowStockGrams: mc.lowStockGrams,
  }));
  if (empty) pricingRows.push({ material: "PLA", color: "Black", listPriceKgCents: 2500, lowStockGrams: 500 });
  appendSheet(wb, "Pricing", SHEETS.Pricing, pricingRows);

  // Spools
  const spoolRows = empty ? [] : (await prisma.spool.findMany({
    include: { brand: true, material: true, color: true },
    orderBy: { purchaseDate: "asc" },
  })).map((s) => ({
    brand: s.brand.name,
    material: s.material.name,
    color: s.color.name,
    diameterMm: s.diameterMm,
    initialGrams: s.initialGrams,
    remainingGrams: s.remainingGrams,
    pricePaidCents: s.pricePaidCents,
    supplier: s.supplier || "",
    purchaseDate: s.purchaseDate.toISOString().slice(0, 10),
    batchCode: s.batchCode || "",
    notes: s.notes || "",
  }));
  if (empty) spoolRows.push({ brand: "Polymaker", material: "PLA", color: "Black", diameterMm: 1.75, initialGrams: 1000, remainingGrams: 1000, pricePaidCents: 2200, supplier: "123-3D", purchaseDate: new Date().toISOString().slice(0, 10), batchCode: "", notes: "" });
  appendSheet(wb, "Spools", SHEETS.Spools, spoolRows);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function appendSheet(wb: XLSX.WorkBook, name: string, columns: readonly string[], rows: any[]) {
  // Build a 2D array with header row + data, in stable column order
  const data: any[][] = [columns.slice()];
  for (const r of rows) {
    data.push(columns.map((c) => r[c] ?? ""));
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Reasonable column widths
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(c.length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ─── IMPORT ──────────────────────────────────────────

export interface ImportSummary {
  brands:    { created: number; updated: number; errors: string[] };
  materials: { created: number; updated: number; errors: string[] };
  colors:    { created: number; updated: number; errors: string[] };
  pricing:   { created: number; updated: number; errors: string[] };
  spools:    { created: number; updated: number; errors: string[] };
}

function emptySummary(): ImportSummary {
  return {
    brands:    { created: 0, updated: 0, errors: [] },
    materials: { created: 0, updated: 0, errors: [] },
    colors:    { created: 0, updated: 0, errors: [] },
    pricing:   { created: 0, updated: 0, errors: [] },
    spools:    { created: 0, updated: 0, errors: [] },
  };
}

/**
 * Parse + apply (or dry-run) an inventory workbook.
 * Order matters: Brands → Materials → Colors → Pricing → Spools.
 */
export async function importWorkbook(buf: Buffer, dryRun: boolean): Promise<ImportSummary> {
  const wb = XLSX.read(buf, { type: "buffer" });
  const summary = emptySummary();

  // ─── Brands ─────
  const brandRows = readSheet(wb, "Brands");
  for (let i = 0; i < brandRows.length; i++) {
    const row = brandRows[i];
    const rowNum = i + 2;
    try {
      const name = (row.name || "").toString().trim();
      if (!name) { summary.brands.errors.push(`Row ${rowNum}: missing name`); continue; }
      const data = {
        name,
        websiteUrl:   strOrNull(row.websiteUrl),
        logoUrl:      strOrNull(row.logoUrl),
        supportEmail: strOrNull(row.supportEmail),
        notes:        strOrNull(row.notes),
        active:       parseBool(row.active, true),
      };
      const existing = await prisma.brand.findUnique({ where: { name } });
      if (existing) {
        if (!dryRun) await prisma.brand.update({ where: { id: existing.id }, data });
        summary.brands.updated++;
      } else {
        if (!dryRun) await prisma.brand.create({ data });
        summary.brands.created++;
      }
    } catch (e: any) {
      summary.brands.errors.push(`Row ${rowNum}: ${e.message}`);
    }
  }

  // ─── Materials ─────
  const matRows = readSheet(wb, "Materials");
  for (let i = 0; i < matRows.length; i++) {
    const row = matRows[i];
    const rowNum = i + 2;
    try {
      const name = (row.name || "").toString().trim();
      if (!name) { summary.materials.errors.push(`Row ${rowNum}: missing name`); continue; }
      const data = {
        name,
        densityGcm3: parseNum(row.densityGcm3, 1.24),
        printTempC:  parseIntOrNull(row.printTempC),
        bedTempC:    parseIntOrNull(row.bedTempC),
        abrasive:    parseBool(row.abrasive, false),
        notes:       strOrNull(row.notes),
        active:      parseBool(row.active, true),
      };
      const existing = await prisma.material.findUnique({ where: { name } });
      if (existing) {
        if (!dryRun) await prisma.material.update({ where: { id: existing.id }, data });
        summary.materials.updated++;
      } else {
        if (!dryRun) await prisma.material.create({ data });
        summary.materials.created++;
      }
    } catch (e: any) {
      summary.materials.errors.push(`Row ${rowNum}: ${e.message}`);
    }
  }

  // ─── Colors ─────
  const colorRows = readSheet(wb, "Colors");
  for (let i = 0; i < colorRows.length; i++) {
    const row = colorRows[i];
    const rowNum = i + 2;
    try {
      const name = (row.name || "").toString().trim();
      if (!name) { summary.colors.errors.push(`Row ${rowNum}: missing name`); continue; }
      const data = {
        name,
        hex: (row.hex || "#000000").toString().trim(),
        swatchUrl: strOrNull(row.swatchUrl),
      };
      const existing = await prisma.color.findUnique({ where: { name } });
      if (existing) {
        if (!dryRun) await prisma.color.update({ where: { id: existing.id }, data });
        summary.colors.updated++;
      } else {
        if (!dryRun) await prisma.color.create({ data });
        summary.colors.created++;
      }
    } catch (e: any) {
      summary.colors.errors.push(`Row ${rowNum}: ${e.message}`);
    }
  }

  // ─── Pricing ─────
  const priceRows = readSheet(wb, "Pricing");
  for (let i = 0; i < priceRows.length; i++) {
    const row = priceRows[i];
    const rowNum = i + 2;
    try {
      const matName = (row.material || "").toString().trim();
      const colName = (row.color || "").toString().trim();
      if (!matName || !colName) { summary.pricing.errors.push(`Row ${rowNum}: missing material or color`); continue; }
      const mat = await prisma.material.findUnique({ where: { name: matName } });
      const col = await prisma.color.findUnique({ where: { name: colName } });
      if (!mat) { summary.pricing.errors.push(`Row ${rowNum}: material "${matName}" not found`); continue; }
      if (!col) { summary.pricing.errors.push(`Row ${rowNum}: color "${colName}" not found`); continue; }
      const data = {
        listPriceKgCents: parseInt(row.listPriceKgCents, 10) || 2500,
        lowStockGrams:    parseInt(row.lowStockGrams, 10) || 500,
      };
      const existing = await prisma.materialColor.findUnique({
        where: { materialId_colorId: { materialId: mat.id, colorId: col.id } },
      });
      if (existing) {
        if (!dryRun) await prisma.materialColor.update({ where: { id: existing.id }, data });
        summary.pricing.updated++;
      } else {
        if (!dryRun) await prisma.materialColor.create({ data: { ...data, materialId: mat.id, colorId: col.id } });
        summary.pricing.created++;
      }
    } catch (e: any) {
      summary.pricing.errors.push(`Row ${rowNum}: ${e.message}`);
    }
  }

  // ─── Spools ─────
  // Spools always create new — no natural key, every spool is a unique physical purchase.
  const spoolRows = readSheet(wb, "Spools");
  for (let i = 0; i < spoolRows.length; i++) {
    const row = spoolRows[i];
    const rowNum = i + 2;
    try {
      const brandName = (row.brand || "").toString().trim();
      const matName   = (row.material || "").toString().trim();
      const colName   = (row.color || "").toString().trim();
      if (!brandName || !matName || !colName) { summary.spools.errors.push(`Row ${rowNum}: missing brand/material/color`); continue; }

      const brand = await prisma.brand.findUnique({ where: { name: brandName } });
      const mat   = await prisma.material.findUnique({ where: { name: matName } });
      const col   = await prisma.color.findUnique({ where: { name: colName } });
      if (!brand) { summary.spools.errors.push(`Row ${rowNum}: brand "${brandName}" not found`); continue; }
      if (!mat)   { summary.spools.errors.push(`Row ${rowNum}: material "${matName}" not found`); continue; }
      if (!col)   { summary.spools.errors.push(`Row ${rowNum}: color "${colName}" not found`); continue; }

      const initialGrams = parseInt(row.initialGrams, 10);
      if (!initialGrams || initialGrams <= 0) { summary.spools.errors.push(`Row ${rowNum}: initialGrams must be > 0`); continue; }
      const pricePaidCents = parseInt(row.pricePaidCents, 10);
      if (pricePaidCents == null || isNaN(pricePaidCents)) { summary.spools.errors.push(`Row ${rowNum}: pricePaidCents required`); continue; }

      const data = {
        brandId: brand.id,
        materialId: mat.id,
        colorId: col.id,
        diameterMm: parseNum(row.diameterMm, 1.75),
        initialGrams,
        remainingGrams: row.remainingGrams != null && row.remainingGrams !== "" ? parseInt(row.remainingGrams, 10) : initialGrams,
        pricePaidCents,
        supplier: strOrNull(row.supplier),
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : new Date(),
        batchCode: strOrNull(row.batchCode),
        notes: strOrNull(row.notes),
        status: "IN_STOCK" as const,
      };

      if (!dryRun) {
        const spool = await prisma.spool.create({ data });
        await recordPurchase(spool.id);
      }
      summary.spools.created++;
    } catch (e: any) {
      summary.spools.errors.push(`Row ${rowNum}: ${e.message}`);
    }
  }

  return summary;
}

// ─── helpers ─────────────────────────────────────────

function readSheet(wb: XLSX.WorkBook, name: string): any[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  // Use raw:false so dates come through as strings; defval keeps empty cells
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
}

function strOrNull(v: any): string | null {
  if (v == null) return null;
  const s = v.toString().trim();
  return s === "" ? null : s;
}

function parseNum(v: any, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function parseIntOrNull(v: any): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function parseBool(v: any, fallback: boolean): boolean {
  if (v == null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = v.toString().trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return fallback;
}
