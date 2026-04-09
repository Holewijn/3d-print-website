"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";
import ImagePicker from "../../components/ImagePicker";

const TABS = [
  { id: "header",  label: "Site Header" },
  { id: "footer",  label: "Site Footer" },
  { id: "admin",   label: "Admin Branding" },
];

const DEFAULT_HEADER = {
  logoText: "3D Print Studio",
  logoMark: "▲",
  logoUrl: "",
  menu: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services/" },
    { label: "Shop", href: "/webshop/" },
    { label: "Portfolio", href: "/portfolio/" },
    { label: "About", href: "/about/" },
    { label: "Contact", href: "/contact/" },
  ],
  ctaText: "Get a Quote",
  ctaHref: "/quote/",
  showCart: true,
  cartColor: "",
};

const DEFAULT_FOOTER = {
  about: "Professional 3D printing services. From rapid prototypes to production runs, we bring your ideas to life with precision and quality.",
  columns: [
    { title: "Services", links: [{ label: "FDM Printing", href: "/services/" }, { label: "Get a Quote", href: "/quote/" }] },
    { title: "Company", links: [{ label: "About Us", href: "/about/" }, { label: "Contact", href: "/contact/" }] },
  ],
  contactEmail: "info@3dprintstudio.local",
  contactPhone: "+31 (0) 10 123 4567",
  contactAddress: "Rotterdam, Netherlands",
  copyright: "© 3D Print Studio. All rights reserved.",
};

const DEFAULT_ADMIN = {
  brandName: "Print Studio",
  tagline: "Admin v1.0",
  logoMark: "3D",
  logoUrl: "",
  primaryColor: "#3b82f6",
};

