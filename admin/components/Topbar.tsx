"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { api("/auth/me").then(setUser).catch(() => {}); }, []);

  const initials = user?.email?.slice(0, 2).toUpperCase() || "AD";

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login/";
  }

  return (
    <header className="topbar">
      <div className="page-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        <div className="topbar-icon" title="Search">⌕</div>
        <div className="topbar-icon" title="Theme">☾</div>
        <div className="topbar-icon" title="Notifications">
          ◉
          <span className="dot">3</span>
        </div>
        <div className="topbar-user" onClick={logout} title="Click to logout">
          <div className="avatar">{initials}</div>
          <div className="info">
            <div className="name">{user?.email || "Admin"}</div>
            <div className="role">Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
