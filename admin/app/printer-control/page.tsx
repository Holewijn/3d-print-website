"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

const POLL_MS = 2000;

export default function PrinterControlPage() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [status, setStatus] = useState<any>(null);
  const [online, setOnline] = useState(true);
  const [err, setErr] = useState("");

  // Load printer list once
  useEffect(() => {
    api("/printers").then((list) => {
      const active = list.filter((p: any) => p.active);
      setPrinters(active);
      if (active.length && !selectedId) setSelectedId(active[0].id);
    }).catch(() => {});
  }, []);

  // Poll status every 2s
  const poll = useCallback(async () => {
    if (!selectedId) return;
    try {
      const s = await api(`/printer-control/${selectedId}/status`);
      setStatus(s);
      setOnline(true);
      setErr("");
    } catch (e: any) {
      setOnline(false);
      setErr(e.message);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [selectedId, poll]);

  const selectedPrinter = printers.find((p) => p.id === selectedId);
  const printState = status?.print?.state || "standby";
  const progress = Math.round((status?.print?.progress || 0) * 100);
  const isPrinting = printState === "printing";
  const isPaused = printState === "paused";
  const isStandby = printState === "standby" || printState === "complete";
  const hasWebcam = !!selectedPrinter?.webcamUrl;

  // ─── Action handlers ───
  async function sendAction(path: string, body: any = {}) {
    try {
      await api(`/printer-control/${selectedId}${path}`, { method: "POST", body: JSON.stringify(body) });
      poll();
    } catch (e: any) { alert("Failed: " + e.message); }
  }
  const doHome = () => sendAction("/home", {});
  const doPause = () => sendAction("/print/pause");
  const doResume = () => sendAction("/print/resume");
  const doCancel = () => {
    if (!confirm("Cancel the current print? This cannot be undone.")) return;
    sendAction("/print/cancel");
  };
  const doEmergencyStop = () => {
    if (!confirm("EMERGENCY STOP the printer? You will need to firmware-restart before printing again.")) return;
    sendAction("/emergency-stop");
  };
  const doFirmwareRestart = () => {
    if (!confirm("Firmware restart the printer?")) return;
    sendAction("/firmware-restart");
  };

  async function setExtTemp() {
    const t = prompt("Extruder target temp (°C):", String(status?.extruder?.target || 0));
    if (t === null) return;
    const target = parseFloat(t);
    if (isNaN(target)) return;
    await sendAction("/temp/extruder", { target });
  }
  async function setBedTemp() {
    const t = prompt("Bed target temp (°C):", String(status?.heaterBed?.target || 0));
    if (t === null) return;
    const target = parseFloat(t);
    if (isNaN(target)) return;
    await sendAction("/temp/bed", { target });
  }

  return (
    <Shell title="Printer Control" subtitle="Live control of your Moonraker printers">
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <label style={{ margin: 0, fontWeight: 700 }}>Printer:</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: "auto", minWidth: 200 }}>
              {printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <StatusPill online={online} printState={printState} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-sm btn-outline" onClick={doFirmwareRestart} title="Firmware restart">↻ FW Restart</button>
            <button className="btn btn-sm btn-danger" onClick={doEmergencyStop} title="Emergency stop">⚠ E-STOP</button>
          </div>
        </div>
        {err && <div className="error" style={{ marginTop: "0.75rem" }}>{err}</div>}
      </div>

      {selectedId && status && (
        <div style={{ display: "grid", gridTemplateColumns: hasWebcam ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: "1rem" }}>
          {/* Webcam column */}
          {hasWebcam && (
            <div className="panel">
              <div className="panel-head"><h3>Webcam</h3></div>
              <div style={{ background: "#000", borderRadius: 8, overflow: "hidden", aspectRatio: "16/9" }}>
                <img
                  src={`/api/printer-control/${selectedId}/camera`}
                  alt="Live webcam"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          )}

          {/* Progress + Temps column */}
          <div>
            {/* Progress card */}
            <div className="panel" style={{ marginBottom: "1rem" }}>
              <div className="panel-head"><h3>Print Progress</h3></div>
              <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                {status.print.filename || "No file loaded"}
              </div>
              <div style={{ background: "var(--bg-elev-2)", height: 24, borderRadius: 12, overflow: "hidden", marginBottom: "0.5rem" }}>
                <div style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: isPrinting ? "var(--primary)" : isPaused ? "#f59e0b" : "var(--text-muted)",
                  transition: "width 0.3s ease",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                }}>
                  {progress > 5 && `${progress}%`}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", fontSize: "0.82rem" }}>
                <Metric label="Elapsed" value={fmtTime(status.print.printDuration)} />
                <Metric label="Total" value={fmtTime(status.print.totalDuration)} />
                <Metric label="ETA" value={calcEta(status.print)} />
              </div>
            </div>

            {/* Temperatures */}
            <div className="panel">
              <div className="panel-head"><h3>Temperatures</h3></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <TempCard label="Nozzle" temp={status.extruder.temperature} target={status.extruder.target} onClick={setExtTemp} />
                <TempCard label="Bed" temp={status.heaterBed.temperature} target={status.heaterBed.target} onClick={setBedTemp} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {selectedId && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <div className="panel-head"><h3>Actions</h3></div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-outline" onClick={doHome} disabled={isPrinting}>⌂ Home All</button>
            <FilesModalTrigger printerId={selectedId} disabled={isPrinting} onPrintStarted={poll} />
            {isPrinting && <button className="btn" onClick={doPause}>⏸ Pause</button>}
            {isPaused && <button className="btn" onClick={doResume}>▶ Resume</button>}
            {(isPrinting || isPaused) && <button className="btn btn-danger" onClick={doCancel}>■ Cancel Print</button>}
          </div>
        </div>
      )}

      {/* Console */}
      {selectedId && <Console printerId={selectedId} />}
    </Shell>
  );
}

