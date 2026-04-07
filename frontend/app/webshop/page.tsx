"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useCart } from "../../lib/cart";

export default function Webshop() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    api("/products/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    api(`/products?${params}`).then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false));
  }, [category, search]);

  function quickAdd(p: any) {
    add({
      productId: p.id, slug: p.slug, name: p.name,
      priceCents: p.priceCents, weightG: p.weightG || 100,
      image: p.images?.[0] || "",
      qty: 1,
    });
  }

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Shop</h1>
          <p>3D printed products from our studio.</p>
        </div>
      </div>

      <section>
        <div className="container">
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            <input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: "0.75rem 1rem", border: "1.5px solid var(--border)", borderRadius: 8 }}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "0.75rem 1rem", border: "1.5px solid var(--border)", borderRadius: 8, minWidth: 180 }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? <p>Loading…</p> : products.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>No products found.</p>
          ) : (
            <div className="grid grid-4">
              {products.map((p) => (
                <div className="product-card" key={p.id}>
                  <Link href={`/webshop/${p.slug}/`}>
                    <div className="img"><img src={p.images?.[0] || ""} alt={p.name} /></div>
                  </Link>
                  <div className="body">
                    <Link href={`/webshop/${p.slug}/`}><h3>{p.name}</h3></Link>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.25rem 0 0.5rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.description}</p>
                    <div className="price">€{(p.priceCents / 100).toFixed(2)}</div>
                    <button className="btn" style={{ width: "100%" }} onClick={() => quickAdd(p)} disabled={p.stock === 0}>
                      {p.stock === 0 ? "Out of stock" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
