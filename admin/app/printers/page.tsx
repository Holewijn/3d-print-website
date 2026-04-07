"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney } from "../../lib/api";

export default function PrintersAdmin() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const list = await api("/printers").catch(() => []);
    setPrinters(list);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <Shell title="Printers" subtitle="Connect Moonraker printers and monitor status">
      <div className="panel">
        <div className="panel-head">
          <h3>Printers ({printers.length})</h3>
          <button className="btn" onClick={() => setEditing({ name: "", moonrakerUrl: "http://", apiKey: "", costPerHourCents: 200, active: true })}>+ Add Printer</button>
        </div>
        {printers.length === 0 ? (
          <div className="empty"><div className="icon">▲</div><p>No printers added yet. Add a Moonraker URL to get started.</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
            {printers.map(p => <PrinterCard key={p.id} printer={p} onEdit={() => setEditing(p)} />)}
          </div>
        )}
      </div>

      {editing && <PrinterEditor printer={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Shell>
  );
}

function PrinterCard({ printer, onEdit }: any) {
  const status = printer.lastStatus || {};
  const online = printer.lastSeenAt && (Date.now() - +new Date(printer.lastSeenAt)) < 120_000;
  const printStats = status?.result?.status?.print_stats || {};
  const heaterBed = status?.result?.status?.heater_bed || {};
  const extruder = status?.result?.status?.extruder || {};

  return (
    <div className="panel" style={{ background: "var(--bg-elev-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1rem" }}>{printer.name}</h3>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{printer.moonrakerUrl}</div>
        </div>
        <span className={`badge ${online ? "badge-success" : "badge-muted"}`}>{online ? "Online" : "Offline"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.82rem", marginBottom: "1rem" }}>
        <div style={{ color: "var(--text-muted)" }}>State</div><div>{printStats.state || "—"}</div>
        <div style={{ color: "var(--text-muted)" }}>Bed Temp</div><div>{heaterBed.temperature != null ? `${heaterBed.temperature.toFixed(0)}°C` : "—"}</div>
        <div style={{ color: "var(--text-muted)" }}>Hotend</div><div>{extruder.temperature != null ? `${extruder.temperature.toFixed(0)}°C` : "—"}</div>
        <div style={{ color: "var(--text-muted)" }}>Cost/hour</div><div>{fmtMoney(printer.costPerHourCents)}</div>
      </div>
      <button className="btn btn-sm btn-outline" onClick={onEdit} style={{ width: "100%" }}>Edit</button>
    </div>
  );
}

function PrinterEditor({ printer, onClose, onSaved }: any) {
  const [f, setF] = useState({ ...printer });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = !printer.id;

  async function save() {
    setBusy(true); setErr("");
    try {
      const body = {
        name: f.name, moonrakerUrl: f.moonrakerUrl, apiKey: f.apiKey || null,
        costPerHourCents: +f.costPerHourCents, active: f.active,
      };
      if (isNew) await api("/printers", { method: "POST", body: JSON.stringify(body) });
      else await api(`/printers/${printer.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function del() {
    if (!confirm(`Delete printer "${f.name}"?`)) return;
    await api(`/printers/${printer.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isNew ? "Add Printer" : `Edit: ${printer.name}`}</h3>
        <div className="form">
          <div><label>Name</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div>
            <label>Moonraker URL</label>
            <input value={f.moonrakerUrl} onChange={e => setF({ ...f, moonrakerUrl: e.target.value })} placeholder="http://192.168.1.50:7125" />
            <div className="help">e.g. <code>http://printer.local:7125</code></div>
          </div>
          <div>
            <label>API Key (optional)</label>
            <input type="password" value={f.apiKey || ""} onChange={e => setF({ ...f, apiKey: e.target.value })} />
            <div className="help">Required if Moonraker has authorization enabled.</div>
          </div>
          <div>
            <label>Cost per hour (cents)</label>
            <input type="number" value={f.costPerHourCents} onChange={e => setF({ ...f, costPerHourCents: +e.target.value })} />
            <div className="help">200 = €2.00/hour. Used in quote calculations.</div>
          </div>
          <div><label><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active (poll status)</label></div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>{!isNew && <button className="btn btn-danger btn-sm" onClick={del}>Delete</button>}</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
