"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";

export default function InvoicesAdmin() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [paymentModal, setPaymentModal] = useState<any>(null);

  async function load() {
    setInvoices(await api("/invoices").catch(() => []));
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL"
    ? invoices
    : filter === "PAID"
      ? invoices.filter((i) => !!i.paidAt)
      : filter === "UNPAID"
        ? invoices.filter((i) => !i.paidAt)
        : invoices;

  function downloadPdf(id: string) {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  }

  async function emailInvoice(id: string) {
    if (!confirm("Email this invoice (PDF only) to the customer?")) return;
    try {
      await api(`/invoices/${id}/email`, { method: "POST" });
      alert("✓ Invoice emailed");
      load();
    } catch (e: any) { alert("Failed: " + e.message); }
  }

  async function delInvoice(id: string) {
    if (!confirm("Permanently delete this invoice?")) return;
    try {
      await api(`/invoices/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { alert("Failed: " + e.message); }
  }

  return (
    <Shell title="Invoices" subtitle="Manage invoices and payment links">
      <div className="panel">
        <div className="panel-head">
          <h3>Invoices ({filtered.length})</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="ALL">All</option>
            <option value="PAID">Paid only</option>
            <option value="UNPAID">Unpaid only</option>
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="icon">📄</div><p>No invoices yet.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Issued</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.number}</strong></td>
                  <td>{i.order?.email || "—"}</td>
                  <td>{fmtMoney(i.totalCents)}</td>
                  <td>
                    {i.paidAt ? (
                      <span className="badge badge-success" title={`Paid ${fmtDate(i.paidAt)}`}>✓ Paid</span>
                    ) : i.molliePaymentId ? (
                      <span className="badge badge-warning">⏳ Pending</span>
                    ) : (
                      <span className="badge badge-muted">Unpaid</span>
                    )}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{fmtDate(i.createdAt)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => downloadPdf(i.id)}>📄 PDF</button>{" "}
                    {!i.paidAt && (
                      <button className="btn btn-sm" onClick={() => setPaymentModal(i)}>💳 Payment Link</button>
                    )}{" "}
                    <button className="btn btn-sm btn-outline" onClick={() => emailInvoice(i.id)}>✉</button>{" "}
                    <button className="btn btn-sm btn-danger" onClick={() => delInvoice(i.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {paymentModal && (
        <PaymentLinkModal
          invoice={paymentModal}
          onClose={() => setPaymentModal(null)}
          onUpdated={() => { setPaymentModal(null); load(); }}
        />
      )}
    </Shell>
  );
}

function PaymentLinkModal({ invoice, onClose, onUpdated }: any) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string>("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailed, setEmailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  // Try to fetch existing payment status on open
  useEffect(() => {
    if (!invoice.molliePaymentId) return;
    api(`/invoices/${invoice.id}/payment-status`)
      .then((s) => { if (s.checkoutUrl) setLink(s.checkoutUrl); })
      .catch(() => {});
  }, [invoice.id, invoice.molliePaymentId]);

  async function generate() {
    setBusy(true); setErr("");
    try {
      const r = await api(`/invoices/${invoice.id}/payment-link`, { method: "POST" });
      setLink(r.checkoutUrl);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function emailLink() {
    setEmailBusy(true); setErr("");
    try {
      await api(`/invoices/${invoice.id}/email-payment-link`, { method: "POST" });
      setEmailed(true);
      setTimeout(() => setEmailed(false), 3000);
    } catch (e: any) { setErr(e.message); }
    finally { setEmailBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3>Payment Link — {invoice.number}</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Generate a secure Mollie payment link for {invoice.order?.email || "this customer"}.
          Total: <strong>{fmtMoney(invoice.totalCents)}</strong>
        </p>

        {!link ? (
          <div>
            <button className="btn btn-lg" disabled={busy} onClick={generate} style={{ width: "100%" }}>
              {busy ? "Creating link…" : "Generate Payment Link"}
            </button>
            {err && <div className="error" style={{ marginTop: "0.75rem" }}>{err}</div>}
          </div>
        ) : (
          <div>
            <div style={{ background: "var(--bg-elev-2)", padding: "0.75rem", borderRadius: 6, marginBottom: "1rem", wordBreak: "break-all", fontSize: "0.78rem", fontFamily: "ui-monospace, monospace" }}>
              {link}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button className="btn btn-outline" onClick={copyLink} style={{ flex: 1 }}>
                {copied ? "✓ Copied!" : "📋 Copy Link"}
              </button>
              <button className="btn" disabled={emailBusy} onClick={emailLink} style={{ flex: 1 }}>
                {emailBusy ? "Sending…" : emailed ? "✓ Sent!" : "✉ Email to Customer"}
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
              The customer will see a Mollie checkout page where they can pay with iDEAL, credit card, Bancontact, etc. The invoice is automatically marked as paid when the payment succeeds.
            </p>
            {err && <div className="error" style={{ marginTop: "0.75rem" }}>{err}</div>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
