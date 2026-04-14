"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Shell from "../components/Shell";
import { api, fmtMoney, fmtDate } from "../lib/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import GridLayout, { Layout } from "react-grid-layout";
import GridLayout from "react-grid-layout";
import type { Layout } from "react-grid-layout";

const RANGES = [
  { id: "today",  label: "Today" },
  { id: "week",   label: "This Week" },
  { id: "month",  label: "Last 30 Days" },
  { id: "90days", label: "Last 90 Days" },
  { id: "year",   label: "Last Year" },
  { id: "all",    label: "All Time" },
];

// Default tile layout — x/y in grid cols/rows, w/h in units (1 unit = 1 col / 80px row)
const DEFAULT_LAYOUT: Layout[] = [
  { i: "revenue-cards", x: 0, y: 0,  w: 12, h: 2,  minW: 6,  minH: 2 },
  { i: "metric-cards",  x: 0, y: 2,  w: 12, h: 2,  minW: 6,  minH: 2 },
  { i: "revenue-chart", x: 0, y: 4,  w: 8,  h: 5,  minW: 4,  minH: 3 },
  { i: "sources-chart", x: 8, y: 4,  w: 4,  h: 5,  minW: 3,  minH: 3 },
  { i: "orders-chart",  x: 0, y: 9,  w: 12, h: 4,  minW: 4,  minH: 3 },
  { i: "recent-orders", x: 0, y: 13, w: 6,  h: 5,  minW: 4,  minH: 3 },
  { i: "recent-quotes", x: 6, y: 13, w: 6,  h: 5,  minW: 4,  minH: 3 },
  { i: "low-stock",     x: 0, y: 18, w: 12, h: 4,  minW: 4,  minH: 3 },
];

