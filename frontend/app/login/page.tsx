"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); window.location.href = "/dashboard/"; }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <>
      <div className="page-header"><div className="container"><h1>Login</h1><p>Access your account, orders, and quotes.</p></div></div>
      <section>
        <div className="container" style={{ display: "grid", placeItems: "center" }}>
          <div className="form-card">
            <form onSubmit={submit}>
              <div><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
              <button className="btn btn-lg">Login</button>
              {err && <div className="error">{err}</div>}
            </form>
            <p style={{ marginTop: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              No account? <a href="/register/" style={{ color: "var(--primary)", fontWeight: 600 }}>Register here</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
