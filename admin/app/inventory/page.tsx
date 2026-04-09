"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";
import ImagePicker from "../../components/ImagePicker";
import InventoryIOButtons from "../../components/InventoryIOButtons";

const TABS = [
  { id: "dashboard",  label: "Dashboard" },
  { id: "spools",     label: "Spools" },
  { id: "pricing",    label: "Pricing & Thresholds" },
  { id: "brands",     label: "Brands" },
  { id: "materials",  label: "Materials" },
  { id: "colors",     label: "Colors" },
  { id: "movements",  label: "Movement History" },
];

export default function InventoryPage() {
  const [tab, setTab] = useState("dashboard");
  return (
    <Shell title="Inventory" subtitle="Filament stock, pricing, and movement history">
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "transparent", border: "none",
                color: tab === t.id ? "var(--primary)" : "var(--text-muted)",
                padding: "0.75rem 0", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: "-1px",
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ paddingBottom: "0.5rem" }}>
            <InventoryIOButtons />
          </div>
        </div>
      </div>

      {tab === "dashboard"  && <DashboardTab />}
      {tab === "spools"     && <SpoolsTab />}
      {tab === "pricing"    && <PricingTab />}
      {tab === "brands"     && <BrandsTab />}
      {tab === "materials"  && <MaterialsTab />}
      {tab === "colors"     && <ColorsTab />}
      {tab === "movements"  && <MovementsTab />}
    </Shell>
  );
}

