"use client";
import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────

export type ToastKind = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  info:    (msg: string) => void;
  warn:    (msg: string) => void;
}

// ─── Context ──────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const push = useCallback((kind: ToastKind, message: string, duration = kind === "error" ? 6000 : 3500) => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-4), { id, kind, message, duration }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const ctx: ToastContextValue = {
    success: (m) => push("success", m),
    error:   (m) => push("error", m),
    info:    (m) => push("info", m),
    warn:    (m) => push("warning", m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastStack toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </ToastContext.Provider>
  );
}

// ─── Stack renderer ───────────────────────────────────────

const ICONS: Record<ToastKind, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
};

const COLORS: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: "#22c55e", icon: "#22c55e" },
  error:   { bar: "#ef4444", icon: "#ef4444" },
  info:    { bar: "#3b82f6", icon: "#60a5fa" },
  warning: { bar: "#f59e0b", icon: "#f59e0b" },
};

function ToastStack({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem",
      display: "flex", flexDirection: "column", gap: "0.5rem",
      zIndex: 9999, pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: "all",
            background: "var(--bg-elev-2)",
            border: "1px solid var(--border)",
            borderLeft: `3px solid ${COLORS[t.kind].bar}`,
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem 1rem",
            display: "flex", alignItems: "flex-start", gap: "0.65rem",
            minWidth: 280, maxWidth: 380,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            cursor: "pointer",
            animation: "toast-in 0.2s ease",
          }}
        >
          <span style={{ color: COLORS[t.kind].icon, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
            {ICONS[t.kind]}
          </span>
          <span style={{ fontSize: "0.875rem", lineHeight: 1.45, color: "var(--text)" }}>
            {t.message}
          </span>
        </div>
      ))}
    </div>
  );
}
