"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/auth/me").then((u) => {
      setUser(u);
      return api("/orders/mine");
    }).then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>My Account</h1>
            <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0" }}>{user.email}</p>
          </div>
          <button className="btn btn-outline" onClick={logout}>Log out</button>
        </div>

        <div className="form-card" style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginTop: 0 }}>Recent Orders ({orders.length})</h3>
          {orders.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No orders yet. <Link href="/webshop/" style={{ color: "var(--primary)" }}>Browse the shop</Link></p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {orders.map((o) => (
                <div key={o.id} style={{ background: "var(--bg-soft, #f9fafb)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div>
                    <strong>#{o.id.slice(-8).toUpperCase()}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {new Date(o.createdAt).toLocaleDateString()} · {o.items?.length || 0} item(s)
                    </div>
                    {o.trackingNumber && (
                      <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                        📦 {o.trackingCarrier}: <code>{o.trackingNumber}</code>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>€{(o.totalCents / 100).toFixed(2)}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{o.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
