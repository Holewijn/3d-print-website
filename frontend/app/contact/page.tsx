"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api("/contact", { method: "POST", body: JSON.stringify(form) }); setSent(true); }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Get in Touch</h1>
          <p>Questions about a project? Want a custom quote? Drop us a message.</p>
        </div>
      </div>

      <section>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "3rem", alignItems: "start" }}>
          <div className="form-card">
            {sent ? (
              <div className="success">✓ Thanks — we'll be in touch within 24 hours.</div>
            ) : (
              <form onSubmit={submit}>
                <div className="form-row">
                  <div>
                    <label>Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label>Subject</label>
                  <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" />
                </div>
                <div>
                  <label>Message</label>
                  <textarea rows={6} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
                </div>
                <button className="btn btn-lg">Send Message →</button>
                {err && <div className="error">{err}</div>}
              </form>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Other ways to reach us</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Email</div>
                <div style={{ color: "var(--text-muted)" }}>info@3dprintstudio.local</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Phone</div>
                <div style={{ color: "var(--text-muted)" }}>+31 (0) 10 123 4567</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Address</div>
                <div style={{ color: "var(--text-muted)" }}>Some Street 123<br />3000 AB Rotterdam<br />Netherlands</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Hours</div>
                <div style={{ color: "var(--text-muted)" }}>Mon–Fri: 9:00 – 18:00<br />Sat: 10:00 – 14:00<br />Sun: Closed</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
