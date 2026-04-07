"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    api("/auth/me")
      .then((u) => {
        if (u.role !== "ADMIN") {
          window.location.href = "/admin/login/";
        } else {
          setOk(true);
        }
      })
      .catch(() => { window.location.href = "/admin/login/"; });
  }, []);
  if (!ok) return <div style={{ padding: "3rem", color: "#8a96b1" }}>Loading…</div>;
  return <>{children}</>;
}
