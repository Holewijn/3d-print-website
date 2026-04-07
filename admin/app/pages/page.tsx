"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function PagesAdmin() {
  const [pages, setPages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  useEffect(() => { api("/pages").then(setPages); }, []);
  async function save() {
    await api(`/pages/${editing.slug}`, { method: "PUT", body: JSON.stringify(editing) });
    setEditing(null);
    api("/pages").then(setPages);
  }
  return (
    <div>
      <div className="card">
        <h1>Pages</h1>
        <table>
          <thead><tr><th>Slug</th><th>Title</th><th></th></tr></thead>
          <tbody>{pages.map(p => (
            <tr key={p.id}><td>{p.slug}</td><td>{p.title}</td><td><button className="btn" onClick={() => setEditing(p)}>Edit</button></td></tr>
          ))}</tbody>
        </table>
      </div>
      {editing && (
        <div className="card">
          <h2>Edit: {editing.slug}</h2>
          <label>Title</label><input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} />
          <label>SEO Title</label><input value={editing.seoTitle || ""} onChange={e => setEditing({...editing, seoTitle: e.target.value})} />
          <label>SEO Description</label><textarea rows={2} value={editing.seoDesc || ""} onChange={e => setEditing({...editing, seoDesc: e.target.value})} />
          <label>Content (JSON)</label><textarea rows={10} value={JSON.stringify(editing.content, null, 2)} onChange={e => { try { setEditing({...editing, content: JSON.parse(e.target.value)}); } catch {} }} />
          <button className="btn" onClick={save}>Save</button>
        </div>
      )}
    </div>
  );
}
