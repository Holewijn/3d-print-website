"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";

export default function PagesAdmin() {
  const [pages, setPages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const all = await api("/pages").catch(() => []);
    setPages(all);
  }
  useEffect(() => { load(); }, []);

  return (
    <Shell title="Pages" subtitle="Manage your website content">
      <div className="panel">
        <div className="panel-head">
          <h3>All Pages ({pages.length})</h3>
          <button className="btn" onClick={() => { setCreating(true); setEditing({ slug: "", title: "", content: { blocks: [] }, seoTitle: "", seoDesc: "", published: true }); }}>+ New Page</button>
        </div>
        {pages.length === 0 ? (
          <div className="empty"><div className="icon">▭</div><p>No pages yet.</p></div>
        ) : (
          <table>
            <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {pages.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td><code style={{ color: "var(--text-muted)" }}>/{p.slug}</code></td>
                  <td><span className={`badge ${p.published ? "badge-success" : "badge-muted"}`}>{p.published ? "Published" : "Draft"}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{fmtDate(p.updatedAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => { setCreating(false); setEditing(p); }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <PageEditor
          page={editing}
          isNew={creating}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </Shell>
  );
}

function PageEditor({ page, isNew, onClose, onSaved }: any) {
  const [f, setF] = useState({
    slug: page.slug,
    title: page.title,
    content: typeof page.content === "string" ? page.content : JSON.stringify(page.content, null, 2),
    seoTitle: page.seoTitle || "",
    seoDesc: page.seoDesc || "",
    published: page.published,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    try {
      let content: any;
      try { content = JSON.parse(f.content); } catch { content = { blocks: [{ type: "text", text: f.content }] }; }
      await api(`/pages/${f.slug}`, {
        method: "PUT",
        body: JSON.stringify({ title: f.title, content, seoTitle: f.seoTitle, seoDesc: f.seoDesc, published: f.published }),
      });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function del() {
    if (!confirm(`Delete page "${f.title}"?`)) return;
    await api(`/pages/${f.slug}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <h3>{isNew ? "New Page" : `Edit: ${page.title}`}</h3>
        <div className="form">
          <div className="form-row">
            <div>
              <label>Title</label>
              <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
            </div>
            <div>
              <label>Slug</label>
              <input value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} disabled={!isNew} />
            </div>
          </div>
          <div>
            <label>Content (JSON or plain text)</label>
            <textarea rows={8} value={f.content} onChange={e => setF({ ...f, content: e.target.value })} style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }} />
            <div className="help">JSON like <code>{'{"blocks":[{"type":"hero","text":"..."}]}'}</code> or plain text.</div>
          </div>
          <div>
            <label>SEO Title</label>
            <input value={f.seoTitle} onChange={e => setF({ ...f, seoTitle: e.target.value })} />
          </div>
          <div>
            <label>SEO Description</label>
            <textarea rows={2} value={f.seoDesc} onChange={e => setF({ ...f, seoDesc: e.target.value })} />
          </div>
          <div>
            <label><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Published</label>
          </div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
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
