"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";

const STATUSES = ["QUEUED", "PRINTING", "PENDING_REVIEW", "DONE", "FAILED", "CANCELLED"];

export default function PrintQueuePage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [confirming, setConfirming] = useState<any>(null);

  async function load() {
    const q = filter ? `?status=${filter}` : "";
    setJobs(await api("/print-queue" + q).catch(() => []));
    if (printers.length === 0) setPrinters(await api("/printers").catch(() => []));
  }
  useEffect(() => { load(); }, [filter]);

  async function updateJob(id: string, body: any) {
    await api(`/print-queue/${id}`, { method: "PUT", body: JSON.stringify(body) });
    load();
  }
  async function delJob(id: string) {
    if (!confirm("Delete this job?")) return;
    await api(`/print-queue/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Shell title="Print Queue" subtitle="Schedule, track, and confirm print jobs">
      <div className="panel">
        <div className="panel-head">
          <h3>Jobs ({jobs.length})</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {jobs.length === 0 ? (
          <div className="empty"><div className="icon">▲</div><p>No print jobs in queue. Convert a quote to a print job from the Quotes page.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Status</th><th>Printer</th><th>Expected</th><th>Actual</th><th>Finished</th><th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td><strong>{j.title}</strong></td>
                  <td>
                    <select value={j.status} onChange={(e) => updateJob(j.id, { status: e.target.value })} style={{ width: "auto", fontSize: "0.78rem" }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={j.printerId || ""} onChange={(e) => updateJob(j.id, { printerId: e.target.value || null })} style={{ width: "auto", fontSize: "0.78rem" }}>
                      <option value="">—</option>
                      {printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td>{j.expectedGrams ? `${j.expectedGrams}g` : "—"}</td>
                  <td>{j.actualGrams ? `${j.actualGrams}g` : "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{j.finishedAt ? fmtDate(j.finishedAt) : "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {j.status === "PENDING_REVIEW" && (
                      <button className="btn btn-sm" onClick={() => setConfirming(j)}>Confirm</button>
                    )}{" "}
                    <button className="btn btn-sm btn-danger" onClick={() => delJob(j.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirming && (
        <ConfirmJobModal
          job={confirming}
          onClose={() => setConfirming(null)}
          onSaved={() => { setConfirming(null); load(); }}
        />
      )}
    </Shell>
  );
}

function ConfirmJobModal({ job, onClose, onSaved }: any) {
  const [grams, setGrams] = useState(job.actualGrams || job.expectedGrams || 0);
  const [success, setSuccess] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    try {
      await api(`/print-queue/${job.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ actualGrams: grams, success }),
      });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Print Job</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>{job.title}</p>
        <div className="form">
          <div>
            <label>Actual Filament Used (grams)</label>
            <input type="number" value={grams} onChange={(e) => setGrams(+e.target.value)} />
            <div className="help">Moonraker reported: {job.actualGrams || "—"}g · Quote expected: {job.expectedGrams || "—"}g</div>
          </div>
          <div>
            <label>Result</label>
            <select value={success ? "true" : "false"} onChange={(e) => setSuccess(e.target.value === "true")}>
              <option value="true">✓ Successful print — deduct as PRINT_USED</option>
              <option value="false">✗ Failed print — deduct as FAILED_PRINT</option>
            </select>
          </div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy || grams <= 0} onClick={save}>{busy ? "Deducting…" : "Confirm & Deduct"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
