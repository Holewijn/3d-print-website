"use client";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AuthGuard from "./AuthGuard";

export default function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar title={title} subtitle={subtitle} />
          <div className="content">{children}</div>
        </div>
      </div>
    </AuthGuard>
  );
}
