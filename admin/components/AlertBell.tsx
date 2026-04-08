"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

export default function AlertBell() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const list = await api("/inventory/alerts").catch(() => []);
    setAlerts(list);
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const unread = alerts.filter((a) => !a.read).length;

  async function markAllRead() {
    await api("/inventory/alerts/read-all", { method: "POST", body: JSON.stringify({}) });
    load();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Alerts"
        style={{
          background: "transparent", border: "1px solid var(--border)",
          width: 38, height: 38, borderRadius: 8, cursor: "pointer",
          color: "var(--text)", display: "grid", placeItems: "center",
          position: "relative",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#ef4444", color: "#fff", borderRadius: 10,
            fontSize: "0.65rem", fontWeight: 700, minWidth: 18, height: 18,
            display: "grid", placeItems: "center", padding: "0 4px",
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 340, maxHeight: 480, overflow: "auto",
            background: "var(--bg-elev)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            zIndex: 91,
          }}>
            <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Alerts</strong>
              {unread > 0 && <button className="btn btn-sm btn-outline" onClick={markAllRead}>Mark all read</button>}
            </div>
            {alerts.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>No alerts</div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} style={{
                  padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)",
                  background: a.read ? "transparent" : "var(--primary-soft)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: a.color?.hex || "#ccc" }} />
                    <strong style={{ fontSize: "0.85rem" }}>Low stock: {a.material?.name} {a.color?.name}</strong>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Current: {a.currentG}g · Threshold: {a.thresholdG}g · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
            <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)", textAlign: "center" }}>
              <Link href="/inventory/" onClick={() => setOpen(false)} style={{ color: "var(--primary)", fontSize: "0.82rem", fontWeight: 600 }}>View inventory →</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
