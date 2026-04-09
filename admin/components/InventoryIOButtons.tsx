"use client";
import { useRef, useState } from "react";

export default function InventoryIOButtons() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [committing, setCommitting] = useState(false);
  const [err, setErr] = useState("");

  function downloadExport() {
    window.open("/api/inventory/export", "_blank");
  }
  function downloadTemplate() {
    window.open("/api/inventory/export?empty=1", "_blank");
  }

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file
    setPendingFile(file);
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/inventory/import", { method: "POST", body: fd, credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Import failed");
      setPreview(data.summary);
    } catch (e: any) {
      setErr(e.message);
      setPendingFile(null);
    } finally { setBusy(false); }
  }

  async function commit() {
    if (!pendingFile) return;
    setCommitting(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      const r = await fetch("/api/inventory/import?commit=1", { method: "POST", body: fd, credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Import failed");
      setPreview(data.summary);
      setTimeout(() => {
        setPreview(null); setPendingFile(null);
        window.location.reload(); // refresh inventory tabs to show new data
      }, 1500);
    } catch (e: any) {
      setErr(e.message);
    } finally { setCommitting(false); }
  }

  function cancel() {
    setPreview(null); setPendingFile(null); setErr("");
  }

  return (
    <>
      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
        <button className="btn btn-sm btn-outline" onClick={downloadExport} title="Download all inventory as Excel">↓ Export</button>
        <button className="btn btn-sm btn-outline" onClick={downloadTemplate} title="Download a blank template">↓ Template</button>
        <button className="btn btn-sm" onClick={pickFile} disabled={busy}>↑ Import</button>
        <input ref={fileRef} type="file" accept=".xlsx" onChange={onFileSelected} style={{ display: "none" }} />
      </div>

      {preview && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && cancel()}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3>Import Preview {pendingFile && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>· {pendingFile.name}</span>}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              This is a dry run — nothing has been written to the database yet. Review the changes below and click <strong>Apply Import</strong> to commit.
            </p>

            <table style={{ marginBottom: "1rem" }}>
              <thead>
                <tr>
                  <th>Sheet</th>
                  <th style={{ textAlign: "right" }}>New</th>
                  <th style={{ textAlign: "right" }}>Updated</th>
                  <th style={{ textAlign: "right" }}>Errors</th>
                </tr>
              </thead>
              <tbody>
                {(["brands", "materials", "colors", "pricing", "spools"] as const).map((k) => {
                  const s = preview[k];
                  const total = s.created + s.updated + s.errors.length;
                  return (
                    <tr key={k}>
                      <td><strong style={{ textTransform: "capitalize" }}>{k}</strong></td>
                      <td style={{ textAlign: "right", color: s.created > 0 ? "#16a34a" : "var(--text-muted)" }}>{s.created}</td>
                      <td style={{ textAlign: "right", color: s.updated > 0 ? "#2563eb" : "var(--text-muted)" }}>{s.updated}</td>
                      <td style={{ textAlign: "right", color: s.errors.length > 0 ? "#ef4444" : "var(--text-muted)" }}>{s.errors.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Show errors if any */}
            {(["brands", "materials", "colors", "pricing", "spools"] as const).some((k) => preview[k].errors.length > 0) && (
              <div style={{ marginBottom: "1rem", maxHeight: 220, overflow: "auto", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "#ef4444", display: "block", marginBottom: "0.5rem" }}>Errors</strong>
                {(["brands", "materials", "colors", "pricing", "spools"] as const).map((k) => (
                  preview[k].errors.length > 0 && (
                    <div key={k} style={{ marginBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>{k}</div>
                      {preview[k].errors.map((err: string, i: number) => (
                        <div key={i} style={{ fontSize: "0.78rem", color: "#ef4444", paddingLeft: "0.5rem" }}>• {err}</div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}

            {err && <div className="error" style={{ marginBottom: "1rem" }}>{err}</div>}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Total: {(["brands", "materials", "colors", "pricing", "spools"] as const).reduce((acc, k) => acc + preview[k].created + preview[k].updated, 0)} rows ready to apply
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-outline btn-sm" onClick={cancel} disabled={committing}>Cancel</button>
                <button className="btn" onClick={commit} disabled={committing}>{committing ? "Importing…" : "Apply Import"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {err && !preview && (
        <div className="modal-bg" onClick={() => setErr("")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import Failed</h3>
            <div className="error">{err}</div>
            <div style={{ textAlign: "right", marginTop: "1rem" }}>
              <button className="btn btn-outline btn-sm" onClick={() => setErr("")}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
