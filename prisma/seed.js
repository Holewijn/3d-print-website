// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  // ─── Admin user ──────────────────────────────────────
  const email = process.env.ADMIN_EMAIL || "admin@local";
  const password = process.env.ADMIN_PASSWORD || "changeme";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN" },
  });

  // ─── Settings ────────────────────────────────────────
  const defaults = [
    { key: "site.title", value: "3D Print Studio" },
    { key: "site.logoText", value: "3D Print Studio" },
    { key: "site.logoUrl", value: "" },
    { key: "site.faviconUrl", value: "" },
    { key: "site.contactEmail", value: "info@3dprintstudio.local" },
    { key: "site.contactPhone", value: "+31 (0) 10 123 4567" },
    { key: "site.address", value: "Rotterdam, Netherlands" },
    { key: "site.footer", value: "© 3D Print Studio" },
    { key: "seo.defaultTitle", value: "3D Print Studio — Professional 3D Printing Services" },
    { key: "seo.defaultDesc", value: "Custom 3D printing services. Upload your STL, get an instant quote, and we'll print it for you." },
    { key: "energy.provider", value: "manual" },
    { key: "energy.priceKwh", value: 0.30 },
    { key: "mollie.apiKey", value: "" },
    { key: "pricing.marginPct", value: 25 },
    { key: "pricing.defaultMachineCostHourCents", value: 200 },
    { key: "pricing.minOrderCents", value: 500 },
  ];
  for (const s of defaults) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  // ─── Pages with default block content ────────────────
  const pages = [
    {
      slug: "home",
      title: "Home",
      content: {
        blocks: [
          {
            type: "hero",
            title: "Professional\n3D Printing Services",
            subtitle: "Bringing your ideas to life with precision and quality. Upload your design, get an instant quote, and we'll handle the rest.",
            backgroundImage: "https://images.unsplash.com/photo-1631544114551-345e96fe7adf?w=1600&q=80",
            primaryButtonText: "Get a Quote",
            primaryButtonHref: "/quote/",
            secondaryButtonText: "View Portfolio",
            secondaryButtonHref: "/portfolio/",
          },
          {
            type: "stats",
            items: [
              { value: "500+", label: "Projects Completed" },
              { value: "12", label: "Materials Available" },
              { value: "48h", label: "Average Turnaround" },
              { value: "99%", label: "Customer Satisfaction" },
            ],
          },
          {
            type: "services",
            title: "Our Services",
            subtitle: "From rapid prototyping to small-batch production, we offer a complete range of 3D printing solutions.",
            items: [
              { icon: "⚙", title: "Rapid Prototyping", description: "Quickly bring your concepts to life with fast iteration cycles and detailed prototypes." },
              { icon: "▲", title: "Custom 3D Printing", description: "Tailored printing solutions for your unique needs in PLA, PETG, ABS, TPU and more." },
              { icon: "✎", title: "3D Design & Modeling", description: "Expert CAD design and 3D modeling services to turn your ideas into print-ready files." },
            ],
          },
          {
            type: "steps",
            title: "How It Works",
            subtitle: "Get from idea to printed object in four simple steps.",
            items: [
              { number: "1", title: "Upload STL", description: "Drop your 3D model file into our quote tool." },
              { number: "2", title: "Get Quote", description: "Instant pricing based on material, time, and complexity." },
              { number: "3", title: "We Print", description: "Your design is printed on our calibrated machines." },
              { number: "4", title: "Delivery", description: "Receive your finished part within days." },
            ],
          },
          {
            type: "portfolio",
            title: "Featured Projects",
            subtitle: "A small selection of recent work from our studio.",
            showViewAllButton: true,
            items: [
              { image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80", title: "Robotic Hand", description: "Functional prosthetic prototype with articulated fingers." },
              { image: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600&q=80", title: "Miniature Architecture", description: "Detailed scale model of a modern building complex." },
              { image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&q=80", title: "Custom Drone Frame", description: "Lightweight quadcopter frame designed for racing." },
            ],
          },
          {
            type: "cta",
            title: "Ready to start your next 3D printing project?",
            buttonText: "Get Started",
            buttonHref: "/quote/",
          },
        ],
      },
    },
    {
      slug: "services",
      title: "Our Services",
      content: {
        blocks: [
          {
            type: "services",
            title: "What We Offer",
            subtitle: "Complete 3D printing and design services for makers, businesses, and creators.",
            items: [
              { icon: "▲", title: "FDM Printing", description: "Fused deposition modeling for durable parts in PLA, PETG, ABS, ASA, TPU and engineering plastics. Build volumes up to 300×300×400mm." },
              { icon: "◆", title: "Resin Printing", description: "SLA/MSLA for ultra-detailed miniatures, jewelry masters, and dental models. Layer heights down to 25 microns." },
              { icon: "✎", title: "3D Modeling", description: "Custom CAD design from sketches, photos, or descriptions. Reverse engineering and file repair also available." },
              { icon: "⚙", title: "Rapid Prototyping", description: "Quick-turn iterations for product development. Same-day printing on small parts when capacity allows." },
              { icon: "⊞", title: "Small Batch Production", description: "Print runs of 10-500 parts with consistent quality. Ideal for kickstarter fulfillment and limited editions." },
              { icon: "✦", title: "Post-Processing", description: "Sanding, priming, painting, and assembly services to finish your parts to spec." },
            ],
          },
          {
            type: "cta",
            title: "Not sure which service fits your project?",
            buttonText: "Talk to Us",
            buttonHref: "/contact/",
          },
        ],
      },
    },
    {
      slug: "portfolio",
      title: "Portfolio",
      content: {
        blocks: [
          {
            type: "portfolio",
            title: "Selected Work",
            subtitle: "A selection of projects we've brought to life — from prototypes to finished products.",
            items: [
              { image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80", title: "Robotic Hand", description: "Functional prosthetic prototype" },
              { image: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600&q=80", title: "Architecture Model", description: "Scale building complex" },
              { image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&q=80", title: "Drone Frame", description: "Custom racing quadcopter" },
              { image: "https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=600&q=80", title: "Cosplay Helmet", description: "Wearable sci-fi prop" },
              { image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&q=80", title: "Mechanical Gears", description: "Working planetary gearbox" },
              { image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80", title: "Custom Enclosure", description: "Electronics housing prototype" },
            ],
          },
        ],
      },
    },
    {
      slug: "about",
      title: "About Us",
      content: {
        blocks: [
          {
            type: "twocolumn",
            title: "Built by makers, for makers",
            body: "3D Print Studio started as a single printer in a garage and grew into a full-service print shop. We work with hobbyists, designers, engineers, and businesses to turn digital files into physical reality.\n\nEvery print is calibrated, inspected, and packaged by hand. We don't outsource and we don't cut corners — because we know how much your project means to you.\n\nWhether you need one custom part or a hundred, we'd love to work with you.",
            imageUrl: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80",
            imageRight: true,
          },
          {
            type: "services",
            title: "Our Values",
            items: [
              { icon: "✓", title: "Quality First", description: "Every print is inspected before it leaves the shop. If it's not right, we reprint it." },
              { icon: "⚡", title: "Fast Turnaround", description: "Most orders ship within 48-72 hours. Rush service available for time-sensitive projects." },
              { icon: "♻", title: "Sustainable", description: "We recycle failed prints and source biodegradable PLA whenever possible." },
            ],
          },
          {
            type: "cta",
            title: "Have a project in mind? Let's talk.",
            buttonText: "Contact Us",
            buttonHref: "/contact/",
          },
        ],
      },
    },
    {
      slug: "contact",
      title: "Get in Touch",
      content: {
        blocks: [
          {
            type: "contactinfo",
            email: "info@3dprintstudio.local",
            phone: "+31 (0) 10 123 4567",
            address: "Some Street 123\n3000 AB Rotterdam\nNetherlands",
            hours: "Mon–Fri: 9:00–18:00\nSat: 10:00–14:00\nSun: Closed",
          },
        ],
      },
    },
  ];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: { title: p.title, content: p.content }, // overwrite content on every seed
      create: p,
    });
  }

  console.log(`✓ Seeded admin: ${email}`);
  console.log(`✓ Seeded ${pages.length} pages with block content`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
