"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const DEMO_PRODUCTS = [
  { id: "d1", name: "Articulated Dragon", description: "Fully posable print-in-place dragon", priceCents: 1995, image: "https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=400&q=80" },
  { id: "d2", name: "Geometric Vase", description: "Modern low-poly desk vase", priceCents: 1495, image: "https://images.unsplash.com/photo-1602874801006-94e1b3aa4b46?w=400&q=80" },
  { id: "d3", name: "Phone Stand", description: "Adjustable desk phone stand", priceCents: 995, image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&q=80" },
  { id: "d4", name: "Cable Organizer", description: "Set of 6 cable management clips", priceCents: 795, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
];

export default function Webshop() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/products")
      .then(p => setProducts(p.length ? p : DEMO_PRODUCTS))
      .catch(() => setProducts(DEMO_PRODUCTS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Shop</h1>
          <p>Ready-to-buy 3D printed products from our studio.</p>
        </div>
      </div>
      <section>
        <div className="container">
          {loading ? <p>Loading…</p> : (
            <div className="grid grid-4">
              {products.map(p => (
                <div className="product-card" key={p.id}>
                  <div className="img">
                    <img src={p.image || (p.images?.[0]) || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"} alt={p.name} />
                  </div>
                  <div className="body">
                    <h3>{p.name}</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{p.description}</p>
                    <div className="price">€{(p.priceCents / 100).toFixed(2)}</div>
                    <button className="btn" style={{ width: "100%" }}>Add to Cart</button>
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
