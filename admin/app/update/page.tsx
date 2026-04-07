"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

export default function UpdatePage() {
  const [version, setVersion] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { api("/admin/version").then(setVersion).catch(() => {}); }, []);

  async function doUpdate() {
    if (!confirm("Pull the latest code from GitHub, rebuild, and restart the application?\n\nThis will briefly take the site offline.")) return;
    setBusy(true); setErr(""); setLog("Starting update…\n");
    try {
      const r = await api("/admin/update", { method: "POST" });
      setLog(r.stdout || "Update complete.");
      api("/admin/version").then(setVersion);
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <Shell title="System Update" subtitle="Pull the latest code from GitHub">
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head"><h3>Current Version</h3></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Commit hash</div>
            <code style={{ fontSize: "1rem", color: "var(--text)" }}>{version?.commit || "unknown"}</code>
          </div>
          <button className="btn" disabled={busy} onClick={doUpdate}>
            {busy ? "Updating…" : "↻ Pull & Rebuild"}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>What this does</h3></div>
        <ol style={{ paddingLeft: "1.25rem", color: "var(--text-muted)", lineHeight: 1.9, fontSize: "0.9rem" }}>
          <li>Runs <code>git pull</code> on the repository inside the container</li>
          <li>Reinstalls dependencies with <code>pnpm install</code></li>
          <li>Applies any pending Prisma migrations</li>
          <li>Rebuilds the backend, frontend, and admin panel</li>
          <li>Restarts the application via PM2</li>
          <li>Automatically rolls back if any step fails</li>
        </ol>
      </div>

      {(log || err) && (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <div className="panel-head"><h3>Output</h3></div>
          {err && <div className="error" style={{ marginBottom: "1rem" }}>{err}</div>}
          {log && <pre className="log-viewer">{log}</pre>}
        </div>
      )}
    </Shell>
  );
}
