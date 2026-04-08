"use client";
import { useCart } from "../lib/cart";

export default function CartButton({ color }: { color?: string }) {
  const { count, open } = useCart();
  const accent = color || "var(--primary)";
  return (
    <button
      onClick={open}
      aria-label="Open cart"
      style={{
        position: "relative",
        background: "transparent",
        border: "1px solid var(--border)",
        width: 42,
        height: 42,
        borderRadius: 8,
        cursor: "pointer",
        color: "var(--text)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: accent,
            color: "#fff",
            borderRadius: 12,
            fontSize: "0.7rem",
            fontWeight: 700,
            minWidth: 20,
            height: 20,
            display: "grid",
            placeItems: "center",
            padding: "0 5px",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
