"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [version, setVersion] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState("");

  useEffect(() => {
    api("/stats/summary").then(setStats).catch(() => location.href = "/admin/login/");
    api("/admin/version").then(v => setVersion(v.commit));
  }, []);

  async function runUpdate() {
    if (!confirm("Pull latest from GitHub and rebuild?")) return;
    setUpdating(true);
    setUpdateLog("Updating...");
    try {
      const r = await api("/admin/update", { method: "POST" });
      setUpdateLog(r.stdout || "Done.");
    } catch (e: any) {
      setUpdateLog("Error: " + e.message);
    } finally { setUpdating(false); }
  }

  return (
    <div>
      <div className="card">
        <h1>Dashboard</h1>
        <p>Current commit: <code>{version.slice(0, 8)}</code></p>
        <button className="btn" disabled={updating} onClick={runUpdate}>
          {updating ? "Updating..." : "Update from GitHub"}
        </button>
        {updateLog && <pre style={{background:"#f1f5f9",padding:"1rem",marginTop:"1rem",maxHeight:300,overflow:"auto"}}>{updateLog}</pre>}
      </div>
      {stats && (
        <div className="card">
          <h2>Website Stats</h2>
          <p>Total pageviews: <strong>{stats.total}</strong></p>
          <p>Last 30 days: <strong>{stats.last30d}</strong></p>
          <p>Orders: <strong>{stats.orders}</strong> · Quotes: <strong>{stats.quotes}</strong></p>
          <h3>Top pages</h3>
          <ul>{stats.topPaths?.map((p: any) => <li key={p.path}>{p.path} — {p._count.path}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
