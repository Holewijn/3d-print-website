"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
      location.href = "/dashboard/";
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
      <h1>Register</h1>
      <form onSubmit={submit}>
        <label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Password (min 8)</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        <button className="btn">Create account</button>
      </form>
      {err && <p style={{color:"red"}}>{err}</p>}
    </div>
  );
}
