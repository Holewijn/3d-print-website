import Link from "next/link";
import { getPublicSettings, DEFAULT_HEADER, MenuItem } from "../lib/publicSettings";
import CartButton from "./CartButton";

export default async function Header() {
  const s = await getPublicSettings();
  const h = { ...DEFAULT_HEADER, ...(s["header"] || {}) };
  const menu: MenuItem[] = Array.isArray(h.menu) && h.menu.length ? h.menu : DEFAULT_HEADER.menu;

  // New behavior: image + text are independent. If both are set, show side-by-side
  // (image left, text right). If only one, show just that one.
  const hasImage = !!h.logoUrl;
  const hasText = !!h.logoText;

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="logo" style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
          {hasImage && <img src={h.logoUrl} alt={h.logoText || "logo"} style={{ height: 40, width: "auto" }} />}
          {!hasImage && !hasText && <span className="logo-mark">{h.logoMark || "▲"}</span>}
          {hasText && <span>{h.logoText}</span>}
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
