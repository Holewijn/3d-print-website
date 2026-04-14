"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StatsAdmin() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api("/stats/summary").then(setS).catch(() => {}); }, []);

  if (!s) return <Shell title="Statistics"><p>Loading…</p></Shell>;

  const chartData = (s.topPaths || []).map((p: any) => ({ 
    path: p.path.replace(/^\/|\/$/g, '') || 'home', 
    views: p._count?.path || 0 
  })).slice(0, 6); // Limit items to keep height small

  return (
    <Shell title="Statistics" subtitle="Website traffic & engagement">
      {/* Main Grid Container */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 2fr", 
        gap: "1.5rem", 
        alignItems: "start",
        maxHeight: "calc(100vh - 160px)" 
      }}>
        
        {/* Left Column: Smaller Blocks */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Card label="Total Views" value={s.total} color="primary" icon="≡" />
          <Card label="Last 30 Days" value={s.last30d} color="success" icon="↑" />
          <Card label="Orders" value={s.orders} color="purple" icon="▦" />
          <Card label="Quotes" value={s.quotes} color="warning" icon="✎" />
        </div>

        {/* Right Column: Compact Chart */}
        <div className="panel" style={{ margin: 0, height: "100%" }}>
          <div className="panel-head" style={{ padding: "10px 15px" }}>
            <h3 style={{ fontSize: "0.9rem", margin: 0 }}>Top Pages</h3>
          </div>
          <div style={{ width: "100%", height: 260, padding: "10px" }}>
            {chartData.length === 0 ? (
              <div className="empty"><p>No traffic data.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" vertical={false} />
                  <XAxis dataKey="path" stroke="#8a96b1" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8a96b1" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ background: "#15203a", border: "1px solid #2a3756", borderRadius: 8, fontSize: '12px' }} 
                  />
                  <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
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
    <div className="stat-card" style={{ 
      padding: "1rem", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      textAlign: "center",
      minWidth: "0" 
    }}>
      <div className="stat-icon" style={{ 
        background: c.bg, 
        color: c.fg, 
        width: "32px", 
        height: "32px", 
        fontSize: "1rem",
        marginBottom: "8px" 
      }}>{icon}</div>
      <div className="stat-info">
        <div className="stat-label" style={{ fontSize: "0.75rem", opacity: 0.8 }}>{label}</div>
        <div className="stat-value" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{value}</div>
      </div>
    </div>
  );
}
