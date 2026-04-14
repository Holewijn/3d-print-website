"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StatsAdmin() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api("/stats/summary").then(setS).catch(() => {}); }, []);

  if (!s) return <Shell title="Statistics"><p>Loading…</p></Shell>;

  const chartData = (s.topPaths || []).map((p: any) => ({ path: p.path, views: p._count?.path || 0 }));

  return (
    <Shell title="Statistics" subtitle="Website traffic & engagement">
      <div className="stat-cards">
        <Card label="Total Pageviews" value={s.total} color="primary" icon="≡" />
        <Card label="Last 30 Days" value={s.last30d} color="success" icon="↑" />
        <Card label="Total Orders" value={s.orders} color="purple" icon="▦" />
        <Card label="Total Quotes" value={s.quotes} color="warning" icon="✎" />
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Top Pages (last 30 days)</h3></div>
        {chartData.length === 0 ? (
          <div className="empty"><p>No traffic data yet.</p></div>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" horizontal={false} />
                <XAxis type="number" stroke="#8a96b1" />
                <YAxis dataKey="path" type="category" stroke="#8a96b1" width={150} />
                <Tooltip contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8 }} />
                <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Card({ label, value, color, icon }: any) {
  const colors: any = {
    primary: { bg: "var(--primary-soft)", fg: "var(--primary)" },
    success: { bg: "var(--success-soft)", fg: "var(--success)" },
    purple: { bg: "var(--purple-soft)", fg: "var(--purple)" },
    warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  };
  const c = colors[color];
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: c.bg, color: c.fg }}>{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}
