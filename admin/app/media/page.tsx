"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

export default function MediaLibrary() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setImages(await api("/images").catch(() => []));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function pick() { fileRef.current?.click(); }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    setBusy(true); setErr("");
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          setErr(`${file.name}: too large (max 10 MB)`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/images/upload", { method: "POST", body: fd, credentials: "include" });
        if (!r.ok) {
          const data = await r.json();
          setErr(`${file.name}: ${data.error || "upload failed"}`);
        }
      }
      await load();
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this image? Anywhere it's used will show as broken.")) return;
    await api(`/images/${id}`, { method: "DELETE" });
    load();
  }

  async function copy(url: string) {
    const fullUrl = `${window.location.origin}${url}`;
    try { await navigator.clipboard.writeText(fullUrl); } catch {}
    setCopied(url);
    setTimeout(() => setCopied(""), 1500);
  }

  function fmtSize(b: number) {
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.round(b / 1024)} KB`;
  }

  return (
    <Shell title="Media Library" subtitle="All uploaded images, in one place">
      <div className="panel">
        <div className="panel-head">
          <h3>Images ({images.length})</h3>
          <button className="btn" onClick={pick} disabled={busy}>{busy ? "Uploading…" : "↑ Upload Images"}</button>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={onFiles} style={{ display: "none" }} />
        </div>
        {err && <div className="error">{err}</div>}
        {loading ? <p>Loading…</p> : images.length === 0 ? (
          <div className="empty"><div className="icon">▣</div><p>No images yet. Click "Upload Images" to add some. You can select multiple files at once.</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.85rem" }}>
            {images.map((img) => (
              <div key={img.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
                <div style={{ height: 130, display: "grid", placeItems: "center", marginBottom: "0.5rem", background: "#fff", borderRadius: 4, padding: "0.4rem" }}>
                  <img src={img.webpUrl || img.url} alt={img.alt || ""} style={{ maxHeight: 120, maxWidth: "100%" }} />
                </div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={img.originalName}>
                  {img.originalName}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  {img.width && img.height ? `${img.width}×${img.height} · ` : ""}{fmtSize(img.sizeBytes)}
                </div>
                <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.6rem" }}>
                  <button className="btn btn-sm btn-outline" onClick={() => copy(img.webpUrl || img.url)} style={{ flex: 1 }}>
                    {copied === (img.webpUrl || img.url) ? "✓" : "Copy URL"}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => del(img.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
