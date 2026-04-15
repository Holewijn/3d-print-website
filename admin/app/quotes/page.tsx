"use client";
import { useEffect, useState, useMemo } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";
import StlViewer from "../../components/StlViewer";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import { TableSkeleton } from "../../components/Skeleton";

const STATUSES = ["NEW", "PRICED", "APPROVED", "REJECTED", "CONVERTED"];
const PAGE_SIZE = 25;

type SortKey = "createdAt" | "totalCents" | "status";
type SortDir = "asc" | "desc";

export default function QuotesAdmin() {
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<any>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  async function load() {
    setLoading(true);
    const list = await api("/quotes").catch(() => []);
    setQuotes(list);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="sort-icon" />;
    return <span className={`sort-icon ${sortDir === "asc" ? "sort-asc" : "sort-desc"}`} />;
  }

  const filtered = useMemo(() => {
    let list = filter === "ALL" ? quotes : quotes.filter((q) => q.status === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          x.email?.toLowerCase().includes(q) ||
          x.id?.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "createdAt") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [quotes, filter, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function update(id: string, body: any) {
    await api(`/quotes/${id}`, { method: "PUT", body: JSON.stringify(body) });
    load();
  }

  async function convert(id: string) {
    const ok = await confirm({ title: "Convert this quote to an order?", variant: "primary" });
    if (!ok) return;
    await api(`/quotes/${id}/convert-to-order`, { method: "POST" });
    load();
    setViewing(null);
  }

  async function sendToQueue(id: string) {
    const ok = await confirm({ title: "Send this quote to the print queue?", variant: "primary" });
    if (!ok) return;
    try {
      await api(`/quotes/${id}/send-to-queue`, { method: "POST" });
      success("Sent to print queue");
      load();
    } catch (e: any) {
      error("Failed: " + e.message);
    }
  }

  async function delQuote(id: string) {
    const ok = await confirm({ title: "Permanently delete this quote?", variant: "danger" });
    if (!ok) return;
    try {
      await api(`/quotes/${id}`, { method: "DELETE" });
      if (viewing?.id === id) setViewing(null);
      load();
    } catch (e: any) {
      error("Failed: " + e.message);
    }
  }

  function downloadStl(uplId: string) {
    window.open(`/api/stl/${uplId}/download`, "_blank");
  }

  return (
    <Shell title="Quotes" subtitle="Approve, edit, and send quotes to production">
      <div className="panel">
        <div className="panel-head">
          <h3>Quotes ({filtered.length})</h3>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Search by email or quote ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        {loading ? (
          <table>
            <thead>
              <tr><th>ID</th><th>Customer</th><th>Material</th><th>Color</th><th>Weight</th><th>Total</th><th>Note</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody><TableSkeleton rows={8} cols={9} /></tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="icon">✎</div><p>No quotes found.</p></div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Material</th>
                  <th>Color</th>
                  <th>Weight</th>
                  <th className="sortable" onClick={() => toggleSort("totalCents")}>
                    Total {sortIcon("totalCents")}
                  </th>
                  <th>Note</th>
                  <th className="sortable" onClick={() => toggleSort("status")}>
                    Status {sortIcon("status")}
                  </th>
                  <th className="sortable" onClick={() => toggleSort("createdAt")}>
                    Date {sortIcon("createdAt")}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((q) => (
                  <tr
                    key={q.id}
                    className="clickable-row"
                    onClick={() => setViewing(q)}
                  >
                    <td>#{q.id.slice(-8)}</td>
                    <td>{q.email}</td>
                    <td>{q.materialRef?.name || q.material}</td>
                    <td>
                      {q.colorRef && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <div style={{ width: 12, height: 12, borderRadius: 2, background: q.colorRef.hex, border: "1px solid var(--border)" }} />
                          <span style={{ fontSize: "0.85rem" }}>{q.colorRef.name}</span>
                        </div>
                      )}
                    </td>
                    <td>{q.weightG ? `${q.weightG}g` : "—"}</td>
                    <td>{fmtMoney(q.totalCents || 0)}</td>
                    <td>{q.customerNote ? <span title={q.customerNote} style={{ cursor: "help" }}>📝</span> : ""}</td>
                    <td><span className={`badge ${badge(q.status)}`}>{q.status}</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmtDate(q.createdAt)}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm btn-danger" onClick={() => delQuote(q.id)}>×</button>
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

      {viewing && (
        <QuoteEditor
          quote={viewing}
          onClose={() => setViewing(null)}
          onUpdate={(body: any) => update(viewing.id, body).then(() => setViewing({ ...viewing, ...body }))}
          onConvert={() => convert(viewing.id)}
          onSendToQueue={() => sendToQueue(viewing.id)}
          onDownload={() => downloadStl(viewing.stlUploadId)}
          onDelete={() => delQuote(viewing.id)}
        />
      )}
    </Shell>
  );
}

function QuoteEditor({ quote, onClose, onUpdate, onConvert, onSendToQueue, onDownload, onDelete }: any) {
  const { success, error } = useToast();
  const [totalCents, setTotalCents] = useState(quote.totalCents || 0);
  const [adminNote, setAdminNote] = useState(quote.adminNote || "");
  const [status, setStatus] = useState(quote.status);
  const [saveBusy, setSaveBusy] = useState(false);
  const [convertBusy, setConvertBusy] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);

  async function handleSave() {
    setSaveBusy(true);
    try {
      await onUpdate({ totalCents, adminNote, status });
      success("Quote saved");
    } catch (e: any) {
      error("Failed to save: " + e.message);
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleConvert() {
    setConvertBusy(true);
    try {
      await onConvert();
    } finally {
      setConvertBusy(false);
    }
  }

  async function handleSendToQueue() {
    setQueueBusy(true);
    try {
      await onSendToQueue();
    } finally {
      setQueueBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
        <h3>Quote #{quote.id.slice(-8)}</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem" }}>{quote.email} · {fmtDate(quote.createdAt)}</p>

        <div style={{ marginBottom: "1.5rem" }}>
          <StlViewer stlUploadId={quote.stlUploadId} height={320} color={quote.colorRef?.hex || "#2563eb"} />
        </div>

        {quote.customerNote && (
          <div style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)", borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "0.4rem" }}>Customer Note</div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{quote.customerNote}</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <Stat label="Material" value={quote.materialRef?.name || quote.material} />
          <Stat label="Color" value={quote.colorRef ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: 14, height: 14, borderRadius: 2, background: quote.colorRef.hex, border: "1px solid var(--border)" }} />
              {quote.colorRef.name}
            </div>
          ) : "—"} />
          <Stat label="Infill" value={`${quote.infillPct}%`} />
          <Stat label="Layer Height" value={`${quote.layerHeightMm}mm`} />
          <Stat label="Volume" value={quote.volumeCm3 ? `${quote.volumeCm3} cm³` : "—"} />
          <Stat label="Weight" value={quote.weightG ? `${quote.weightG} g` : "—"} />
          <Stat label="Print Time" value={quote.printMinutes ? `${Math.floor(quote.printMinutes / 60)}h ${quote.printMinutes % 60}m` : "—"} />
          <Stat label="Energy" value={quote.energyKwh ? `${quote.energyKwh} kWh` : "—"} />
        </div>

        <div className="form">
          <div>
            <label>Total Price (cents)</label>
            <input type="number" value={totalCents} onChange={(e) => setTotalCents(+e.target.value)} />
            <div className="help">Currently: {fmtMoney(totalCents)}</div>
          </div>
          <div>
            <label>Admin Note (private)</label>
            <textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-outline btn-sm" onClick={onDownload}>↓ STL</button>
              {!quote.printJob && (
                <button className="btn btn-sm" onClick={handleSendToQueue} disabled={queueBusy}>
                  {queueBusy ? <span className="btn-spinner" /> : null}
                  {queueBusy ? " Sending…" : "→ Send to Print Queue"}
                </button>
              )}
              {quote.printJob && <span className="badge badge-success" style={{ alignSelf: "center" }}>In Print Queue</span>}
              <button className="btn btn-success btn-sm" onClick={handleConvert} disabled={quote.status === "CONVERTED" || convertBusy}>
                {convertBusy ? <span className="btn-spinner" /> : null}
                {convertBusy ? " Converting…" : "→ Convert to Order"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={saveBusy}>
                {saveBusy ? <><span className="btn-spinner" /> Saving…</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div style={{ background: "var(--bg-elev-2)", padding: "0.75rem", borderRadius: 8 }}>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: 700, marginTop: "0.2rem" }}>{value}</div>
    </div>
  );
}

function badge(s: string) {
  if (["APPROVED", "CONVERTED"].includes(s)) return "badge-success";
  if (["NEW", "PRICED"].includes(s)) return "badge-warning";
  if (s === "REJECTED") return "badge-danger";
  return "badge-muted";
}
