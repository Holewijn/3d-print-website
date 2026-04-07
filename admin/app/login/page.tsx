"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const u = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (u.role !== "ADMIN") throw new Error("Not an admin account");
      window.location.href = "/admin/";
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="mark">3D</div>
          <div className="name">Print Studio Admin</div>
        </div>
        <form className="form" onSubmit={submit}>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn" disabled={busy} style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {err && <div className="error">{err}</div>}
        </form>
      </div>
    </div>
  );
}
