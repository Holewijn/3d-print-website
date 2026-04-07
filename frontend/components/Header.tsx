"use client";
import Link from "next/link";
import { useCart } from "../lib/cart";

export default function Header() {
  const { count, open } = useCart();
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="logo">
          <span className="logo-mark">▲</span>
          <span>3D Print Studio</span>
        </Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/services/">Services</Link>
          <Link href="/webshop/">Shop</Link>
          <Link href="/portfolio/">Portfolio</Link>
          <Link href="/about/">About</Link>
          <Link href="/contact/">Contact</Link>
          <button onClick={open} aria-label="Open cart" style={{
            position: "relative", background: "transparent", border: "1px solid var(--border)",
            width: 42, height: 42, borderRadius: 8, cursor: "pointer", color: "var(--text)",
            display: "grid", placeItems: "center", fontSize: "1.1rem",
          }}>
            ◴
            {count > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6, background: "var(--primary)",
                color: "#fff", borderRadius: 12, fontSize: "0.7rem", fontWeight: 700,
                minWidth: 20, height: 20, display: "grid", placeItems: "center", padding: "0 5px",
              }}>{count}</span>
            )}
          </button>
          <Link href="/quote/" className="btn">Get a Quote</Link>
        </nav>
      </div>
    </header>
  );
}
