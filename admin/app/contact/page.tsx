"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ContactAdmin() {
  const [msgs, setMsgs] = useState<any[]>([]);
  const load = () => api("/contact").then(setMsgs);
  useEffect(() => { load(); }, []);
  async function toggle(id: string, handled: boolean) {
    await api(`/contact/${id}`, { method: "PUT", body: JSON.stringify({ handled: !handled }) });
    load();
  }
  return (
    <div className="card">
      <h1>Contact form submissions</h1>
      <table>
        <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Handled</th></tr></thead>
        <tbody>{msgs.map(m => (
          <tr key={m.id}>
            <td>{new Date(m.createdAt).toLocaleString()}</td>
            <td>{m.name}</td><td>{m.email}</td><td>{m.subject}</td>
            <td style={{maxWidth:300}}>{m.message}</td>
            <td><input type="checkbox" checked={m.handled} onChange={() => toggle(m.id, m.handled)} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
