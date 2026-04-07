"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Settings() {
  const [s, setS] = useState<any>({});
  useEffect(() => { api("/settings").then(setS); }, []);
  async function save(key: string) {
    await api(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value: s[key] }) });
    alert("Saved " + key);
  }
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  return (
    <div>
      <div className="card"><h1>Settings</h1></div>
      <div className="card">
        <h2>Site</h2>
        <label>Title</label><input value={s["site.title"] || ""} onChange={e => set("site.title", e.target.value)} />
        <button className="btn" onClick={() => save("site.title")}>Save</button>
        <label>Logo text</label><input value={s["site.logoText"] || ""} onChange={e => set("site.logoText", e.target.value)} />
        <button className="btn" onClick={() => save("site.logoText")}>Save</button>
        <label>Logo URL</label><input value={s["site.logoUrl"] || ""} onChange={e => set("site.logoUrl", e.target.value)} />
        <button className="btn" onClick={() => save("site.logoUrl")}>Save</button>
        <label>Favicon URL</label><input value={s["site.faviconUrl"] || ""} onChange={e => set("site.faviconUrl", e.target.value)} />
        <button className="btn" onClick={() => save("site.faviconUrl")}>Save</button>
        <label>Footer text</label><input value={s["site.footer"] || ""} onChange={e => set("site.footer", e.target.value)} />
        <button className="btn" onClick={() => save("site.footer")}>Save</button>
        <label>Contact email</label><input value={s["site.contactEmail"] || ""} onChange={e => set("site.contactEmail", e.target.value)} />
        <button className="btn" onClick={() => save("site.contactEmail")}>Save</button>
        <label>Contact phone</label><input value={s["site.contactPhone"] || ""} onChange={e => set("site.contactPhone", e.target.value)} />
        <button className="btn" onClick={() => save("site.contactPhone")}>Save</button>
      </div>
      <div className="card">
        <h2>SEO</h2>
        <label>Default title</label><input value={s["seo.defaultTitle"] || ""} onChange={e => set("seo.defaultTitle", e.target.value)} />
        <button className="btn" onClick={() => save("seo.defaultTitle")}>Save</button>
        <label>Default description</label><textarea value={s["seo.defaultDesc"] || ""} onChange={e => set("seo.defaultDesc", e.target.value)} />
        <button className="btn" onClick={() => save("seo.defaultDesc")}>Save</button>
      </div>
      <div className="card">
        <h2>Mollie</h2>
        <label>API key</label><input value={s["mollie.apiKey"] || ""} onChange={e => set("mollie.apiKey", e.target.value)} placeholder="test_xxx or live_xxx" />
        <button className="btn" onClick={() => save("mollie.apiKey")}>Save</button>
      </div>
      <div className="card">
        <h2>Energy Pricing</h2>
        <label>Provider</label>
        <select value={s["energy.provider"] || "manual"} onChange={e => set("energy.provider", e.target.value)}>
          <option value="manual">Manual</option>
          <option value="zonneplan">Zonneplan</option>
        </select>
        <button className="btn" onClick={() => save("energy.provider")}>Save</button>
        <label>Manual price (€/kWh)</label><input type="number" step="0.01" value={s["energy.priceKwh"] || 0.30} onChange={e => set("energy.priceKwh", +e.target.value)} />
        <button className="btn" onClick={() => save("energy.priceKwh")}>Save</button>
        <label>Zonneplan API key</label><input value={s["energy.zonneplanKey"] || ""} onChange={e => set("energy.zonneplanKey", e.target.value)} />
        <button className="btn" onClick={() => save("energy.zonneplanKey")}>Save</button>
      </div>
      <div className="card">
        <h2>Pricing</h2>
        <label>Margin %</label><input type="number" value={s["pricing.marginPct"] || 25} onChange={e => set("pricing.marginPct", +e.target.value)} />
        <button className="btn" onClick={() => save("pricing.marginPct")}>Save</button>
      </div>
    </div>
  );
}
