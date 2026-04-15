"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtDate } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import { TableSkeleton } from "../../components/Skeleton";

export default function PrintersAdmin() {
  const { success, error } = useToast();
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    setLoading(true);
    setPrinters(await api("/printers").catch(() => []));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  function statusDot(p: any) {
    if (!p.active) return <span style={{ color: "var(--text-muted)" }}>—</span>;
    const recent = p.lastSeenAt && Date.now() - new Date(p.lastSeenAt).getTime() < 90_000;
    return (
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        background: recent ? "var(--success)" : "var(--warning)",
        marginRight: "0.4rem",
      }} title={recent ? "Online" : "Offline"} />
    );
  }

  return (
    <Shell title="Printers" subtitle="Manage your 3D printer fleet">
      <div className="panel">
        <div className="panel-head">
          <h3>Printers ({printers.length})</h3>
          <button className="btn" onClick={() => setEditing({ _isNew: true, active: true, costPerHourCents: 200 })}>
            + Add Printer
          </button>
        </div>

        {loading ? (
          <table>
            <thead>
              <tr><th>Name</th><th>URL</th><th>Webcam</th><th>€/h</th><th>Last Seen</th><th>Active</th><th></th></tr>
            </thead>
            <tbody><TableSkeleton rows={5} cols={7} /></tbody>
          </table>
        ) : printers.length === 0 ? (
          <div className="empty"><div className="icon">▲</div><p>No printers yet. Add one to start tracking.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Webcam</th>
                <th>€/h</th>
                <th>Last Seen</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {printers.map((p) => (
                <tr key={p.id} className="clickable-row" onClick={() => setEditing(p)}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {statusDot(p)}
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{p.moonrakerUrl}</td>
                  <td>{p.webcamUrl ? "✓" : "—"}</td>
                  <td>{(p.costPerHourCents / 100).toFixed(2)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {p.lastSeenAt ? fmtDate(p.lastSeenAt) : "never"}
                  </td>
                  <td>
                    <span className={`badge ${p.active ? "badge-success" : "badge-muted"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <PrinterEditor
          printer={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg: string) => { setEditing(null); load(); success(msg); }}
          onError={error}
        />
      )}
    </Shell>
  );
}

function PrinterEditor({ printer, onClose, onSaved, onError }: any) {
  const confirm = useConfirm();
  const [f, setF] = useState<any>({ ...printer });
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const isNew = printer._isNew;

  async function save() {
    setBusy(true);
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
      onSaved(isNew ? "Printer added" : "Printer saved");
    } catch (e: any) {
      onError("Failed to save: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    const ok = await confirm({ title: `Delete printer "${f.name}"?`, variant: "danger" });
    if (!ok) return;
    setDelBusy(true);
    try {
      await api(`/printers/${printer.id}`, { method: "DELETE" });
      onSaved("Printer deleted");
    } catch (e: any) {
      onError("Failed to delete: " + e.message);
      setDelBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3>{isNew ? "New Printer" : `Edit: ${printer.name}`}</h3>
        <div className="form">
          <div>
            <label>Name *</label>
            <input value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Prusa MK3S" />
          </div>
          <div>
            <label>Moonraker URL *</label>
            <input
              value={f.moonrakerUrl || ""}
              onChange={(e) => setF({ ...f, moonrakerUrl: e.target.value })}
              placeholder="http://192.168.1.50:7125"
            />
            <div className="help">Include protocol + port. No trailing slash.</div>
          </div>
          <div>
            <label>API Key (optional)</label>
            <input
              value={f.apiKey || ""}
              onChange={(e) => setF({ ...f, apiKey: e.target.value })}
              placeholder="Leave blank if auth not required"
            />
          </div>
          <div>
            <label>Webcam URL (optional)</label>
            <input
              value={f.webcamUrl || ""}
              onChange={(e) => setF({ ...f, webcamUrl: e.target.value })}
              placeholder="http://192.168.1.50/webcam/?action=stream"
            />
            <div className="help">Direct URL to the MJPEG stream. The backend will proxy it through /api/printer-control/:id/camera.</div>
          </div>
          <div className="form-row">
            <div>
              <label>Cost per hour (cents)</label>
              <input
                type="number"
                value={f.costPerHourCents || 0}
                onChange={(e) => setF({ ...f, costPerHourCents: +e.target.value })}
              />
              <div className="help">Used in quote calculations. 200 = €2.00/h</div>
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <label>
                <input
                  type="checkbox"
                  checked={f.active !== false}
                  onChange={(e) => setF({ ...f, active: e.target.checked })}
                  style={{ width: "auto", marginRight: "0.5rem" }}
                />
                Active
              </label>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              {!isNew && (
                <button className="btn btn-danger btn-sm" onClick={del} disabled={delBusy}>
                  {delBusy ? <><span className="btn-spinner" /> Deleting…</> : "Delete"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={busy} onClick={save}>
                {busy ? <><span className="btn-spinner" /> Saving…</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
