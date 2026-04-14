"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../../lib/api";
import { useCart } from "../../../lib/cart";

// Icons for auto-matched section headings
const SECTION_ICONS: Record<string, string> = {
  features: "✓",   kenmerken: "✓",   specs: "✓",  specifications: "✓",
  assembly: "🔧",  montage: "🔧",    installation: "🔧",
  audience: "👥", doelgroep: "👥",  "target audience": "👥", voor: "👥",
  result: "✨",   resultaat: "✨",  outcome: "✨",
  included: "📦", "in the box": "📦", inhoud: "📦",
};

function iconForSection(title: string): string {
  const t = title.toLowerCase().trim();
  for (const key of Object.keys(SECTION_ICONS)) {
    if (t.includes(key)) return SECTION_ICONS[key];
  }
  return "▸";
}

/**
 * Split a markdown string on `## Heading` lines into sections.
 * The text before the first `##` is treated as "lead" (short description).
 */
function splitSections(md: string): { lead: string; sections: Array<{ title: string; body: string }> } {
  if (!md) return { lead: "", sections: [] };
  const lines = md.split("\n");
  const sections: Array<{ title: string; body: string }> = [];
  let leadLines: string[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (current) sections.push({ title: current.title, body: current.body.join("\n").trim() });
      current = { title: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      leadLines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, body: current.body.join("\n").trim() });

  return { lead: leadLines.join("\n").trim(), sections };
}

export default function ProductDetail() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    if (!slug) return;
    api(`/products/${slug}`).then(setProduct).catch(() => setNotFound(true));
  }, [slug]);

  const { lead, sections } = useMemo(
    () => splitSections(product?.description || ""),
    [product?.description],
  );

  const images: string[] = useMemo(() => {
    if (!product) return [];
    const imgs = Array.isArray(product.images) ? product.images : [];
    return imgs.filter(Boolean);
  }, [product]);

  if (notFound) return (
    <div className="container" style={{ padding: "4rem 1rem", textAlign: "center" }}>
      <h1>Product not found</h1>
      <Link href="/webshop/" className="btn" style={{ marginTop: "1rem" }}>← Back to shop</Link>
    </div>
  );
  if (!product) return <div className="container" style={{ padding: "4rem 1rem" }}>Loading…</div>;

  // Stock logic — respect trackStock flag
  const trackStock = product.trackStock !== false; // default true
  const inStock = !trackStock || product.stock > 0;
  const maxQty = trackStock ? Math.max(1, product.stock) : 99;

  function addToCart() {
    add({
      productId: product.id, slug: product.slug, name: product.name,
      priceCents: product.priceCents, weightG: product.weightG || 100,
      image: images[0] || "", qty,
    });
  }

  return (
    <section style={{ padding: "3rem 0", background: "var(--bg-soft, #f9fafb)" }}>
      <div className="container">
        <Link href="/webshop/" style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "inline-block", marginBottom: "1.5rem" }}>
          ← Back to shop
        </Link>

        {/* Hero: images + buy box */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "3rem" }}>
            {/* Image column */}
            <div>
              <div style={{
                background: "var(--bg-soft, #f9fafb)",
                borderRadius: 12,
                aspectRatio: "1",
                display: "grid",
                placeItems: "center",
                padding: "1rem",
                marginBottom: images.length > 1 ? "1rem" : 0,
              }}>
                {images[activeImage] ? (
                  <img
                    src={images[activeImage]}
                    alt={product.name}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No image</div>
                )}
              </div>
              {images.length > 1 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      style={{
                        width: 72, height: 72,
                        borderRadius: 8,
                        border: i === activeImage ? "2px solid var(--primary, #2563eb)" : "2px solid transparent",
                        padding: 2,
                        background: "var(--bg-soft, #f9fafb)",
                        cursor: "pointer",
                      }}
                    >
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Buy box */}
            <div>
              {product.category && (
                <div style={{ color: "var(--primary, #2563eb)", fontWeight: 600, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  {product.category}
                </div>
              )}
              <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem", lineHeight: 1.2 }}>
                {product.name}
              </h1>

              {/* Lead / short description (everything before the first ##) */}
              {lead && (
                <div style={{ fontSize: "1rem", color: "var(--text-muted, #6b7280)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{lead}</ReactMarkdown>
                </div>
              )}

              {/* Price */}
              <div style={{
                background: "var(--primary-soft, #eff6ff)",
                border: "2px solid var(--primary, #2563eb)",
                borderRadius: 10,
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
              }}>
                <div style={{ fontSize: "0.75rem", color: "var(--primary, #2563eb)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                  Price
                </div>
                <div style={{ fontSize: "2.25rem", fontWeight: 900, color: "var(--primary, #2563eb)", lineHeight: 1.1 }}>
                  €{(product.priceCents / 100).toFixed(2)}
                </div>
              </div>

              {/* Stock status */}
              <div style={{ marginBottom: "1.25rem", fontSize: "0.9rem" }}>
                {inStock ? (
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>
                    ✓ {trackStock ? `In stock (${product.stock})` : "Available — made to order"}
                  </span>
                ) : (
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>Out of stock</span>
                )}
              </div>

              {inStock && (
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
                  <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Qty:</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--border, #e5e7eb)", borderRadius: 8 }}>
                    <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: "0.5rem 0.9rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}>−</button>
                    <span style={{ padding: "0 0.9rem", fontWeight: 700, minWidth: 30, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => setQty(Math.min(maxQty, qty + 1))} style={{ padding: "0.5rem 0.9rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}>+</button>
                  </div>
                </div>
              )}

              <button className="btn btn-lg" style={{ width: "100%", fontSize: "1rem" }} onClick={addToCart} disabled={!inStock}>
                {!inStock ? "Out of stock" : `Add to Cart — €${((product.priceCents * qty) / 100).toFixed(2)}`}
              </button>

              {/* Trust row */}
              <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--bg-soft, #f9fafb)", borderRadius: 8, fontSize: "0.82rem", color: "var(--text-muted, #6b7280)", display: "grid", gap: "0.35rem" }}>
                <div>📦 Free shipping over €50 (NL)</div>
                <div>✓ Made-to-order, ships within 3 days</div>
                <div>↺ 14-day return policy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section cards */}
        {sections.length > 0 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {sections.map((sec, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: 0, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>{iconForSection(sec.title)}</span>
                  {sec.title}
                </h2>
                <div className="prose-product" style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--text, #1f2937)" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.body}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scoped list styling for the markdown */}
      <style jsx global>{`
        .prose-product ul { padding-left: 0; list-style: none; margin: 0.5rem 0; }
        .prose-product ul li {
          padding-left: 1.5rem;
          position: relative;
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .prose-product ul li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: var(--primary, #2563eb);
          font-weight: 700;
        }
        .prose-product ol { padding-left: 1.25rem; margin: 0.5rem 0; }
        .prose-product ol li { margin-bottom: 0.5rem; line-height: 1.6; }
        .prose-product p { margin: 0.5rem 0; }
        .prose-product strong { color: var(--text, #1f2937); }
        .prose-product h3 {
          font-size: 1.05rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </section>
  );
}
