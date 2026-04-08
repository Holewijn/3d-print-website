import Link from "next/link";
import { getPublicSettings, DEFAULT_HEADER, MenuItem } from "../lib/publicSettings";
import CartButton from "./CartButton";

export default async function Header() {
  const s = await getPublicSettings();
  const h = { ...DEFAULT_HEADER, ...(s["header"] || {}) };
  const menu: MenuItem[] = Array.isArray(h.menu) && h.menu.length ? h.menu : DEFAULT_HEADER.menu;

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="logo">
          {h.logoType === "image" && h.logoUrl ? (
            <img src={h.logoUrl} alt={h.logoText} style={{ height: 40, width: "auto" }} />
          ) : (
            <>
              <span className="logo-mark">{h.logoMark || "▲"}</span>
              <span>{h.logoText}</span>
            </>
          )}
        </Link>
        <nav className="nav">
          {menu.map((item, i) => (
            <Link key={i} href={item.href}>{item.label}</Link>
          ))}
          {h.showCart !== false && <CartButton color={h.cartColor || ""} />}
          {h.ctaText && <Link href={h.ctaHref || "/quote/"} className="btn">{h.ctaText}</Link>}
        </nav>
      </div>
    </header>
  );
}
