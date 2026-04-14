"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "LU", name: "Luxembourg" },
  { code: "AT", name: "Austria" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "GB", name: "United Kingdom" },
  { code: "CH", name: "Switzerland" },
  { code: "NO", name: "Norway" },
  { code: "US", name: "United States" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:       "#f59e0b",
  PAID:          "#3b82f6",
  IN_PRODUCTION: "#8b5cf6",
  SHIPPED:       "#06b6d4",
  COMPLETED:     "#10b981",
  CANCELLED:     "#ef4444",
  REFUNDED:      "#6b7280",
};

function fmtMoney(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ─── Order row (collapsible) ─────────────────────────────
function OrderRow({ order }: { order: any }) {
  const [open, setOpen] = useState(false);
  const addr = order.shippingAddr as any;
  const color = STATUS_COLORS[order.status] || "#6b7280";

  return (
    <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 10, overflow: "hidden" }}>
      {/* Summary row — click to expand */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: "var(--bg-soft, #f9fafb)", border: "none", cursor: "pointer",
          padding: "1rem 1.1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem",
          textAlign: "left",
        }}
      >
        <div>
          <strong style={{ fontFamily: "monospace", fontSize: "0.95rem" }}>
            #{order.id.slice(-8).toUpperCase()}
          </strong>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {fmtDate(order.createdAt)} · {order.items?.length || 0} item(s)
          </div>
          {order.trackingNumber && (
            <div style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
              📦 {order.trackingCarrier}: <span style={{ fontFamily: "monospace" }}>{order.trackingNumber}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>{fmtMoney(order.totalCents)}</div>
            <div style={{
              fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em",
              textTransform: "uppercase", color,
            }}>{order.status}</div>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", userSelect: "none" }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: "1.1rem", background: "#fff", borderTop: "1px solid var(--border, #e5e7eb)" }}>
          {/* Line items */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Items</div>
            <table style={{ width: "100%", fontSize: "0.88rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  <th style={{ textAlign: "left", paddingBottom: "0.3rem", fontWeight: 500 }}>Product</th>
                  <th style={{ textAlign: "center", paddingBottom: "0.3rem", fontWeight: 500 }}>Qty</th>
                  <th style={{ textAlign: "right", paddingBottom: "0.3rem", fontWeight: 500 }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((it: any, i: number) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border, #e5e7eb)" }}>
                    <td style={{ padding: "0.45rem 0" }}>{it.name}</td>
                    <td style={{ padding: "0.45rem 0", textAlign: "center" }}>{it.qty}</td>
                    <td style={{ padding: "0.45rem 0", textAlign: "right" }}>{fmtMoney(it.priceCents * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {order.shippingCents > 0 && (
                  <tr style={{ borderTop: "1px solid var(--border, #e5e7eb)" }}>
                    <td colSpan={2} style={{ padding: "0.45rem 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>Shipping ({order.shippingMethod || "—"})</td>
                    <td style={{ padding: "0.45rem 0", textAlign: "right" }}>{fmtMoney(order.shippingCents)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: "2px solid var(--border, #e5e7eb)" }}>
                  <td colSpan={2} style={{ padding: "0.5rem 0", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: "0.5rem 0", textAlign: "right", fontWeight: 700 }}>{fmtMoney(order.totalCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Shipping address */}
          {addr && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Delivered to</div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                {order.shippingName && <div>{order.shippingName}</div>}
                {addr.line1 && <div>{addr.line1}</div>}
                {addr.line2 && <div>{addr.line2}</div>}
                {(addr.postalCode || addr.city) && <div>{[addr.postalCode, addr.city].filter(Boolean).join(" ")}</div>}
                {addr.country && <div>{addr.country}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────
export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Personal details form
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "",
    addressLine1: "", addressLine2: "", city: "", postalCode: "", country: "NL",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    api("/auth/me").then((u) => {
      setUser(u);
      setForm({
        firstName:    u.firstName    || "",
        lastName:     u.lastName     || "",
        phone:        u.phone        || "",
        addressLine1: u.addressLine1 || "",
        addressLine2: u.addressLine2 || "",
        city:         u.city         || "",
        postalCode:   u.postalCode   || "",
        country:      u.country      || "NL",
      });
      return api("/orders/mine");
    }).then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      const updated = await api("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveErr(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container" style={{ padding: "4rem 1rem" }}>Loading…</div>;
  if (!user) return (
    <div className="container" style={{ padding: "4rem 1rem", textAlign: "center" }}>
      <h1>Not logged in</h1>
      <Link href="/login/" className="btn" style={{ marginTop: "1rem" }}>Log in</Link>
    </div>
  );

  return (
    <section style={{ padding: "3rem 0" }}>
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>My Account</h1>
            <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0" }}>{user.email}</p>
          </div>
          <button className="btn btn-outline" onClick={logout}>Log out</button>
        </div>

        {/* Orders */}
        <div className="form-card" style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: "1.1rem" }}>My Orders ({orders.length})</h3>
          {orders.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              No orders yet.{" "}
              <Link href="/webshop/" style={{ color: "var(--primary)" }}>Browse the shop</Link>
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {orders.map((o) => <OrderRow key={o.id} order={o} />)}
            </div>
          )}
        </div>

        {/* Personal details */}
        <div className="form-card">
          <h3 style={{ marginTop: 0, marginBottom: "1.1rem" }}>Personal Details</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 0, marginBottom: "1.25rem" }}>
            Saved details are pre-filled automatically at checkout.
          </p>
          <form onSubmit={saveProfile} className="form">
            <div className="form-row">
              <div>
                <label>First name</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label>Last name</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label>Address</label>
              <input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} placeholder="Street and number" />
            </div>
            <div>
              <label>Apartment / suite (optional)</label>
              <input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
            </div>
            <div className="form-row">
              <div>
                <label>City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label>Postal code</label>
                <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </div>
            </div>
            <div>
              <label>Country</label>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>

            {saveErr && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "0.65rem 0.9rem", borderRadius: 8, fontSize: "0.88rem" }}>
                {saveErr}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving…" : "Save details"}
              </button>
              {saved && <span style={{ fontSize: "0.88rem", color: "#16a34a", fontWeight: 600 }}>Saved!</span>}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
