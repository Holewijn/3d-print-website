"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import StlViewer from "../../components/StlViewer";

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [viewingQuote, setViewingQuote] = useState<any>(null);

  useEffect(() => {
    api("/auth/me").then(setMe).catch(() => { window.location.href = "/login/"; });
    api("/users/me/orders").then(setOrders).catch(() => {});
    api("/users/me/quotes").then(setQuotes).catch(() => {});
    api("/invoices/me/list").then(setInvoices).catch(() => {});
  }, []);

  if (!me) return <section><div className="container"><p>Loading…</p></div></section>;

  const invoiceByOrder: Record<string, any> = {};
  for (const inv of invoices) invoiceByOrder[inv.orderId] = inv;

  return (
    <>
      <div className="page-header">
        <div className="container"><h1>My Account</h1><p>Logged in as {me.email}</p></div>
      </div>

      <section>
        <div className="container">
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Profile</h2>
          <div className="form-card" style={{ marginBottom: "3rem", maxWidth: "100%" }}>
            <ProfileForm me={me} onSaved={setMe} />
          </div>

          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Orders ({orders.length})</h2>
          {orders.length === 0 ? <p style={{ color: "var(--text-muted)", marginBottom: "3rem" }}>No orders yet.</p> : (
            <div style={{ marginBottom: "3rem" }}>
              {orders.map((o) => {
                const inv = invoiceByOrder[o.id];
                return (
                  <div key={o.id} className="card" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Order #{o.id.slice(-8).toUpperCase()}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        {new Date(o.createdAt).toLocaleDateString()} · {o.status}
                        {inv && ` · Invoice ${inv.number}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>€{(o.totalCents / 100).toFixed(2)}</div>
                      {inv && <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" className="btn btn-outline" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>↓ Invoice</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Quotes ({quotes.length})</h2>
          {quotes.length === 0 ? <p style={{ color: "var(--text-muted)" }}>No quotes yet.</p> : (
            <div>
              {quotes.map((q) => (
                <div key={q.id} className="card" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Quote #{q.id.slice(-8)}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{q.material} · {q.weightG}g · {q.status}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>€{((q.totalCents || 0) / 100).toFixed(2)}</div>
                    <button className="btn btn-outline" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }} onClick={() => setViewingQuote(q)}>View 3D</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {viewingQuote && (
        <div onClick={() => setViewingQuote(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "grid", placeItems: "center", zIndex: 100, padding: "1rem" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", maxWidth: 720, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem" }}>Quote #{viewingQuote.id.slice(-8)}</h3>
              <button onClick={() => setViewingQuote(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
            </div>
            <StlViewer stlUploadId={viewingQuote.stlUploadId} height={400} />
            <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", fontSize: "0.85rem" }}>
              <div><strong>Volume:</strong> {viewingQuote.volumeCm3} cm³</div>
              <div><strong>Weight:</strong> {viewingQuote.weightG}g</div>
              <div><strong>Material:</strong> {viewingQuote.material}</div>
              <div><strong>Time:</strong> {Math.floor(viewingQuote.printMinutes / 60)}h {viewingQuote.printMinutes % 60}m</div>
              <div><strong>Status:</strong> {viewingQuote.status}</div>
              <div><strong>Total:</strong> €{((viewingQuote.totalCents || 0) / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileForm({ me, onSaved }: any) {
  const [f, setF] = useState({ ...me });
  const [saved, setSaved] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const updated = await api("/users/me/profile", { method: "PUT", body: JSON.stringify(f) });
    onSaved(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return (
    <form onSubmit={save}>
      <div className="form-row">
        <div><label>First name</label><input value={f.firstName || ""} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
        <div><label>Last name</label><input value={f.lastName || ""} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></div>
      </div>
      <div><label>Phone</label><input value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div><label>Address</label><input value={f.addressLine1 || ""} onChange={(e) => setF({ ...f, addressLine1: e.target.value })} /></div>
      <div className="form-row">
        <div><label>City</label><input value={f.city || ""} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
        <div><label>Postal code</label><input value={f.postalCode || ""} onChange={(e) => setF({ ...f, postalCode: e.target.value })} /></div>
      </div>
      <button className="btn">Save Profile</button>
      {saved && <div className="success">✓ Saved</div>}
    </form>
  );
}