// ─── Subcomponents ────────────────────────────────────

function StatusPill({ online, printState }: any) {
  if (!online) return <span className="badge badge-danger">Offline</span>;
  const m: Record<string, { label: string; cls: string }> = {
    standby: { label: "Idle", cls: "badge-muted" },
    printing: { label: "Printing", cls: "badge-success" },
    paused: { label: "Paused", cls: "badge-warning" },
    complete: { label: "Complete", cls: "badge-success" },
    cancelled: { label: "Cancelled", cls: "badge-muted" },
    error: { label: "Error", cls: "badge-danger" },
  };
  const info = m[printState] || { label: printState, cls: "badge-muted" };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg)", padding: "0.5rem 0.75rem", borderRadius: 6 }}>
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{value}</div>
    </div>
  );
}

function TempCard({ label, temp, target, onClick }: any) {
  const heating = target > 0 && Math.abs(temp - target) > 2;
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
        padding: "0.85rem 1rem", cursor: "pointer", textAlign: "left",
        color: "var(--text)",
      }}
      title="Click to set target temperature"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
        {heating && <span style={{ color: "#f97316", fontSize: "0.7rem" }}>● heating</span>}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "ui-monospace, monospace", marginTop: "0.2rem" }}>
        {temp.toFixed(1)}°
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "0.35rem" }}>
          / {target.toFixed(0)}°
        </span>
      </div>
    </button>
  );
}

function fmtTime(seconds: number) {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function calcEta(print: any) {
  if (!print.printDuration || !print.progress || print.progress <= 0) return "—";
  const total = print.printDuration / print.progress;
  const remaining = total - print.printDuration;
  if (remaining < 0) return "—";
  return fmtTime(remaining);
}

// ─── Files modal ──────────────────────────────────────
function FilesModalTrigger({ printerId, disabled, onPrintStarted }: any) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-outline" onClick={() => setOpen(true)} disabled={disabled}>📁 Files / Start Print</button>
      {open && <FilesModal printerId={printerId} onClose={() => setOpen(false)} onPrintStarted={() => { setOpen(false); onPrintStarted(); }} />}
    </>
  );
}

