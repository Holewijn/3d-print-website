"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";

export default function ContactAdmin() {
  const [messages, setMessages] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "unhandled">("unhandled");

  async function load() {
    const list = await api("/contact").catch(() => []);
    setMessages(list);
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "unhandled" ? messages.filter(m => !m.handled) : messages;

  async function toggle(id: string, handled: boolean) {
    await api(`/contact/${id}`, { method: "PUT", body: JSON.stringify({ handled }) });
    load();
    if (viewing?.id === id) setViewing({ ...viewing, handled });
  }

  return (
    <Shell title="Messages" subtitle="Contact form submissions">
      <div className="panel">
        <div className="panel-head">
          <h3>Inbox ({filtered.length})</h3>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ width: "auto" }}>
            <option value="unhandled">Unhandled only</option>
            <option value="all">All messages</option>
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="icon">✉</div><p>No messages.</p></div>
        ) : (
          <table>
            <thead><tr><th>From</th><th>Subject</th><th>Status</th><th>Received</th><th></th></tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong><br /><span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{m.email}</span></td>
                  <td>{m.subject || <em style={{ color: "var(--text-dim)" }}>(no subject)</em>}</td>
                  <td><span className={`badge ${m.handled ? "badge-success" : "badge-warning"}`}>{m.handled ? "Handled" : "New"}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{fmtDate(m.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setViewing(m)}>Read</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewing && (
        <div className="modal-bg" onClick={() => setViewing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{viewing.subject || "(no subject)"}</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>From <strong>{viewing.name}</strong> ({viewing.email}) · {fmtDate(viewing.createdAt)}</p>
            <div style={{ background: "var(--bg-elev-2)", padding: "1rem", borderRadius: 8, whiteSpace: "pre-wrap", marginBottom: "1.5rem" }}>{viewing.message}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-outline btn-sm" onClick={() => window.open(`mailto:${viewing.email}?subject=Re: ${viewing.subject || ""}`)}>Reply via Email</button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>Close</button>
                <button className="btn btn-success btn-sm" onClick={() => toggle(viewing.id, !viewing.handled)}>
                  {viewing.handled ? "Mark Unhandled" : "Mark Handled"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
