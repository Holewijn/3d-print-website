"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import StlViewer from "../../components/StlViewer";

export default function QuotePage() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [material, setMaterial] = useState("PLA");
  const [infill, setInfill] = useState(20);
  const [layer, setLayer] = useState(0.2);
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState("");
  const [upload, setUpload] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api("/inventory/brands").then(setBrands).catch(() => {}); }, []);

  // Auto-upload as soon as a file is picked, so the viewer can show
  useEffect(() => {
    if (!file) return;
    setQuote(null); setUpload(null); setErr("");
    const fd = new FormData();
    fd.append("file", file);
    fetch("/api/stl/upload", { method: "POST", body: fd, credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Upload failed")))
      .then(setUpload)
      .catch((e) => setErr(e.message));
  }, [file]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!upload) return;
    setBusy(true); setErr("");
    try {
      const q = await api("/quotes", {
        method: "POST",
        body: JSON.stringify({
          stlUploadId: upload.id, email, material,
          filamentBrandId: brandId || null,
          infillPct: infill, layerHeightMm: layer,
        }),
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
          <p>Upload your STL file and we'll calculate material, print time, and total cost.</p>
        </div>
      </div>

      <section>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
          <div className="form-card">
            <form onSubmit={submit}>
              <div>
                <label>STL File</label>
                <input type="file" accept=".stl" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
              </div>
              <div>
                <label>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="form-row">
                <div>
                  <label>Material</label>
                  <select value={material} onChange={(e) => setMaterial(e.target.value)}>
                    <option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option>
                  </select>
                </div>
                <div>
                  <label>Filament Brand</label>
                  <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                    <option value="">Default</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>Infill (%)</label>
                  <input type="number" min={0} max={100} value={infill} onChange={(e) => setInfill(+e.target.value)} />
                </div>
                <div>
                  <label>Layer Height (mm)</label>
                  <input type="number" step={0.05} min={0.05} max={0.4} value={layer} onChange={(e) => setLayer(+e.target.value)} />
                </div>
              </div>
              <button className="btn btn-lg" disabled={busy || !upload}>{busy ? "Calculating…" : "Calculate Quote →"}</button>
              {err && <div className="error">{err}</div>}
            </form>
          </div>

          <div>
            {upload ? (
              <>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>3D Preview</h3>
                <StlViewer stlUploadId={upload.id} height={360} />
              </>
            ) : (
              <div style={{ background: "var(--bg-soft)", border: "2px dashed var(--border)", borderRadius: 8, padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>▲</div>
                <p>Upload an STL file to see a 3D preview</p>
              </div>
            )}

            {quote && (
              <div className="quote-result" style={{ marginTop: "1.5rem" }}>
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
