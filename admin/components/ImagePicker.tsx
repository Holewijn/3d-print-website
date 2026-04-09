"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  help?: string;
  placeholder?: string;
  /** Show a preview thumbnail under the field */
  showPreview?: boolean;
}

/**
 * Drop-in replacement for a URL <input>. Three things in one row:
 * 1. The URL text input (still editable for external URLs)
 * 2. An [Upload] button — opens file picker, uploads, fills the input
 * 3. A [Library] button — opens the media library modal to pick existing
 *
 * Below, an optional thumbnail preview if value is set.
 */
export default function ImagePicker({ value, onChange, label, help, placeholder, showPreview = true }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [libOpen, setLibOpen] = useState(false);

  function pick() { fileRef.current?.click(); }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 10 * 1024 * 1024) { setErr("File too large (max 10 MB)"); return; }
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/images/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Upload failed");
      // Prefer the WebP derivative for raster images, fall back to original
      onChange(data.webpUrl || data.url);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {label && <label>{label}</label>}
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "/uploads/images/… or https://…"}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-sm btn-outline" onClick={pick} disabled={busy} title="Upload from your computer">
          {busy ? "…" : "↑ Upload"}
        </button>
        <button type="button" className="btn btn-sm btn-outline" onClick={() => setLibOpen(true)} title="Choose from library">
          Library
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={onFile} style={{ display: "none" }} />
      </div>
      {help && <div className="help">{help}</div>}
      {err && <div className="error" style={{ marginTop: "0.4rem" }}>{err}</div>}
      {showPreview && value && (
        <div style={{ marginTop: "0.5rem" }}>
          <img src={value} alt="" style={{ maxHeight: 70, maxWidth: 200, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)" }}
            onError={(e) => { (e.currentTarget.style.display = "none"); }} />
        </div>
      )}
      {libOpen && (
        <MediaLibraryModal
          onSelect={(url) => { onChange(url); setLibOpen(false); }}
          onClose={() => setLibOpen(false)}
        />
      )}
    </div>
  );
}

function MediaLibraryModal({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setImages(await api("/images").catch(() => []));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <h3>Image Library</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>Click any image to select it.</p>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? <p>Loading…</p> : images.length === 0 ? (
            <div className="empty"><p>No images uploaded yet.</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.6rem" }}>
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onSelect(img.webpUrl || img.url)}
                  style={{
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "0.5rem", cursor: "pointer", textAlign: "center",
                  }}
                  title={img.originalName}
                >
                  <div style={{ height: 90, display: "grid", placeItems: "center", marginBottom: "0.4rem" }}>
                    <img src={img.webpUrl || img.url} alt="" style={{ maxHeight: 90, maxWidth: "100%", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.originalName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
