"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import { useCart } from "../../../lib/cart";

export default function ProductDetail() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    if (!slug) return;
    api(`/products/${slug}`).then(setProduct).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return <div className="container" style={{ padding: "4rem 1rem", textAlign: "center" }}><h1>Product not found</h1><Link href="/webshop/" className="btn" style={{ marginTop: "1rem" }}>← Back to shop</Link></div>;
  if (!product) return <div className="container" style={{ padding: "4rem 1rem" }}>Loading…</div>;

  function addToCart() {
    add({
      productId: product.id, slug: product.slug, name: product.name,
      priceCents: product.priceCents, weightG: product.weightG || 100,
      image: product.images?.[0] || "", qty,
    });
  }

  return (
    <section style={{ padding: "3rem 0" }}>
      <div className="container">
        <Link href="/webshop/" style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "inline-block", marginBottom: "2rem" }}>← Back to shop</Link>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
          <div>
            <img src={product.images?.[0] || ""} alt={product.name} style={{ width: "100%", borderRadius: "var(--radius)", aspectRatio: "1", objectFit: "cover" }} />
          </div>
          <div>
            {product.category && <div style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>{product.category}</div>}
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "1rem" }}>{product.name}</h1>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginBottom: "1.5rem" }}>€{(product.priceCents / 100).toFixed(2)}</div>
            <p style={{ color: "var(--text-muted)", marginBottom: "2rem", lineHeight: 1.7 }}>{product.description}</p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: product.stock > 0 ? "var(--primary)" : "#dc2626" }}>
                {product.stock > 0 ? `✓ In stock (${product.stock})` : "Out of stock"}
              </span>
            </div>
            {product.stock > 0 && (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Qty:</label>
                <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--border)", borderRadius: 8 }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: "0.6rem 1rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}>−</button>
                  <span style={{ padding: "0 1rem", fontWeight: 700 }}>{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stock, qty + 1))} style={{ padding: "0.6rem 1rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}>+</button>
                </div>
              </div>
            )}
            <button className="btn btn-lg" style={{ width: "100%" }} onClick={addToCart} disabled={product.stock === 0}>
              {product.stock === 0 ? "Out of stock" : `Add to Cart — €${((product.priceCents * qty) / 100).toFixed(2)}`}
            </button>
            <div style={{ marginTop: "2rem", padding: "1rem", background: "var(--bg-soft)", borderRadius: 8, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <div>📦 Free shipping over €50 (NL)</div>
              <div>✓ Made-to-order, ships within 3 days</div>
              <div>↺ 14-day return policy</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
