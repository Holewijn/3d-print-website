import { prisma } from "../db";

export interface CalcInput {
  country: string;
  subtotalCents: number;
  weightG: number;
}

export interface AvailableRate {
  id: string;
  zoneId: string;
  name: string;
  type: string;
  costCents: number;
  description?: string;
}

// Returns all rates available for the given country/cart, sorted by cost ascending.
export async function calculateShippingOptions(input: CalcInput): Promise<AvailableRate[]> {
  const country = (input.country || "").toUpperCase().trim();
  if (!country) return [];

  const zones = await prisma.shippingZone.findMany({
    where: { active: true },
    include: { rates: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  // Find the first zone that includes this country (most specific wins by sortOrder)
  const zone = zones.find((z) => Array.isArray(z.countries) && (z.countries as string[]).includes(country));
  if (!zone) return [];

  const out: AvailableRate[] = [];
  for (const r of zone.rates) {
    if (r.minOrderCents != null && input.subtotalCents < r.minOrderCents) continue;

    let cost = 0;
    let description: string | undefined;

    switch (r.type) {
      case "FLAT":
        cost = r.costCents;
        break;
      case "FREE":
        cost = 0;
        description = "Free shipping";
        break;
      case "FREE_OVER":
        if (r.freeAboveCents != null && input.subtotalCents >= r.freeAboveCents) {
          cost = 0;
          description = `Free over €${(r.freeAboveCents / 100).toFixed(2)}`;
        } else {
          cost = r.costCents;
        }
        break;
      case "WEIGHT": {
        const kg = Math.max(0.1, input.weightG / 1000);
        cost = Math.ceil(kg) * r.costCents;
        description = `€${(r.costCents / 100).toFixed(2)} per kg`;
        break;
      }
    }

    out.push({
      id: r.id,
      zoneId: zone.id,
      name: r.name,
      type: r.type,
      costCents: cost,
      description,
    });
  }

  return out.sort((a, b) => a.costCents - b.costCents);
}

// Validate a chosen rate (called server-side at order creation to prevent tampering)
export async function getValidatedRate(rateId: string, country: string, subtotalCents: number, weightG: number) {
  const options = await calculateShippingOptions({ country, subtotalCents, weightG });
  return options.find((o) => o.id === rateId) || null;
}
