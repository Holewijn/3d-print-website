"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Shell from "../components/Shell";
import { api, fmtMoney, fmtDate } from "../lib/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const RANGES = [
  { id: "today",  label: "Today" },
  { id: "week",   label: "This Week" },
  { id: "month",  label: "Last 30 Days" },
  { id: "90days", label: "Last 90 Days" },
  { id: "year",   label: "Last Year" },
  { id: "all",    label: "All Time" },
];

const ALL_BLOCKS = [
  { id: "revenue-cards", label: "Revenue summary cards" },
  { id: "metric-cards",  label: "KPI metric cards" },
  { id: "revenue-chart", label: "Revenue over time chart" },
  { id: "orders-chart",  label: "Orders per day chart" },
  { id: "sources-chart", label: "Traffic sources chart" },
  { id: "recent-orders", label: "Recent orders table" },
  { id: "recent-quotes", label: "Recent quotes table" },
  { id: "low-stock",     label: "Low stock alerts" },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleBlocks, setVisibleBlocks] = useState<string[]>(ALL_BLOCKS.map((b) => b.id));

  // Load saved block layout
  useEffect(() => {
    api("/settings/dashboard.layout").then((r) => {
      if (r?.value?.blocks && Array.isArray(r.value.blocks)) {
        setVisibleBlocks(r.value.blocks);
      }
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const d = await api(`/stats/dashboard?range=${range}`);
      setData(d);
      setLastUpdated(new Date());
    } catch (e) {
      // keep old data if fetch fails
    } finally { setLoading(false); }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [range, fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchData]);

  function isVisible(id: string) { return visibleBlocks.includes(id); }

  async function saveLayout(blocks: string[]) {
    setVisibleBlocks(blocks);
    try {
      await api("/settings/dashboard.layout", {
        method: "PUT",
        body: JSON.stringify({ value: { blocks } }),
      });
    } catch {}
  }

  function downloadCsv() {
    window.open(`/api/stats/orders-csv?range=${range}`, "_blank");
  }

  const m = data?.metrics;
  const secondsAgo = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000) : 0;

  return (
    <Shell title="Dashboard" subtitle="E-commerce analytics overview">
      {/* Control bar */}
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <select value={range} onChange={(e) => setRange(e.target.value)} style={{ width: "auto" }}>
              {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <button className="btn btn-sm btn-outline" onClick={fetchData} disabled={loading}>
              ↻ {loading ? "Refreshing…" : "Refresh"}
            </button>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ width: "auto", margin: 0 }} />
              Auto-refresh (30s)
            </label>
            {lastUpdated && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Updated {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-sm btn-outline" onClick={downloadCsv}>↓ Export CSV</button>
            <button className="btn btn-sm btn-outline" onClick={() => setCustomizeOpen(true)}>⚙ Customize</button>
          </div>
        </div>
      </div>

      {loading && !data && <div className="panel"><p>Loading analytics…</p></div>}

      {data && (
        <>
          {/* Revenue summary cards */}
          {isVisible("revenue-cards") && (
            <div className="stats-grid" style={{ marginBottom: "1rem" }}>
              <RevCard label="Revenue Today"  value={fmtMoney(m.revenueTodayCents)} color="#3b82f6" />
              <RevCard label="Revenue Week"   value={fmtMoney(m.revenueWeekCents)}  color="#10b981" />
              <RevCard label="Revenue Month"  value={fmtMoney(m.revenueMonthCents)} color="#8b5cf6" />
              <RevCard label="Range Total"    value={fmtMoney(m.revenueCents)}      color="#f59e0b" />
            </div>
          )}

          {/* KPI metric cards */}
          {isVisible("metric-cards") && (
            <div className="stats-grid" style={{ marginBottom: "1rem" }}>
              <Metric label="Orders" value={m.ordersCount} hint={`${m.quotesInRange} quotes`} />
              <Metric label="Avg Order Value" value={fmtMoney(m.aov)} hint="per order" />
              <Metric label="Conversion Rate" value={`${(m.conversionRate * 100).toFixed(1)}%`} hint={`${m.convertedQuotes}/${m.quotesInRange} quotes`} />
              <Metric label="New Customers" value={m.newCustomers} hint={`${m.totalCustomers} total`} />
            </div>
          )}

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            {isVisible("revenue-chart") && (
              <div className="panel">
                <div className="panel-head"><h3>Revenue Over Time</h3></div>
                {data.charts.revenueOverTime.length === 0 ? (
                  <div className="empty"><p>No data.</p></div>
                ) : (
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={data.charts.revenueOverTime.map((r: any) => ({ ...r, euros: r.cents / 100 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                        <XAxis dataKey="date" stroke="#8a96b1" fontSize={11} />
                        <YAxis stroke="#8a96b1" fontSize={11} tickFormatter={(v) => `€${v}`} />
                        <Tooltip
                          contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8 }}
                          formatter={(v: any) => [`€${(+v).toFixed(2)}`, "Revenue"]}
                        />
                        <Line type="monotone" dataKey="euros" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {isVisible("sources-chart") && (
              <div className="panel">
                <div className="panel-head"><h3>Order Sources</h3></div>
                {data.charts.trafficSources.length === 0 ? (
                  <div className="empty"><p>No data.</p></div>
                ) : (
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={data.charts.trafficSources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name}`}>
                          {data.charts.trafficSources.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Orders per day */}
          {isVisible("orders-chart") && (
            <div className="panel" style={{ marginBottom: "1rem" }}>
              <div className="panel-head"><h3>Orders Per Day</h3></div>
              {data.charts.ordersPerDay.length === 0 ? (
                <div className="empty"><p>No data.</p></div>
              ) : (
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.charts.ordersPerDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                      <XAxis dataKey="date" stroke="#8a96b1" fontSize={11} />
                      <YAxis stroke="#8a96b1" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Recent tables */}
          <div style={{ display: "grid", gridTemplateColumns: isVisible("recent-orders") && isVisible("recent-quotes") ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: "1rem" }}>
            {isVisible("recent-orders") && (
              <div className="panel">
                <div className="panel-head">
                  <h3>Recent Orders</h3>
                  <Link href="/orders/" className="btn btn-sm btn-outline">View all →</Link>
                </div>
                {data.recentOrders.length === 0 ? (
                  <div className="empty"><p>No orders yet.</p></div>
                ) : (
                  <table>
                    <tbody>
                      {data.recentOrders.map((o: any) => (
                        <tr key={o.id}>
                          <td>#{o.id.slice(-8)}</td>
                          <td style={{ fontSize: "0.82rem" }}>{o.email}</td>
                          <td>{fmtMoney(o.totalCents)}</td>
                          <td><span className={`badge ${o.status === "PAID" || o.status === "COMPLETED" ? "badge-success" : "badge-muted"}`}>{o.status}</span></td>
                          <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{fmtDate(o.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {isVisible("recent-quotes") && (
              <div className="panel">
                <div className="panel-head">
                  <h3>Recent Quotes</h3>
                  <Link href="/quotes/" className="btn btn-sm btn-outline">View all →</Link>
                </div>
                {data.recentQuotes.length === 0 ? (
                  <div className="empty"><p>No quotes yet.</p></div>
                ) : (
                  <table>
                    <tbody>
                      {data.recentQuotes.map((q: any) => (
                        <tr key={q.id}>
                          <td>#{q.id.slice(-8)}</td>
                          <td style={{ fontSize: "0.82rem" }}>{q.email}</td>
                          <td>{fmtMoney(q.totalCents || 0)}</td>
                          <td><span className="badge badge-muted">{q.status}</span></td>
                          <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{fmtDate(q.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Low stock alerts */}
          {isVisible("low-stock") && data.lowStock.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h3>⚠ Low Stock Alerts ({data.lowStock.length})</h3>
                <Link href="/inventory/" className="btn btn-sm btn-outline">Manage →</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
                {data.lowStock.map((s: any, i: number) => (
                  <div key={i} style={{ background: "var(--bg-elev-2)", padding: "0.75rem", borderRadius: 8, borderLeft: "3px solid #ef4444" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: s.colorHex, border: "1px solid var(--border)" }} />
                      <strong style={{ fontSize: "0.85rem" }}>{s.materialName} {s.colorName}</strong>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {s.totalGrams}g left · threshold {s.lowStockGrams}g
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Customize modal */}
      {customizeOpen && (
        <div className="modal-bg" onClick={() => setCustomizeOpen(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3>Customize Dashboard</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Show or hide dashboard blocks. Your choices are saved and apply to all admins.
            </p>
            <div className="form" style={{ gap: "0.5rem" }}>
              {ALL_BLOCKS.map((b) => (
                <label key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem", background: "var(--bg-elev-2)", borderRadius: 6 }}>
                  <input
                    type="checkbox"
                    checked={visibleBlocks.includes(b.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...visibleBlocks, b.id]
                        : visibleBlocks.filter((x) => x !== b.id);
                      saveLayout(next);
                    }}
                    style={{ width: "auto", margin: 0 }}
                  />
                  <span>{b.label}</span>
                </label>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button className="btn btn-sm" onClick={() => setCustomizeOpen(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function RevCard({ label, value, color }: any) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: any) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{hint}</div>}
      </div>
    </div>
  );
}
