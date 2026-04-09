"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";

export default function OrderThanks() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const [order, setOrder] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    function load() {
      api(`/orders/public/${id}`)
        .then((o) => { if (!cancelled) setOrder(o); })
        .catch(() => { if (!cancelled) setNotFound(true); });
    }
    load();
    const t = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [id]);

  if (notFound) return <div className="container" style={{ padding: "4rem 1rem", textAlign: "center" }}><h1>Order not found</h1></div>;
  if (!order) return <div className="container" style={{ padding: "4rem 1rem" }}>Loading…</div>;

  const isPaid = ["PAID", "IN_PRODUCTION", "SHIPPED", "COMPLETED"].includes(order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <section style={{ padding: "5rem 0" }}>
      <div className="container" style={{ maxWidth: 700, textAlign: "center" }}>
        {isPaid && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center", margin: "0 auto 1.5rem", fontSize: "2.5rem" }}>✓</div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.75rem" }}>Thank you!</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", marginBottom: "2rem" }}>Your order has been received and is being prepared.</p>
          </>
        )}
        {isCancelled && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "grid", placeItems: "center", margin: "0 auto 1.5rem", fontSize: "2.5rem" }}>×</div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.75rem" }}>Payment cancelled</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", marginBottom: "2rem" }}>Your order was not completed. No charge has been made.</p>
          </>
        )}
        {!isPaid && !isCancelled && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center", margin: "0 auto 1.5rem", fontSize: "2rem" }}>⋯</div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.75rem" }}>Processing payment…</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Waiting for confirmation. This page will refresh automatically.</p>
          </>
        )}

        <div className="form-card" style={{ textAlign: "left", margin: "0 auto", maxWidth: 500 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Order ID</div>
              <div style={{ fontWeight: 700 }}>#{order.id.slice(-8).toUpperCase()}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Status</div>
              <div style={{ fontWeight: 700 }}>{order.status}</div>
            </div>
          </div>
          {(order.items || []).map((it: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <span>{it.name} × {it.qty}</span>
              <span>€{((it.priceCents * it.qty) / 100).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ paddingTop: "1rem", marginTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", fontWeight: 800, fontSize: "1.1rem" }}>
              <span>Total</span><span style={{ color: "var(--primary)" }}>€{(order.totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2rem" }}>A confirmation email has been sent to {order.email}</p>
        <Link href="/" className="btn btn-outline" style={{ marginTop: "1rem" }}>← Back to home</Link>
      </div>
    </section>
  );
}
