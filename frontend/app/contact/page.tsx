"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api("/contact", { method: "POST", body: JSON.stringify(form) });
    setSent(true);
  }
  if (sent) return <div className="card"><h1>Thanks!</h1><p>We'll get back to you soon.</p></div>;
  return (
    <div className="card">
      <h1>Contact</h1>
      <form onSubmit={submit}>
        <label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
        <label>Subject</label><input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
        <label>Message</label><textarea rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} required />
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  );
}
