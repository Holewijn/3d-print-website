// Mirror of frontend/lib/blocks.ts so the admin can build/edit blocks.
// Keep these in sync if you add new block types.

export type Block =
  | { type: "hero"; title: string; subtitle: string; backgroundImage: string; primaryButtonText?: string; primaryButtonHref?: string; secondaryButtonText?: string; secondaryButtonHref?: string }
  | { type: "stats"; items: Array<{ value: string; label: string }> }
  | { type: "services"; title: string; subtitle?: string; items: Array<{ icon: string; title: string; description: string }> }
  | { type: "steps"; title: string; subtitle?: string; items: Array<{ number: string; title: string; description: string }> }
  | { type: "portfolio"; title: string; subtitle?: string; showViewAllButton?: boolean; items: Array<{ image: string; title: string; description: string }> }
  | { type: "richtext"; content: string; align?: "left" | "center" }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "cta"; title: string; buttonText: string; buttonHref: string }
  | { type: "contactinfo"; email: string; phone: string; address: string; hours: string }
  | { type: "faq"; title: string; items: Array<{ question: string; answer: string }> }
  | { type: "twocolumn"; title: string; body: string; imageUrl: string; imageRight?: boolean };

export type BlockType = Block["type"];

export const BLOCK_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: "hero",        label: "Hero Section",      icon: "▦" },
  { type: "stats",       label: "Statistics Strip",  icon: "≡" },
  { type: "services",    label: "Services Grid",     icon: "⚙" },
  { type: "steps",       label: "Process Steps",     icon: "→" },
  { type: "portfolio",   label: "Portfolio Gallery", icon: "▣" },
  { type: "twocolumn",   label: "Two Column",        icon: "⊞" },
  { type: "richtext",    label: "Rich Text",         icon: "¶" },
  { type: "image",       label: "Image",             icon: "▭" },
  { type: "cta",         label: "Call to Action",    icon: "✦" },
  { type: "contactinfo", label: "Contact Info",      icon: "✉" },
  { type: "faq",         label: "FAQ",               icon: "?" },
];

export function emptyBlock(type: BlockType): Block {
  switch (type) {
    case "hero": return { type, title: "Headline", subtitle: "Subtitle text", backgroundImage: "https://images.unsplash.com/photo-1631544114551-345e96fe7adf?w=1600&q=80", primaryButtonText: "Get Started", primaryButtonHref: "/quote/" };
    case "stats": return { type, items: [{ value: "100+", label: "Projects" }] };
    case "services": return { type, title: "Our Services", subtitle: "What we do", items: [{ icon: "⚙", title: "Service", description: "Description" }] };
    case "steps": return { type, title: "How It Works", items: [{ number: "1", title: "Step", description: "Description" }] };
    case "portfolio": return { type, title: "Featured Work", items: [{ image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80", title: "Project", description: "Description" }] };
    case "richtext": return { type, content: "Add your text here.", align: "left" };
    case "image": return { type, src: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80", alt: "Image" };
    case "cta": return { type, title: "Ready to start?", buttonText: "Get in Touch", buttonHref: "/contact/" };
    case "contactinfo": return { type, email: "info@example.com", phone: "+31 10 123 4567", address: "Some Street 123\n3000 AB Rotterdam", hours: "Mon–Fri 9:00–18:00" };
    case "faq": return { type, title: "FAQ", items: [{ question: "Question?", answer: "Answer." }] };
    case "twocolumn": return { type, title: "About Us", body: "Text content here.", imageUrl: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80", imageRight: true };
  }
}
