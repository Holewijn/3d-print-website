import Link from "next/link";
import type { Block } from "../../lib/blocks";

export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!Array.isArray(blocks)) return null;
  return <>{blocks.map((b, i) => <RenderBlock key={i} block={b} />)}</>;
}

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return (
        <section className="hero" style={{ padding: 0 }}>
          <div className="hero-bg" style={{ backgroundImage: `url(${block.backgroundImage})` }} />
          <div className="hero-overlay" />
          <div className="container">
            <div className="hero-content">
              <h1 style={{ whiteSpace: "pre-line" }}>{block.title}</h1>
              <p>{block.subtitle}</p>
              <div className="btn-row">
                {block.primaryButtonText && (
                  <Link href={block.primaryButtonHref || "#"} className="btn btn-lg">{block.primaryButtonText} →</Link>
                )}
                {block.secondaryButtonText && (
                  <Link href={block.secondaryButtonHref || "#"} className="btn btn-lg btn-outline" style={{ color: "#fff", borderColor: "#fff" }}>{block.secondaryButtonText}</Link>
                )}
              </div>
            </div>
          </div>
        </section>
      );

    case "stats":
      return (
        <div className="stats-strip">
          <div className="container" style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`, gap: "2rem" }}>
            {block.items.map((s, i) => (
              <div className="stat" key={i}>
                <div className="num">{s.value}</div>
                <div className="label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "services":
      return (
        <section>
          <div className="container">
            <div className="section-head">
              <h2>{block.title}</h2>
              {block.subtitle && <p>{block.subtitle}</p>}
            </div>
            <div className="grid grid-3">
              {block.items.map((s, i) => (
                <div className="card" key={i}>
                  <div className="icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "steps":
      return (
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <h2>{block.title}</h2>
              {block.subtitle && <p>{block.subtitle}</p>}
            </div>
            <div className="steps">
              {block.items.map((s, i) => (
                <div className="step" key={i}>
                  <div className="num">{s.number}</div>
                  <h4>{s.title}</h4>
                  <p>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "portfolio":
      return (
        <section>
          <div className="container">
            <div className="section-head">
              <h2>{block.title}</h2>
              {block.subtitle && <p>{block.subtitle}</p>}
            </div>
            <div className="grid grid-3">
              {block.items.map((p, i) => (
                <div className="project-card" key={i}>
                  <div className="img"><img src={p.image} alt={p.title} /></div>
                  <div className="body"><h3>{p.title}</h3><p>{p.description}</p></div>
                </div>
              ))}
            </div>
            {block.showViewAllButton && (
              <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
                <Link href="/portfolio/" className="btn btn-outline">View Full Portfolio</Link>
              </div>
            )}
          </div>
        </section>
      );

    case "richtext":
      return (
        <section>
          <div className="container" style={{ maxWidth: 800, textAlign: block.align || "left" }}>
            <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)", lineHeight: 1.8 }}>{block.content}</div>
          </div>
        </section>
      );

    case "image":
      return (
        <section>
          <div className="container">
            <img src={block.src} alt={block.alt} style={{ borderRadius: "var(--radius)", width: "100%" }} />
            {block.caption && <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "0.75rem" }}>{block.caption}</p>}
          </div>
        </section>
      );

    case "cta":
      return (
        <section style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-banner">
              <h3>{block.title}</h3>
              <Link href={block.buttonHref} className="btn btn-lg">{block.buttonText} →</Link>
            </div>
          </div>
        </section>
      );

    case "contactinfo":
      return (
        <section>
          <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
            <div><div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Email</div><div style={{ color: "var(--text-muted)" }}>{block.email}</div></div>
            <div><div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Phone</div><div style={{ color: "var(--text-muted)" }}>{block.phone}</div></div>
            <div><div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Address</div><div style={{ color: "var(--text-muted)", whiteSpace: "pre-line" }}>{block.address}</div></div>
            <div><div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Hours</div><div style={{ color: "var(--text-muted)", whiteSpace: "pre-line" }}>{block.hours}</div></div>
          </div>
        </section>
      );

    case "faq":
      return (
        <section className="alt">
          <div className="container" style={{ maxWidth: 800 }}>
            <div className="section-head"><h2>{block.title}</h2></div>
            {block.items.map((f, i) => (
              <details key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "1.25rem 1.5rem", marginBottom: "0.75rem" }}>
                <summary style={{ fontWeight: 700, cursor: "pointer", fontSize: "1.05rem" }}>{f.question}</summary>
                <p style={{ color: "var(--text-muted)", marginTop: "0.75rem" }}>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      );

    case "twocolumn":
      return (
        <section>
          <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
            {block.imageRight ? (
              <>
                <div>
                  <h2 style={{ fontSize: "2rem", marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>{block.title}</h2>
                  <div style={{ color: "var(--text-muted)", whiteSpace: "pre-line" }}>{block.body}</div>
                </div>
                <img src={block.imageUrl} alt="" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }} />
              </>
            ) : (
              <>
                <img src={block.imageUrl} alt="" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }} />
                <div>
                  <h2 style={{ fontSize: "2rem", marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>{block.title}</h2>
                  <div style={{ color: "var(--text-muted)", whiteSpace: "pre-line" }}>{block.body}</div>
                </div>
              </>
            )}
          </div>
        </section>
      );

    default:
      return null;
  }
}
