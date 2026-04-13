"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AccountIcon() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  const href = loggedIn ? "/account/" : "/login/";
  const title = loggedIn ? "My Account" : "Log in";

  return (
    <Link href={href} title={title} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 38, height: 38, borderRadius: "50%",
      background: "var(--bg-soft, #f3f4f6)", color: "var(--text, #1a202c)",
      position: "relative", textDecoration: "none",
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      {loggedIn && (
        <span style={{
          position: "absolute", top: 4, right: 4,
          width: 8, height: 8, borderRadius: "50%",
          background: "#16a34a", border: "2px solid var(--bg, #fff)",
        }} />
      )}
    </Link>
  );
}
