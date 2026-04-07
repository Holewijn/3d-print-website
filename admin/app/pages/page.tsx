"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";
import BlockForm from "../../components/BlockForm";
import { Block, BLOCK_TYPES, emptyBlock, BlockType } from "../../lib/blocks";

export default function PagesAdmin() {
  const [pages, setPages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const all = await api("/pages").catch(() => []);
    setPages(all);
  }
  useEffect(() => { load(); }, []);

  return (
    <Shell title="Pages" subtitle="Edit your website content with visual blocks">
      <div className="panel">
        <div className="panel-head">
          <h3>All Pages ({pages.length})</h3>
          <button className="btn" onClick={() => setEditing({ slug: "", title: "New Page", content: { blocks: [] }, seoTitle: "", seoDesc: "", published: true, _isNew: true })}>+ New Page</button>
        </div>
        {pages.length === 0 ? (
          <div className="empty"><div className="icon">▭</div><p>No pages yet.</p></div>
        ) : (
          <table>
            <thead><tr><th>Title</th><th>Slug</th><th>Blocks</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {pages.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td><code style={{ color: "var(--text-muted)" }}>/{p.slug === "home" ? "" : p.slug}</code></td>
                  <td>{p.content?.blocks?.length || 0}</td>
                  <td><span className={`badge ${p.published ? "badge-success" : "badge-muted"}`}>{p.published ? "Published" : "Draft"}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{fmtDate(p.updatedAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <a href={`/${p.slug === "home" ? "" : p.slug + "/"}`} target="_blank" className="btn btn-sm btn-outline" style={{ marginRight: "0.5rem" }}>Preview ↗</a>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <PageEditor key={editing.id || "new"} page={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Shell>
  );
}

function PageEditor({ page, onClose, onSaved }: any) {
  const [title, setTitle] = useState(page.title || "");
  const [slug, setSlug] = useState(page.slug || "");
  const [seoTitle, setSeoTitle] = useState(page.seoTitle || "");
  const [seoDesc, setSeoDesc] = useState(page.seoDesc || "");
  const [published, setPublished] = useState(page.published ?? true);
  const [blocks, setBlocks] = useState<Block[]>(page.content?.blocks || []);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const isNew = page._isNew;

  function addBlock(type: BlockType) {
    setBlocks([...blocks, emptyBlock(type)]);
    setAdding(false);
  }
  function updateBlock(idx: number, b: Block) {
    const next = [...blocks];
    next[idx] = b;
    setBlocks(next);
  }
  function removeBlock(idx: number) {
    if (!confirm("Delete this block?")) return;
    setBlocks(blocks.filter((_, i) => i !== idx));
  }
  function moveBlock(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[j]] = [next[j], next[idx]];
    setBlocks(next);
  }

  async function save() {
    setBusy(true); setErr("");
    try {
      await api(`/pages/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ title, content: { blocks }, seoTitle, seoDesc, published }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (isNew) onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  async function del() {
    if (!confirm(`Delete page "${title}"? This cannot be undone.`)) return;
    await api(`/pages/${slug}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 900, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3>{isNew ? "New Page" : `Editing: ${page.title}`}</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>

        {/* Page metadata */}
        <div className="panel" style={{ background: "var(--bg)", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>Page Settings</h3>
          <div className="form">
            <div className="form-row">
              <div><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><label>URL Slug</label><input value={slug} onChange={e => setSlug(e.target.value)} disabled={!isNew} /></div>
            </div>
            <div className="form-row">
              <div><label>SEO Title</label><input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} /></div>
              <div><label>SEO Description</label><input value={seoDesc} onChange={e => setSeoDesc(e.target.value)} /></div>
            </div>
            <div><label><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} style={{ width: "auto", marginRight: "0.5rem" }} />Published</label></div>
          </div>
        </div>

        {/* Blocks list */}
        <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Content Blocks ({blocks.length})</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          {blocks.length === 0 && (
            <div className="empty" style={{ background: "var(--bg)", borderRadius: 8, padding: "2rem" }}>
              <p>No blocks yet. Add one below.</p>
            </div>
          )}
          {blocks.map((b, idx) => {
            const meta = BLOCK_TYPES.find(t => t.type === b.type);
            return (
              <details key={idx} className="panel" style={{ background: "var(--bg)", padding: "0.85rem 1rem" }}>
                <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", listStyle: "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--primary-soft)", color: "var(--primary)", display: "inline-grid", placeItems: "center", fontSize: "0.85rem" }}>{meta?.icon}</span>
                    <strong>{meta?.label || b.type}</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>#{idx + 1}</span>
                  </span>
                  <span style={{ display: "flex", gap: "0.25rem" }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-outline" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="btn btn-sm btn-outline" onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}>↓</button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeBlock(idx)}>Delete</button>
                  </span>
                </summary>
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                  <BlockForm block={b} onChange={(nb) => updateBlock(idx, nb)} />
                </div>
              </details>
            );
          })}
        </div>

        {/* Add block */}
        {adding ? (
          <div className="panel" style={{ background: "var(--bg)", marginBottom: "1rem" }}>
            <div className="panel-head">
              <h3 style={{ fontSize: "0.9rem" }}>Choose a block type</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setAdding(false)}>Cancel</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
              {BLOCK_TYPES.map(t => (
                <button key={t.type} className="btn btn-outline" onClick={() => addBlock(t.type)} style={{ flexDirection: "column", padding: "1rem 0.5rem", gap: "0.4rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>{t.icon}</span>
                  <span style={{ fontSize: "0.75rem" }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button className="btn btn-outline" onClick={() => setAdding(true)} style={{ width: "100%", marginBottom: "1rem" }}>+ Add Block</button>
        )}

        {err && <div className="error" style={{ marginBottom: "1rem" }}>{err}</div>}
        {saved && <div className="success-msg" style={{ marginBottom: "1rem" }}>✓ Page saved</div>}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <div>{!isNew && <button className="btn btn-danger" onClick={del}>Delete Page</button>}</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {!isNew && <a href={`/${slug === "home" ? "" : slug + "/"}`} target="_blank" className="btn btn-outline">Preview ↗</a>}
            <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Page"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