export default function AppearancePage() {
  const [tab, setTab] = useState("header");
  const [header, setHeader] = useState<any>(DEFAULT_HEADER);
  const [footer, setFooter] = useState<any>(DEFAULT_FOOTER);
  const [admin, setAdmin] = useState<any>(DEFAULT_ADMIN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/settings").then((s) => {
      if (s["header"]) setHeader({ ...DEFAULT_HEADER, ...s["header"] });
      if (s["footer"]) setFooter({ ...DEFAULT_FOOTER, ...s["footer"] });
      if (s["admin"]) setAdmin({ ...DEFAULT_ADMIN, ...s["admin"] });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function saveHeader() {
    setSaving(true);
    await api("/settings/header", { method: "PUT", body: JSON.stringify({ value: header }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }
  async function saveFooter() {
    setSaving(true);
    await api("/settings/footer", { method: "PUT", body: JSON.stringify({ value: footer }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }
  async function saveAdmin() {
    setSaving(true);
    await api("/settings/admin", { method: "PUT", body: JSON.stringify({ value: admin }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
    setTimeout(() => window.location.reload(), 500);
  }

  if (loading) return <Shell title="Appearance"><p>Loading…</p></Shell>;

  return (
    <Shell title="Appearance" subtitle="Customize your site's look and branding">
      <div className="panel">
        <div style={{ display: "flex", gap: "1.5rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "transparent", border: "none",
              color: tab === t.id ? "var(--primary)" : "var(--text-muted)",
              padding: "0.75rem 0", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
              borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: "-1px",
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "header" && (
          <div className="form">
            <div className="help" style={{ padding: "0.75rem", background: "var(--bg-elev-2)", borderRadius: 8 }}>
              You can use a logo image, a text name, or both. If both are set, the image appears on the left and the text on the right.
            </div>

            <ImagePicker
              label="Logo Image"
              value={header.logoUrl || ""}
              onChange={(v) => setHeader({ ...header, logoUrl: v })}
              help="Upload a PNG/SVG (rendered at 40px height). Leave empty to skip the image."
            />

            <div>
              <label>Logo Text</label>
              <input value={header.logoText || ""} onChange={(e) => setHeader({ ...header, logoText: e.target.value })} placeholder="3D Print Studio" />
              <div className="help">The brand name shown next to the image. Leave empty to skip the text.</div>
            </div>

            <div>
              <label>Menu Items</label>
              <Repeater
                items={header.menu}
                onChange={(items: any) => setHeader({ ...header, menu: items })}
                addLabel="Add menu item"
                fields={[
                  { key: "label", label: "Label", placeholder: "Home" },
                  { key: "href", label: "URL", placeholder: "/" },
                ]}
              />
            </div>

            <div className="form-row">
              <div>
                <label>CTA Button Text</label>
                <input value={header.ctaText || ""} onChange={(e) => setHeader({ ...header, ctaText: e.target.value })} placeholder="Get a Quote" />
                <div className="help">Leave blank to hide</div>
              </div>
              <div>
                <label>CTA Button URL</label>
                <input value={header.ctaHref || ""} onChange={(e) => setHeader({ ...header, ctaHref: e.target.value })} placeholder="/quote/" />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Show Cart Icon</label>
                <select value={header.showCart ? "true" : "false"} onChange={(e) => setHeader({ ...header, showCart: e.target.value === "true" })}>
                  <option value="true">Yes</option>
                  <option value="false">No (hide cart)</option>
                </select>
              </div>
              <div>
                <label>Cart Badge Color</label>
                <input type="color" value={header.cartColor || "#3b82f6"} onChange={(e) => setHeader({ ...header, cartColor: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
              <button className="btn" disabled={saving} onClick={saveHeader}>{saving ? "Saving…" : "Save Header"}</button>
              {saved && <span className="success-msg">✓ Saved — refresh the public site to see changes</span>}
              <a href="/" target="_blank" className="btn btn-outline">Preview ↗</a>
            </div>
          </div>
        )}

        {tab === "footer" && (
          <div className="form">
            <div>
              <label>About Text</label>
              <textarea rows={3} value={footer.about} onChange={(e) => setFooter({ ...footer, about: e.target.value })} />
            </div>

            <div>
              <label>Footer Columns</label>
              <div className="help" style={{ marginBottom: "0.5rem" }}>Each column has a title and a list of links.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {(footer.columns || []).map((col: any, idx: number) => (
                  <div key={idx} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <input
                        value={col.title}
                        onChange={(e) => {
                          const next = [...footer.columns];
                          next[idx] = { ...col, title: e.target.value };
                          setFooter({ ...footer, columns: next });
                        }}
                        placeholder="Column title"
                        style={{ fontWeight: 700 }}
                      />
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: "0.5rem" }} onClick={() => {
                        if (!confirm("Remove this column?")) return;
                        setFooter({ ...footer, columns: footer.columns.filter((_: any, i: number) => i !== idx) });
                      }}>×</button>
                    </div>
                    <Repeater
                      items={col.links || []}
                      onChange={(links: any) => {
                        const next = [...footer.columns];
                        next[idx] = { ...col, links };
                        setFooter({ ...footer, columns: next });
                      }}
                      addLabel="Add link"
                      fields={[
                        { key: "label", label: "Label" },
                        { key: "href", label: "URL" },
                      ]}
                    />
                  </div>
                ))}
                <button className="btn btn-outline" onClick={() => setFooter({ ...footer, columns: [...(footer.columns || []), { title: "New Column", links: [] }] })}>+ Add Column</button>
              </div>
            </div>

            <div><label>Contact Email</label><input value={footer.contactEmail} onChange={(e) => setFooter({ ...footer, contactEmail: e.target.value })} /></div>
            <div><label>Contact Phone</label><input value={footer.contactPhone} onChange={(e) => setFooter({ ...footer, contactPhone: e.target.value })} /></div>
            <div><label>Contact Address</label><input value={footer.contactAddress} onChange={(e) => setFooter({ ...footer, contactAddress: e.target.value })} /></div>
            <div><label>Copyright Line</label><input value={footer.copyright} onChange={(e) => setFooter({ ...footer, copyright: e.target.value })} /></div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
              <button className="btn" disabled={saving} onClick={saveFooter}>{saving ? "Saving…" : "Save Footer"}</button>
              {saved && <span className="success-msg">✓ Saved</span>}
            </div>
          </div>
        )}

        {tab === "admin" && (
          <div className="form">
            <div className="help" style={{ padding: "0.75rem", background: "var(--bg-elev-2)", borderRadius: 8 }}>
              These settings change the admin panel's branding (the sidebar logo, name, and primary color). Changes apply after refresh.
            </div>

            <ImagePicker
              label="Admin Logo Image"
              value={admin.logoUrl || ""}
              onChange={(v) => setAdmin({ ...admin, logoUrl: v })}
              help="Upload an image (rendered at 36px height). Falls back to the text mark below if empty."
            />

            <div>
              <label>Brand Mark (text fallback)</label>
              <input value={admin.logoMark || ""} onChange={(e) => setAdmin({ ...admin, logoMark: e.target.value })} placeholder="3D" />
              <div className="help">Used only if no image is uploaded. Short — 1-3 characters or an emoji.</div>
            </div>

            <div className="form-row">
              <div>
                <label>Brand Name</label>
                <input value={admin.brandName} onChange={(e) => setAdmin({ ...admin, brandName: e.target.value })} />
              </div>
              <div>
                <label>Tagline</label>
                <input value={admin.tagline} onChange={(e) => setAdmin({ ...admin, tagline: e.target.value })} />
              </div>
            </div>
            <div>
              <label>Primary Color</label>
              <input type="color" value={admin.primaryColor} onChange={(e) => setAdmin({ ...admin, primaryColor: e.target.value })} />
              <div className="help">Used for sidebar active state, buttons, badges, and accents.</div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
              <button className="btn" disabled={saving} onClick={saveAdmin}>{saving ? "Saving…" : "Save & Reload"}</button>
              {saved && <span className="success-msg">✓ Saved — reloading…</span>}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Repeater({ items, onChange, fields, addLabel }: any) {
  function update(idx: number, key: string, value: string) {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  }
  function add() { onChange([...items, Object.fromEntries(fields.map((f: any) => [f.key, ""]))]); }
  function remove(idx: number) { onChange(items.filter((_: any, i: number) => i !== idx)); }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {items.map((it: any, idx: number) => (
        <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {fields.map((f: any) => (
            <input key={f.key} value={it[f.key] || ""} onChange={(e) => update(idx, f.key, e.target.value)} placeholder={f.label} style={{ flex: 1 }} />
          ))}
          <button type="button" className="btn btn-sm btn-outline" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>↓</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(idx)}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline" onClick={add} style={{ alignSelf: "flex-start" }}>+ {addLabel}</button>
    </div>
  );
}
