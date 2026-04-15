"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney } from "../../lib/api";
import ImagePicker from "../../components/ImagePicker";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import { TableSkeleton } from "../../components/Skeleton";

// ─── Constants ────────────────────────────────────────────

const PAGE_SIZE = 25;

type SortKey = "name" | "priceCents" | "stock" | "active";
type SortDir = "asc" | "desc";

// ─── Page ─────────────────────────────────────────────────

export default function ProductsAdmin() {
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<any>(null);

  // search + sort + page
  const [search,  setSearch]   = useState("");
  const [sortKey, setSortKey]  = useState<SortKey>("name");
  const [sortDir, setSortDir]  = useState<SortDir>("asc");
  const [page,    setPage]     = useState(1);

  async function load() {
    setLoading(true);
    try {
      const list = await api("/products");
      setProducts(list);
    } catch (e: any) {
      error(e.message ?? "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Sort helper ──────────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortClass(key: SortKey) {
    if (sortKey !== key) return "sortable";
    return `sortable sort-${sortDir}`;
  }

  // ── Filtered + sorted + paginated list ──────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? products.filter(
          (p) =>
            (p.name     ?? "").toLowerCase().includes(q) ||
            (p.category ?? "").toLowerCase().includes(q),
        )
      : products;
  }, [products, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "priceCents":
          cmp = (a.priceCents ?? 0) - (b.priceCents ?? 0);
          break;
        case "stock":
          cmp = (a.stock ?? 0) - (b.stock ?? 0);
          break;
        case "active":
          cmp = (a.active ? 1 : 0) - (b.active ? 1 : 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openEdit(product: any) {
    setEditing(product);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    <Shell title="Products" subtitle="Manage your webshop">
      <div className="panel">
        <div className="panel-head">
          <h3>All Products ({loading ? "…" : filtered.length})</h3>
          <button
            className="btn"
            onClick={() =>
              setEditing({
                slug: "", name: "", description: "", priceCents: 0, weightG: 100,
                stock: 0, trackStock: true, category: "", images: [], active: true,
              })
            }
          >
            + New Product
          </button>
        </div>

        {/* Search toolbar */}
        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Search by name or category…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="empty">
            <div className="icon">▣</div>
            <p>{search ? "No products match your search." : "No products yet."}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className={sortClass("name")} onClick={() => toggleSort("name")}>
                    Name <span className="sort-icon" />
                  </th>
                  <th>Category</th>
                  <th className={sortClass("priceCents")} onClick={() => toggleSort("priceCents")}>
                    Price <span className="sort-icon" />
                  </th>
                  <th>Weight</th>
                  <th className={sortClass("stock")} onClick={() => toggleSort("stock")}>
                    Stock <span className="sort-icon" />
                  </th>
                  <th className={sortClass("active")} onClick={() => toggleSort("active")}>
                    Status <span className="sort-icon" />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={8} cols={8} />
                ) : (
                  paginated.map((p) => (
                    <tr
                      key={p.id}
                      className="clickable-row"
                      onClick={() => openEdit(p)}
                    >
                      <td>
                        {Array.isArray(p.images) && p.images[0] && (
                          <img
                            src={p.images[0]}
                            alt=""
                            style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }}
                          />
                        )}
                      </td>
                      <td>
                        <strong>{p.name}</strong>
                        {Array.isArray(p.images) && p.images.length > 1 && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: "0.4rem" }}>
                            +{p.images.length - 1} img
                          </span>
                        )}
                      </td>
                      <td>{p.category || "—"}</td>
                      <td>{fmtMoney(p.priceCents)}</td>
                      <td>{p.weightG}g</td>
                      <td>
                        {p.trackStock === false
                          ? <span style={{ color: "var(--text-muted)" }}>—</span>
                          : p.stock}
                      </td>
                      <td>
                        <span className={`badge ${p.active ? "badge-success" : "badge-muted"}`}>
                          {p.active ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </Shell>
  );
}

// ─── Editor Modal ─────────────────────────────────────────

