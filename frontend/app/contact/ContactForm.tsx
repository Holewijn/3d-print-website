"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Field {
  id: string;
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  rows?: number;
  width?: "full" | "half";
}

const DEFAULT_FIELDS: Field[] = [
  { id: "1", type: "text",     name: "name",    label: "Name",    required: true, width: "half" },
  { id: "2", type: "email",    name: "email",   label: "Email",   required: true, width: "half" },
  { id: "3", type: "text",     name: "subject", label: "Subject", required: false, width: "full" },
  { id: "4", type: "textarea", name: "message", label: "Message", required: true,  width: "full", rows: 5 },
];

export default function ContactForm() {
  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS);
  const [submitText, setSubmitText] = useState("Send Message");
  const [successMsg, setSuccessMsg] = useState("Thanks — we'll be in touch within 24 hours.");
  const [values, setValues] = useState<Record<string, any>>({});
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public").catch(() => null);
    api("/settings/public").then((s: any) => {
      // public endpoint only exposes site/seo keys; fetch contact form via direct settings call
    });
    // Fetch contact form fields specifically
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then(() => {
        // Use direct fetch to get form config (it's stored under contactForm.* keys)
        return fetch("/api/contact/form-config").then((r) => r.ok ? r.json() : null);
      })
      .then((cfg) => {
        if (cfg?.fields?.length) setFields(cfg.fields);
        if (cfg?.submitText) setSubmitText(cfg.submitText);
        if (cfg?.successMsg) setSuccessMsg(cfg.successMsg);
      })
      .catch(() => {});
  }, []);

  function setVal(name: string, value: any) {
    setValues({ ...values, [name]: value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      // Build the message body. The backend's /api/contact expects { name, email, subject, message }.
      // Map dynamic fields → known fields, plus stuff everything into message text.
      const name = values.name || "";
      const email = values.email || "";
      const subject = values.subject || "Contact form submission";
      const messageLines: string[] = [];
      for (const f of fields) {
        if (["name", "email", "subject"].includes(f.name)) continue;
        const v = values[f.name];
        if (v != null && v !== "" && v !== false) {
          messageLines.push(`${f.label}: ${v}`);
        }
      }
      const message = (values.message || "") + (messageLines.length ? "\n\n---\n" + messageLines.join("\n") : "");

      await api("/contact", { method: "POST", body: JSON.stringify({ name, email, subject, message }) });
      setSent(true);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (sent) {
    return (
      <section>
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="form-card">
            <div className="success">✓ {successMsg}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="form-card" style={{ maxWidth: "100%" }}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {fields.map((f) => {
                const span = f.width === "half" ? "span 1" : "span 2";
                return (
                  <div key={f.id} style={{ gridColumn: span }}>
                    {f.type !== "checkbox" && <label>{f.label}{f.required && " *"}</label>}
                    {renderField(f, values[f.name], (v) => setVal(f.name, v))}
                  </div>
                );
              })}
            </div>
            <button type="submit" className="btn btn-lg" disabled={busy} style={{ marginTop: "1.5rem" }}>
              {busy ? "Sending…" : submitText + " →"}
            </button>
            {err && <div className="error" style={{ marginTop: "1rem" }}>{err}</div>}
          </form>
        </div>
      </div>
    </section>
  );
}

function renderField(f: Field, value: any, onChange: (v: any) => void) {
  const common = { required: f.required, placeholder: f.placeholder || "" };
  switch (f.type) {
    case "textarea":
      return <textarea rows={f.rows || 5} value={value || ""} onChange={(e) => onChange(e.target.value)} {...common} />;
    case "select":
      return (
        <select value={value || ""} onChange={(e) => onChange(e.target.value)} required={f.required}>
          <option value="">— Select —</option>
          {(f.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      );
    case "checkbox":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} required={f.required} style={{ width: "auto" }} />
          <span>{f.label}{f.required && " *"}</span>
        </label>
      );
    case "number":
      return <input type="number" value={value || ""} onChange={(e) => onChange(e.target.value)} {...common} />;
    case "email":
      return <input type="email" value={value || ""} onChange={(e) => onChange(e.target.value)} {...common} />;
    case "tel":
      return <input type="tel" value={value || ""} onChange={(e) => onChange(e.target.value)} {...common} />;
    default:
      return <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} {...common} />;
  }
}
