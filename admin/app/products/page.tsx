"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney } from "../../lib/api";

export default function ProductsAdmin() {
  const [products, setProducts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const list = await api("/products").catch(() => []);
    setProducts(list);
  }
  useEffect(() => { load(); }, []);

  return (
    <Shell title="Products" subtitle="Manage your webshop">
      <div className="panel">
        <div className="panel-head">
          <h3>All Products ({products.length})</h3>
          <button className="btn" onClick={() => setEditing({ slug: "", name: "", description: "", priceCents: 0, stock: 0, images: [], active: true })}>+ New Product</button>
        </div>
        {products.length === 0 ? (
          <div className="empty"><div className="icon">▣</div><p>No products yet.</p></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td><code style={{ color: "var(--text-muted)" }}>{p.slug}</code></td>
                  <td>{fmtMoney(p.priceCents)}</td>
                  <td>{p.stock}</td>
                  <td><span className={`badge ${p.active ? "badge-success" : "badge-muted"}`}>{p.active ? "Active" : "Hidden"}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <ProductEditor product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Shell>
  );
}

function ProductEditor({ product, onClose, onSaved }: any) {
  const [f, setF] = useState({
    slug: product.slug || "",
    name: product.name || "",
    description: product.description || "",
    priceCents: product.priceCents || 0,
    stock: product.stock || 0,
    imageUrl: Array.isArray(product.images) && product.images[0] ? product.images[0] : "",
    active: product.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = !product.id;

  async function save() {
    setBusy(true); setErr("");
    try {
      const body = {
        slug: f.slug,
        name: f.name,
        description: f.description,
        priceCents: +f.priceCents,
        stock: +f.stock,
        images: f.imageUrl ? [f.imageUrl] : [],
        active: f.active,
      };
      if (isNew) await api("/products", { method: "POST", body: JSON.stringify(body) });
      else await api(`/products/${product.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function del() {
    if (!confirm(`Delete "${f.name}"?`)) return;
    await api(`/products/${product.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isNew ? "New Product" : `Edit: ${product.name}`}</h3>
        <div className="form">
          <div className="form-row">
            <div><label>Name</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
            <div><label>Slug</label><input value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} /></div>
          </div>
          <div><label>Description</label><textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
          <div className="form-row">
            <div><label>Price (cents)</label><input type="number" value={f.priceCents} onChange={e => setF({ ...f, priceCents: +e.target.value })} /></div>
            <div><label>Stock</label><input type="number" value={f.stock} onChange={e => setF({ ...f, stock: +e.target.value })} /></div>
          </div>
          <div><label>Image URL</label><input value={f.imageUrl} onChange={e => setF({ ...f, imageUrl: e.target.value })} placeholder="https://…" /></div>
          <div><label><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active (visible in shop)</label></div>
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
