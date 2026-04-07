"use client";
import Link from "next/link";
import { useCart } from "../lib/cart";

export default function CartDrawer() {
  const { items, isOpen, close, subtotalCents, updateQty, remove } = useCart();
  return (
    <>
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity .2s", zIndex: 100,
        }}
      />
      <aside
        style={{
          position: "fixed", top: 0, right: 0, height: "100vh", width: "min(420px, 100vw)",
          background: "#fff", boxShadow: "-8px 0 32px rgba(0,0,0,0.2)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform .25s ease", zIndex: 101,
          display: "flex", flexDirection: "column",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>Your Cart ({items.length})</h3>
          <button onClick={close} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>×</button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem 1rem" }}>
              <p>Your cart is empty</p>
              <Link href="/webshop/" onClick={close} className="btn" style={{ marginTop: "1rem", display: "inline-block" }}>Browse shop</Link>
            </div>
          ) : items.map((it) => (
            <div key={it.productId} style={{ display: "flex", gap: "0.85rem", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
              <img src={it.image} alt={it.name} style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover", background: "var(--bg-accent)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{it.name}</div>
                <div style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.9rem", margin: "0.25rem 0" }}>€{(it.priceCents / 100).toFixed(2)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button onClick={() => updateQty(it.productId, it.qty - 1)} style={qtyBtn}>−</button>
                  <span style={{ minWidth: 20, textAlign: "center", fontSize: "0.85rem" }}>{it.qty}</span>
                  <button onClick={() => updateQty(it.productId, it.qty + 1)} style={qtyBtn}>+</button>
                  <button onClick={() => remove(it.productId)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <footer style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
              <strong style={{ fontSize: "1.15rem" }}>€{(subtotalCents / 100).toFixed(2)}</strong>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Shipping calculated at checkout</p>
            <Link href="/checkout/" onClick={close} className="btn btn-lg" style={{ width: "100%", textAlign: "center" }}>Checkout →</Link>
          </footer>
        )}
      </aside>
    </>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 4, border: "1px solid var(--border)",
  background: "#fff", cursor: "pointer", fontWeight: 700,
};
