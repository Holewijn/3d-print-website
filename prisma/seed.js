// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@local";
  const password = process.env.ADMIN_PASSWORD || "changeme";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN" }
  });

  const defaults = [
    { key: "site.title", value: "3D Print Studio" },
    { key: "site.logoText", value: "3D Print" },
    { key: "site.logoUrl", value: "" },
    { key: "site.faviconUrl", value: "" },
    { key: "site.contactEmail", value: "info@local" },
    { key: "site.contactPhone", value: "" },
    { key: "site.address", value: "" },
    { key: "site.footer", value: "© 3D Print Studio" },
    { key: "seo.defaultTitle", value: "3D Print Studio" },
    { key: "seo.defaultDesc", value: "Custom 3D printing services" },
    { key: "energy.provider", value: "manual" },
    { key: "energy.priceKwh", value: 0.30 },
    { key: "mollie.apiKey", value: "" },
    { key: "pricing.marginPct", value: 25 },
    { key: "pricing.minOrderCents", value: 500 }
  ];
  for (const s of defaults) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s
    });
  }

  const pages = [
    { slug: "home", title: "Home", content: { blocks: [{ type: "hero", text: "Welcome" }] } },
    { slug: "services", title: "Services", content: { blocks: [] } },
    { slug: "portfolio", title: "Portfolio", content: { blocks: [] } },
    { slug: "about", title: "About", content: { blocks: [] } },
    { slug: "contact", title: "Contact", content: { blocks: [] } }
  ];
  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: p
    });
  }

  console.log(`Seeded admin: ${email}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
