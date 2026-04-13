"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.error || "Login failed");
      }
      window.location.href = "/account/";
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <section style={{ padding: "5rem 0" }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Log in</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Access your orders and quotes.</p>
        <form className="form-card" onSubmit={submit}>
          <div className="form">
            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {err && <div className="error">{err}</div>}
            <button className="btn btn-lg" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
              No account? <Link href="/register/" style={{ color: "var(--primary)" }}>Register</Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
