// Run AFTER db push:
//   node prisma/seed-inventory.js
//
// Idempotent — won't create duplicates if you run it twice.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MATERIALS = [
  { name: "PLA",   densityGcm3: 1.24, printTempC: 210, bedTempC: 60,  abrasive: false },
  { name: "PETG",  densityGcm3: 1.27, printTempC: 235, bedTempC: 80,  abrasive: false },
  { name: "ABS",   densityGcm3: 1.04, printTempC: 245, bedTempC: 100, abrasive: false },
  { name: "ASA",   densityGcm3: 1.07, printTempC: 250, bedTempC: 100, abrasive: false },
  { name: "TPU",   densityGcm3: 1.21, printTempC: 225, bedTempC: 50,  abrasive: false },
  { name: "Nylon", densityGcm3: 1.08, printTempC: 260, bedTempC: 80,  abrasive: false },
  { name: "PC",    densityGcm3: 1.20, printTempC: 270, bedTempC: 110, abrasive: false },
];

const COLORS = [
  { name: "Black",        hex: "#000000" },
  { name: "White",        hex: "#ffffff" },
  { name: "Grey",         hex: "#808080" },
  { name: "Red",          hex: "#dc2626" },
  { name: "Blue",         hex: "#2563eb" },
  { name: "Green",        hex: "#16a34a" },
  { name: "Yellow",       hex: "#eab308" },
  { name: "Orange",       hex: "#f97316" },
  { name: "Transparent",  hex: "#f0f0f0" },
];

const DEFAULT_SETTINGS = [
  { key: "inventory.deductionMode", value: "CONFIRM" },
  { key: "alerts.email", value: "" },
];

async function main() {
  console.log("→ Wiping old FilamentBrand data…");
  // The FilamentBrand model was dropped from the schema but if any rows
  // still exist (e.g. before db push), Prisma will have already removed them.
  // Nothing to do here explicitly.

  console.log("→ Seeding materials…");
  for (const m of MATERIALS) {
    await prisma.material.upsert({
      where: { name: m.name },
      update: {},
      create: { ...m, active: true },
    });
  }

  console.log("→ Seeding colors…");
  for (const c of COLORS) {
    await prisma.color.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }

  console.log("→ Seeding default settings…");
  for (const s of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // Seed default list prices: PLA Black at €25/kg (no low stock alert yet)
  const pla = await prisma.material.findUnique({ where: { name: "PLA" } });
  const black = await prisma.color.findUnique({ where: { name: "Black" } });
  const white = await prisma.color.findUnique({ where: { name: "White" } });
  if (pla && black) {
    await prisma.materialColor.upsert({
      where: { materialId_colorId: { materialId: pla.id, colorId: black.id } },
      update: {},
      create: { materialId: pla.id, colorId: black.id, listPriceKgCents: 2500, lowStockGrams: 500 },
    });
  }
  if (pla && white) {
    await prisma.materialColor.upsert({
      where: { materialId_colorId: { materialId: pla.id, colorId: white.id } },
      update: {},
      create: { materialId: pla.id, colorId: white.id, listPriceKgCents: 2500, lowStockGrams: 500 },
    });
  }

  console.log("✓ Inventory seed complete");
  console.log("  → Go to Admin → Inventory to add Brands, Spools, and configure Pricing & Thresholds");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
