"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Quote() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [infill, setInfill] = useState(20);
  const [layer, setLayer] = useState(0.2);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!file) { setErr("Pick an STL file"); return; }
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/stl/upload", { method: "POST", body: fd, credentials: "include" });
      if (!upRes.ok) throw new Error("Upload failed");
      const upl = await upRes.json();
      const q = await api("/quotes", {
        method: "POST",
        body: JSON.stringify({ stlUploadId: upl.id, email, infillPct: infill, layerHeightMm: layer })
      });
      setResult(q);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="card">
      <h1>Get a Quote</h1>
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>STL file</label>
        <input type="file" accept=".stl" onChange={e => setFile(e.target.files?.[0] || null)} required />
        <label>Infill %</label>
        <input type="number" value={infill} min={0} max={100} onChange={e => setInfill(+e.target.value)} />
        <label>Layer height (mm)</label>
        <input type="number" value={layer} step="0.05" min={0.05} max={0.4} onChange={e => setLayer(+e.target.value)} />
        <button className="btn" type="submit">Calculate</button>
      </form>
      {err && <p style={{ color: "red" }}>{err}</p>}
      {result && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Estimated price: €{(result.totalCents / 100).toFixed(2)}</h3>
          <p>Volume: {result.volumeCm3} cm³ · Weight: {result.weightG} g · Time: ~{result.printMinutes} min</p>
        </div>
      )}
    </div>
  );
}