function FilesModal({ printerId, onClose, onPrintStarted }: any) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api(`/printer-control/${printerId}/files`);
      setFiles(r.files || []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true); setErr(""); setProgress(0);

    // Use XHR for progress events (fetch doesn't expose upload progress)
    const fd = new FormData();
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/printer-control/${printerId}/files/upload`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        load();
      } else {
        try { setErr(JSON.parse(xhr.responseText).error || `Upload failed (${xhr.status})`); }
        catch { setErr(`Upload failed (${xhr.status})`); }
      }
    };
    xhr.onerror = () => { setUploading(false); setErr("Network error"); };
    xhr.send(fd);
  }

  async function startPrint(filename: string) {
    if (!confirm(`Start printing ${filename}?`)) return;
    try {
      await api(`/printer-control/${printerId}/print/start`, {
        method: "POST",
        body: JSON.stringify({ filename }),
      });
      onPrintStarted();
    } catch (e: any) { alert("Failed: " + e.message); }
  }

  async function delFile(filename: string) {
    if (!confirm(`Delete ${filename}?`)) return;
    try {
      await api(`/printer-control/${printerId}/files/${encodeURIComponent(filename)}`, { method: "DELETE" });
      load();
    } catch (e: any) { alert("Failed: " + e.message); }
  }

  function fmtSize(b: number) {
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.round(b / 1024)} KB`;
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <h3>G-code Files</h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Click a file to start printing.</p>
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? `Uploading ${progress}%…` : "↑ Upload G-code"}
          </button>
          <input ref={fileRef} type="file" accept=".gcode,.g,.gco,.ufp,.bgcode" onChange={onFile} style={{ display: "none" }} />
        </div>
        {uploading && (
          <div style={{ background: "var(--bg-elev-2)", height: 6, borderRadius: 3, marginBottom: "1rem", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--primary)", transition: "width 0.2s" }} />
          </div>
        )}
        {err && <div className="error">{err}</div>}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? <p>Loading…</p> : files.length === 0 ? (
            <div className="empty"><p>No files on printer. Upload a G-code file to get started.</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Filename</th><th>Size</th><th>Modified</th><th></th></tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.path || f.filename}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{f.path || f.filename}</td>
                    <td>{fmtSize(f.size || 0)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {f.modified ? new Date(f.modified * 1000).toLocaleString() : "—"}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn btn-sm" onClick={() => startPrint(f.path || f.filename)}>▶ Print</button>{" "}
                      <button className="btn btn-sm btn-danger" onClick={() => delFile(f.path || f.filename)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── G-code console ───────────────────────────────────
function Console({ printerId }: { printerId: string }) {
  const [history, setHistory] = useState<Array<{ dir: "out" | "in" | "err"; text: string; ts: Date }>>([]);
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [history]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const script = cmd.trim();
    if (!script) return;

    // Soft warning for dangerous commands
    if (/M109\s+S[3-9]\d{2}|M104\s+S[3-9]\d{2}|M190\s+S1[2-9]\d|M140\s+S1[2-9]\d/i.test(script)) {
      if (!confirm(`WARNING: this command sets a very high temperature. Continue?\n\n${script}`)) return;
    }

    setBusy(true);
    setHistory((h) => [...h, { dir: "out", text: script, ts: new Date() }]);
    setCmd("");
    try {
      await api(`/printer-control/${printerId}/gcode`, { method: "POST", body: JSON.stringify({ script }) });
      setHistory((h) => [...h, { dir: "in", text: "ok", ts: new Date() }]);
    } catch (e: any) {
      setHistory((h) => [...h, { dir: "err", text: e.message, ts: new Date() }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Console</h3>
        <button className="btn btn-sm btn-outline" onClick={() => setHistory([])}>Clear</button>
      </div>
      <div
        ref={logRef}
        style={{
          background: "#0f172a",
          color: "#e2e8f0",
          borderRadius: 6,
          padding: "0.75rem 1rem",
          fontFamily: "ui-monospace, monospace",
          fontSize: "0.82rem",
          height: 240,
          overflowY: "auto",
          marginBottom: "0.75rem",
        }}
      >
        {history.length === 0 ? (
          <div style={{ color: "#64748b", fontStyle: "italic" }}>
            Type a G-code command below. Examples: G28, M115, SET_HEATER_TEMPERATURE HEATER=extruder TARGET=200
          </div>
        ) : history.map((h, i) => (
          <div key={i} style={{ marginBottom: "0.15rem", color: h.dir === "err" ? "#f87171" : h.dir === "out" ? "#38bdf8" : "#94a3b8" }}>
            <span style={{ opacity: 0.5 }}>{h.ts.toLocaleTimeString()}</span>{" "}
            <span style={{ opacity: 0.7 }}>{h.dir === "out" ? ">" : h.dir === "err" ? "!" : "<"}</span>{" "}
            {h.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="G-code command (e.g. G28, M115, SET_HEATER_TEMPERATURE …)"
          disabled={busy}
          style={{ flex: 1, fontFamily: "ui-monospace, monospace" }}
        />
        <button className="btn" type="submit" disabled={busy || !cmd.trim()}>Send</button>
      </form>
    </div>
  );
}
