"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

interface Field {
  id: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "number";
  name: string;          // posted as message metadata
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];    // for select
  rows?: number;         // for textarea
  width?: "full" | "half";
}

const DEFAULT_FIELDS: Field[] = [
  { id: "1", type: "text",     name: "name",    label: "Name",    required: true, width: "half" },
  { id: "2", type: "email",    name: "email",   label: "Email",   required: true, width: "half" },
  { id: "3", type: "text",     name: "subject", label: "Subject", required: false, width: "full" },
  { id: "4", type: "textarea", name: "message", label: "Message", required: true,  width: "full", rows: 5 },
];

export default function ContactFormBuilder() {
  const [fields, setFields] = useState<Field[]>([]);
  const [submitText, setSubmitText] = useState("Send Message");
  const [successMsg, setSuccessMsg] = useState("Thanks — we'll be in touch within 24 hours.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/settings").then((s) => {
      setFields(Array.isArray(s["contactForm.fields"]) && s["contactForm.fields"].length > 0 ? s["contactForm.fields"] : DEFAULT_FIELDS);
      if (s["contactForm.submitText"]) setSubmitText(s["contactForm.submitText"]);
      if (s["contactForm.successMsg"]) setSuccessMsg(s["contactForm.successMsg"]);
      setLoading(false);
    }).catch(() => { setFields(DEFAULT_FIELDS); setLoading(false); });
  }, []);

  function addField() {
    setFields([...fields, { id: Date.now().toString(), type: "text", name: `field_${fields.length + 1}`, label: "New Field", required: false, width: "full" }]);
  }
  function updateField(idx: number, patch: Partial<Field>) {
    setFields(fields.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }
  function removeField(idx: number) {
    if (!confirm("Delete this field?")) return;
    setFields(fields.filter((_, i) => i !== idx));
  }
  function moveField(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[idx], next[j]] = [next[j], next[idx]];
    setFields(next);
  }
  function resetToDefault() {
    if (!confirm("Reset all fields to default?")) return;
    setFields(DEFAULT_FIELDS);
  }

  async function save() {
    setSaving(true);
    try {
      await api("/settings/contactForm.fields", { method: "PUT", body: JSON.stringify({ value: fields }) });
      await api("/settings/contactForm.submitText", { method: "PUT", body: JSON.stringify({ value: submitText }) });
      await api("/settings/contactForm.successMsg", { method: "PUT", body: JSON.stringify({ value: successMsg }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  if (loading) return <Shell title="Contact Form"><p>Loading…</p></Shell>;

  return (
    <Shell title="Contact Form Builder" subtitle="Customize the contact form fields">
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h3>Form Fields ({fields.length})</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-outline btn-sm" onClick={resetToDefault}>Reset to Default</button>
            <button className="btn" onClick={addField}>+ Add Field</button>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="empty"><p>No fields. Add one to start.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {fields.map((f, idx) => (
              <details key={f.id} className="panel" style={{ background: "var(--bg)", padding: "0.85rem 1rem" }}>
                <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", listStyle: "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--primary-soft)", color: "var(--primary)", display: "inline-grid", placeItems: "center", fontSize: "0.85rem" }}>{fieldIcon(f.type)}</span>
                    <strong>{f.label || "(unnamed)"}</strong>
                    <span className="badge badge-muted">{f.type}</span>
                    {f.required && <span className="badge badge-warning">required</span>}
                  </span>
                  <span style={{ display: "flex", gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-outline" onClick={() => moveField(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="btn btn-sm btn-outline" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}>↓</button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeField(idx)}>Delete</button>
                  </span>
                </summary>
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                  <div className="form">
                    <div className="form-row">
                      <div>
                        <label>Field Type</label>
                        <select value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as any })}>
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="tel">Phone</option>
                          <option value="number">Number</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Dropdown</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      <div>
                        <label>Width</label>
                        <select value={f.width || "full"} onChange={(e) => updateField(idx, { width: e.target.value as any })}>
                          <option value="full">Full width</option>
                          <option value="half">Half width</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div>
                        <label>Label</label>
                        <input value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
                      </div>
                      <div>
                        <label>Field Name (internal)</label>
                        <input value={f.name} onChange={(e) => updateField(idx, { name: e.target.value.replace(/\s+/g, "_") })} />
                      </div>
                    </div>
                    {f.type !== "checkbox" && (
                      <div>
                        <label>Placeholder</label>
                        <input value={f.placeholder || ""} onChange={(e) => updateField(idx, { placeholder: e.target.value })} />
                      </div>
                    )}
                    {f.type === "textarea" && (
                      <div>
                        <label>Rows</label>
                        <input type="number" min={2} max={20} value={f.rows || 5} onChange={(e) => updateField(idx, { rows: +e.target.value })} />
                      </div>
                    )}
                    {f.type === "select" && (
                      <div>
                        <label>Options (one per line)</label>
                        <textarea rows={4} value={(f.options || []).join("\n")} onChange={(e) => updateField(idx, { options: e.target.value.split("\n").filter(Boolean) })} />
                      </div>
                    )}
                    <div>
                      <label><input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, { required: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Required field</label>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head"><h3>Form Settings</h3></div>
        <div className="form">
          <div>
            <label>Submit Button Text</label>
            <input value={submitText} onChange={(e) => setSubmitText(e.target.value)} />
          </div>
          <div>
            <label>Success Message (after submission)</label>
            <textarea rows={2} value={successMsg} onChange={(e) => setSuccessMsg(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button className="btn btn-lg" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Form"}</button>
        {saved && <span className="success-msg">✓ Saved — visit /contact/ to see the new form</span>}
        <a href="/contact/" target="_blank" className="btn btn-outline">Preview ↗</a>
      </div>
    </Shell>
  );
}

function fieldIcon(type: string) {
  return { text: "T", email: "@", tel: "☎", number: "#", textarea: "¶", select: "▼", checkbox: "☑" }[type] || "?";
}
