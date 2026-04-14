"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney } from "../../lib/api";
import ImagePicker from "../../components/ImagePicker";

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
          <button className="btn" onClick={() => setEditing({
            slug: "", name: "", description: "", priceCents: 0, weightG: 100,
            stock: 0, trackStock: true, category: "", images: [], active: true,
          })}>+ New Product</button>
        </div>
        {products.length === 0 ? (
          <div className="empty"><div className="icon">▣</div><p>No products yet.</p></div>
        ) : (
          <table>
            <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Weight</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{Array.isArray(p.images) && p.images[0] && <img src={p.images[0]} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }} />}</td>
                  <td><strong>{p.name}</strong>{Array.isArray(p.images) && p.images.length > 1 && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: "0.4rem" }}>+{p.images.length - 1} img</span>}</td>
                  <td>{p.category || "—"}</td>
                  <td>{fmtMoney(p.priceCents)}</td>
                  <td>{p.weightG}g</td>
                  <td>{p.trackStock === false ? <span style={{ color: "var(--text-muted)" }}>—</span> : p.stock}</td>
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
    weightG: product.weightG || 100,
    stock: product.stock || 0,
    trackStock: product.trackStock !== false,
    category: product.category || "",
    images: Array.isArray(product.images) ? [...product.images] : [],
    active: product.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = !product.id;

  async function save() {
    setBusy(true); setErr("");
    try {
      const body = {
        slug: f.slug, name: f.name, description: f.description,
        priceCents: +f.priceCents, weightG: +f.weightG,
        stock: f.trackStock ? +f.stock : 0,
        trackStock: f.trackStock,
        category: f.category || null,
        images: f.images.filter(Boolean),
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

  // ─── Image list management ───
  function addImage() { setF({ ...f, images: [...f.images, ""] }); }
  function updateImage(i: number, url: string) {
    const next = [...f.images];
    next[i] = url;
    setF({ ...f, images: next });
  }
  function removeImage(i: number) {
    setF({ ...f, images: f.images.filter((_, idx) => idx !== i) });
  }
  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= f.images.length) return;
    const next = [...f.images];
    [next[i], next[j]] = [next[j], next[i]];
    setF({ ...f, images: next });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "New Product" : `Edit: ${product.name}`}</h3>
        <div className="form">
          <div className="form-row">
            <div><label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><label>Slug</label><input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
          </div>
          <div>
            <label>Description (Markdown)</label>
            <textarea
              rows={10}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              placeholder={"Write a short lead paragraph here.\n\n## Features\n- Bullet point 1\n- Bullet point 2\n\n## Assembly\nStep-by-step instructions…\n\n## Target Audience\nWho is this for?\n\n## Result\nWhat do you get?"}
              style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.82rem" }}
            />
            <div className="help">
              Text before the first <code>## Heading</code> becomes the short description shown next to the price.
              Each <code>## Heading</code> becomes a styled card on the product page. Use <code>-</code> for bullet points.
              Recognized section icons: Features/Kenmerken, Assembly/Montage, Audience/Doelgroep, Result/Resultaat, Included/Inhoud.
            </div>
          </div>
          <div><label>Category</label><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Toys, Home, Office…" /></div>

          {/* Image list */}
          <div>
            <label>Product Images ({f.images.length})</label>
            {f.images.length === 0 && <div className="help">No images yet. Click "+ Add Image" below.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {f.images.map((img, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", background: "var(--bg-elev-2)", padding: "0.75rem", borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <ImagePicker
                      value={img}
                      onChange={(v) => updateImage(i, v)}
                      help={i === 0 ? "Main image (shown first)" : `Image ${i + 1}`}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => moveImage(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => moveImage(i, 1)} disabled={i === f.images.length - 1}>↓</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeImage(i)}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={addImage} style={{ marginTop: "0.5rem" }}>+ Add Image</button>
          </div>

          <div className="form-row">
            <div><label>Price (cents)</label><input type="number" value={f.priceCents} onChange={(e) => setF({ ...f, priceCents: +e.target.value })} /></div>
            <div><label>Weight (grams)</label><input type="number" value={f.weightG} onChange={(e) => setF({ ...f, weightG: +e.target.value })} /></div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={f.trackStock} onChange={(e) => setF({ ...f, trackStock: e.target.checked })} style={{ width: "auto", margin: 0 }} />
              <span>Track stock for this product</span>
            </label>
            <div className="help">
              When unchecked, this product is <strong>always available</strong> (made-to-order) and the stock count is ignored.
              Use this for products you print on demand without keeping inventory.
            </div>
          </div>

          {f.trackStock && (
            <div className="form-row">
              <div><label>Stock</label><input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: +e.target.value })} /></div>
              <div style={{ display: "flex", alignItems: "end" }}>
                <label><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active (visible in shop)</label>
              </div>
            </div>
          )}
          {!f.trackStock && (
            <div>
              <label><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active (visible in shop)</label>
            </div>
          )}

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
