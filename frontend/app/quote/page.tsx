"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";

export default function QuotePage() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [material, setMaterial] = useState("PLA");
  const [infill, setInfill] = useState(20);
  const [layer, setLayer] = useState(0.2);
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api("/inventory/brands").then(setBrands).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setErr(""); setQuote(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/stl/upload", { method: "POST", body: fd, credentials: "include" });
      if (!upRes.ok) throw new Error("Upload failed");
      const upl = await upRes.json();
      const q = await api("/quotes", {
        method: "POST",
        body: JSON.stringify({
          stlUploadId: upl.id, email, material,
          filamentBrandId: brandId || null,
          infillPct: infill, layerHeightMm: layer
        })
      });
      setQuote(q);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Get an Instant Quote</h1>
          <p>Upload your STL file and we'll calculate material, print time, and total cost in seconds.</p>
        </div>
      </div>

      <section>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
          <div className="form-card">
            <form onSubmit={submit}>
              <div>
                <label>STL File</label>
                <input type="file" accept=".stl" onChange={e => setFile(e.target.files?.[0] || null)} required />
              </div>
              <div>
                <label>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="form-row">
                <div>
                  <label>Material</label>
                  <select value={material} onChange={e => setMaterial(e.target.value)}>
                    <option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option>
                  </select>
                </div>
                <div>
                  <label>Filament Brand</label>
                  <select value={brandId} onChange={e => setBrandId(e.target.value)}>
                    <option value="">Default</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>Infill (%)</label>
                  <input type="number" min={0} max={100} value={infill} onChange={e => setInfill(+e.target.value)} />
                </div>
                <div>
                  <label>Layer Height (mm)</label>
                  <input type="number" step={0.05} min={0.05} max={0.4} value={layer} onChange={e => setLayer(+e.target.value)} />
                </div>
              </div>
              <button className="btn btn-lg" disabled={busy}>{busy ? "Calculating…" : "Calculate Quote →"}</button>
              {err && <div className="error">{err}</div>}
            </form>
          </div>

          <div>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>What you get</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <li style={{ display: "flex", gap: "0.75rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 800 }}>✓</span>
                <div><strong>Instant pricing</strong><br /><span style={{ color: "var(--text-muted)" }}>Material, energy, and machine time calculated in real-time.</span></div>
              </li>
              <li style={{ display: "flex", gap: "0.75rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 800 }}>✓</span>
                <div><strong>No commitment</strong><br /><span style={{ color: "var(--text-muted)" }}>Get a quote first, decide later.</span></div>
              </li>
              <li style={{ display: "flex", gap: "0.75rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 800 }}>✓</span>
                <div><strong>Multiple materials</strong><br /><span style={{ color: "var(--text-muted)" }}>PLA, PETG, ABS, TPU and more.</span></div>
              </li>
              <li style={{ display: "flex", gap: "0.75rem" }}>
                <span style={{ color: "var(--primary)", fontWeight: 800 }}>✓</span>
                <div><strong>Fast turnaround</strong><br /><span style={{ color: "var(--text-muted)" }}>Most orders shipped within 3 business days.</span></div>
              </li>
            </ul>

            {quote && (
              <div className="quote-result">
                <h3>Your Quote</h3>
                <div className="quote-stats">
                  <div className="quote-stat"><div className="label">Volume</div><div className="value">{quote.volumeCm3} cm³</div></div>
                  <div className="quote-stat"><div className="label">Weight</div><div className="value">{quote.weightG} g</div></div>
                  <div className="quote-stat"><div className="label">Print Time</div><div className="value">{Math.floor(quote.printMinutes / 60)}h {quote.printMinutes % 60}m</div></div>
                  <div className="quote-stat"><div className="label">Energy</div><div className="value">{quote.energyKwh} kWh</div></div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Price</div>
                  <div className="quote-total">€{(quote.totalCents / 100).toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
