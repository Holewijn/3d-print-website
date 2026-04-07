import type { Block } from "./blocks";

const API_BASE = process.env.INTERNAL_API_BASE || "http://localhost:3000";

export interface PageData {
  id: string;
  slug: string;
  title: string;
  content: { blocks: Block[] };
  seoTitle?: string;
  seoDesc?: string;
}

export async function getPage(slug: string): Promise<PageData | null> {
  try {
    const r = await fetch(`${API_BASE}/api/pages/${slug}`, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.content || !Array.isArray(data.content.blocks)) {
      data.content = { blocks: [] };
    }
    return data;
  } catch {
    return null;
  }
}
