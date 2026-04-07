"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => { api("/products").then(setProducts).catch(() => {}); }, []);
  return (
    <div>
      <h1>Webshop</h1>
      <div className="grid">
        {products.map(p => (
          <div key={p.id} className="card">
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <strong>€{(p.priceCents / 100).toFixed(2)}</strong>
          </div>
        ))}
        {products.length === 0 && <p>No products yet.</p>}
      </div>
    </div>
  );
}
