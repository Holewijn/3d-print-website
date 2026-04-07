import fs from "fs";

export function stlVolumeCm3(filePath: string): number {
  const buf = fs.readFileSync(filePath);
  const isAscii = buf.slice(0, 5).toString("utf8").toLowerCase() === "solid"
    && buf.includes(Buffer.from("facet normal"));
  const triangles = isAscii ? parseAscii(buf.toString("utf8")) : parseBinary(buf);
  let vol = 0;
  for (const t of triangles) {
    vol += signedVolumeOfTriangle(t[0], t[1], t[2]);
  }
  return Math.abs(vol) / 1000;
}

type V3 = [number, number, number];

function signedVolumeOfTriangle(p1: V3, p2: V3, p3: V3): number {
  const v321 = p3[0] * p2[1] * p1[2];
  const v231 = p2[0] * p3[1] * p1[2];
  const v312 = p3[0] * p1[1] * p2[2];
  const v132 = p1[0] * p3[1] * p2[2];
  const v213 = p2[0] * p1[1] * p3[2];
  const v123 = p1[0] * p2[1] * p3[2];
  return (-v321 + v231 + v312 - v132 - v213 + v123) / 6;
}

function parseBinary(buf: Buffer): V3[][] {
  const tris: V3[][] = [];
  const count = buf.readUInt32LE(80);
  let off = 84;
  for (let i = 0; i < count; i++) {
    off += 12;
    const v: V3[] = [];
    for (let j = 0; j < 3; j++) {
      v.push([buf.readFloatLE(off), buf.readFloatLE(off + 4), buf.readFloatLE(off + 8)]);
      off += 12;
    }
    off += 2;
    tris.push(v);
  }
  return tris;
}

function parseAscii(text: string): V3[][] {
  const tris: V3[][] = [];
  const re = /vertex\s+(-?\d+\.?\d*(?:e[-+]?\d+)?)\s+(-?\d+\.?\d*(?:e[-+]?\d+)?)\s+(-?\d+\.?\d*(?:e[-+]?\d+)?)/gi;
  let m: RegExpExecArray | null;
  let cur: V3[] = [];
  while ((m = re.exec(text))) {
    cur.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
    if (cur.length === 3) { tris.push(cur); cur = []; }
  }
  return tris;
}

export interface PriceInputs {
  volumeCm3: number;
  densityGcm3: number;
  infillPct: number;
  layerHeightMm: number;
  pricePerKgCents: number;
  energyPriceKwhCents: number;
  printerWattage: number;
  machineCostPerHourCents: number;
  marginPct: number;
  printSpeedMmS: number;
  setupFeeCents: number;     // NEW
  minOrderCents: number;     // NEW
}

export interface PriceResult {
  volumeCm3: number;
  weightG: number;
  printMinutes: number;
  energyKwh: number;
  materialCostCents: number;
  energyCostCents: number;
  machineCostCents: number;
  marginCents: number;
  setupFeeCents: number;
  totalCents: number;
}

export function calculatePrice(i: PriceInputs): PriceResult {
  const effectiveVolume = i.volumeCm3 * (0.2 + 0.8 * (i.infillPct / 100));
  const weightG = effectiveVolume * i.densityGcm3;
  const layerFactor = 0.2 / Math.max(0.05, i.layerHeightMm);
  const printMinutes = Math.max(5, Math.round(weightG * 1.8 * layerFactor));
  const printHours = printMinutes / 60;
  const energyKwh = (i.printerWattage / 1000) * printHours;

  const materialCostCents = Math.round((weightG / 1000) * i.pricePerKgCents);
  const energyCostCents = Math.round(energyKwh * i.energyPriceKwhCents);
  const machineCostCents = Math.round(printHours * i.machineCostPerHourCents);
  const subtotal = materialCostCents + energyCostCents + machineCostCents;
  const marginCents = Math.round(subtotal * (i.marginPct / 100));

  // Setup fee added on top, then enforce minimum order
  const beforeMin = subtotal + marginCents + (i.setupFeeCents || 0);
  const totalCents = Math.max(beforeMin, i.minOrderCents || 0);

  return {
    volumeCm3: round(i.volumeCm3, 2),
    weightG: round(weightG, 1),
    printMinutes,
    energyKwh: round(energyKwh, 3),
    materialCostCents,
    energyCostCents,
    machineCostCents,
    marginCents,
    setupFeeCents: i.setupFeeCents || 0,
    totalCents,
  };
}

function round(n: number, d: number) { const f = Math.pow(10, d); return Math.round(n * f) / f; }
