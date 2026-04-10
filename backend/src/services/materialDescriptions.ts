import { prisma } from "../db";

// Default descriptions for common filament materials. Used by the public
// quote page to show a helpful "what is this for?" blurb when the customer
// picks a material. Admins can edit these in Admin → Inventory → Materials.
const DEFAULTS: Record<string, string> = {
  PLA: "Easy to print, biodegradable, and great for prototypes, display models, and decorative parts. Not suitable for high-temperature environments (softens above ~60°C). Perfect for indoor use, figurines, toys, and visual mockups.",
  "PLA+": "Tougher and slightly more heat-resistant than standard PLA. Great for functional parts, light mechanical use, and items that need a bit more durability without jumping to ABS or PETG.",
  PETG: "Strong, durable, and slightly flexible. Handles moderate heat (up to ~75°C) and is food-safe when printed with a stainless nozzle. Great for mechanical parts, enclosures, water bottles, and outdoor-use items.",
  ABS: "Tough and heat-resistant (up to ~95°C). Popular for automotive parts, tool housings, and items exposed to heat or mechanical stress. Requires an enclosed printer and produces fumes during printing.",
  ASA: "Similar to ABS but with excellent UV resistance, making it the go-to for outdoor parts that need to survive sunlight and weather. Great for garden hardware, license plates, and automotive exterior parts.",
  TPU: "Flexible rubber-like material. Great for phone cases, gaskets, vibration dampers, wearables, and anything that needs to bend without breaking. Available in different hardnesses (shore 85A, 95A).",
  Nylon: "Extremely strong, wear-resistant, and slightly flexible. Ideal for gears, hinges, living snap-fits, and mechanical parts that see friction. Absorbs moisture from the air, so requires dry storage.",
  PC: "Polycarbonate — one of the toughest and most heat-resistant consumer filaments. Used for functional prototypes, impact-resistant parts, and items that see high temperatures (up to ~110°C). Requires a very hot nozzle and enclosure.",
  "PLA-CF": "PLA reinforced with chopped carbon fiber. Stiffer and more dimensionally stable than regular PLA, with a matte finish. Great for brackets, drone frames, and parts that need rigidity without weight. Abrasive — requires a hardened nozzle.",
  "PETG-CF": "PETG with carbon fiber reinforcement. Combines PETG's ease of printing with stiffer mechanical performance. Good for functional engineering parts. Requires a hardened nozzle.",
  "Nylon-CF": "Carbon fiber Nylon. One of the strongest printable materials, used for drone arms, end-use mechanical parts, and tooling. Very abrasive — hardened nozzle essential.",
  PP: "Polypropylene — very flexible and chemically resistant. Used for living hinges, food containers, and labware. Difficult to print and requires specific bed surfaces.",
  PVA: "Water-soluble support material. Used only as soluble supports for complex multi-material prints.",
  HIPS: "Soluble in limonene, used as a support material for ABS. Also printable on its own for low-cost prototypes.",
};

/**
 * Seeds material.description for any material that:
 *   - Doesn't already have a description, AND
 *   - Has a name that matches one of the defaults (case-insensitive)
 *
 * Safe to call on every boot — idempotent.
 */
export async function seedMaterialDescriptions() {
  try {
    const materials = await prisma.material.findMany();
    for (const m of materials) {
      if (m.description && m.description.trim()) continue;

      // Case-insensitive match against defaults
      const key = Object.keys(DEFAULTS).find((k) => k.toLowerCase() === m.name.toLowerCase());
      if (!key) continue;

      await prisma.material.update({
        where: { id: m.id },
        data: { description: DEFAULTS[key] },
      });
    }
  } catch (e: any) {
    // Non-fatal — likely the migration hasn't been run yet
    console.warn("[seedMaterialDescriptions] skipped:", e.message);
  }
}
