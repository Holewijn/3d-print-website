import Link from "next/link";
import { getPublicSettings, DEFAULT_FOOTER, FooterColumn } from "../lib/publicSettings";

export default async function Footer() {
  const s = await getPublicSettings();
  const f = { ...DEFAULT_FOOTER, ...(s["footer"] || {}) };
  const columns: FooterColumn[] = Array.isArray(f.columns) && f.columns.length ? f.columns : DEFAULT_FOOTER.columns;
  const headerLogo = (s["header"]?.logoText) || "3D Print Studio";

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="logo" style={{ color: "#fff", marginBottom: "1rem" }}>
              <span className="logo-mark">▲</span>
              <span>{headerLogo}</span>
            </div>
            <p>{f.about}</p>
          </div>
          {columns.map((col, i) => (
            <div className="footer-col" key={i}>
              <h4>{col.title}</h4>
              {(col.links || []).map((link, j) => (
                <Link key={j} href={link.href}>{link.label}</Link>
              ))}
            </div>
          ))}
          <div className="footer-col">
            <h4>Contact</h4>
            <p>
              {f.contactEmail}<br />
              {f.contactPhone}<br />
              {f.contactAddress}
            </p>
          </div>
        </div>
        <div className="footer-bottom">{f.copyright}</div>
      </div>
    </footer>
  );
}
