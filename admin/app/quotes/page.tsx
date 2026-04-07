"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";

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

  const filtered = filter === "ALL" ? quotes : quotes.filter(q => q.status === filter);

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

  function downloadStl(uplId: string) {
    window.open(`/api/stl/${uplId}/download`, "_blank");
  }

  return (
    <Shell title="Quotes" subtitle="Approve, edit, and convert customer quotes">
      <div className="panel">
        <div className="panel-head">
          <h3>Quotes ({filtered.length})</h3>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="icon">✎</div><p>No quotes yet.</p></div>
        ) : (
          <table>
            <thead><tr><th>ID</th><th>Customer</th><th>Material</th><th>Weight</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id}>
                  <td>#{q.id.slice(-8)}</td>
                  <td>{q.email}</td>
                  <td>{q.material}</td>
                  <td>{q.weightG ? `${q.weightG}g` : "—"}</td>
                  <td>{fmtMoney(q.totalCents || 0)}</td>
                  <td><span className={`badge ${badge(q.status)}`}>{q.status}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{fmtDate(q.createdAt)}</td>
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
          onUpdate={(body) => update(viewing.id, body).then(() => setViewing({ ...viewing, ...body }))}
          onConvert={() => convert(viewing.id)}
          onDownload={() => downloadStl(viewing.stlUploadId)}
        />
      )}
    </Shell>
  );
}

function QuoteEditor({ quote, onClose, onUpdate, onConvert, onDownload }: any) {
  const [totalCents, setTotalCents] = useState(quote.totalCents || 0);
  const [adminNote, setAdminNote] = useState(quote.adminNote || "");
  const [status, setStatus] = useState(quote.status);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Quote #{quote.id.slice(-8)}</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem" }}>{quote.email} · {fmtDate(quote.createdAt)}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <Stat label="Material" value={quote.material} />
          <Stat label="Infill" value={`${quote.infillPct}%`} />
          <Stat label="Volume" value={quote.volumeCm3 ? `${quote.volumeCm3} cm³` : "—"} />
          <Stat label="Weight" value={quote.weightG ? `${quote.weightG} g` : "—"} />
          <Stat label="Print Time" value={quote.printMinutes ? `${Math.floor(quote.printMinutes / 60)}h ${quote.printMinutes % 60}m` : "—"} />
          <Stat label="Energy" value={quote.energyKwh ? `${quote.energyKwh} kWh` : "—"} />
        </div>

        <div className="form">
          <div>
            <label>Total Price (cents)</label>
            <input type="number" value={totalCents} onChange={e => setTotalCents(+e.target.value)} />
            <div className="help">Currently: {fmtMoney(totalCents)}</div>
          </div>
          <div>
            <label>Admin Note</label>
            <textarea rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {["NEW", "PRICED", "APPROVED", "REJECTED", "CONVERTED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onDownload}>↓ Download STL</button>
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
