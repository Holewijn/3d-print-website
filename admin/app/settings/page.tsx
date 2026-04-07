"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

const TABS = [
  { id: "general",   label: "General" },
  { id: "company",   label: "Company" },
  { id: "invoicing", label: "Invoicing" },
  { id: "smtp",      label: "Email (SMTP)" },
  { id: "seo",       label: "SEO" },
  { id: "pricing",   label: "Pricing" },
  { id: "energy",    label: "Energy" },
  { id: "mollie",    label: "Mollie" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [s, setS] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/settings").then((r) => { setS(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function set(key: string, value: any) { setS({ ...s, [key]: value }); }

  async function save(keys: string[]) {
    setSaving(true);
    try {
      for (const k of keys) {
        await api(`/settings/${k}`, { method: "PUT", body: JSON.stringify({ value: s[k] }) });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  if (loading) return <Shell title="Settings"><p>Loading…</p></Shell>;

  const SaveBar = ({ keys }: { keys: string[] }) => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
      <button className="btn" disabled={saving} onClick={() => save(keys)}>{saving ? "Saving…" : "Save Changes"}</button>
      {saved && <span className="success-msg">✓ Saved</span>}
    </div>
  );

  return (
    <Shell title="Settings" subtitle="Configure your website">
      <div className="panel">
        <div style={{ display: "flex", gap: "1.5rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "transparent", border: "none", color: tab === t.id ? "var(--primary)" : "var(--text-muted)",
              padding: "0.75rem 0", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
              borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: "-1px",
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "general" && (
          <div className="form">
            <div><label>Site Title</label><input value={s["site.title"] || ""} onChange={(e) => set("site.title", e.target.value)} /></div>
            <div><label>Logo Text</label><input value={s["site.logoText"] || ""} onChange={(e) => set("site.logoText", e.target.value)} /></div>
            <div><label>Logo URL</label><input value={s["site.logoUrl"] || ""} onChange={(e) => set("site.logoUrl", e.target.value)} /></div>
            <div><label>Favicon URL</label><input value={s["site.faviconUrl"] || ""} onChange={(e) => set("site.faviconUrl", e.target.value)} /></div>
            <div><label>Footer Text</label><input value={s["site.footer"] || ""} onChange={(e) => set("site.footer", e.target.value)} /></div>
            <SaveBar keys={["site.title", "site.logoText", "site.logoUrl", "site.faviconUrl", "site.footer"]} />
          </div>
        )}

        {tab === "company" && (
          <div className="form">
            <div className="help" style={{ marginBottom: "0.5rem", padding: "0.75rem", background: "var(--bg-elev-2)", borderRadius: 8 }}>
              These details appear on every invoice and packing slip. Required for Dutch/EU tax compliance.
            </div>
            <div><label>Company Name *</label><input value={s["company.name"] || ""} onChange={(e) => set("company.name", e.target.value)} /></div>
            <div><label>Address Line 1</label><input value={s["company.addressLine1"] || ""} onChange={(e) => set("company.addressLine1", e.target.value)} /></div>
            <div><label>Address Line 2</label><input value={s["company.addressLine2"] || ""} onChange={(e) => set("company.addressLine2", e.target.value)} /></div>
            <div className="form-row">
              <div><label>Postal Code</label><input value={s["company.postalCode"] || ""} onChange={(e) => set("company.postalCode", e.target.value)} /></div>
              <div><label>City</label><input value={s["company.city"] || ""} onChange={(e) => set("company.city", e.target.value)} /></div>
            </div>
            <div><label>Country</label><input value={s["company.country"] || ""} onChange={(e) => set("company.country", e.target.value)} /></div>
            <div className="form-row">
              <div><label>Email</label><input type="email" value={s["company.email"] || ""} onChange={(e) => set("company.email", e.target.value)} /></div>
              <div><label>Phone</label><input value={s["company.phone"] || ""} onChange={(e) => set("company.phone", e.target.value)} /></div>
            </div>
            <div><label>Website</label><input value={s["company.website"] || ""} onChange={(e) => set("company.website", e.target.value)} /></div>
            <div><label>Logo URL (for invoices)</label><input value={s["company.logoUrl"] || ""} onChange={(e) => set("company.logoUrl", e.target.value)} /></div>
            <div className="form-row">
              <div><label>KvK Number</label><input value={s["company.kvk"] || ""} onChange={(e) => set("company.kvk", e.target.value)} placeholder="12345678" /></div>
              <div><label>BTW / VAT Number</label><input value={s["company.btw"] || ""} onChange={(e) => set("company.btw", e.target.value)} placeholder="NL123456789B01" /></div>
            </div>
            <div><label>Bank Name</label><input value={s["company.bank"] || ""} onChange={(e) => set("company.bank", e.target.value)} placeholder="ING / Rabobank / ..." /></div>
            <div className="form-row">
              <div><label>IBAN</label><input value={s["company.iban"] || ""} onChange={(e) => set("company.iban", e.target.value)} placeholder="NL00 BANK 0000 0000 00" /></div>
              <div><label>BIC / SWIFT</label><input value={s["company.bic"] || ""} onChange={(e) => set("company.bic", e.target.value)} placeholder="INGBNL2A" /></div>
            </div>
            <SaveBar keys={["company.name","company.addressLine1","company.addressLine2","company.postalCode","company.city","company.country","company.email","company.phone","company.website","company.logoUrl","company.kvk","company.btw","company.bank","company.iban","company.bic"]} />
          </div>
        )}

        {tab === "invoicing" && (
          <div className="form">
            <div><label>VAT Rate (%)</label><input type="number" step={0.1} value={s["invoice.vatRate"] ?? 21} onChange={(e) => set("invoice.vatRate", +e.target.value)} /><div className="help">Standard NL rate is 21%. 9% for reduced rate. 0% for exports / VAT-exempt.</div></div>
            <div><label>Payment Terms (printed on invoice)</label><textarea rows={2} value={s["invoice.paymentTerms"] || ""} onChange={(e) => set("invoice.paymentTerms", e.target.value)} placeholder="Payment within 14 days of invoice date." /></div>
            <div><label>Invoice Footer Note (optional)</label><textarea rows={2} value={s["invoice.footerNote"] || ""} onChange={(e) => set("invoice.footerNote", e.target.value)} placeholder="Thank you for your business!" /></div>
            <div><label>Auto-send invoice email when order is PAID</label>
              <select value={s["invoice.autoEmail"] ?? "true"} onChange={(e) => set("invoice.autoEmail", e.target.value === "true")}>
                <option value="true">Yes (recommended)</option>
                <option value="false">No — manual only</option>
              </select>
            </div>
            <SaveBar keys={["invoice.vatRate","invoice.paymentTerms","invoice.footerNote","invoice.autoEmail"]} />
          </div>
        )}

        {tab === "smtp" && (
          <div className="form">
            <div className="help" style={{ marginBottom: "0.5rem", padding: "0.75rem", background: "var(--bg-elev-2)", borderRadius: 8 }}>
              SMTP settings let the system email invoices to customers automatically. Use your hosting provider's SMTP details, or a service like Mailgun / SendGrid / Postmark.
            </div>
            <div className="form-row">
              <div><label>SMTP Host</label><input value={s["smtp.host"] || ""} onChange={(e) => set("smtp.host", e.target.value)} placeholder="smtp.example.com" /></div>
              <div><label>SMTP Port</label><input type="number" value={s["smtp.port"] ?? 587} onChange={(e) => set("smtp.port", +e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div><label>Username</label><input value={s["smtp.user"] || ""} onChange={(e) => set("smtp.user", e.target.value)} /></div>
              <div><label>Password</label><input type="password" value={s["smtp.pass"] || ""} onChange={(e) => set("smtp.pass", e.target.value)} /></div>
            </div>
            <div><label>From Address</label><input value={s["smtp.from"] || ""} onChange={(e) => set("smtp.from", e.target.value)} placeholder='"3D Print Studio" <noreply@example.com>' /></div>
            <div><label>Use SSL/TLS (port 465)</label>
              <select value={s["smtp.secure"] ? "true" : "false"} onChange={(e) => set("smtp.secure", e.target.value === "true")}>
                <option value="false">No (STARTTLS, port 587)</option>
                <option value="true">Yes (SSL, port 465)</option>
              </select>
            </div>
            <SaveBar keys={["smtp.host","smtp.port","smtp.user","smtp.pass","smtp.from","smtp.secure"]} />
          </div>
        )}

        {tab === "seo" && (
          <div className="form">
            <div><label>Default SEO Title</label><input value={s["seo.defaultTitle"] || ""} onChange={(e) => set("seo.defaultTitle", e.target.value)} /></div>
            <div><label>Default Description</label><textarea rows={3} value={s["seo.defaultDesc"] || ""} onChange={(e) => set("seo.defaultDesc", e.target.value)} /></div>
            <SaveBar keys={["seo.defaultTitle","seo.defaultDesc"]} />
          </div>
        )}

        {tab === "pricing" && (
          <div className="form">
            <div><label>Profit Margin (%)</label><input type="number" value={s["pricing.marginPct"] ?? 25} onChange={(e) => set("pricing.marginPct", +e.target.value)} /></div>
                        <div><label>Setup Fee (cents)</label><input type="number" value={s["pricing.setupFeeCents"] ?? 0} onChange={(e) => set("pricing.setupFeeCents", +e.target.value)} /><div className="help">Fixed fee added to every quote (e.g. 250 = €2.50). Set to 0 to disable.</div></div>
            <div><label>Default Machine Cost (cents/hour)</label><input type="number" value={s["pricing.defaultMachineCostHourCents"] ?? 200} onChange={(e) => set("pricing.defaultMachineCostHourCents", +e.target.value)} /></div>
            <div><label>Minimum Order (cents)</label><input type="number" value={s["pricing.minOrderCents"] ?? 500} onChange={(e) => set("pricing.minOrderCents", +e.target.value)} /></div>
            <SaveBar keys={["pricing.marginPct","pricing.setupFeeCents","pricing.defaultMachineCostHourCents","pricing.minOrderCents"]} />
          </div>
        )}

        {tab === "energy" && (
          <div className="form">
            <div><label>Provider</label>
              <select value={s["energy.provider"] || "manual"} onChange={(e) => set("energy.provider", e.target.value)}>
                <option value="manual">Manual</option>
                <option value="zonneplan">Zonneplan</option>
              </select>
            </div>
            <div><label>Manual Price (€/kWh)</label><input type="number" step={0.01} value={s["energy.priceKwh"] ?? 0.30} onChange={(e) => set("energy.priceKwh", +e.target.value)} /></div>
            <div><label>Zonneplan API Key</label><input type="password" value={s["energy.zonneplanKey"] || ""} onChange={(e) => set("energy.zonneplanKey", e.target.value)} /></div>
            <SaveBar keys={["energy.provider","energy.priceKwh","energy.zonneplanKey"]} />
          </div>
        )}

        {tab === "mollie" && (
          <div className="form">
            <div><label>Mollie API Key</label><input type="password" value={s["mollie.apiKey"] || ""} onChange={(e) => set("mollie.apiKey", e.target.value)} placeholder="test_… or live_…" /></div>
            <div><label>Webhook URL (read-only)</label><input readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/payments/webhook`} /></div>
            <SaveBar keys={["mollie.apiKey"]} />
          </div>
        )}
      </div>
    </Shell>
  );
}
