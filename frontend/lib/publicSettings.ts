const API_BASE = process.env.INTERNAL_API_BASE || "http://localhost:3000";

let cache: { data: Record<string, any>; ts: number } | null = null;
const TTL_MS = 30_000;

export async function getPublicSettings(): Promise<Record<string, any>> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  try {
    const r = await fetch(`${API_BASE}/api/settings/public`, { cache: "no-store" });
    if (!r.ok) return cache?.data || {};
    const data = await r.json();
    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return cache?.data || {};
  }
}

export interface MenuItem { label: string; href: string }
export interface FooterColumn { title: string; links: MenuItem[] }

export const DEFAULT_HEADER = {
  logoType: "text" as "text" | "image",
  logoText: "3D Print Studio",
  logoMark: "▲",
  logoUrl: "",
  menu: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services/" },
    { label: "Shop", href: "/webshop/" },
    { label: "Portfolio", href: "/portfolio/" },
    { label: "About", href: "/about/" },
    { label: "Contact", href: "/contact/" },
  ] as MenuItem[],
  ctaText: "Get a Quote",
  ctaHref: "/quote/",
  showCart: true,
  cartColor: "",
};

export const DEFAULT_FOOTER = {
  about: "Professional 3D printing services. From rapid prototypes to production runs, we bring your ideas to life with precision and quality.",
  columns: [
    { title: "Services", links: [{ label: "FDM Printing", href: "/services/" }, { label: "Resin Printing", href: "/services/" }, { label: "3D Modeling", href: "/services/" }, { label: "Get a Quote", href: "/quote/" }] },
    { title: "Company", links: [{ label: "About Us", href: "/about/" }, { label: "Portfolio", href: "/portfolio/" }, { label: "Contact", href: "/contact/" }, { label: "Login", href: "/login/" }] },
  ] as FooterColumn[],
  contactEmail: "info@3dprintstudio.local",
  contactPhone: "+31 (0) 10 123 4567",
  contactAddress: "Rotterdam, Netherlands",
  copyright: "© 3D Print Studio. All rights reserved.",
};
