"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";
import StlViewer from "../../components/StlViewer";

const STATUSES = ["NEW", "PRICED", "APPROVED", "REJECTED", "CONVERTED"];

export default function QuotesAdmin() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [viewing, setViewing] = useState<any>(null);

  async function load() {
    const list = await api("/quotes").catch(() => []);
    setQuotes(list);
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL" ? quotes : quotes.filter((q) => q.status === filter);

  async function update(id: string, body: any) {
    await api(`/quotes/${id}`, { method: "PUT", body: JSON.stringify(body) });
    load();
  }

  async function convert(id: string) {
    if (!confirm("Convert this quote to an order?")) return;
    await api(`/quotes/${id}/convert-to-order`, { method: "POST" });
    load();
    setViewing(null);
  }

  async function sendToQueue(id: string) {
    if (!confirm("Send this quote to the print queue?")) return;
    try {
      await api(`/quotes/${id}/send-to-queue`, { method: "POST" });
      alert("✓ Sent to print queue");
      load();
    } catch (e: any) {
      alert("Failed: " + e.message);
    }
  }
   async function delQuote(id: string) {
     if (!confirm("Permanently delete this quote?")) return;
     try {
       await api(`/quotes/${id}`, { method: "DELETE" });
       if (viewing?.id === id) setViewing(null);
       load();
     } catch (e: any) { alert("Failed: " + e.message); }
   }

  function downloadStl(uplId: string) {
    window.open(`/api/stl/${uplId}/download`, "_blank");
  }

  return (
    <Shell title="Quotes" subtitle="Approve, edit, and send quotes to production">
      <div className="panel">
        <div className="panel-head">
          <h3>Quotes ({filtered.length})</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="icon">✎</div><p>No quotes yet.</p></div>
        ) : (
          <table>
            <thead><tr><th>ID</th><th>Customer</th><th>Material</th><th>Color</th><th>Weight</th><th>Total</th><th>Note</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id}>
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
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setViewing(q)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        />
      )}
    </Shell>
  );
}

function QuoteEditor({ quote, onClose, onUpdate, onConvert, onSendToQueue, onDownload }: any) {
  const [totalCents, setTotalCents] = useState(quote.totalCents || 0);
  const [adminNote, setAdminNote] = useState(quote.adminNote || "");
  const [status, setStatus] = useState(quote.status);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
        <h3>Quote #{quote.id.slice(-8)}</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem" }}>{quote.email} · {fmtDate(quote.createdAt)}</p>

        <div style={{ marginBottom: "1.5rem" }}>
          <StlViewer stlUploadId={quote.stlUploadId} height={320} color={quote.colorRef?.hex || "#2563eb"} />
        </div>

        {/* Customer note from public form */}
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
              {!quote.printJob && <button className="btn btn-sm" onClick={onSendToQueue}>→ Send to Print Queue</button>}
              {quote.printJob && <span className="badge badge-success" style={{ alignSelf: "center" }}>In Print Queue</span>}
              <button className="btn btn-success btn-sm" onClick={onConvert} disabled={quote.status === "CONVERTED"}>→ Convert to Order</button>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn" onClick={() => onUpdate({ totalCents, adminNote, status })}>Save</button>
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
