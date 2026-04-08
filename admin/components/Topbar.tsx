"use client";
import AlertBell from "./AlertBell";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="topbar">
      <div>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 800 }}>{title}</h1>
        {subtitle && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <AlertBell />
      </div>
    </div>
  );
}
