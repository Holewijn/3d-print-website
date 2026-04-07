// Shared block schema for the CMS.
// Each page is { blocks: Block[] }. Add new block types here and they'll be
// available in both the renderer (frontend) and the editor (admin).

export type Block =
  | HeroBlock
  | StatsBlock
  | ServicesBlock
  | StepsBlock
  | PortfolioBlock
  | RichTextBlock
  | ImageBlock
  | CtaBlock
  | ContactInfoBlock
  | FaqBlock
  | TwoColumnBlock;

export interface HeroBlock {
  type: "hero";
  title: string;
  subtitle: string;
  backgroundImage: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
}

export interface StatsBlock {
  type: "stats";
  items: Array<{ value: string; label: string }>;
}

export interface ServicesBlock {
  type: "services";
  title: string;
  subtitle?: string;
  items: Array<{ icon: string; title: string; description: string }>;
}

export interface StepsBlock {
  type: "steps";
  title: string;
  subtitle?: string;
  items: Array<{ number: string; title: string; description: string }>;
}

export interface PortfolioBlock {
  type: "portfolio";
  title: string;
  subtitle?: string;
  items: Array<{ image: string; title: string; description: string }>;
  showViewAllButton?: boolean;
}

export interface RichTextBlock {
  type: "richtext";
  content: string; // markdown / plain text
  align?: "left" | "center";
}

export interface ImageBlock {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
}

export interface CtaBlock {
  type: "cta";
  title: string;
  buttonText: string;
  buttonHref: string;
}

export interface ContactInfoBlock {
  type: "contactinfo";
  email: string;
  phone: string;
  address: string;
  hours: string;
}

export interface FaqBlock {
  type: "faq";
  title: string;
  items: Array<{ question: string; answer: string }>;
}

export interface TwoColumnBlock {
  type: "twocolumn";
  title: string;
  body: string;
  imageUrl: string;
  imageRight?: boolean;
}

export const BLOCK_TYPE_LABELS: Record<Block["type"], string> = {
  hero: "Hero Section",
  stats: "Statistics Strip",
  services: "Services / Features Grid",
  steps: "Process Steps",
  portfolio: "Portfolio Gallery",
  richtext: "Rich Text",
  image: "Image",
  cta: "Call to Action",
  contactinfo: "Contact Information",
  faq: "FAQ",
  twocolumn: "Two Column (Text + Image)",
};

export function emptyBlock(type: Block["type"]): Block {
  switch (type) {
    case "hero": return { type, title: "Headline", subtitle: "Subtitle text", backgroundImage: "https://images.unsplash.com/photo-1631544114551-345e96fe7adf?w=1600&q=80", primaryButtonText: "Get Started", primaryButtonHref: "/quote/" };
    case "stats": return { type, items: [{ value: "100+", label: "Projects" }, { value: "12", label: "Materials" }, { value: "48h", label: "Turnaround" }, { value: "99%", label: "Satisfaction" }] };
    case "services": return { type, title: "Our Services", subtitle: "What we do", items: [{ icon: "⚙", title: "Service One", description: "Description" }] };
    case "steps": return { type, title: "How It Works", items: [{ number: "1", title: "Step", description: "Description" }] };
    case "portfolio": return { type, title: "Featured Projects", items: [{ image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80", title: "Project", description: "Description" }] };
    case "richtext": return { type, content: "Add your text here.", align: "left" };
    case "image": return { type, src: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80", alt: "Image" };
    case "cta": return { type, title: "Ready to start?", buttonText: "Get in Touch", buttonHref: "/contact/" };
    case "contactinfo": return { type, email: "info@example.com", phone: "+31 10 123 4567", address: "Some Street 123\n3000 AB Rotterdam", hours: "Mon–Fri 9:00–18:00" };
    case "faq": return { type, title: "Frequently Asked Questions", items: [{ question: "Question?", answer: "Answer." }] };
    case "twocolumn": return { type, title: "About", body: "Text content here.", imageUrl: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80", imageRight: true };
  }
}
