"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      location.href = "/dashboard/";
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
      <h1>Login</h1>
      <form onSubmit={submit}>
        <label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="btn">Login</button>
      </form>
      {err && <p style={{color:"red"}}>{err}</p>}
      <p>No account? <a href="/register/">Register</a></p>
    </div>
  );
}
