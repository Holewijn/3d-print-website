"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Products() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ slug: "", name: "", description: "", priceCents: 0, stock: 0, images: [], active: true });
  const load = () => api("/products").then(setItems);
  useEffect(() => { load(); }, []);
  async function add() {
    await api("/products", { method: "POST", body: JSON.stringify(form) });
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await api(`/products/${id}`, { method: "DELETE" });
    load();
  }
  return (
    <div>
      <div className="card">
        <h1>Products</h1>
        <table>
          <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
          <tbody>{items.map(p => (
            <tr key={p.id}><td>{p.name}</td><td>€{(p.priceCents/100).toFixed(2)}</td><td>{p.stock}</td><td><button className="btn btn-danger" onClick={() => del(p.id)}>Delete</button></td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card">
        <h2>Add product</h2>
        <label>Slug</label><input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} />
        <label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <label>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <label>Price (cents)</label><input type="number" value={form.priceCents} onChange={e => setForm({...form, priceCents: +e.target.value})} />
        <label>Stock</label><input type="number" value={form.stock} onChange={e => setForm({...form, stock: +e.target.value})} />
        <button className="btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}
