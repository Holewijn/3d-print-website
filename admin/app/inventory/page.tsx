"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney } from "../../lib/api";

export default function InventoryAdmin() {
  const [brands, setBrands] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const list = await api("/inventory/brands").catch(() => []);
    setBrands(list);
  }
  useEffect(() => { load(); }, []);

  async function adjust(id: string, delta: number) {
    await api(`/inventory/brands/${id}/adjust`, { method: "POST", body: JSON.stringify({ delta }) });
    load();
  }

  return (
    <Shell title="Inventory" subtitle="Manage filament brands & stock">
      <div className="panel">
        <div className="panel-head">
          <h3>Filament Brands ({brands.length})</h3>
          <button className="btn" onClick={() => setEditing({ name: "", material: "PLA", colorHex: "#000000", pricePerKgCents: 2500, densityGcm3: 1.24, whereToBuyUrl: "", stockGrams: 0, active: true })}>+ New Brand</button>
        </div>
        {brands.length === 0 ? (
          <div className="empty"><div className="icon">◉</div><p>No filament brands configured.</p></div>
        ) : (
          <table>
            <thead><tr><th>Brand</th><th>Material</th><th>Color</th><th>Price/kg</th><th>Stock</th><th>Where to Buy</th><th></th></tr></thead>
            <tbody>
              {brands.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td>{b.material}</td>
                  <td><span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 4, background: b.colorHex || "#666", verticalAlign: "middle" }} /> {b.colorHex || "—"}</td>
                  <td>{fmtMoney(b.pricePerKgCents)}</td>
                  <td>
                    <strong>{b.stockGrams}g</strong>
                    <span style={{ marginLeft: "0.5rem" }}>
                      <button className="btn btn-sm btn-outline" onClick={() => adjust(b.id, 1000)}>+1kg</button>{" "}
                      <button className="btn btn-sm btn-outline" onClick={() => adjust(b.id, -100)}>−100g</button>
                    </span>
                  </td>
                  <td>{b.whereToBuyUrl ? <a href={b.whereToBuyUrl} target="_blank" style={{ color: "var(--primary)" }}>Link →</a> : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(b)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <BrandEditor brand={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Shell>
  );
}

function BrandEditor({ brand, onClose, onSaved }: any) {
  const [f, setF] = useState({ ...brand });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = !brand.id;

  async function save() {
    setBusy(true); setErr("");
    try {
      const body = {
        name: f.name, material: f.material, colorHex: f.colorHex,
        pricePerKgCents: +f.pricePerKgCents, densityGcm3: +f.densityGcm3,
        whereToBuyUrl: f.whereToBuyUrl, stockGrams: +f.stockGrams, active: f.active,
      };
      if (isNew) await api("/inventory/brands", { method: "POST", body: JSON.stringify(body) });
      else await api(`/inventory/brands/${brand.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function del() {
    if (!confirm(`Delete brand "${f.name}"?`)) return;
    await api(`/inventory/brands/${brand.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isNew ? "New Filament Brand" : `Edit: ${brand.name}`}</h3>
        <div className="form">
          <div className="form-row">
            <div><label>Brand Name</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
            <div>
              <label>Material</label>
              <select value={f.material} onChange={e => setF({ ...f, material: e.target.value })}>
                <option>PLA</option><option>PETG</option><option>ABS</option><option>ASA</option><option>TPU</option><option>Nylon</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div><label>Color</label><input type="color" value={f.colorHex || "#000000"} onChange={e => setF({ ...f, colorHex: e.target.value })} /></div>
            <div><label>Density (g/cm³)</label><input type="number" step={0.01} value={f.densityGcm3} onChange={e => setF({ ...f, densityGcm3: +e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div><label>Price per kg (cents)</label><input type="number" value={f.pricePerKgCents} onChange={e => setF({ ...f, pricePerKgCents: +e.target.value })} /></div>
            <div><label>Stock (grams)</label><input type="number" value={f.stockGrams} onChange={e => setF({ ...f, stockGrams: +e.target.value })} /></div>
          </div>
          <div><label>Where to Buy URL</label><input value={f.whereToBuyUrl || ""} onChange={e => setF({ ...f, whereToBuyUrl: e.target.value })} /></div>
          <div><label><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active</label></div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>{!isNew && <button className="btn btn-danger btn-sm" onClick={del}>Delete</button>}</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
