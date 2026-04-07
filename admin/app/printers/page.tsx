"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Printers() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", moonrakerUrl: "http://", apiKey: "", costPerHourCents: 200, active: true });
  const load = () => api("/printers").then(setPrinters);
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);
  async function add() {
    await api("/printers", { method: "POST", body: JSON.stringify(form) });
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await api(`/printers/${id}`, { method: "DELETE" });
    load();
  }
  return (
    <div>
      <div className="card">
        <h1>Printers (Moonraker)</h1>
        <table>
          <thead><tr><th>Name</th><th>URL</th><th>€/hour</th><th>Last seen</th><th>Status</th><th></th></tr></thead>
          <tbody>{printers.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td><td>{p.moonrakerUrl}</td><td>€{(p.costPerHourCents/100).toFixed(2)}</td>
              <td>{p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleString() : "never"}</td>
              <td><pre style={{maxWidth:200,maxHeight:60,overflow:"auto",fontSize:".7rem"}}>{JSON.stringify(p.lastStatus)}</pre></td>
              <td><button className="btn btn-danger" onClick={() => del(p.id)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card">
        <h2>Add printer</h2>
        <label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <label>Moonraker URL</label><input value={form.moonrakerUrl} onChange={e => setForm({...form, moonrakerUrl: e.target.value})} placeholder="http://192.168.1.100:7125" />
        <label>API key (optional)</label><input value={form.apiKey} onChange={e => setForm({...form, apiKey: e.target.value})} />
        <label>Cost per hour (cents)</label><input type="number" value={form.costPerHourCents} onChange={e => setForm({...form, costPerHourCents: +e.target.value})} />
        <button className="btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}
