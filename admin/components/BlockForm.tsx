"use client";
import type { Block } from "../lib/blocks";

// A repeater control for arrays of items
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {items.map((it: any, idx: number) => (
        <div key={idx} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <strong style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Item {idx + 1}</strong>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>↓</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(idx)}>×</button>
            </div>
          </div>
          {fields.map((f: any) => (
            <div key={f.key} style={{ marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.75rem" }}>{f.label}</label>
              {f.type === "textarea"
                ? <textarea rows={2} value={it[f.key] || ""} onChange={e => update(idx, f.key, e.target.value)} />
                : <input value={it[f.key] || ""} onChange={e => update(idx, f.key, e.target.value)} placeholder={f.placeholder} />}
            </div>
          ))}
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline" onClick={add}>+ {addLabel}</button>
    </div>
  );
}

export default function BlockForm({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const set = (patch: Partial<Block>) => onChange({ ...block, ...patch } as Block);

  switch (block.type) {
    case "hero":
      return (
        <div className="form">
          <div><label>Title (use \n for line break)</label><input value={block.title} onChange={e => set({ title: e.target.value })} /></div>
          <div><label>Subtitle</label><textarea rows={2} value={block.subtitle} onChange={e => set({ subtitle: e.target.value })} /></div>
          <div><label>Background Image URL</label><input value={block.backgroundImage} onChange={e => set({ backgroundImage: e.target.value })} /></div>
          <div className="form-row">
            <div><label>Primary Button Text</label><input value={block.primaryButtonText || ""} onChange={e => set({ primaryButtonText: e.target.value })} /></div>
            <div><label>Primary Button Link</label><input value={block.primaryButtonHref || ""} onChange={e => set({ primaryButtonHref: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div><label>Secondary Button Text</label><input value={block.secondaryButtonText || ""} onChange={e => set({ secondaryButtonText: e.target.value })} /></div>
            <div><label>Secondary Button Link</label><input value={block.secondaryButtonHref || ""} onChange={e => set({ secondaryButtonHref: e.target.value })} /></div>
          </div>
        </div>
      );

    case "stats":
      return (
        <div className="form">
          <label>Statistics Items</label>
          <Repeater
            items={block.items}
            onChange={(items: any) => set({ items })}
            addLabel="Add stat"
            fields={[
              { key: "value", label: "Value", placeholder: "500+" },
              { key: "label", label: "Label", placeholder: "Projects Completed" },
            ]}
          />
        </div>
      );

    case "services":
      return (
        <div className="form">
          <div><label>Section Title</label><input value={block.title} onChange={e => set({ title: e.target.value })} /></div>
          <div><label>Section Subtitle</label><input value={block.subtitle || ""} onChange={e => set({ subtitle: e.target.value })} /></div>
          <label>Services</label>
          <Repeater
            items={block.items}
            onChange={(items: any) => set({ items })}
            addLabel="Add service"
            fields={[
              { key: "icon", label: "Icon (emoji or symbol)", placeholder: "⚙" },
              { key: "title", label: "Title" },
              { key: "description", label: "Description", type: "textarea" },
            ]}
          />
        </div>
      );

    case "steps":
      return (
        <div className="form">
          <div><label>Section Title</label><input value={block.title} onChange={e => set({ title: e.target.value })} /></div>
          <div><label>Section Subtitle</label><input value={block.subtitle || ""} onChange={e => set({ subtitle: e.target.value })} /></div>
          <label>Steps</label>
          <Repeater
            items={block.items}
            onChange={(items: any) => set({ items })}
            addLabel="Add step"
            fields={[
              { key: "number", label: "Number", placeholder: "1" },
              { key: "title", label: "Title" },
              { key: "description", label: "Description", type: "textarea" },
            ]}
          />
        </div>
      );

    case "portfolio":
      return (
        <div className="form">
          <div><label>Section Title</label><input value={block.title} onChange={e => set({ title: e.target.value })} /></div>
          <div><label>Section Subtitle</label><input value={block.subtitle || ""} onChange={e => set({ subtitle: e.target.value })} /></div>
          <div><label><input type="checkbox" checked={block.showViewAllButton || false} onChange={e => set({ showViewAllButton: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Show "View Full Portfolio" button</label></div>
          <label>Projects</label>
          <Repeater
            items={block.items}
            onChange={(items: any) => set({ items })}
            addLabel="Add project"
            fields={[
              { key: "image", label: "Image URL" },
              { key: "title", label: "Title" },
              { key: "description", label: "Description" },
            ]}
          />
        </div>
      );

    case "richtext":
      return (
        <div className="form">
          <div><label>Content</label><textarea rows={6} value={block.content} onChange={e => set({ content: e.target.value })} /></div>
          <div>
            <label>Alignment</label>
            <select value={block.align || "left"} onChange={e => set({ align: e.target.value as any })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="form">
          <div><label>Image URL</label><input value={block.src} onChange={e => set({ src: e.target.value })} /></div>
          <div><label>Alt Text</label><input value={block.alt} onChange={e => set({ alt: e.target.value })} /></div>
          <div><label>Caption (optional)</label><input value={block.caption || ""} onChange={e => set({ caption: e.target.value })} /></div>
        </div>
      );

    case "cta":
      return (
        <div className="form">
          <div><label>Title</label><input value={block.title} onChange={e => set({ title: e.target.value })} /></div>
          <div className="form-row">
            <div><label>Button Text</label><input value={block.buttonText} onChange={e => set({ buttonText: e.target.value })} /></div>
            <div><label>Button Link</label><input value={block.buttonHref} onChange={e => set({ buttonHref: e.target.value })} /></div>
          </div>
        </div>
      );

    case "contactinfo":
      return (
        <div className="form">
          <div><label>Email</label><input value={block.email} onChange={e => set({ email: e.target.value })} /></div>
          <div><label>Phone</label><input value={block.phone} onChange={e => set({ phone: e.target.value })} /></div>
          <div><label>Address (multiline)</label><textarea rows={3} value={block.address} onChange={e => set({ address: e.target.value })} /></div>
          <div><label>Opening Hours (multiline)</label><textarea rows={3} value={block.hours} onChange={e => set({ hours: e.target.value })} /></div>
        </div>
      );

    case "faq":
      return (
        <div className="form">
          <div><label>Section Title</label><input value={block.title} onChange={e => set({ title: e.target.value })} /></div>
          <label>Questions</label>
          <Repeater
            items={block.items}
            onChange={(items: any) => set({ items })}
            addLabel="Add question"
            fields={[
              { key: "question", label: "Question" },
              { key: "answer", label: "Answer", type: "textarea" },
            ]}
          />
        </div>
      );

    case "twocolumn":
      return (
        <div className="form">
          <div><label>Title</label><input value={block.title} onChange={e => set({ title: e.target.value })} /></div>
          <div><label>Body Text (multiline)</label><textarea rows={5} value={block.body} onChange={e => set({ body: e.target.value })} /></div>
          <div><label>Image URL</label><input value={block.imageUrl} onChange={e => set({ imageUrl: e.target.value })} /></div>
          <div><label><input type="checkbox" checked={block.imageRight || false} onChange={e => set({ imageRight: e.target.checked })} style={{ width: "auto", marginRight: "0.5rem" }} />Image on the right</label></div>
        </div>
      );

    default:
      return <p style={{ color: "var(--text-muted)" }}>Unknown block type</p>;
  }
}
