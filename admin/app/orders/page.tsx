"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";

const STATUSES = ["PENDING", "PAID", "IN_PRODUCTION", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [viewing, setViewing] = useState<any>(null);

  async function load() {
    const list = await api("/orders").catch(() => []);
    setOrders(list);
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL" ? orders : orders.filter(o => o.status === filter);

  async function setStatus(id: string, status: string) {
    await api(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
    if (viewing?.id === id) setViewing({ ...viewing, status });
  }

  return (
    <Shell title="Orders" subtitle="Manage customer orders">
      <div className="panel">
        <div className="panel-head">
          <h3>Orders ({filtered.length})</h3>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="icon">▦</div><p>No orders yet.</p></div>
        ) : (
          <table>
            <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td>#{o.id.slice(-8)}</td>
                  <td>{o.email}</td>
                  <td>{fmtMoney(o.totalCents)}</td>
                  <td><span className={`badge ${badge(o.status)}`}>{o.status}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{fmtDate(o.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setViewing(o)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewing && (
        <div className="modal-bg" onClick={() => setViewing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Order #{viewing.id.slice(-8)}</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>{viewing.email} · {fmtDate(viewing.createdAt)}</p>
            <div style={{ marginBottom: "1.5rem" }}>
              <strong>Items</strong>
              <table style={{ marginTop: "0.5rem" }}>
                <tbody>
                  {(viewing.items || []).map((it: any) => (
                    <tr key={it.id}><td>{it.name}</td><td>×{it.qty}</td><td style={{ textAlign: "right" }}>{fmtMoney(it.priceCents * it.qty)}</td></tr>
                  ))}
                  <tr><td colSpan={2}><strong>Total</strong></td><td style={{ textAlign: "right" }}><strong>{fmtMoney(viewing.totalCents)}</strong></td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <label>Status</label>
              <select value={viewing.status} onChange={e => setStatus(viewing.id, e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function badge(s: string) {
  if (["PAID", "COMPLETED", "SHIPPED"].includes(s)) return "badge-success";
  if (["PENDING", "IN_PRODUCTION"].includes(s)) return "badge-warning";
  if (["CANCELLED", "REFUNDED"].includes(s)) return "badge-danger";
  return "badge-muted";
}