function ProductEditor({ product, onClose, onSaved }: any) {
  const { success, error } = useToast();
  const confirm = useConfirm();

  const initial = {
    slug:        product.slug        || "",
    name:        product.name        || "",
    description: product.description || "",
    priceCents:  product.priceCents  || 0,
    weightG:     product.weightG     || 100,
    stock:       product.stock       || 0,
    trackStock:  product.trackStock  !== false,
    category:    product.category    || "",
    images:      Array.isArray(product.images) ? [...product.images] : [],
    active:      product.active      ?? true,
  };

  const [f,        setF]        = useState(initial);
  const [busy,     setBusy]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDirty,  setIsDirty]  = useState(false);
  const isNew = !product.id;

  function patch(partial: Partial<typeof initial>) {
    setF((prev) => ({ ...prev, ...partial }));
    setIsDirty(true);
  }

  async function handleClose() {
    if (isDirty) {
      const ok = await confirm({
        title:        "Discard changes?",
        message:      "You have unsaved changes. They will be lost.",
        confirmLabel: "Discard",
        variant:      "danger",
      });
      if (!ok) return;
    }
    onClose();
  }

  async function save() {
    setBusy(true);
    try {
      const body = {
        slug:       f.slug,
        name:       f.name,
        description: f.description,
        priceCents: +f.priceCents,
        weightG:    +f.weightG,
        stock:      f.trackStock ? +f.stock : 0,
        trackStock: f.trackStock,
        category:   f.category || null,
        images:     f.images.filter(Boolean),
        active:     f.active,
      };
      if (isNew) await api("/products",              { method: "POST",   body: JSON.stringify(body) });
      else        await api(`/products/${product.id}`, { method: "PUT",    body: JSON.stringify(body) });
      success(isNew ? "Product created" : "Product saved");
      onSaved();
    } catch (e: any) {
      error(e.message ?? "Failed to save product");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    const ok = await confirm({
      title:        "Delete product?",
      message:      "This cannot be undone.",
      confirmLabel: "Delete",
      variant:      "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api(`/products/${product.id}`, { method: "DELETE" });
      success("Product deleted");
      onSaved();
    } catch (e: any) {
      error(e.message ?? "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  }

  // ── Image list management ──────────────────────────────
  function addImage() { patch({ images: [...f.images, ""] }); }

  function updateImage(i: number, url: string) {
    const next = [...f.images];
    next[i] = url;
    patch({ images: next });
  }

  function removeImage(i: number) {
    patch({ images: f.images.filter((_, idx) => idx !== i) });
  }

  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= f.images.length) return;
    const next = [...f.images];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ images: next });
  }

  return (
    <div className="modal-bg" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "New Product" : `Edit: ${product.name}`}</h3>

        {isDirty && (
          <div className="unsaved-banner">You have unsaved changes.</div>
        )}

        <div className="form">
          <div className="form-row">
            <div>
              <label>Name</label>
              <input
                value={f.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div>
              <label>Slug</label>
              <input
                value={f.slug}
                onChange={(e) => patch({ slug: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label>Description (Markdown)</label>
            <textarea
              rows={10}
              value={f.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder={
                "Write a short lead paragraph here.\n\n## Features\n- Bullet point 1\n- Bullet point 2\n\n## Assembly\nStep-by-step instructions…\n\n## Target Audience\nWho is this for?\n\n## Result\nWhat do you get?"
              }
              style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.82rem" }}
            />
            <div className="help">
              Text before the first <code>## Heading</code> becomes the short description shown next to the price.
              Each <code>## Heading</code> becomes a styled card on the product page. Use <code>-</code> for bullet points.
              Recognized section icons: Features/Kenmerken, Assembly/Montage, Audience/Doelgroep, Result/Resultaat, Included/Inhoud.
            </div>
          </div>

          <div>
            <label>Category</label>
            <input
              value={f.category}
              onChange={(e) => patch({ category: e.target.value })}
              placeholder="Toys, Home, Office…"
            />
          </div>

          {/* Image list */}
          <div>
            <label>Product Images ({f.images.length})</label>
            {f.images.length === 0 && (
              <div className="help">No images yet. Click "+ Add Image" below.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {f.images.map((img, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", gap: "0.5rem", alignItems: "flex-start",
                    background: "var(--bg-elev-2)", padding: "0.75rem", borderRadius: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <ImagePicker
                      value={img}
                      onChange={(v) => updateImage(i, v)}
                      help={i === 0 ? "Main image (shown first)" : `Image ${i + 1}`}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => moveImage(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => moveImage(i, 1)}  disabled={i === f.images.length - 1}>↓</button>
                    <button type="button" className="btn btn-sm btn-danger"  onClick={() => removeImage(i)}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={addImage}
              style={{ marginTop: "0.5rem" }}
            >
              + Add Image
            </button>
          </div>

          <div className="form-row">
            <div>
              <label>Price (cents)</label>
              <input
                type="number"
                value={f.priceCents}
                onChange={(e) => patch({ priceCents: +e.target.value })}
              />
            </div>
            <div>
              <label>Weight (grams)</label>
              <input
                type="number"
                value={f.weightG}
                onChange={(e) => patch({ weightG: +e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={f.trackStock}
                onChange={(e) => patch({ trackStock: e.target.checked })}
                style={{ width: "auto", margin: 0 }}
              />
              <span>Track stock for this product</span>
            </label>
            <div className="help">
              When unchecked, this product is <strong>always available</strong> (made-to-order) and the stock count is ignored.
              Use this for products you print on demand without keeping inventory.
            </div>
          </div>

          {f.trackStock && (
            <div className="form-row">
              <div>
                <label>Stock</label>
                <input
                  type="number"
                  value={f.stock}
                  onChange={(e) => patch({ stock: +e.target.value })}
                />
              </div>
              <div style={{ display: "flex", alignItems: "end" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={f.active}
                    onChange={(e) => patch({ active: e.target.checked })}
                    style={{ width: "auto", marginRight: "0.5rem" }}
                  />
                  Active (visible in shop)
                </label>
              </div>
            </div>
          )}

          {!f.trackStock && (
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={f.active}
                  onChange={(e) => patch({ active: e.target.checked })}
                  style={{ width: "auto", marginRight: "0.5rem" }}
                />
                Active (visible in shop)
              </label>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              {!isNew && (
                <button
                  className="btn btn-danger btn-sm"
                  disabled={deleting}
                  onClick={del}
                >
                  {deleting && <span className="btn-spinner" />}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={handleClose}>
                Cancel
              </button>
              <button className="btn" disabled={busy} onClick={save}>
                {busy && <span className="btn-spinner" />}
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
