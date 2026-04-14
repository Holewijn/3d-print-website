"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Shell from "../../components/Shell";

// ─── Types ────────────────────────────────────────────────

interface Status {
  localHash: string;
  remoteHash: string;
  branch: string;
  behind: number;
  ahead: number;
  upToDate: boolean;
  lastCommit: { message: string; author: string; date: string };
  nodeVersion: string;
  uptime: number;
}

interface Commit {
  hash: string;
  short: string;
  message: string;
  author: string;
  date: string;
}

interface LogLine {
  kind: "out" | "err" | "meta" | "ok" | "fail";
  text: string;
  ts: number;
}

type Action = "update" | "rollback" | "restart" | null;

// ─── Helpers ──────────────────────────────────────────────

function timeAgo(iso: string) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtUptime(s: number) {
  if (s < 60)    return `${Math.floor(s)}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

function hhmm(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function short(hash: string) { return hash?.slice(0, 8) ?? ""; }

// ─── Spinner ──────────────────────────────────────────────

function Spinner({ size = 14 }: { size?: number }) {
  const t = Math.max(1, Math.round(size / 7));
  return (
    <span style={{
      display: "inline-block", width: size, height: size, flexShrink: 0,
      border: `${t}px solid currentColor`, borderTopColor: "transparent",
      borderRadius: "50%", animation: "u-spin 0.65s linear infinite",
    }} />
  );
}

// ─── StatusCard ───────────────────────────────────────────

function StatusCard({ status, loading, onRefresh }: { status: Status | null; loading: boolean; onRefresh: () => void }) {
  const dot = loading ? "#5b6883"
    : !status       ? "#ef4444"
    : status.upToDate ? "#22c55e"
    : "#f59e0b";

  const dotShadow = loading || !status ? "none"
    : status.upToDate ? "0 0 10px #22c55e88"
    : "0 0 10px #f59e0b88";

  return (
    <div style={{
      background: "var(--bg-elev)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "1.25rem 1.5rem",
      marginBottom: "1.25rem", display: "flex", alignItems: "flex-start",
      justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        {/* LED */}
        <div style={{ paddingTop: 4 }}>
          <div style={{
            width: 13, height: 13, borderRadius: "50%",
            background: dot, boxShadow: dotShadow,
            animation: !loading && status && !status.upToDate ? "u-pulse 2s ease-in-out infinite" : "none",
          }} />
        </div>
        {/* Info */}
        <div>
          {loading ? (
            <div style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Spinner size={12} /> Checking for updates…
            </div>
          ) : !status ? (
            <div style={{ color: "var(--danger)" }}>Could not reach server</div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                {status.upToDate
                  ? "Up to date"
                  : <span style={{ color: "var(--warning)" }}>{status.behind} commit{status.behind !== 1 ? "s" : ""} behind</span>
                }
                {status.ahead > 0 && (
                  <span style={{ marginLeft: "0.6rem", fontSize: "0.8rem", color: "var(--primary)", fontWeight: 500 }}>
                    {status.ahead} ahead
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.25rem 0 0.4rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <span>Branch: <code style={{ color: "var(--primary)" }}>{status.branch}</code></span>
                <span>Local: <code style={{ color: "var(--text)" }}>{short(status.localHash)}</code></span>
                {!status.upToDate && <span>Remote: <code style={{ color: "var(--warning)" }}>{short(status.remoteHash)}</code></span>}
              </div>
              <div style={{ fontSize: "0.88rem" }}>
                <span style={{ color: "var(--text-muted)" }}>"{status.lastCommit.message}"</span>
                <span style={{ color: "var(--text-dim)", marginLeft: "0.5rem", fontSize: "0.78rem" }}>
                  — {status.lastCommit.author} · {timeAgo(status.lastCommit.date)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side: meta + check button */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}>
        <button
          className="btn btn-sm btn-outline"
          onClick={onRefresh}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          {loading ? <Spinner size={11} /> : "↺"} Check
        </button>
        {status && (
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", textAlign: "right", lineHeight: 1.7 }}>
            <div>Node {status.nodeVersion}</div>
            <div>Uptime {fmtUptime(status.uptime)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function UpdatePage() {
  const [status, setStatus]               = useState<Status | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [commits, setCommits]             = useState<Commit[]>([]);
  const [rollbackOpen, setRollbackOpen]   = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<Commit | null>(null);
  const [lines, setLines]                 = useState<LogLine[]>([]);
  const [running, setRunning]             = useState<Action>(null);
  const [lastExit, setLastExit]           = useState<number | null>(null);

  const consoleRef  = useRef<HTMLDivElement>(null);
  const atBottom    = useRef(true);
  const abortRef    = useRef<AbortController | null>(null);

  // ── Data loaders ──

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const r = await fetch("/api/admin/status", { credentials: "include" });
      if (r.ok) setStatus(await r.json());
      else setStatus(null);
    } catch { setStatus(null); }
    finally { setStatusLoading(false); }
  }, []);

  const loadCommits = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/git-log", { credentials: "include" });
      if (r.ok) setCommits(await r.json());
    } catch {}
  }, []);

  useEffect(() => { loadStatus(); loadCommits(); }, [loadStatus, loadCommits]);

  // ── Console auto-scroll ──

  useEffect(() => {
    if (atBottom.current && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [lines]);

  function onConsoleScroll() {
    const el = consoleRef.current;
    if (!el) return;
    atBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
  }

  function scrollToBottom() {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    atBottom.current = true;
  }

  // ── Streaming runner ──

  function appendLine(kind: LogLine["kind"], text: string) {
    setLines((l) => [...l, { kind, text, ts: Date.now() }]);
  }

  async function runStream(path: string, body: object | null, label: string) {
    appendLine("meta", `\n▸ ${label}\n`);
    atBottom.current = true;
    setLastExit(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const resp = await fetch(`/api${path}`, {
        method: "POST",
        credentials: "include",
        signal: ac.signal,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        appendLine("fail", `✗ ${err.error || resp.statusText}\n`);
        return;
      }

      const reader  = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE events are separated by double newline
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";

        for (const evt of events) {
          const raw = evt.trim();
          if (!raw.startsWith("data: ")) continue;
          try {
            const { type, text } = JSON.parse(raw.slice(6));
            if (type === "exit") {
              const code = parseInt(text, 10);
              setLastExit(code);
              appendLine(code === 0 ? "ok" : "fail",
                code === 0 ? "✓ Completed successfully\n" : `✗ Process exited with code ${code}\n`);
            } else {
              appendLine(type === "err" ? "err" : "out", text);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") appendLine("fail", `✗ Connection lost: ${e.message}\n`);
    }
  }

  // After update/rollback: wait for server to come back online
  async function waitForServer() {
    appendLine("meta", "⏳ Waiting for server to restart…\n");
    await new Promise((r) => setTimeout(r, 3500));
    for (let i = 0; i < 30; i++) {
      try {
        const r = await fetch("/api/health", { credentials: "include" });
        if (r.ok) { appendLine("ok", "✓ Server is back online\n"); loadStatus(); loadCommits(); return; }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
    appendLine("meta", "⚠ Server may still be restarting — refresh manually if needed.\n");
  }

  // ── Actions ──

  async function doUpdate() {
    if (running) return;
    if (!confirm("Pull the latest code from GitHub, reinstall dependencies, rebuild, and restart?\n\nThe site will be briefly unavailable.")) return;
    setRunning("update");
    await runStream("/admin/update/stream", null, "Pull & Rebuild");
    await waitForServer();
    setRunning(null);
  }

  async function doRestart() {
    if (running) return;
    if (!confirm("Restart the application now?")) return;
    setRunning("restart");
    appendLine("meta", "\n▸ Restart\n");
    try {
      const r = await fetch("/api/admin/restart", { method: "POST", credentials: "include" });
      if (r.ok) {
        appendLine("out", "Restart signal sent.\n");
        await waitForServer();
      } else {
        appendLine("fail", "✗ Restart request failed\n");
      }
    } catch { appendLine("fail", "✗ Could not reach server\n"); }
    setRunning(null);
  }

  async function doRollback() {
    if (!rollbackTarget || running) return;
    if (!confirm(`Roll back to commit ${rollbackTarget.short}?\n\n"${rollbackTarget.message}"\n\nThis will rebuild everything and restart.`)) return;
    setRollbackOpen(false);
    setRunning("rollback");
    await runStream("/admin/rollback/stream", { commit: rollbackTarget.hash },
      `Rollback → ${rollbackTarget.short} "${rollbackTarget.message}"`);
    await waitForServer();
    setRunning(null);
    setRollbackTarget(null);
  }

  function doAbort() {
    abortRef.current?.abort();
    appendLine("meta", "⚠ Aborted by user\n");
    setRunning(null);
  }

  // ── Render ──

  return (
    <Shell title="System Update" subtitle="Deploy, rollback & manage the running application">
      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes u-spin   { to { transform: rotate(360deg); } }
        @keyframes u-pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes u-blink  { 50%{opacity:0} }
        .rollback-row:hover { background: var(--bg-elev-2) !important; }
      `}</style>

      <StatusCard status={status} loading={statusLoading} onRefresh={loadStatus} />

      {/* ── Action bar ── */}
      <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="btn"
          onClick={doUpdate}
          disabled={!!running}
          style={{ display: "flex", alignItems: "center", gap: "0.45rem",
            ...(status && !status.upToDate ? { background: "var(--warning)", borderColor: "var(--warning)", color: "#000" } : {}) }}
        >
          {running === "update" ? <Spinner size={13} /> : "↑"}
          Pull &amp; Rebuild
          {status && !status.upToDate && status.behind > 0 && (
            <span style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "0.1rem 0.45rem", fontSize: "0.75rem", fontWeight: 700 }}>
              {status.behind}
            </span>
          )}
        </button>

        <button
          className="btn btn-outline"
          onClick={doRestart}
          disabled={!!running}
          style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
        >
          {running === "restart" ? <Spinner size={13} /> : "↻"} Restart
        </button>

        <button
          className={`btn ${rollbackOpen ? "" : "btn-outline"}`}
          onClick={() => { setRollbackOpen((v) => !v); if (!rollbackOpen) loadCommits(); }}
          style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
        >
          ⎌ Rollback {rollbackOpen ? "▲" : "▼"}
        </button>

        {running && (
          <button
            className="btn btn-outline"
            onClick={doAbort}
            style={{ marginLeft: "auto", color: "var(--danger)", borderColor: "var(--danger)", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            ✕ Abort
          </button>
        )}
      </div>

      {/* ── Live Console ── */}
      <div style={{
        background: "var(--bg-elev)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", marginBottom: "1.25rem", overflow: "hidden",
      }}>
        {/* Console header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.6rem 1rem", background: "var(--bg-elev-2)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Traffic lights */}
            <div style={{ display: "flex", gap: "0.3rem" }}>
              {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              console — print3d
            </span>
            {running && (
              <span style={{ fontSize: "0.75rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Spinner size={10} /> running
              </span>
            )}
            {lastExit !== null && !running && (
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: lastExit === 0 ? "var(--success)" : "var(--danger)" }}>
                {lastExit === 0 ? "✓ exit 0" : `✗ exit ${lastExit}`}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={scrollToBottom}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "0.78rem", padding: "0.15rem 0.4rem" }}
              title="Scroll to bottom"
            >↓</button>
            <button
              onClick={() => { setLines([]); setLastExit(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "0.78rem", padding: "0.15rem 0.5rem" }}
            >Clear</button>
          </div>
        </div>

        {/* Console body */}
        <div
          ref={consoleRef}
          onScroll={onConsoleScroll}
          style={{
            background: "#0d1117",
            color: "#c9d1d9",
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
            fontSize: "0.8rem",
            lineHeight: 1.65,
            padding: "0.9rem 1rem",
            height: 400,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {lines.length === 0 && !running && (
            <span style={{ color: "#4a5568" }}>No output yet. Run an action above to see live logs here.</span>
          )}
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: "0.65rem", minHeight: "1.1em" }}>
              <span style={{
                color: "#374151", flexShrink: 0, userSelect: "none",
                fontSize: "0.7rem", paddingTop: "0.18em", minWidth: 56,
              }}>
                {hhmm(line.ts)}
              </span>
              <span style={{
                color: line.kind === "err"  ? "#fbbf24"
                     : line.kind === "meta" ? "#60a5fa"
                     : line.kind === "ok"   ? "#34d399"
                     : line.kind === "fail" ? "#f87171"
                     : "#c9d1d9",
              }}>
                {line.text}
              </span>
            </div>
          ))}
          {running && (
            <div style={{ display: "flex", gap: "0.65rem" }}>
              <span style={{ color: "#374151", fontSize: "0.7rem", minWidth: 56, userSelect: "none" }}>&nbsp;</span>
              <span style={{ color: "#60a5fa", animation: "u-blink 1s step-end infinite" }}>▋</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Rollback Panel ── */}
      {rollbackOpen && (
        <div style={{
          background: "var(--bg-elev)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", overflow: "hidden",
        }}>
          <div style={{
            padding: "0.7rem 1.1rem", background: "var(--bg-elev-2)",
            borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>⎌ Rollback — select a commit</span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Last {commits.length} commits · click to select
            </span>
          </div>

          {commits.length === 0 ? (
            <div style={{ padding: "1.25rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Spinner size={12} /> Loading commits…
            </div>
          ) : (
            <div>
              {commits.map((c, idx) => {
                const isCurrent  = status && (c.hash === status.localHash || status.localHash.startsWith(c.hash));
                const isSelected = rollbackTarget?.hash === c.hash;
                return (
                  <div
                    key={c.hash}
                    className="rollback-row"
                    onClick={() => !isCurrent && setRollbackTarget(isSelected ? null : c)}
                    style={{
                      display: "flex", alignItems: "center", gap: "1rem",
                      padding: "0.6rem 1.1rem",
                      borderBottom: idx < commits.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: isCurrent ? "default" : "pointer",
                      background: isSelected ? "var(--primary-soft)" : "transparent",
                      borderLeft: isSelected   ? "3px solid var(--primary)"
                               : isCurrent    ? "3px solid var(--success)"
                               : "3px solid transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    {/* Hash */}
                    <code style={{
                      fontSize: "0.8rem", flexShrink: 0, minWidth: 72,
                      color: isCurrent ? "var(--success)" : isSelected ? "var(--primary)" : "#60a5fa",
                    }}>
                      {c.short}
                    </code>

                    {/* Message + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.88rem", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: isCurrent ? "var(--text-muted)" : "var(--text)",
                      }}>
                        {c.message}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                        {c.author} · {timeAgo(c.date)}
                      </div>
                    </div>

                    {/* Badge */}
                    {isCurrent && (
                      <span style={{ fontSize: "0.7rem", background: "var(--success-soft)", color: "var(--success)", padding: "0.2rem 0.55rem", borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>
                        current
                      </span>
                    )}
                    {isSelected && !isCurrent && (
                      <span style={{ fontSize: "0.7rem", background: "var(--primary-soft)", color: "var(--primary)", padding: "0.2rem 0.55rem", borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>
                        selected
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirmation bar */}
          {rollbackTarget && (
            <div style={{
              padding: "0.9rem 1.1rem",
              background: "var(--warning-soft)",
              borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  Roll back to <code style={{ color: "var(--primary)" }}>{rollbackTarget.short}</code>?
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  "{rollbackTarget.message}" — {rollbackTarget.author} · {timeAgo(rollbackTarget.date)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button className="btn btn-sm btn-outline" onClick={() => setRollbackTarget(null)}>Cancel</button>
                <button
                  className="btn btn-sm"
                  onClick={doRollback}
                  disabled={!!running}
                  style={{ background: "var(--danger)", borderColor: "var(--danger)", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {running === "rollback" ? <Spinner size={12} /> : "⎌"} Rollback &amp; Rebuild
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
