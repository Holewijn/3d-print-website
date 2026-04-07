"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";

export default function InvoicesAdmin() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const list = await api("/invoices").catch(() => []);
    setInvoices(list);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function emailInvoice(id: string) {
    if (!confirm("Email this invoice to the customer?")) return;
    setBusyId(id);
    try {
      await api(`/invoices/${id}/email`, { method: "POST" });
      alert("✓ Invoice sent");
      load();
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally { setBusyId(null); }
  }

  async function regenerate(id: string) {
    if (!confirm("Delete the existing PDF and regenerate? The invoice number stays the same.")) return;
    setBusyId(id);
    try {
      await api(`/invoices/${id}/regenerate`, { method: "POST" });
      load();
    } finally { setBusyId(null); }
  }

  function download(id: string) {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  }

  return (
    <Shell title="Invoices" subtitle="All invoices issued">
      <div className="panel">
        <div className="panel-head">
          <h3>Invoices ({invoices.length})</h3>
        </div>
        {loading ? <p>Loading…</p> : invoices.length === 0 ? (
          <div className="empty"><div className="icon">📄</div><p>No invoices yet. Invoices are generated automatically when an order is paid.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th><th>Customer</th><th>Issued</th><th>Total</th><th>Status</th><th>Email</th><th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><strong>{inv.number}</strong></td>
                  <td>{inv.customerName}<br /><span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{inv.customerEmail}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{fmtDate(inv.issuedAt)}</td>
                  <td><strong>{fmtMoney(inv.totalCents)}</strong></td>
                  <td>{inv.paidAt ? <span className="badge badge-success">Paid</span> : <span className="badge badge-warning">Unpaid</span>}</td>
                  <td>{inv.emailSent ? <span className="badge badge-success">Sent</span> : <span className="badge badge-muted">Not sent</span>}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => download(inv.id)}>↓ PDF</button>{" "}
                    <button className="btn btn-sm btn-outline" onClick={() => emailInvoice(inv.id)} disabled={busyId === inv.id}>✉ Email</button>{" "}
                    <button className="btn btn-sm btn-outline" onClick={() => regenerate(inv.id)} disabled={busyId === inv.id}>↻</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