// ─── Dashboard ────────────────────────────────────────
function DashboardTab() {
  const [summary, setSummary] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);

  useEffect(() => {
    api("/inventory/summary").then(setSummary).catch(() => {});
    api("/inventory/trends?days=30").then(setTrends).catch(() => {});
  }, []);

  const lowStock = summary.filter((s) => s.isLow);
  const maxBarG = Math.max(...(trends?.byDay || []).map((d: any) => d.grams), 1);

  return (
    <>
      <div className="stats-grid" style={{ marginBottom: "1rem" }}>
        <div className="stat-card"><div className="label">Combos in stock</div><div className="value">{summary.length}</div></div>
        <div className="stat-card"><div className="label">Low-stock warnings</div><div className="value" style={{ color: lowStock.length > 0 ? "#ef4444" : "inherit" }}>{lowStock.length}</div></div>
        <div className="stat-card"><div className="label">Used (30d)</div><div className="value">{trends?.totalUsedG || 0}g</div></div>
        <div className="stat-card"><div className="label">Cost (30d)</div><div className="value">{fmtMoney(trends?.totalCostCents || 0)}</div></div>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="panel-head"><h3>Stock by Material & Color</h3></div>
        {summary.length === 0 ? (
          <div className="empty"><p>No material+color combos configured. Go to <strong>Pricing & Thresholds</strong> to add some.</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {summary.map((s) => {
              const pct = s.lowStockGrams ? Math.min(100, (s.totalGrams / (s.lowStockGrams * 3)) * 100) : 0;
              return (
                <div key={`${s.materialId}-${s.colorId}`} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: s.colorHex, border: "1px solid var(--border)" }} />
                    <strong>{s.materialName} {s.colorName}</strong>
                    {s.isLow && <span className="badge badge-danger" style={{ marginLeft: "auto" }}>LOW</span>}
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{s.totalGrams}<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.3rem" }}>g</span></div>
                  <div style={{ marginTop: "0.5rem", height: 6, background: "var(--bg-elev-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.isLow ? "#ef4444" : "var(--primary)" }} />
                  </div>
                  <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Threshold: {s.lowStockGrams}g · €{(s.listPriceKgCents / 100).toFixed(2)}/kg
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {trends?.byDay?.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Usage — Last 30 days</h3></div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 160, padding: "0.5rem 0" }}>
            {trends.byDay.map((d: any) => (
              <div key={d.date} title={`${d.date}: ${d.grams}g`} style={{
                flex: 1,
                height: `${(d.grams / maxBarG) * 100}%`,
                background: "var(--primary)",
                borderRadius: "2px 2px 0 0",
                minHeight: 2,
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            <span>{trends.byDay[0]?.date}</span>
            <span>{trends.byDay[trends.byDay.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Spools ───────────────────────────────────────────
function SpoolsTab() {
  const [spools, setSpools] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [adjusting, setAdjusting] = useState<any>(null);

  async function load() {
    const q = statusFilter ? `?status=${statusFilter}` : "";
    setSpools(await api("/inventory/spools" + q).catch(() => []));
    if (brands.length === 0) {
      setBrands(await api("/inventory/brands").catch(() => []));
      setMaterials(await api("/inventory/materials").catch(() => []));
      setColors(await api("/inventory/colors").catch(() => []));
      setPrinters(await api("/printers").catch(() => []));
    }
  }
  useEffect(() => { load(); }, [statusFilter]);

  async function dispose(id: string) {
    if (!confirm("Dispose this spool? Remaining grams will be written off.")) return;
    await api(`/inventory/spools/${id}/dispose`, { method: "POST", body: JSON.stringify({}) });
    load();
  }

  async function hardDelete(s: any) {
    const msg = `PERMANENTLY DELETE this spool?\n\n${s.brand?.name} ${s.material?.name} ${s.color?.name}\nBatch: ${s.batchCode || "—"}\n\nThis removes the spool AND its entire movement history. It cannot be undone.\n\nType DELETE to confirm.`;
    const answer = prompt(msg);
    if (answer !== "DELETE") return;
    await api(`/inventory/spools/${s.id}?confirm=1`, { method: "DELETE" });
    load();
  }

  async function loadOnPrinter(spoolId: string, printerId: string) {
    if (!printerId) return;
    await api(`/inventory/spools/${spoolId}/load`, { method: "POST", body: JSON.stringify({ printerId }) });
    load();
  }
  async function unload(spoolId: string) {
    await api(`/inventory/spools/${spoolId}/unload`, { method: "POST", body: JSON.stringify({}) });
    load();
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Spools ({spools.length})</h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="">All statuses</option>
            <option value="IN_STOCK">In stock</option>
            <option value="IN_USE">In use</option>
            <option value="EMPTY">Empty</option>
            <option value="DISPOSED">Disposed</option>
          </select>
          <button className="btn" onClick={() => setEditing({ _isNew: true, diameterMm: 1.75, initialGrams: 1000, pricePaidCents: 2000, purchaseDate: new Date().toISOString().slice(0, 10) })}>
            + Add Spool
          </button>
        </div>
      </div>
      {spools.length === 0 ? (
        <div className="empty"><div className="icon">◉</div><p>No spools yet. Add your first spool to start tracking.</p></div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Brand / Material / Color</th>
              <th>Remaining</th>
              <th>Cost/kg</th>
              <th>Purchased</th>
              <th>Status</th>
              <th>Printer</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {spools.map((s) => {
              const pct = s.initialGrams ? (s.remainingGrams / s.initialGrams) * 100 : 0;
              const costPerKg = s.initialGrams ? Math.round((s.pricePaidCents / s.initialGrams) * 1000) : 0;
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: s.color?.hex || "#ccc", border: "1px solid var(--border)" }} />
                      <div>
                        <strong>{s.brand?.name}</strong>{" "}
                        <span style={{ color: "var(--text-muted)" }}>{s.material?.name} · {s.color?.name}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.remainingGrams}g <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ {s.initialGrams}g</span></div>
                    <div style={{ width: 80, height: 4, background: "var(--bg-elev-2)", borderRadius: 2, marginTop: 3 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct < 20 ? "#ef4444" : "var(--primary)", borderRadius: 2 }} />
                    </div>
                  </td>
                  <td>{fmtMoney(costPerKg)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{fmtDate(s.purchaseDate)}</td>
                  <td><span className={`badge ${s.status === "IN_STOCK" || s.status === "IN_USE" ? "badge-success" : "badge-muted"}`}>{s.status}</span></td>
                  <td>
                    {s.loadedOnPrinter ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <strong style={{ fontSize: "0.82rem" }}>{s.loadedOnPrinter.name}</strong>
                        <button className="btn btn-sm btn-outline" onClick={() => unload(s.id)}>×</button>
                      </div>
                    ) : s.status === "IN_STOCK" || s.status === "IN_USE" ? (
                      <select onChange={(e) => loadOnPrinter(s.id, e.target.value)} defaultValue="" style={{ width: "auto", fontSize: "0.78rem" }}>
                        <option value="">Load on…</option>
                        {printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    ) : "—"}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setAdjusting(s)}>Adjust</button>{" "}
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(s)}>Edit</button>{" "}
                    {s.status !== "DISPOSED" && <button className="btn btn-sm btn-outline" onClick={() => dispose(s.id)} title="Write off remaining grams, mark disposed">Dispose</button>}{" "}
                    <button className="btn btn-sm btn-danger" onClick={() => hardDelete(s)} title="Permanently delete spool + history">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editing && <SpoolEditor spool={editing} brands={brands} materials={materials} colors={colors} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {adjusting && <AdjustModal spool={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); load(); }} />}
    </div>
  );
}

function SpoolEditor({ spool, brands, materials, colors, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ ...spool });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mergeCandidate, setMergeCandidate] = useState<any>(null);
  const isNew = spool._isNew;

  async function save() {
    setBusy(true); setErr("");
    try {
      // On NEW spools, check first if an existing (brand+material+color+batch)
      // combo exists. If yes, prompt the user to merge instead of creating.
      if (isNew && f.batchCode) {
        const match = await api("/inventory/spools/find-mergeable", {
          method: "POST",
          body: JSON.stringify({
            brandId: f.brandId,
            materialId: f.materialId,
            colorId: f.colorId,
            batchCode: f.batchCode,
          }),
        });
        if (match) {
          setMergeCandidate(match);
          setBusy(false);
          return;
        }
      }
      await actuallySave();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  async function actuallySave() {
    setBusy(true); setErr("");
    try {
      const body = {
        brandId: f.brandId,
        materialId: f.materialId,
        colorId: f.colorId,
        diameterMm: +f.diameterMm,
        initialGrams: +f.initialGrams,
        remainingGrams: isNew ? +f.initialGrams : +f.remainingGrams,
        pricePaidCents: +f.pricePaidCents,
        supplier: f.supplier || null,
        batchCode: f.batchCode || null,
        notes: f.notes || null,
        purchaseDate: f.purchaseDate,
      };
      if (isNew) await api("/inventory/spools", { method: "POST", body: JSON.stringify(body) });
      else await api(`/inventory/spools/${spool.id}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doMerge() {
    setBusy(true); setErr("");
    try {
      await api(`/inventory/spools/${mergeCandidate.id}/add-roll`, {
        method: "POST",
        body: JSON.stringify({
          addGrams: +f.initialGrams,
          addPriceCents: +f.pricePaidCents,
          note: f.notes || null,
        }),
      });
      setMergeCandidate(null);
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3>{isNew ? "New Spool" : "Edit Spool"}</h3>
        <div className="form">
          <div className="form-row">
            <div>
              <label>Brand *</label>
              <select value={f.brandId || ""} onChange={(e) => setF({ ...f, brandId: e.target.value })}>
                <option value="">— Select —</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label>Purchase Date</label>
              <input type="date" value={(f.purchaseDate || "").slice(0, 10)} onChange={(e) => setF({ ...f, purchaseDate: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Material *</label>
              <select value={f.materialId || ""} onChange={(e) => setF({ ...f, materialId: e.target.value })}>
                <option value="">— Select —</option>
                {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label>Color *</label>
              <select value={f.colorId || ""} onChange={(e) => setF({ ...f, colorId: e.target.value })}>
                <option value="">— Select —</option>
                {colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Diameter (mm)</label>
              <input type="number" step="0.05" value={f.diameterMm || 1.75} onChange={(e) => setF({ ...f, diameterMm: e.target.value })} />
            </div>
            <div>
              <label>Initial Grams *</label>
              <input type="number" value={f.initialGrams || 0} onChange={(e) => setF({ ...f, initialGrams: e.target.value })} />
            </div>
            <div>
              <label>Price Paid (cents) *</label>
              <input type="number" value={f.pricePaidCents || 0} onChange={(e) => setF({ ...f, pricePaidCents: e.target.value })} />
            </div>
          </div>
          {!isNew && (
            <div>
              <label>Remaining Grams</label>
              <input type="number" value={f.remainingGrams || 0} onChange={(e) => setF({ ...f, remainingGrams: e.target.value })} />
              <div className="help">Direct edit — prefer "Adjust" for tracked changes</div>
            </div>
          )}
          <div className="form-row">
            <div><label>Supplier</label><input value={f.supplier || ""} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></div>
            <div><label>Batch Code</label><input value={f.batchCode || ""} onChange={(e) => setF({ ...f, batchCode: e.target.value })} /></div>
          </div>
          <div><label>Notes</label><textarea rows={2} value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
      {mergeCandidate && (
        <div className="modal-bg" style={{ zIndex: 110 }} onClick={() => setMergeCandidate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3>Merge with existing spool?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              A spool with the same brand, material, color, and batch code already exists:
            </p>
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.85rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: mergeCandidate.color?.hex || "#ccc", border: "1px solid var(--border)" }} />
                <strong>{mergeCandidate.brand?.name} {mergeCandidate.material?.name} {mergeCandidate.color?.name}</strong>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Batch: <strong>{mergeCandidate.batchCode}</strong> · Currently {mergeCandidate.remainingGrams}g / {mergeCandidate.initialGrams}g
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
              <strong>Merge:</strong> Add {f.initialGrams}g and €{((+f.pricePaidCents || 0) / 100).toFixed(2)} to the existing spool. Cost/kg becomes a weighted average. Recommended for "+1 roll of the same batch".
            </p>
            <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
              <strong>Create new:</strong> Keep them as two separate spools. Use this if the batch codes are actually different.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-outline btn-sm" onClick={() => setMergeCandidate(null)}>Cancel</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setMergeCandidate(null); actuallySave(); }}>Create New Spool</button>
              <button className="btn" disabled={busy} onClick={doMerge}>{busy ? "Merging…" : "Merge into Existing"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdjustModal({ spool, onClose, onSaved }: any) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("MANUAL_ADJUST");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api(`/inventory/spools/${spool.id}/adjust`, { method: "POST", body: JSON.stringify({ deltaGrams: delta, reason, note }) });
      onSaved();
    } finally { setBusy(false); }
  }
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Adjust Stock</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>{spool.brand?.name} {spool.material?.name} {spool.color?.name} — currently {spool.remainingGrams}g</p>
        <div className="form">
          <div>
            <label>Delta (negative to subtract)</label>
            <input type="number" value={delta} onChange={(e) => setDelta(+e.target.value)} />
            <div className="help">e.g. -50 to remove 50g, +25 to add 25g</div>
          </div>
          <div>
            <label>Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="FAILED_PRINT">Failed print</option>
              <option value="DISPOSED">Disposed / dried out</option>
              <option value="LOST">Lost</option>
              <option value="MANUAL_ADJUST">Manual correction</option>
            </select>
          </div>
          <div><label>Note</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy || delta === 0} onClick={save}>{busy ? "Saving…" : "Apply"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing + Thresholds ─────────────────────────────
function PricingTab() {
  const [combos, setCombos] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [refreshExisting, setRefreshExisting] = useState(false);

  async function load() {
    setCombos(await api("/inventory/material-colors").catch(() => []));
    setMaterials(await api("/inventory/materials").catch(() => []));
    setColors(await api("/inventory/colors").catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function autoCalculate() {
    const msg = refreshExisting
      ? "Scan all spools and REFRESH every combo's list price to the highest cost/kg? This will overwrite prices you've manually set."
      : "Scan all spools and create missing combos? Existing prices stay untouched.";
    if (!confirm(msg)) return;
    setAutoBusy(true);
    try {
      const r = await api("/inventory/material-colors/auto-price", {
        method: "POST",
        body: JSON.stringify({ refreshExisting }),
      });
      setAutoResult(r);
      await load();
      setTimeout(() => setAutoResult(null), 5000);
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally { setAutoBusy(false); }
  }

  async function save(row: any) {
    const body = {
      materialId: row.materialId,
      colorId: row.colorId,
      listPriceKgCents: +row.listPriceKgCents,
      lowStockGrams: +row.lowStockGrams,
    };
    await api("/inventory/material-colors", { method: "POST", body: JSON.stringify(body) });
    setEditing(null);
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this pricing rule?")) return;
    await api(`/inventory/material-colors/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>List Prices & Low-Stock Thresholds ({combos.length})</h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
            <input type="checkbox" checked={refreshExisting} onChange={(e) => setRefreshExisting(e.target.checked)} style={{ width: "auto", margin: 0 }} />
            Also refresh existing
          </label>
          <button className="btn btn-outline" disabled={autoBusy} onClick={autoCalculate} title="Scan spools, create missing combos from highest cost/kg">
            {autoBusy ? "Calculating…" : "⚡ Auto-Calculate"}
          </button>
          <button className="btn" onClick={() => setEditing({ _isNew: true, listPriceKgCents: 2500, lowStockGrams: 500 })}>+ Add Combo</button>
        </div>
      </div>
      {autoResult && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.88rem" }}>
          ✓ Scanned {autoResult.totalSpoolGroups} spool groups — {autoResult.created} created, {autoResult.updated} updated, {autoResult.skipped} skipped
        </div>
      )}
      <div className="help" style={{ marginBottom: "1rem" }}>
        List price is what customers see in quotes. Low-stock threshold triggers alerts when total drops below it. Click <strong>Auto-Calculate</strong> to scan your spools and create missing combos using the highest cost/kg. Nylon/TPU/PU default to 200g alert threshold, everything else to 500g.
      </div>
      {combos.length === 0 ? (
        <div className="empty"><p>No pricing rules yet. Add combinations of materials and colors with their list prices.</p></div>
      ) : (
        <table>
          <thead><tr><th>Material</th><th>Color</th><th>List Price (€/kg)</th><th>Low Stock Alert</th><th></th></tr></thead>
          <tbody>
            {combos.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.material.name}</strong></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: c.color.hex, border: "1px solid var(--border)" }} />
                    {c.color.name}
                  </div>
                </td>
                <td>{fmtMoney(c.listPriceKgCents)}</td>
                <td>{c.lowStockGrams}g</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setEditing(c)}>Edit</button>{" "}
                  <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing._isNew ? "New Combo" : "Edit Combo"}</h3>
            <div className="form">
              <div className="form-row">
                <div>
                  <label>Material</label>
                  <select value={editing.materialId || ""} onChange={(e) => setEditing({ ...editing, materialId: e.target.value })}>
                    <option value="">—</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Color</label>
                  <select value={editing.colorId || ""} onChange={(e) => setEditing({ ...editing, colorId: e.target.value })}>
                    <option value="">—</option>
                    {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label>List Price (cents per kg)</label>
                <input type="number" value={editing.listPriceKgCents} onChange={(e) => setEditing({ ...editing, listPriceKgCents: +e.target.value })} />
                <div className="help">2500 = €25.00/kg</div>
              </div>
              <div>
                <label>Low-Stock Threshold (grams)</label>
                <input type="number" value={editing.lowStockGrams} onChange={(e) => setEditing({ ...editing, lowStockGrams: +e.target.value })} />
                <div className="help">Alert when total stock for this combo drops below this</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn" onClick={() => save(editing)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Brands ──────────────────────────────────────────
function BrandsTab() {
  const [brands, setBrands] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  async function load() { setBrands(await api("/inventory/brands").catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function save(b: any) {
    const body = {
      name: b.name,
      websiteUrl: b.websiteUrl || null,
      logoUrl: b.logoUrl || null,
      supportEmail: b.supportEmail || null,
      notes: b.notes || null,
      active: b.active !== false,
    };
    if (b._isNew) await api("/inventory/brands", { method: "POST", body: JSON.stringify(body) });
    else await api(`/inventory/brands/${b.id}`, { method: "PUT", body: JSON.stringify(body) });
    setEditing(null); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this brand?")) return;
    await api(`/inventory/brands/${id}`, { method: "DELETE" }); load();
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Brands ({brands.length})</h3>
        <button className="btn" onClick={() => setEditing({ _isNew: true, active: true })}>+ New Brand</button>
      </div>
      {brands.length === 0 ? <div className="empty"><p>No brands yet.</p></div> : (
        <table>
          <thead><tr><th>Name</th><th>Website</th><th>Support</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {b.logoUrl && <img src={b.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "contain" }} />}
                    <strong>{b.name}</strong>
                  </div>
                </td>
                <td>{b.websiteUrl ? <a href={b.websiteUrl} target="_blank" style={{ color: "var(--primary)" }}>{b.websiteUrl}</a> : "—"}</td>
                <td>{b.supportEmail || "—"}</td>
                <td>{b.active ? "✓" : "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setEditing(b)}>Edit</button>{" "}
                  <button className="btn btn-sm btn-danger" onClick={() => del(b.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing._isNew ? "New Brand" : "Edit Brand"}</h3>
            <div className="form">
              <div><label>Name *</label><input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label>Website</label><input value={editing.websiteUrl || ""} onChange={(e) => setEditing({ ...editing, websiteUrl: e.target.value })} placeholder="https://" /></div>
              <ImagePicker
                label="Brand Logo"
                value={editing.logoUrl || ""}
                onChange={(v) => setEditing({ ...editing, logoUrl: v })}
                help="Upload from your computer or pick from the media library."
              />
              <div><label>Support Email</label><input value={editing.supportEmail || ""} onChange={(e) => setEditing({ ...editing, supportEmail: e.target.value })} /></div>
              <div><label>Notes</label><textarea rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div><label><input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Active</label></div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn" onClick={() => save(editing)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Materials ───────────────────────────────────────
function MaterialsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  async function load() { setItems(await api("/inventory/materials").catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function save(m: any) {
    const body = {
      name: m.name,
      densityGcm3: +m.densityGcm3,
      printTempC: m.printTempC ? +m.printTempC : null,
      bedTempC: m.bedTempC ? +m.bedTempC : null,
      abrasive: !!m.abrasive,
      notes: m.notes || null,
      active: m.active !== false,
    };
    if (m._isNew) await api("/inventory/materials", { method: "POST", body: JSON.stringify(body) });
    else await api(`/inventory/materials/${m.id}`, { method: "PUT", body: JSON.stringify(body) });
    setEditing(null); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this material?")) return;
    await api(`/inventory/materials/${id}`, { method: "DELETE" }); load();
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Materials ({items.length})</h3>
        <button className="btn" onClick={() => setEditing({ _isNew: true, densityGcm3: 1.24, active: true })}>+ New Material</button>
      </div>
      {items.length === 0 ? <div className="empty"><p>No materials yet.</p></div> : (
        <table>
          <thead><tr><th>Name</th><th>Density</th><th>Print / Bed Temp</th><th>Abrasive</th><th></th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.name}</strong></td>
                <td>{m.densityGcm3} g/cm³</td>
                <td>{m.printTempC || "—"}°C / {m.bedTempC || "—"}°C</td>
                <td>{m.abrasive ? "Yes" : "No"}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setEditing(m)}>Edit</button>{" "}
                  <button className="btn btn-sm btn-danger" onClick={() => del(m.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing._isNew ? "New Material" : "Edit Material"}</h3>
            <div className="form">
              <div><label>Name *</label><input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label>Density (g/cm³)</label><input type="number" step="0.01" value={editing.densityGcm3 || 1.24} onChange={(e) => setEditing({ ...editing, densityGcm3: e.target.value })} /></div>
              <div className="form-row">
                <div><label>Print Temp (°C)</label><input type="number" value={editing.printTempC || ""} onChange={(e) => setEditing({ ...editing, printTempC: e.target.value })} /></div>
                <div><label>Bed Temp (°C)</label><input type="number" value={editing.bedTempC || ""} onChange={(e) => setEditing({ ...editing, bedTempC: e.target.value })} /></div>
              </div>
              <div><label><input type="checkbox" checked={!!editing.abrasive} onChange={(e) => setEditing({ ...editing, abrasive: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Abrasive (needs hardened nozzle)</label></div>
              <div><label>Notes</label><textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn" onClick={() => save(editing)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Colors ──────────────────────────────────────────
function ColorsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  async function load() { setItems(await api("/inventory/colors").catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function save(c: any) {
    const body = {
      name: c.name,
      hex: c.hex || "#000000",
      swatchUrl: c.swatchUrl || null,
    };
    if (c._isNew) await api("/inventory/colors", { method: "POST", body: JSON.stringify(body) });
    else await api(`/inventory/colors/${c.id}`, { method: "PUT", body: JSON.stringify(body) });
    setEditing(null); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this color?")) return;
    await api(`/inventory/colors/${id}`, { method: "DELETE" }); load();
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Colors ({items.length})</h3>
        <button className="btn" onClick={() => setEditing({ _isNew: true, hex: "#000000" })}>+ New Color</button>
      </div>
      {items.length === 0 ? <div className="empty"><p>No colors yet.</p></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          {items.map((c) => (
            <div key={c.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem", textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: c.hex, border: "1px solid var(--border)", margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "monospace" }}>{c.hex}</div>
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                <button className="btn btn-sm btn-outline" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing._isNew ? "New Color" : "Edit Color"}</h3>
            <div className="form">
              <div><label>Name *</label><input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Black, White, Galaxy Purple…" /></div>
              <div>
                <label>Hex Color</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="color" value={editing.hex || "#000000"} onChange={(e) => setEditing({ ...editing, hex: e.target.value })} style={{ width: 60, padding: 0 }} />
                  <input value={editing.hex || ""} onChange={(e) => setEditing({ ...editing, hex: e.target.value })} placeholder="#000000" style={{ flex: 1 }} />
                </div>
              </div>
              <div><label>Swatch Image URL (optional)</label><input value={editing.swatchUrl || ""} onChange={(e) => setEditing({ ...editing, swatchUrl: e.target.value })} /></div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn" onClick={() => save(editing)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Movements history ───────────────────────────────
function MovementsTab() {
  const [movements, setMovements] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  async function load() {
    const q = reason ? `?reason=${reason}` : "";
    setMovements(await api("/inventory/movements" + q).catch(() => []));
  }
  useEffect(() => { load(); }, [reason]);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Movement History</h3>
        <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "auto" }}>
          <option value="">All reasons</option>
          <option value="PURCHASE">Purchase</option>
          <option value="PRINT_USED">Print used</option>
          <option value="FAILED_PRINT">Failed print</option>
          <option value="DISPOSED">Disposed</option>
          <option value="LOST">Lost</option>
          <option value="MANUAL_ADJUST">Manual adjust</option>
        </select>
      </div>
      {movements.length === 0 ? <div className="empty"><p>No movements yet.</p></div> : (
        <table>
          <thead><tr><th>Date</th><th>Spool</th><th>Reason</th><th>Grams</th><th>Cost</th><th>Note</th></tr></thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{new Date(m.createdAt).toLocaleString()}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: m.spool?.color?.hex || "#ccc" }} />
                    <span style={{ fontSize: "0.85rem" }}>{m.spool?.brand?.name} {m.spool?.material?.name} {m.spool?.color?.name}</span>
                  </div>
                </td>
                <td><span className="badge badge-muted">{m.reason}</span></td>
                <td style={{ fontWeight: 700, color: m.deltaGrams < 0 ? "#ef4444" : "#16a34a" }}>{m.deltaGrams > 0 ? "+" : ""}{m.deltaGrams}g</td>
                <td>{fmtMoney(m.costCents)}</td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{m.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
