"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Inventory() {
  const [brands, setBrands] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", material: "PLA", colorHex: "#ffffff", pricePerKgCents: 2500, densityGcm3: 1.24, whereToBuyUrl: "", stockGrams: 0, active: true });
  const load = () => api("/inventory/brands").then(setBrands);
  useEffect(() => { load(); }, []);
  async function add() {
    await api("/inventory/brands", { method: "POST", body: JSON.stringify(form) });
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await api(`/inventory/brands/${id}`, { method: "DELETE" });
    load();
  }
  return (
    <div>
      <div className="card">
        <h1>Filament Inventory</h1>
        <table>
          <thead><tr><th>Brand</th><th>Material</th><th>Stock (g)</th><th>€/kg</th><th>Where to buy</th><th></th></tr></thead>
          <tbody>{brands.map(b => (
            <tr key={b.id}>
              <td>{b.name}</td><td>{b.material}</td><td>{b.stockGrams}</td><td>€{(b.pricePerKgCents/100).toFixed(2)}</td>
              <td>{b.whereToBuyUrl && <a href={b.whereToBuyUrl} target="_blank">link</a>}</td>
              <td><button className="btn btn-danger" onClick={() => del(b.id)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card">
        <h2>Add brand</h2>
        <label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <label>Material</label><input value={form.material} onChange={e => setForm({...form, material: e.target.value})} />
        <label>Color</label><input type="color" value={form.colorHex} onChange={e => setForm({...form, colorHex: e.target.value})} />
        <label>Price per kg (cents)</label><input type="number" value={form.pricePerKgCents} onChange={e => setForm({...form, pricePerKgCents: +e.target.value})} />
        <label>Density (g/cm³)</label><input type="number" step="0.01" value={form.densityGcm3} onChange={e => setForm({...form, densityGcm3: +e.target.value})} />
        <label>Where to buy URL</label><input value={form.whereToBuyUrl} onChange={e => setForm({...form, whereToBuyUrl: e.target.value})} />
        <label>Stock (grams)</label><input type="number" value={form.stockGrams} onChange={e => setForm({...form, stockGrams: +e.target.value})} />
        <button className="btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}
