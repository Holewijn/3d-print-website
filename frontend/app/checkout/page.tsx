"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../../lib/cart";
import { api } from "../../lib/api";

const COUNTRIES = [
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

export default function Checkout() {
  const { items, subtotalCents, totalWeightG, clear } = useCart();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "", phone: "",
    address1: "", address2: "", city: "", postalCode: "", country: "NL",
  });
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Auto-fill if logged in
  useEffect(() => {
    api("/auth/me").then((u) => {
      setMe(u);
      setForm((f) => ({
        ...f,
        email: u.email || f.email,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        phone: u.phone || "",
        address1: u.addressLine1 || "",
        address2: u.addressLine2 || "",
        city: u.city || "",
        postalCode: u.postalCode || "",
        country: u.country || "NL",
      }));
    }).catch(() => {});
  }, []);

  // Recalculate shipping when country/cart changes
  useEffect(() => {
    if (items.length === 0) return;
    setLoadingShipping(true);
    api("/shipping/calculate", {
      method: "POST",
      body: JSON.stringify({ country: form.country, subtotalCents, weightG: totalWeightG }),
    })
      .then((r) => {
        setShippingOptions(r.options || []);
        if (r.options && r.options.length > 0 && !r.options.find((o: any) => o.id === selectedRateId)) {
          setSelectedRateId(r.options[0].id);
        }
      })
      .catch(() => setShippingOptions([]))
      .finally(() => setLoadingShipping(false));
  }, [form.country, subtotalCents, totalWeightG, items.length]);

  const selectedRate = shippingOptions.find((o) => o.id === selectedRateId);
  const shippingCents = selectedRate?.costCents || 0;
  const totalCents = subtotalCents + shippingCents;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    if (!selectedRateId) { setErr("Please select a shipping method"); return; }
    setBusy(true); setErr("");
    try {
      const order = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          shippingName: `${form.firstName} ${form.lastName}`.trim(),
          shippingPhone: form.phone,
          shippingAddr: {
            line1: form.address1,
            line2: form.address2,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
          shippingRateId: selectedRateId,
        }),
      });

      // Create Mollie payment
      const payment = await api(`/payments/create/${order.id}`, { method: "POST" });
      if (payment.checkoutUrl) {
        clear();
        window.location.href = payment.checkoutUrl;
      } else {
        throw new Error("Payment URL missing");
      }
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: "4rem 1rem", textAlign: "center" }}>
        <h1>Your cart is empty</h1>
        <Link href="/webshop/" className="btn" style={{ marginTop: "1rem" }}>Browse shop</Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="container"><h1>Checkout</h1></div>
      </div>
      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "3rem", alignItems: "start" }}>
          {/* Left: form */}
          <form onSubmit={placeOrder}>
            <div className="form-card" style={{ marginBottom: "1.5rem", maxWidth: "100%" }}>
              <h3 style={{ marginBottom: "1.25rem" }}>Contact</h3>
              <div className="form">
                <div><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                {!me && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Have an account? <Link href="/login/" style={{ color: "var(--primary)" }}>Sign in</Link></p>}
              </div>
            </div>

            <div className="form-card" style={{ marginBottom: "1.5rem", maxWidth: "100%" }}>
              <h3 style={{ marginBottom: "1.25rem" }}>Shipping Address</h3>
              <div className="form">
                <div className="form-row">
                  <div><label>First name</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div><label>Last name</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label>Address</label><input value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} required /></div>
                <div><label>Apartment / suite (optional)</label><input value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })} /></div>
                <div className="form-row">
                  <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
                  <div><label>Postal code</label><input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required /></div>
                </div>
                <div>
                  <label>Country</label>
                  <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-card" style={{ marginBottom: "1.5rem", maxWidth: "100%" }}>
              <h3 style={{ marginBottom: "1.25rem" }}>Shipping Method</h3>
              {loadingShipping ? <p>Calculating…</p> : shippingOptions.length === 0 ? (
                <p style={{ color: "#dc2626" }}>No shipping available to {form.country}. Please choose another country.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {shippingOptions.map((o) => (
                    <label key={o.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", border: `2px solid ${selectedRateId === o.id ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", background: selectedRateId === o.id ? "var(--primary-light)" : "#fff" }}>
                      <input type="radio" checked={selectedRateId === o.id} onChange={() => setSelectedRateId(o.id)} style={{ width: "auto" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        {o.description && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{o.description}</div>}
                      </div>
                      <strong>{o.costCents === 0 ? "FREE" : `€${(o.costCents / 100).toFixed(2)}`}</strong>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem" }}>{err}</div>}

            <button type="submit" className="btn btn-lg" disabled={busy || !selectedRateId} style={{ width: "100%" }}>
              {busy ? "Processing…" : `Pay €${(totalCents / 100).toFixed(2)} →`}
            </button>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.75rem", textAlign: "center" }}>
              You'll be redirected to Mollie for secure payment (iDEAL, Bancontact, Credit Card)
            </p>
          </form>

          {/* Right: order summary */}
          <div className="form-card" style={{ position: "sticky", top: 90, maxWidth: "100%" }}>
            <h3 style={{ marginBottom: "1.25rem" }}>Order Summary</h3>
            {items.map((it) => (
              <div key={it.productId} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                <img src={it.image} alt="" style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover" }} />
                <div style={{ flex: 1, fontSize: "0.85rem" }}>
                  <div style={{ fontWeight: 600 }}>{it.name}</div>
                  <div style={{ color: "var(--text-muted)" }}>Qty: {it.qty}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>€{((it.priceCents * it.qty) / 100).toFixed(2)}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
              <span>€{(subtotalCents / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Shipping</span>
              <span>{selectedRate ? (shippingCents === 0 ? "FREE" : `€${(shippingCents / 100).toFixed(2)}`) : "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.75rem", marginTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
              <strong>Total</strong>
              <strong style={{ fontSize: "1.25rem", color: "var(--primary)" }}>€{(totalCents / 100).toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
