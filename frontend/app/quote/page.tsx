"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import StlViewer from "../../components/StlViewer";

interface Combo {
  materialId: string;
  materialName: string;
  materialDescription: string | null;
  colorId: string;
  colorName: string;
  colorHex: string;
  listPriceKgCents: number;
  inStock: boolean;
  stockGrams: number;
}

export default function QuotePage() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [combos, setCombos] = useState<Combo[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [colorId, setColorId] = useState("");
  const [noColor, setNoColor] = useState(false);
  const [infill, setInfill] = useState(20);
  const [layer, setLayer] = useState(0.2);
  const [customerNote, setCustomerNote] = useState("");
  const [upload, setUpload] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/quotes/available-combos").then(setCombos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!file) return;
    setQuote(null); setUpload(null); setErr(""); setSubmitted(false);
    const fd = new FormData();
    fd.append("file", file);
    fetch("/api/stl/upload", { method: "POST", body: fd, credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Upload failed")))
      .then(setUpload)
      .catch((e) => setErr(e.message));
  }, [file]);

  // Distinct materials (with descriptions preserved)
  const materials = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; description: string | null }>();
    for (const c of combos) {
      if (!seen.has(c.materialId)) seen.set(c.materialId, {
        id: c.materialId, name: c.materialName, description: c.materialDescription,
      });
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [combos]);

  // Colors for the chosen material
  const colorsForMaterial = useMemo(() => {
    if (!materialId) return [];
    return combos
      .filter((c) => c.materialId === materialId)
      .sort((a, b) => a.colorName.localeCompare(b.colorName));
  }, [combos, materialId]);

  // When material changes, reset color and noColor flag
  useEffect(() => {
    if (!materialId) { setColorId(""); return; }
    if (colorId && !colorsForMaterial.some((c) => c.colorId === colorId)) {
      setColorId("");
    }
    if (!colorId && !noColor && colorsForMaterial.length > 0) {
      setColorId(colorsForMaterial[0].colorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, colorsForMaterial.length]);

  // If user toggles "I'll describe the color in the note", clear colorId
  useEffect(() => {
    if (noColor) setColorId("");
    else if (!colorId && colorsForMaterial.length > 0) setColorId(colorsForMaterial[0].colorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noColor]);

  const selectedMaterial = materials.find((m) => m.id === materialId);
  const selectedCombo = combos.find((c) => c.materialId === materialId && c.colorId === colorId);

  // Frontend validation: if noColor, require a note of reasonable length
  const noteRequired = noColor;
  const noteValid = !noteRequired || (customerNote.trim().length >= 3);

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    if (!upload || !materialId) return;
    if (!noColor && !colorId) { setErr("Please pick a color, or tick \"I'll describe it in the note\""); return; }
    if (noColor && !noteValid) { setErr("Please describe the desired color in the note"); return; }
    setBusy(true); setErr("");
    try {
      const q = await api("/quotes", {
        method: "POST",
        body: JSON.stringify({
          stlUploadId: upload.id, email, materialId,
          colorId: noColor ? null : colorId,
          infillPct: infill, layerHeightMm: layer,
          customerNote: customerNote || null,
        }),
      });
      setQuote(q);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function payNow() {
    if (!quote) return;
    setPaying(true); setErr("");
    try {
      const r = await api(`/quotes/${quote.id}/checkout`, { method: "POST" });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else throw new Error("Payment URL missing");
    } catch (e: any) {
      setErr(e.message);
      setPaying(false);
    }
  }

  async function submitForApproval() {
    if (!quote) return;
    setSubmitting(true); setErr("");
    try {
      await api(`/quotes/${quote.id}/submit-for-approval`, { method: "POST" });
      setSubmitted(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Get an Instant Quote</h1>
          <p>Upload your STL, pick material + color, and get a price in seconds.</p>
        </div>
      </div>

      <section>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
          <div className="form-card">
            <form onSubmit={calculate}>
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
                  <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} required>
                    <option value="">— Select —</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Color</label>
                  <select value={colorId} onChange={(e) => setColorId(e.target.value)} disabled={!materialId || noColor}>
                    <option value="">— Select —</option>
                    {colorsForMaterial.map((c) => (
                      <option key={c.colorId} value={c.colorId}>
                        {c.colorName} {c.inStock ? "" : "— back-order"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Material description blurb */}
              {selectedMaterial?.description && (
                <div style={{
                  background: "var(--primary-soft, #eff6ff)",
                  borderLeft: "3px solid var(--primary, #2563eb)",
                  padding: "0.75rem 1rem",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                }}>
                  <strong>{selectedMaterial.name}:</strong> {selectedMaterial.description}
                </div>
              )}

              {/* No-color toggle */}
              {materialId && (
                <div style={{ fontSize: "0.85rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={noColor} onChange={(e) => setNoColor(e.target.checked)} style={{ width: "auto", margin: 0 }} />
                    <span>Color not listed? Tick this and describe it in the note below.</span>
                  </label>
                </div>
              )}

              {/* Out-of-stock warning */}
              {selectedCombo && !selectedCombo.inStock && (
                <div style={{ background: "#fef3c7", color: "#92400e", padding: "0.6rem 0.85rem", borderRadius: 6, fontSize: "0.85rem" }}>
                  ⓘ This color is currently out of stock. We'll restock and ship as soon as possible.
                </div>
              )}

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

              <div>
                <label>
                  Note {noteRequired && <span style={{ color: "#dc2626" }}>*</span>}
                  {!noteRequired && <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.8rem" }}> (optional)</span>}
                </label>
                <textarea
                  rows={3}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder={noteRequired
                    ? "Describe the desired color (e.g. 'matte navy blue', 'transparent', 'neon green')…"
                    : "Anything we should know? Deadlines, special handling, post-processing requests…"
                  }
                />
                {noteRequired && !noteValid && customerNote.length > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#dc2626", marginTop: "0.25rem" }}>
                    Please write at least a few words describing the color.
                  </div>
                )}
              </div>

              <button className="btn btn-lg" disabled={busy || !upload || !materialId || (!noColor && !colorId) || (noColor && !noteValid)}>
                {busy ? "Calculating…" : "Calculate Quote →"}
              </button>
              {err && <div className="error">{err}</div>}
            </form>
          </div>

          <div>
            {upload ? (
              <>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>3D Preview</h3>
                <StlViewer stlUploadId={upload.id} height={360} color={selectedCombo?.colorHex || "#2563eb"} />
              </>
            ) : (
              <div style={{ background: "var(--bg-soft, #f9fafb)", border: "2px dashed var(--border, #e5e7eb)", borderRadius: 8, padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted, #6b7280)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>▲</div>
                <p>Upload an STL file to see a 3D preview</p>
              </div>
            )}

            {quote && !submitted && (
              <div className="quote-result" style={{ marginTop: "1.5rem" }}>
                <h3>Your Quote</h3>
                <div className="quote-stats">
                  <div className="quote-stat"><div className="label">Volume</div><div className="value">{quote.volumeCm3} cm³</div></div>
                  <div className="quote-stat"><div className="label">Weight</div><div className="value">{quote.weightG} g</div></div>
                  <div className="quote-stat"><div className="label">Print Time</div><div className="value">{Math.floor(quote.printMinutes / 60)}h {quote.printMinutes % 60}m</div></div>
                  <div className="quote-stat"><div className="label">Energy</div><div className="value">{quote.energyKwh} kWh</div></div>
                </div>
                <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted, #6b7280)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Price</div>
                  <div className="quote-total">€{(quote.totalCents / 100).toFixed(2)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <button type="button" className="btn btn-lg" onClick={payNow} disabled={paying || submitting}>
                    {paying ? "Redirecting to checkout…" : "Pay Now & Print →"}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={submitForApproval} disabled={paying || submitting}>
                    {submitting ? "Submitting…" : "Submit for Approval (no payment)"}
                  </button>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted, #6b7280)", textAlign: "center", margin: "0.25rem 0 0" }}>
                    "Pay Now" goes straight to print. "Submit for Approval" lets us review and contact you first.
                  </p>
                </div>
                {err && <div className="error" style={{ marginTop: "0.75rem" }}>{err}</div>}
              </div>
            )}

            {submitted && (
              <div className="quote-result" style={{ marginTop: "1.5rem", textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center", margin: "0 auto 1rem", fontSize: "2rem" }}>✓</div>
                <h3>Submitted!</h3>
                <p style={{ color: "var(--text-muted, #6b7280)" }}>
                  We've received your quote request and will get back to you within 24 hours at <strong>{quote.email}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
