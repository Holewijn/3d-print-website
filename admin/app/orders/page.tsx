"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";

const STATUSES = ["PENDING", "PAID", "IN_PRODUCTION", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [viewing, setViewing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await api("/orders").catch(() => []);
    setOrders(list);
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  async function setStatus(id: string, status: string) {
    await api(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
    if (viewing?.id === id) setViewing({ ...viewing, status });
  }

  async function generateInvoice(orderId: string) {
    setBusy(true);
    try {
      const inv = await api(`/invoices/order/${orderId}`, { method: "POST" });
      alert(`✓ Invoice ${inv.number} created`);
      load();
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally { setBusy(false); }
  }

  async function emailInvoice(orderId: string) {
    setBusy(true);
    try {
      const order = await api(`/orders/${orderId}`);
      // Find or create invoice
      let invoice;
      try {
        const all = await api("/invoices");
        invoice = all.find((i: any) => i.orderId === orderId);
      } catch {}
      if (!invoice) {
        invoice = await api(`/invoices/order/${orderId}`, { method: "POST" });
      }
      await api(`/invoices/${invoice.id}/email`, { method: "POST" });
      alert("✓ Invoice emailed to " + order.email);
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally { setBusy(false); }
  }

  function downloadInvoice(orderId: string) {
    api("/invoices").then((all: any[]) => {
      const inv = all.find((i: any) => i.orderId === orderId);
      if (!inv) {
        if (confirm("No invoice yet for this order. Create one now?")) generateInvoice(orderId);
        return;
      }
      window.open(`/api/invoices/${inv.id}/pdf`, "_blank");
    });
  }

  function downloadPackingSlip(orderId: string) {
    window.open(`/api/invoices/order/${orderId}/packing-slip`, "_blank");
  }

  return (
    <Shell title="Orders" subtitle="Manage customer orders">
      <div className="panel">
        <div className="panel-head">
          <h3>Orders ({filtered.length})</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="icon">▦</div><p>No orders yet.</p></div>
        ) : (
          <table>
            <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {filtered.map((o) => (
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
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3>Order #{viewing.id.slice(-8)}</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>{viewing.email} · {fmtDate(viewing.createdAt)}</p>

            <div style={{ marginBottom: "1.5rem" }}>
              <strong>Items</strong>
              <table style={{ marginTop: "0.5rem" }}>
                <tbody>
                  {(viewing.items || []).map((it: any) => (
                    <tr key={it.id}><td>{it.name}</td><td>×{it.qty}</td><td style={{ textAlign: "right" }}>{fmtMoney(it.priceCents * it.qty)}</td></tr>
                  ))}
                  <tr><td colSpan={2}><strong>Subtotal</strong></td><td style={{ textAlign: "right" }}>{fmtMoney(viewing.subtotalCents || 0)}</td></tr>
                  {viewing.shippingCents > 0 && <tr><td colSpan={2}>Shipping ({viewing.shippingMethod})</td><td style={{ textAlign: "right" }}>{fmtMoney(viewing.shippingCents)}</td></tr>}
                  <tr><td colSpan={2}><strong>Total</strong></td><td style={{ textAlign: "right" }}><strong>{fmtMoney(viewing.totalCents)}</strong></td></tr>
                </tbody>
              </table>
            </div>

            {viewing.shippingAddr && (
              <div style={{ marginBottom: "1.5rem" }}>
                <strong>Shipping To</strong>
                <div style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem", whiteSpace: "pre-line" }}>
                  {viewing.shippingName}{"\n"}
                  {viewing.shippingAddr.line1}{viewing.shippingAddr.line2 ? "\n" + viewing.shippingAddr.line2 : ""}{"\n"}
                  {viewing.shippingAddr.postalCode} {viewing.shippingAddr.city}{"\n"}
                  {viewing.shippingAddr.country}
                </div>
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <label>Status</label>
              <select value={viewing.status} onChange={(e) => setStatus(viewing.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
   {viewing.stlUploadId && (
     <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1rem", background: "var(--bg-elev-2)", borderRadius: 8 }}>
       <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
         Attached STL File
       </div>
       
         href={`/api/stl/${viewing.stlUploadId}/download`}
         className="btn btn-sm btn-outline"
         target="_blank"
         rel="noopener"
       >
         ↓ Download STL
       </a>
     </div>
   )}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginBottom: "1rem" }}>
              <strong style={{ display: "block", marginBottom: "0.75rem" }}>Documents</strong>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn btn-sm" disabled={busy} onClick={() => downloadInvoice(viewing.id)}>📄 Invoice PDF</button>
                <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => downloadPackingSlip(viewing.id)}>📦 Packing Slip</button>
                <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => emailInvoice(viewing.id)}>✉ Email Invoice</button>
                <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => generateInvoice(viewing.id)}>+ Generate Invoice</button>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
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
