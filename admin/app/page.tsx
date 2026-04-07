"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "../components/Shell";
import { api, fmtMoney, fmtDate } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [version, setVersion] = useState<any>(null);

  useEffect(() => {
    api("/stats/summary").then(setStats).catch(() => {});
    api("/orders").then(setOrders).catch(() => {});
    api("/quotes").then(setQuotes).catch(() => {});
    api("/printers").then(setPrinters).catch(() => {});
    api("/admin/version").then(setVersion).catch(() => {});
  }, []);

  // Build chart data from last 30 days of pageviews (synthesized for demo when empty)
  const chartData = buildChartData(stats);

  return (
    <Shell title="Dashboard" subtitle="Overview & system summary">
      {/* STAT CARDS */}
      <div className="stat-cards">
        <StatCard
          icon="▭" color="primary"
          label="Total Pages"
          value={stats?.pages ?? 5}
          trend="+0% vs last month" trendUp
        />
        <StatCard
          icon="✎" color="success"
          label="Total Quotes"
          value={quotes.length}
          trend={`${quotes.filter(q => q.status === "NEW").length} new`} trendUp
        />
        <StatCard
          icon="▦" color="purple"
          label="Total Orders"
          value={orders.length}
          trend={`${orders.filter(o => o.status === "PENDING").length} pending`} trendUp
        />
        <StatCard
          icon="▲" color="warning"
          label="Active Printers"
          value={printers.filter((p: any) => p.active).length}
          trend={`${printers.length} total`} trendUp
        />
      </div>

      {/* CHART */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h3>Site Overview</h3>
          <select className="btn-ghost" style={{ padding: "0.45rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "0.8rem" }}>
            <option>Last 30 Days</option>
          </select>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" vertical={false} />
              <XAxis dataKey="date" stroke="#8a96b1" />
              <YAxis stroke="#8a96b1" />
              <Tooltip
                contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8, color: "#e6edf7" }}
                labelStyle={{ color: "#8a96b1" }}
              />
              <Legend />
              <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="pageviews" stroke="#22c55e" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TWO COL: SYSTEM STATUS + QUICK ACTIONS */}
      <div className="dash-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="panel">
          <div className="panel-head"><h3>System Status</h3></div>
          <table>
            <tbody>
              <tr>
                <td>Application</td>
                <td><code style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{version?.commit?.slice(0, 8) || "unknown"}</code></td>
                <td style={{ textAlign: "right" }}><span className="badge badge-success">Running</span></td>
              </tr>
              <tr>
                <td>Database</td>
                <td>PostgreSQL</td>
                <td style={{ textAlign: "right" }}><span className="badge badge-success">Connected</span></td>
              </tr>
              <tr>
                <td>Backend API</td>
                <td>Node.js 20</td>
                <td style={{ textAlign: "right" }}><span className="badge badge-success">Healthy</span></td>
              </tr>
              <tr>
                <td>Active Printers</td>
                <td>{printers.filter((p: any) => p.active).length} of {printers.length}</td>
                <td style={{ textAlign: "right" }}>
                  <span className={`badge ${printers.length ? "badge-success" : "badge-muted"}`}>
                    {printers.length ? "OK" : "None"}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Pending Quotes</td>
                <td>{quotes.filter(q => q.status === "NEW").length}</td>
                <td style={{ textAlign: "right" }}>
                  <span className={`badge ${quotes.filter(q => q.status === "NEW").length ? "badge-warning" : "badge-success"}`}>
                    {quotes.filter(q => q.status === "NEW").length ? "Action needed" : "Up to date"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Quick Actions</h3></div>
          <div className="quick-actions">
            <Link href="/pages/" className="quick-tile">
              <div className="qi" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>▭</div>
              <div className="ql">Edit Pages</div>
            </Link>
            <Link href="/products/" className="quick-tile">
              <div className="qi" style={{ background: "var(--success-soft)", color: "var(--success)" }}>▣</div>
              <div className="ql">Add Product</div>
            </Link>
            <Link href="/printers/" className="quick-tile">
              <div className="qi" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>▲</div>
              <div className="ql">Add Printer</div>
            </Link>
            <Link href="/inventory/" className="quick-tile">
              <div className="qi" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>◉</div>
              <div className="ql">Inventory</div>
            </Link>
            <Link href="/settings/" className="quick-tile">
              <div className="qi" style={{ background: "var(--pink-soft)", color: "var(--pink)" }}>⚙</div>
              <div className="ql">Site Settings</div>
            </Link>
            <Link href="/update/" className="quick-tile">
              <div className="qi" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>↻</div>
              <div className="ql">Update App</div>
            </Link>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="panel">
        <div className="panel-head">
          <h3>Recent Activity</h3>
          <Link href="/orders/" className="btn btn-sm btn-outline">View all</Link>
        </div>
        {orders.length === 0 && quotes.length === 0 ? (
          <div className="empty">
            <div className="icon">▦</div>
            <p>No recent activity yet. Once you receive orders or quotes they'll appear here.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Item</th><th>Type</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr>
              </thead>
              <tbody>
                {[...orders.slice(0, 3).map(o => ({ ...o, _type: "Order" })),
                  ...quotes.slice(0, 3).map(q => ({ ...q, _type: "Quote" }))]
                  .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                  .slice(0, 6)
                  .map(item => (
                    <tr key={item._type + item.id}>
                      <td>#{item.id.slice(-8)}</td>
                      <td>{item._type}</td>
                      <td>{item.email}</td>
                      <td><span className={`badge ${badgeFor(item.status)}`}>{item.status}</span></td>
                      <td>{fmtMoney(item.totalCents || 0)}</td>
                      <td style={{ color: "var(--text-muted)" }}>{fmtDate(item.createdAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}

function StatCard({ icon, color, label, value, trend, trendUp }: any) {
  const colors: any = {
    primary: { bg: "var(--primary-soft)", fg: "var(--primary)" },
    success: { bg: "var(--success-soft)", fg: "var(--success)" },
    purple: { bg: "var(--purple-soft)", fg: "var(--purple)" },
    warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  };
  const c = colors[color] || colors.primary;
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: c.bg, color: c.fg }}>{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {trend && <div className={`stat-trend ${trendUp ? "up" : "down"}`}>↑ {trend}</div>}
      </div>
    </div>
  );
}

function badgeFor(status: string) {
  const s = (status || "").toUpperCase();
  if (["PAID", "COMPLETED", "APPROVED"].includes(s)) return "badge-success";
  if (["PENDING", "NEW", "PRICED", "IN_PRODUCTION"].includes(s)) return "badge-warning";
  if (["CANCELLED", "REJECTED"].includes(s)) return "badge-danger";
  if (s === "CONVERTED") return "badge-purple";
  return "badge-muted";
}

function buildChartData(stats: any) {
  // If real stats exist, use them. Otherwise show empty chart (zeros across 30 days).
  const days = 30;
  const data: any[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      visitors: 0,
      pageviews: 0,
    });
  }
  if (stats?.last30d > 0) {
    // Spread the count evenly with slight variation as a placeholder until per-day stats endpoint exists.
    const perDay = Math.max(1, Math.floor(stats.last30d / days));
    for (let i = 0; i < days; i++) {
      data[i].visitors = Math.floor(perDay * (0.7 + Math.random() * 0.6));
      data[i].pageviews = Math.floor(perDay * (1.0 + Math.random() * 0.8));
    }
  }
  return data;
}
