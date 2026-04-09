"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const NAV = [
  { section: null, items: [{ href: "/", label: "Dashboard", icon: "▤" }] },
  {
    section: "Content",
    items: [
      { href: "/pages/", label: "Pages", icon: "▭" },
      { href: "/products/", label: "Products", icon: "▣" },
      { href: "/quotes/", label: "Quotes", icon: "✎" },
      { href: "/orders/", label: "Orders", icon: "▦" },
      { href: "/invoices/", label: "Invoices", icon: "📄" },
    ],
  },
  {
    section: "Production",
    items: [
      { href: "/printers/", label: "Printers", icon: "▲" },
      { href: "/print-queue/", label: "Print Queue", icon: "⇉" },
      { href: "/inventory/", label: "Inventory", icon: "◉" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/shipping/", label: "Shipping", icon: "✈" },
      { href: "/contact/", label: "Messages", icon: "✉" },
      { href: "/contact-form/", label: "Contact Form", icon: "▤" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/appearance/", label: "Appearance", icon: "✦" },
      { href: "/media/", label: "Media Library", icon: "▣" },
      { href: "/stats/", label: "Statistics", icon: "≡" },
      { href: "/settings/", label: "Settings", icon: "⚙" },
      { href: "/update/", label: "System Update", icon: "↻" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname === "" : pathname.startsWith(href);

  const [brand, setBrand] = useState<any>({
    brandName: "Print Studio", tagline: "Admin v1.0",
    logoMark: "3D", logoUrl: "", primaryColor: "#3b82f6",
  });

  useEffect(() => {
    api("/settings/public").then((s) => {
      if (s["admin"]) {
        const a = s["admin"];
        setBrand((prev: any) => ({ ...prev, ...a }));
        if (a.primaryColor) {
          document.documentElement.style.setProperty("--primary", a.primaryColor);
          document.documentElement.style.setProperty("--primary-dark", a.primaryColor);
          document.documentElement.style.setProperty("--primary-soft", hexToRgba(a.primaryColor, 0.12));
        }
      }
    }).catch(() => {});
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {brand.logoUrl
          ? <img src={brand.logoUrl} alt={brand.brandName} style={{ height: 36, width: "auto" }} />
          : <div className="mark">{brand.logoMark}</div>}
        <div>
          <div className="name">{brand.brandName}</div>
          <div className="ver">{brand.tagline}</div>
        </div>
      </div>
      <div className="sidebar-search"><input placeholder="Search menu…" /></div>
      {NAV.map((group, gi) => (
        <div key={gi}>
          {group.section && <div className="sidebar-section">{group.section}</div>}
          <nav className="sidebar-nav">
            {group.items.map((it) => (
              <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
                <span className="icon">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      ))}
      <div className="sidebar-footer">← Collapse Menu</div>
    </aside>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m) return `rgba(59,130,246,${alpha})`;
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
