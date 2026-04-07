// prisma/seed-webshop.js — adds sample products + default shipping zones.
// Safe to run multiple times: only inserts if data doesn't exist yet.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // ─── Sample products ─────────────────────────────────
  const products = [
    { slug: "articulated-dragon", name: "Articulated Dragon", category: "Toys", description: "Fully posable print-in-place dragon. Available in multiple colors.", priceCents: 1995, weightG: 80, stock: 25, images: ["https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=600&q=80"] },
    { slug: "geometric-vase", name: "Geometric Vase", category: "Home", description: "Modern low-poly desk vase. Watertight, dishwasher safe.", priceCents: 1495, weightG: 150, stock: 40, images: ["https://images.unsplash.com/photo-1602874801006-94e1b3aa4b46?w=600&q=80"] },
    { slug: "phone-stand", name: "Adjustable Phone Stand", category: "Office", description: "Ergonomic desk phone stand with adjustable angle.", priceCents: 995, weightG: 90, stock: 60, images: ["https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&q=80"] },
    { slug: "cable-organizer", name: "Cable Organizer (set of 6)", category: "Office", description: "Set of 6 cable management clips that stick to any flat surface.", priceCents: 795, weightG: 50, stock: 100, images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"] },
    { slug: "planter-pot", name: "Hexagon Planter Pot", category: "Home", description: "Modular hexagonal planter, snap multiple together.", priceCents: 1295, weightG: 200, stock: 35, images: ["https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80"] },
    { slug: "headphone-stand", name: "Headphone Stand", category: "Office", description: "Sturdy headphone holder for your desk.", priceCents: 1795, weightG: 220, stock: 20, images: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80"] },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }
  console.log(`✓ ${products.length} sample products`);

  // ─── Default shipping zones ─────────────────────────
  const zoneCount = await prisma.shippingZone.count();
  if (zoneCount === 0) {
    const nl = await prisma.shippingZone.create({
      data: {
        name: "Netherlands",
        countries: ["NL"],
        sortOrder: 1,
        rates: {
          create: [
            { name: "PostNL Standard", type: "FLAT", costCents: 595, sortOrder: 1 },
            { name: "Free shipping over €50", type: "FREE_OVER", costCents: 595, freeAboveCents: 5000, sortOrder: 2 },
            { name: "DHL Express", type: "FLAT", costCents: 1295, sortOrder: 3 },
          ],
        },
      },
    });

    const eu = await prisma.shippingZone.create({
      data: {
        name: "European Union",
        countries: ["BE", "DE", "FR", "LU", "AT", "IT", "ES", "PT", "IE", "DK", "SE", "FI", "PL", "CZ", "SK", "HU", "SI", "HR", "EE", "LV", "LT", "RO", "BG", "GR", "CY", "MT"],
        sortOrder: 2,
        rates: {
          create: [
            { name: "EU Standard", type: "FLAT", costCents: 1295, sortOrder: 1 },
            { name: "EU Express", type: "FLAT", costCents: 2495, sortOrder: 2 },
          ],
        },
      },
    });

    const world = await prisma.shippingZone.create({
      data: {
        name: "Rest of World",
        countries: ["GB", "CH", "NO", "US", "CA", "AU", "NZ", "JP"],
        sortOrder: 3,
        rates: {
          create: [
            { name: "International Standard", type: "WEIGHT", costCents: 1500, sortOrder: 1 },
            { name: "International Express", type: "FLAT", costCents: 4995, sortOrder: 2 },
          ],
        },
      },
    });

    console.log(`✓ Created 3 shipping zones with rates`);
  } else {
    console.log(`→ Shipping zones already exist (${zoneCount}), skipping`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