const TILE_LABELS: Record<string, string> = {
  "revenue-cards": "Revenue Cards",
  "metric-cards":  "KPI Metrics",
  "revenue-chart": "Revenue Chart",
  "sources-chart": "Order Sources",
  "orders-chart":  "Orders Per Day",
  "recent-orders": "Recent Orders",
  "recent-quotes": "Recent Quotes",
  "low-stock":     "Low Stock Alerts",
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ─── Tile wrapper ──────────────────────────────────────
function Tile({ title, children, onHide }: { title: string; children: React.ReactNode; onHide?: () => void }) {
  return (
    <div style={{
      background: "var(--bg-elev)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Drag handle */}
      <div className="tile-handle" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.55rem 0.85rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elev-2)",
        cursor: "grab",
        userSelect: "none",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ opacity: 0.5 }}>⣿</span> {title}
        </span>
        {onHide && (
          <button
            onClick={onHide}
            className="cancel-drag"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "0.9rem", lineHeight: 1, padding: "0 2px" }}
            title="Hide tile"
          >×</button>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0.85rem" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Stat cards ───────────────────────────────────────
function RevCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.85rem 1rem", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.85rem 1rem" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{value}</div>
      {hint && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>{hint}</div>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────
export default function Dashboard() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT);
  const [hiddenTiles, setHiddenTiles] = useState<string[]>([]);
  const [gridWidth, setGridWidth] = useState(1200);
  const [editMode, setEditMode] = useState(false);

  // Persist layout to backend settings
  async function persistLayout(l: Layout[], hidden: string[]) {
    try {
      await api("/settings/dashboard.layout", {
        method: "PUT",
        body: JSON.stringify({ value: { layout: l, hidden } }),
      });
    } catch {}
  }

  // Load saved layout
  useEffect(() => {
    api("/settings/dashboard.layout").then((r) => {
      if (r?.value?.layout) setLayout(r.value.layout);
      if (r?.value?.hidden) setHiddenTiles(r.value.hidden);
    }).catch(() => {});
  }, []);

  // Measure grid container width
  useEffect(() => {
    function measure() {
      const el = document.getElementById("dash-grid-container");
      if (el) setGridWidth(el.offsetWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const d = await api(`/stats/dashboard?range=${range}`);
      setData(d);
      setLastUpdated(new Date());
    } catch {}
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { setLoading(true); fetchData(); }, [range, fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchData]);

  const secondsAgo = lastUpdated ? Math.round((Date.now() - lastUpdated.getTime()) / 1000) : null;

  function hideTile(id: string) {
    const next = [...hiddenTiles, id];
    setHiddenTiles(next);
    persistLayout(layout, next);
  }

  function showTile(id: string) {
    const next = hiddenTiles.filter((h) => h !== id);
    setHiddenTiles(next);
    persistLayout(layout, next);
  }

  function onLayoutChange(newLayout: Layout[]) {
    setLayout(newLayout);
    persistLayout(newLayout, hiddenTiles);
  }

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT);
    setHiddenTiles([]);
    persistLayout(DEFAULT_LAYOUT, []);
  }

  const m = data?.metrics;
  const visibleLayout = layout.filter((l) => !hiddenTiles.includes(l.i));

  function renderTileContent(id: string) {
    if (!data) return <div className="empty"><p>Loading…</p></div>;
    switch (id) {
      case "revenue-cards":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.6rem", height: "100%" }}>
            <RevCard label="Revenue Today"  value={fmtMoney(m.revenueTodayCents)} color="#3b82f6" />
            <RevCard label="Revenue Week"   value={fmtMoney(m.revenueWeekCents)}  color="#10b981" />
            <RevCard label="Revenue Month"  value={fmtMoney(m.revenueMonthCents)} color="#8b5cf6" />
            <RevCard label="Range Total"    value={fmtMoney(m.revenueCents)}      color="#f59e0b" />
          </div>
        );
      case "metric-cards":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.6rem", height: "100%" }}>
            <Metric label="Orders"          value={m.ordersCount}                                hint={`${m.quotesInRange} quotes`} />
            <Metric label="Avg Order Value" value={fmtMoney(m.aov)}                              hint="per order" />
            <Metric label="Conversion"      value={`${(m.conversionRate * 100).toFixed(1)}%`}    hint={`${m.convertedQuotes}/${m.quotesInRange}`} />
            <Metric label="New Customers"   value={m.newCustomers}                               hint={`${m.totalCustomers} total`} />
          </div>
        );
      case "revenue-chart":
        return data.charts.revenueOverTime.length === 0 ? <div className="empty"><p>No data.</p></div> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.charts.revenueOverTime.map((r: any) => ({ ...r, euros: r.cents / 100 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
              <XAxis dataKey="date" stroke="#8a96b1" fontSize={11} />
              <YAxis stroke="#8a96b1" fontSize={11} tickFormatter={(v) => `€${v}`} />
              <Tooltip contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8 }} formatter={(v: any) => [`€${(+v).toFixed(2)}`, "Revenue"]} />
              <Line type="monotone" dataKey="euros" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "sources-chart":
        return data.charts.trafficSources.length === 0 ? <div className="empty"><p>No data.</p></div> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.charts.trafficSources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="60%" label={(e: any) => e.name}>
                {data.charts.trafficSources.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case "orders-chart":
        return data.charts.ordersPerDay.length === 0 ? <div className="empty"><p>No data.</p></div> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.charts.ordersPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
              <XAxis dataKey="date" stroke="#8a96b1" fontSize={11} />
              <YAxis stroke="#8a96b1" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "recent-orders":
        return data.recentOrders.length === 0 ? <div className="empty"><p>No orders yet.</p></div> : (
          <table style={{ width: "100%", fontSize: "0.82rem" }}>
            <tbody>
              {data.recentOrders.map((o: any) => (
                <tr key={o.id}>
                  <td>#{o.id.slice(-8)}</td>
                  <td>{o.email}</td>
                  <td>{fmtMoney(o.totalCents)}</td>
                  <td><span className={`badge ${o.status === "PAID" || o.status === "COMPLETED" ? "badge-success" : "badge-muted"}`}>{o.status}</span></td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "recent-quotes":
        return data.recentQuotes.length === 0 ? <div className="empty"><p>No quotes yet.</p></div> : (
          <table style={{ width: "100%", fontSize: "0.82rem" }}>
            <tbody>
              {data.recentQuotes.map((q: any) => (
                <tr key={q.id}>
                  <td>#{q.id.slice(-8)}</td>
                  <td>{q.email}</td>
                  <td>{fmtMoney(q.totalCents || 0)}</td>
                  <td><span className="badge badge-muted">{q.status}</span></td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{fmtDate(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "low-stock":
        return data.lowStock.length === 0 ? <div className="empty"><p>All stock levels OK.</p></div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.6rem" }}>
            {data.lowStock.map((s: any, i: number) => (
              <div key={i} style={{ background: "var(--bg-elev-2)", padding: "0.75rem", borderRadius: 8, borderLeft: "3px solid #ef4444" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: s.colorHex, border: "1px solid var(--border)" }} />
                  <strong style={{ fontSize: "0.85rem" }}>{s.materialName} {s.colorName}</strong>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.totalGrams}g left · threshold {s.lowStockGrams}g</div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Shell title="Dashboard" subtitle="Analytics & overview">
      {/* Toolbar */}
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {RANGES.map((r) => (
              <button key={r.id} onClick={() => setRange(r.id)}
                className={`btn btn-sm ${range === r.id ? "" : "btn-outline"}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {lastUpdated && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Updated {secondsAgo! < 5 ? "just now" : `${secondsAgo}s ago`}
              </span>
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ width: "auto" }} />
              Auto
            </label>
            <button className="btn btn-sm btn-outline" onClick={fetchData}>↻ Refresh</button>
            <button className="btn btn-sm btn-outline" onClick={() => window.open(`/api/stats/orders-csv?range=${range}`, "_blank")}>↓ CSV</button>
            <button
              className={`btn btn-sm ${editMode ? "" : "btn-outline"}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "✓ Done Editing" : "✎ Edit Layout"}
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => setCustomizeOpen(true)}>⚙ Tiles</button>
          </div>
        </div>
      </div>

      {/* Edit mode hint */}
      {editMode && (
        <div style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)", borderRadius: 8, padding: "0.5rem 1rem", marginBottom: "1rem", fontSize: "0.83rem", color: "var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🖱 Drag tiles by their header · Resize from the bottom-right corner · Layout auto-saves</span>
          <button className="btn btn-sm btn-outline" onClick={resetLayout} style={{ fontSize: "0.75rem" }}>Reset to default</button>
        </div>
      )}

      {loading && !data && <div className="panel"><p>Loading analytics…</p></div>}

      {/* Grid */}
      <div id="dash-grid-container" style={{ width: "100%" }}>
        <GridLayout
          layout={visibleLayout}
          cols={12}
          rowHeight={80}
          width={gridWidth}
          onLayoutChange={onLayoutChange}
          draggableHandle=".tile-handle"
          isDraggable={editMode}
          isResizable={editMode}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          resizeHandles={["se"]}
        >
          {visibleLayout.map(({ i }) => (
            <div key={i}>
              <Tile
                title={TILE_LABELS[i] ?? i}
                onHide={editMode ? () => hideTile(i) : undefined}
              >
                {renderTileContent(i)}
              </Tile>
            </div>
          ))}
        </GridLayout>
      </div>

      {/* Tile visibility modal */}
      {customizeOpen && (
        <div className="modal-bg" onClick={() => setCustomizeOpen(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3>Show / Hide Tiles</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {DEFAULT_LAYOUT.map(({ i }) => {
                const hidden = hiddenTiles.includes(i);
                return (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.6rem", background: "var(--bg-elev-2)", borderRadius: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!hidden}
                      onChange={() => hidden ? showTile(i) : hideTile(i)}
                      style={{ width: "auto" }}
                    />
                    <span style={{ fontSize: "0.88rem" }}>{TILE_LABELS[i]}</span>
                  </label>
                );
              })}
            </div>
            <button className="btn" style={{ width: "100%" }} onClick={() => setCustomizeOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </Shell>
  );
}
