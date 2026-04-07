"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney } from "../../lib/api";

const COMMON_COUNTRIES = [
  { code: "NL", name: "Netherlands" }, { code: "BE", name: "Belgium" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" },
  { code: "LU", name: "Luxembourg" }, { code: "AT", name: "Austria" },
  { code: "IT", name: "Italy" }, { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" }, { code: "IE", name: "Ireland" },
  { code: "DK", name: "Denmark" }, { code: "SE", name: "Sweden" },
  { code: "FI", name: "Finland" }, { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" }, { code: "GB", name: "United Kingdom" },
  { code: "CH", name: "Switzerland" }, { code: "NO", name: "Norway" },
  { code: "US", name: "United States" }, { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }, { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
];

export default function ShippingAdmin() {
  const [zones, setZones] = useState<any[]>([]);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [editingRate, setEditingRate] = useState<{ zoneId: string; rate: any } | null>(null);

  async function load() {
    const list = await api("/shipping/zones").catch(() => []);
    setZones(list);
  }
  useEffect(() => { load(); }, []);

  async function deleteZone(id: string) {
    if (!confirm("Delete this zone and all its rates?")) return;
    await api(`/shipping/zones/${id}`, { method: "DELETE" });
    load();
  }

  async function deleteRate(id: string) {
    if (!confirm("Delete this rate?")) return;
    await api(`/shipping/rates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Shell title="Shipping" subtitle="Configure shipping zones and rates">
      <div className="panel">
        <div className="panel-head">
          <h3>Shipping Zones ({zones.length})</h3>
          <button className="btn" onClick={() => setEditingZone({ name: "", countries: [], sortOrder: zones.length, active: true, _isNew: true })}>+ Add Zone</button>
        </div>

        {zones.length === 0 ? (
          <div className="empty"><div className="icon">▦</div><p>No shipping zones yet. Add one to start accepting orders.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {zones.map((z) => (
              <div key={z.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.05rem" }}>{z.name} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>#{z.sortOrder}</span></h3>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.4rem" }}>
                      {(z.countries || []).join(", ") || "No countries"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span className={`badge ${z.active ? "badge-success" : "badge-muted"}`}>{z.active ? "Active" : "Disabled"}</span>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditingZone(z)}>Edit Zone</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteZone(z.id)}>Delete</button>
                  </div>
                </div>

                {/* Rates table */}
                <table style={{ marginTop: "0.5rem" }}>
                  <thead>
                    <tr><th>Method</th><th>Type</th><th>Cost</th><th>Conditions</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(z.rates || []).length === 0 ? (
                      <tr><td colSpan={5} style={{ color: "var(--text-muted)", textAlign: "center" }}>No rates yet</td></tr>
                    ) : z.rates.map((r: any) => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.type}</td>
                        <td>{r.type === "FREE" ? "FREE" : fmtMoney(r.costCents)}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {r.type === "FREE_OVER" && `Free over ${fmtMoney(r.freeAboveCents)}`}
                          {r.type === "WEIGHT" && "per kg"}
                          {r.minOrderCents != null && ` · min ${fmtMoney(r.minOrderCents)}`}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setEditingRate({ zoneId: z.id, rate: r })}>Edit</button>{" "}
                          <button className="btn btn-sm btn-danger" onClick={() => deleteRate(r.id)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn btn-sm btn-outline" style={{ marginTop: "0.75rem" }} onClick={() => setEditingRate({ zoneId: z.id, rate: { name: "", type: "FLAT", costCents: 0, sortOrder: (z.rates?.length || 0), active: true, _isNew: true } })}>
                  + Add Rate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingZone && <ZoneEditor zone={editingZone} onClose={() => setEditingZone(null)} onSaved={() => { setEditingZone(null); load(); }} />}
      {editingRate && <RateEditor zoneId={editingRate.zoneId} rate={editingRate.rate} onClose={() => setEditingRate(null)} onSaved={() => { setEditingRate(null); load(); }} />}
    </Shell>
  );
}

function ZoneEditor({ zone, onClose, onSaved }: any) {
  const [f, setF] = useState({ ...zone });
  const [countryInput, setCountryInput] = useState((zone.countries || []).join(", "));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = zone._isNew;

  function toggleCountry(code: string) {
    const list = countryInput.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (list.includes(code)) setCountryInput(list.filter((c: string) => c !== code).join(", "));
    else setCountryInput([...list, code].join(", "));
  }

  async function save() {
    setBusy(true); setErr("");
    try {
      const countries = countryInput.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
      const body = { name: f.name, countries, sortOrder: +f.sortOrder, active: f.active };
      if (isNew) await api("/shipping/zones", { method: "POST", body: JSON.stringify(body) });
      else await api(`/shipping/zones/${zone.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const selected = countryInput.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "New Zone" : `Edit: ${zone.name}`}</h3>
        <div className="form">
          <div className="form-row">
            <div><label>Zone Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Netherlands, EU, World" /></div>
            <div><label>Sort Order</label><input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: +e.target.value })} /></div>
          </div>
          <div>
            <label>Countries (ISO 2-letter codes, comma-separated)</label>
            <input value={countryInput} onChange={(e) => setCountryInput(e.target.value)} placeholder="NL, BE, DE" />
            <div className="help">Click to add common countries:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
              {COMMON_COUNTRIES.map((c) => (
                <button key={c.code} type="button" onClick={() => toggleCountry(c.code)} className={`btn btn-sm ${selected.includes(c.code) ? "" : "btn-outline"}`} style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}>
                  {c.code}
                </button>
              ))}
            </div>
          </div>
          <div><label><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active</label></div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Zone"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RateEditor({ zoneId, rate, onClose, onSaved }: any) {
  const [f, setF] = useState({ ...rate });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = rate._isNew;

  async function save() {
    setBusy(true); setErr("");
    try {
      const body = {
        name: f.name, type: f.type,
        costCents: +(f.costCents || 0),
        freeAboveCents: f.type === "FREE_OVER" && f.freeAboveCents != null ? +f.freeAboveCents : null,
        minOrderCents: f.minOrderCents != null && f.minOrderCents !== "" ? +f.minOrderCents : null,
        sortOrder: +(f.sortOrder || 0),
        active: f.active,
      };
      if (isNew) await api(`/shipping/zones/${zoneId}/rates`, { method: "POST", body: JSON.stringify(body) });
      else await api(`/shipping/rates/${rate.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "New Rate" : `Edit: ${rate.name}`}</h3>
        <div className="form">
          <div><label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="PostNL Standard" /></div>
          <div>
            <label>Type</label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="FLAT">Flat rate</option>
              <option value="FREE">Free shipping</option>
              <option value="FREE_OVER">Free over threshold</option>
              <option value="WEIGHT">Weight-based (per kg)</option>
            </select>
          </div>
          {f.type !== "FREE" && (
            <div>
              <label>Cost (cents) {f.type === "WEIGHT" && "per kg"}</label>
              <input type="number" value={f.costCents} onChange={(e) => setF({ ...f, costCents: e.target.value })} />
              <div className="help">595 = €5.95</div>
            </div>
          )}
          {f.type === "FREE_OVER" && (
            <div>
              <label>Free above (cents)</label>
              <input type="number" value={f.freeAboveCents || ""} onChange={(e) => setF({ ...f, freeAboveCents: e.target.value })} />
              <div className="help">5000 = €50.00</div>
            </div>
          )}
          <div>
            <label>Minimum order (cents, optional)</label>
            <input type="number" value={f.minOrderCents || ""} onChange={(e) => setF({ ...f, minOrderCents: e.target.value })} />
          </div>
          <div className="form-row">
            <div><label>Sort order</label><input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <label><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active</label>
            </div>
          </div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Rate"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
