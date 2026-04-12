"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";

const STATUSES = ["QUEUED", "ASSIGNED", "PRINTING", "DONE", "FAILED", "CANCELLED"];

export default function PrintQueueAdmin() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [sendModal, setSendModal] = useState<any>(null);

  async function load() {
    setJobs(await api("/print-queue").catch(() => []));
    setPrinters(await api("/printers").catch(() => []));
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

  async function setStatus(id: string, status: string) {
    await api(`/print-queue/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  }

  async function delJob(id: string) {
    if (!confirm("Delete this print job? This will also delete any attached G-code.")) return;
    await api(`/print-queue/${id}`, { method: "DELETE" });
    load();
  }

  function fmtSize(b: number) {
    if (!b) return "";
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.round(b / 1024)} KB`;
  }

  return (
    <Shell title="Print Queue" subtitle="G-code attachment and printer dispatch">
      <div className="panel">
        <div className="panel-head">
          <h3>Print Jobs ({filtered.length})</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="icon">⇉</div><p>No print jobs yet. Quotes converted to orders auto-create print jobs.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Printer</th>
                <th>G-code</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.title || `Job #${j.id.slice(-8)}`}</strong>
                    {j.expectedGrams && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>~{j.expectedGrams}g</div>}
                  </td>
                  <td>{j.printer?.name || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td>
                    {j.gcodeFilename ? (
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{j.gcodeOriginalName || "gcode"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{fmtSize(j.gcodeSizeBytes)}</div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>none</span>
                    )}
                  </td>
                  <td>
                    <select value={j.status} onChange={(e) => setStatus(j.id, e.target.value)} style={{ width: "auto", fontSize: "0.78rem" }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{fmtDate(j.createdAt)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <GcodeUploadButton job={j} onSaved={load} />{" "}
                    {j.gcodeFilename && (
                      <button className="btn btn-sm" onClick={() => setSendModal(j)} title="Send to printer">→ Send</button>
                    )}{" "}
                    <button className="btn btn-sm btn-danger" onClick={() => delJob(j.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sendModal && (
        <SendToPrinterModal
          job={sendModal}
          printers={printers.filter((p) => p.active)}
          onClose={() => setSendModal(null)}
          onSent={() => { setSendModal(null); load(); }}
        />
      )}
    </Shell>
  );
}

function GcodeUploadButton({ job, onSaved }: any) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/print-queue/${job.id}/upload-gcode`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!r.ok) {
        const data = await r.json();
        alert("Failed: " + (data.error || "upload error"));
      } else {
        onSaved();
      }
    } finally { setBusy(false); }
  }

  return (
    <>
      <button className="btn btn-sm btn-outline" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? "↑ …" : job.gcodeFilename ? "↑ Replace" : "↑ G-code"}
      </button>
      <input ref={fileRef} type="file" accept=".gcode,.g,.gco,.ufp,.bgcode" onChange={onFile} style={{ display: "none" }} />
    </>
  );
}

function SendToPrinterModal({ job, printers, onClose, onSent }: any) {
  const [printerId, setPrinterId] = useState(job.printerId || (printers[0]?.id || ""));
  const [startNow, setStartNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!printerId) { setErr("Pick a printer"); return; }
    setBusy(true); setErr("");
    try {
      const r = await api(`/print-queue/${job.id}/send-to-printer`, {
        method: "POST",
        body: JSON.stringify({ printerId, startNow }),
      });
      alert(`✓ G-code uploaded to ${printers.find((p: any) => p.id === printerId)?.name}${r.started ? " and print started" : ""}`);
      onSent();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>Send to Printer</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Upload <strong>{job.gcodeOriginalName}</strong> to a printer's virtual_sdcard.
        </p>

        {printers.length === 0 ? (
          <div className="error">No active printers. Add one in Production → Printers first.</div>
        ) : (
          <div className="form">
            <div>
              <label>Printer</label>
              <select value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
                {printers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} style={{ width: "auto", margin: 0 }} />
                <span>Start printing immediately after upload</span>
              </label>
              <div className="help">Leave unchecked to just stage the file. You can start it later from Printer Control or Mainsail.</div>
            </div>
            {err && <div className="error">{err}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={busy} onClick={send}>
                {busy ? "Uploading…" : startNow ? "Upload & Start" : "Upload"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
