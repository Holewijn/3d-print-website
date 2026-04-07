"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

const TABS = [
  { id: "general",  label: "General" },
  { id: "seo",      label: "SEO" },
  { id: "pricing",  label: "Pricing" },
  { id: "energy",   label: "Energy" },
  { id: "mollie",   label: "Mollie" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/settings").then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function set(key: string, value: any) {
    setSettings({ ...settings, [key]: value });
  }

  async function save(keys: string[]) {
    setSaving(true);
    try {
      for (const k of keys) {
        await api(`/settings/${k}`, { method: "PUT", body: JSON.stringify({ value: settings[k] }) });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  if (loading) return <Shell title="Settings"><p>Loading…</p></Shell>;

  return (
    <Shell title="Settings" subtitle="Configure your website">
      <div className="panel">
        {/* Tabs */}
        <div style={{ display: "flex", gap: "1.5rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "transparent", border: "none", color: tab === t.id ? "var(--primary)" : "var(--text-muted)",
                padding: "0.75rem 0", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: "-1px"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="form">
            <div>
              <label>Site Title</label>
              <input value={settings["site.title"] || ""} onChange={e => set("site.title", e.target.value)} />
            </div>
            <div>
              <label>Logo Text</label>
              <input value={settings["site.logoText"] || ""} onChange={e => set("site.logoText", e.target.value)} />
            </div>
            <div>
              <label>Logo URL (optional)</label>
              <input value={settings["site.logoUrl"] || ""} onChange={e => set("site.logoUrl", e.target.value)} placeholder="https://…/logo.svg" />
              <div className="help">Leave blank to use logo text only.</div>
            </div>
            <div>
              <label>Favicon URL</label>
              <input value={settings["site.faviconUrl"] || ""} onChange={e => set("site.faviconUrl", e.target.value)} placeholder="https://…/favicon.ico" />
            </div>
            <div className="form-row">
              <div>
                <label>Contact Email</label>
                <input type="email" value={settings["site.contactEmail"] || ""} onChange={e => set("site.contactEmail", e.target.value)} />
              </div>
              <div>
                <label>Contact Phone</label>
                <input value={settings["site.contactPhone"] || ""} onChange={e => set("site.contactPhone", e.target.value)} />
              </div>
            </div>
            <div>
              <label>Address</label>
              <textarea rows={3} value={settings["site.address"] || ""} onChange={e => set("site.address", e.target.value)} />
            </div>
            <div>
              <label>Footer Text</label>
              <input value={settings["site.footer"] || ""} onChange={e => set("site.footer", e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button className="btn" disabled={saving} onClick={() => save(["site.title", "site.logoText", "site.logoUrl", "site.faviconUrl", "site.contactEmail", "site.contactPhone", "site.address", "site.footer"])}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="success-msg">✓ Saved</span>}
            </div>
          </div>
        )}

        {tab === "seo" && (
          <div className="form">
            <div>
              <label>Default SEO Title</label>
              <input value={settings["seo.defaultTitle"] || ""} onChange={e => set("seo.defaultTitle", e.target.value)} />
              <div className="help">Used as the page title when individual pages don't override it.</div>
            </div>
            <div>
              <label>Default Description</label>
              <textarea rows={3} value={settings["seo.defaultDesc"] || ""} onChange={e => set("seo.defaultDesc", e.target.value)} />
              <div className="help">Recommended length: 150-160 characters.</div>
            </div>
            <div>
              <label>Open Graph Image URL</label>
              <input value={settings["seo.ogImage"] || ""} onChange={e => set("seo.ogImage", e.target.value)} placeholder="https://…/og.jpg" />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button className="btn" disabled={saving} onClick={() => save(["seo.defaultTitle", "seo.defaultDesc", "seo.ogImage"])}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="success-msg">✓ Saved</span>}
            </div>
          </div>
        )}

        {tab === "pricing" && (
          <div className="form">
            <div>
              <label>Profit Margin (%)</label>
              <input type="number" min={0} max={500} value={settings["pricing.marginPct"] ?? 25} onChange={e => set("pricing.marginPct", +e.target.value)} />
              <div className="help">Added on top of material + energy + machine cost.</div>
            </div>
            <div>
              <label>Default Machine Cost (cents/hour)</label>
              <input type="number" min={0} value={settings["pricing.defaultMachineCostHourCents"] ?? 200} onChange={e => set("pricing.defaultMachineCostHourCents", +e.target.value)} />
              <div className="help">200 = €2.00 per print hour. Used when a printer-specific rate isn't available.</div>
            </div>
            <div>
              <label>Minimum Order (cents)</label>
              <input type="number" min={0} value={settings["pricing.minOrderCents"] ?? 500} onChange={e => set("pricing.minOrderCents", +e.target.value)} />
              <div className="help">Quotes below this amount will be rounded up.</div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button className="btn" disabled={saving} onClick={() => save(["pricing.marginPct", "pricing.defaultMachineCostHourCents", "pricing.minOrderCents"])}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="success-msg">✓ Saved</span>}
            </div>
          </div>
        )}

        {tab === "energy" && (
          <div className="form">
            <div>
              <label>Energy Provider</label>
              <select value={settings["energy.provider"] || "manual"} onChange={e => set("energy.provider", e.target.value)}>
                <option value="manual">Manual price</option>
                <option value="zonneplan">Zonneplan (live EPEX)</option>
              </select>
            </div>
            <div>
              <label>Manual Price (€/kWh)</label>
              <input type="number" step={0.01} min={0} value={settings["energy.priceKwh"] ?? 0.30} onChange={e => set("energy.priceKwh", +e.target.value)} />
              <div className="help">Used as fallback when no live price is available.</div>
            </div>
            <div>
              <label>Zonneplan API Key (optional)</label>
              <input type="password" value={settings["energy.zonneplanKey"] || ""} onChange={e => set("energy.zonneplanKey", e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button className="btn" disabled={saving} onClick={() => save(["energy.provider", "energy.priceKwh", "energy.zonneplanKey"])}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="success-msg">✓ Saved</span>}
            </div>
          </div>
        )}

        {tab === "mollie" && (
          <div className="form">
            <div>
              <label>Mollie API Key</label>
              <input type="password" value={settings["mollie.apiKey"] || ""} onChange={e => set("mollie.apiKey", e.target.value)} placeholder="test_… or live_…" />
              <div className="help">Get yours at <a href="https://my.mollie.com/dashboard/developers/api-keys" target="_blank" style={{ color: "var(--primary)" }}>my.mollie.com</a>. Use a test key for development.</div>
            </div>
            <div>
              <label>Webhook URL (read-only)</label>
              <input readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/payments/webhook`} />
              <div className="help">Mollie will POST payment status updates to this URL automatically.</div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button className="btn" disabled={saving} onClick={() => save(["mollie.apiKey"])}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="success-msg">✓ Saved</span>}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
