"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";

export default function PrintersAdmin() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    setPrinters(await api("/printers").catch(() => []));
  }
  useEffect(() => { load(); }, []);

  return (
    <Shell title="Printers" subtitle="Manage your 3D printer fleet">
      <div className="panel">
        <div className="panel-head">
          <h3>Printers ({printers.length})</h3>
          <button className="btn" onClick={() => setEditing({ _isNew: true, active: true, costPerHourCents: 200 })}>+ Add Printer</button>
        </div>
        {printers.length === 0 ? (
          <div className="empty"><div className="icon">▲</div><p>No printers yet. Add one to start tracking.</p></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>URL</th><th>Webcam</th><th>€/h</th><th>Last Seen</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {printers.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{p.moonrakerUrl}</td>
                  <td>{p.webcamUrl ? "✓" : "—"}</td>
                  <td>{(p.costPerHourCents / 100).toFixed(2)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{p.lastSeenAt ? fmtDate(p.lastSeenAt) : "never"}</td>
                  <td>{p.active ? "✓" : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <PrinterEditor printer={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Shell>
  );
}

function PrinterEditor({ printer, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ ...printer });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = printer._isNew;

  async function save() {
    setBusy(true); setErr("");
    try {
      const body = {
        name: f.name,
        moonrakerUrl: f.moonrakerUrl,
        apiKey: f.apiKey || null,
        webcamUrl: f.webcamUrl || null,
        costPerHourCents: parseInt(f.costPerHourCents, 10) || 0,
        active: f.active !== false,
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3>{isNew ? "New Printer" : `Edit: ${printer.name}`}</h3>
        <div className="form">
          <div><label>Name *</label><input value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Prusa MK3S" /></div>
          <div>
            <label>Moonraker URL *</label>
            <input value={f.moonrakerUrl || ""} onChange={(e) => setF({ ...f, moonrakerUrl: e.target.value })} placeholder="http://192.168.1.50:7125" />
            <div className="help">Include protocol + port. No trailing slash.</div>
          </div>
          <div>
            <label>API Key (optional)</label>
            <input value={f.apiKey || ""} onChange={(e) => setF({ ...f, apiKey: e.target.value })} placeholder="Leave blank if auth not required" />
          </div>
          <div>
            <label>Webcam URL (optional)</label>
            <input value={f.webcamUrl || ""} onChange={(e) => setF({ ...f, webcamUrl: e.target.value })} placeholder="http://192.168.1.50/webcam/?action=stream" />
            <div className="help">Direct URL to the MJPEG stream. The backend will proxy it through /api/printer-control/:id/camera. Leave blank to hide the webcam.</div>
          </div>
          <div className="form-row">
            <div>
              <label>Cost per hour (cents)</label>
              <input type="number" value={f.costPerHourCents || 0} onChange={(e) => setF({ ...f, costPerHourCents: +e.target.value })} />
              <div className="help">Used in quote calculations. 200 = €2.00/h</div>
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <label><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active</label>
            </div>
          </div>
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
