"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }); window.location.href = "/dashboard/"; }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <>
      <div className="page-header"><div className="container"><h1>Create Account</h1><p>Sign up to track your orders and save your STL files.</p></div></div>
      <section>
        <div className="container" style={{ display: "grid", placeItems: "center" }}>
          <div className="form-card">
            <form onSubmit={submit}>
              <div><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div><label>Password (min 8)</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} /></div>
              <button className="btn btn-lg">Create Account</button>
              {err && <div className="error">{err}</div>}
            </form>
            <p style={{ marginTop: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              Already registered? <a href="/login/" style={{ color: "var(--primary)", fontWeight: 600 }}>Login</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
