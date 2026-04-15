"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import { TableSkeleton } from "../../components/Skeleton";

const STATUSES = ["QUEUED", "ASSIGNED", "PRINTING", "DONE", "FAILED", "CANCELLED"];
const PAGE_SIZE = 25;

type SortKey = "createdAt" | "status";
type SortDir = "asc" | "desc";

export default function PrintQueueAdmin() {
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [jobs, setJobs] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sendModal, setSendModal] = useState<any>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  async function load() {
    setLoading(true);
    const [j, p] = await Promise.all([
      api("/print-queue").catch(() => []),
      api("/printers").catch(() => []),
    ]);
    setJobs(j);
    setPrinters(p);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="sort-icon" />;
    return <span className={`sort-icon ${sortDir === "asc" ? "sort-asc" : "sort-desc"}`} />;
  }

  const filtered = useMemo(() => {
    let list = filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          j.id?.toLowerCase().includes(q) ||
          j.title?.toLowerCase().includes(q) ||
          j.printer?.name?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "createdAt") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [jobs, filter, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function setStatus(id: string, status: string) {
    try {
      await api(`/print-queue/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      load();
    } catch (e: any) {
      error("Failed to update status: " + e.message);
    }
  }

  async function delJob(id: string) {
    const ok = await confirm({ title: "Delete this print job?", message: "This will also delete any attached G-code.", variant: "danger" });
    if (!ok) return;
    try {
      await api(`/print-queue/${id}`, { method: "DELETE" });
      success("Job deleted");
      load();
    } catch (e: any) {
      error("Failed: " + e.message);
    }
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
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Search by job ID, title or printer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        {loading ? (
          <table>
            <thead>
              <tr><th>Job</th><th>Printer</th><th>G-code</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody><TableSkeleton rows={8} cols={6} /></tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="icon">⇉</div><p>No print jobs found.</p></div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Printer</th>
                  <th>G-code</th>
                  <th className="sortable" onClick={() => toggleSort("status")}>
                    Status {sortIcon("status")}
                  </th>
                  <th className="sortable" onClick={() => toggleSort("createdAt")}>
                    Created {sortIcon("createdAt")}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <strong>{j.title || `Job #${j.id.slice(-8)}`}</strong>
                      {j.expectedGrams && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>~{j.expectedGrams}g</div>
                      )}
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
                      <select
                        value={j.status}
                        onChange={(e) => setStatus(j.id, e.target.value)}
                        style={{ width: "auto", fontSize: "0.78rem" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{fmtDate(j.createdAt)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <GcodeUploadButton job={j} onSaved={load} onError={error} />{" "}
                      {j.gcodeFilename && (
                        <button className="btn btn-sm" onClick={() => setSendModal(j)} title="Send to printer">→ Send</button>
                      )}{" "}
                      <button className="btn btn-sm btn-danger" onClick={() => delJob(j.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 0} onClick={() => setPage(0)}>«</button>
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
                <span>Page {page + 1} of {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>›</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
              </div>
            )}
          </>
        )}
      </div>

      {sendModal && (
        <SendToPrinterModal
          job={sendModal}
          printers={printers.filter((p) => p.active)}
          onClose={() => setSendModal(null)}
          onSent={() => { setSendModal(null); load(); }}
          onSuccess={success}
          onError={error}
        />
      )}
    </Shell>
  );
}

function GcodeUploadButton({ job, onSaved, onError }: any) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: { target: HTMLInputElement }) {
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
        const data = await r.json().catch(() => ({}));
        onError("Failed: " + (data.error || "upload error"));
      } else {
        onSaved();
      }
    } catch (e: any) {
      onError("Upload failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-sm btn-outline" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? <><span className="btn-spinner" /> …</> : job.gcodeFilename ? "↑ Replace" : "↑ G-code"}
      </button>
      <input ref={fileRef} type="file" accept=".gcode,.g,.gco,.ufp,.bgcode" onChange={onFile} style={{ display: "none" }} />
    </>
  );
}

function SendToPrinterModal({ job, printers, onClose, onSent, onSuccess, onError }: any) {
  const [printerId, setPrinterId] = useState(job.printerId || (printers[0]?.id || ""));
  const [startNow, setStartNow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!printerId) { onError("Pick a printer"); return; }
    setBusy(true);
    try {
      const r = await api(`/print-queue/${job.id}/send-to-printer`, {
        method: "POST",
        body: JSON.stringify({ printerId, startNow }),
      });
      const name = printers.find((p: any) => p.id === printerId)?.name;
      onSuccess(`G-code uploaded to ${name}${r.started ? " and print started" : ""}`);
      onSent();
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
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
                <input
                  type="checkbox"
                  checked={startNow}
                  onChange={(e) => setStartNow(e.target.checked)}
                  style={{ width: "auto", margin: 0 }}
                />
                <span>Start printing immediately after upload</span>
              </label>
              <div className="help">Leave unchecked to just stage the file. You can start it later from Printer Control or Mainsail.</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={busy} onClick={send}>
                {busy ? <><span className="btn-spinner" /> Uploading…</> : startNow ? "Upload & Start" : "Upload"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
