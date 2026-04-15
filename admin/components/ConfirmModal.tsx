"use client";
import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────

export interface ConfirmOptions {
  title:         string;
  message?:      string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:      "danger" | "primary";
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be inside ConfirmProvider");
  return ctx.confirm;
}

// ─── Provider ─────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts]       = useState<ConfirmOptions | null>(null);
  const resolverRef           = useRef<Resolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
  }, []);

  function resolve(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpts(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div
          className="modal-bg"
          onClick={() => resolve(false)}
          style={{ zIndex: 8000 }}
        >
          <div
            className="modal"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: opts.message ? "0.6rem" : "1.5rem" }}>
              {opts.title}
            </h3>
            {opts.message && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                {opts.message}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => resolve(false)}>
                {opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                className="btn"
                onClick={() => resolve(true)}
                style={opts.variant === "danger"
                  ? { background: "var(--danger)", borderColor: "var(--danger)" }
                  : {}}
                autoFocus
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
