"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

const NAV = [
  { section: null, items: [{ href: "/", label: "Dashboard", icon: "▤" }] },
  {
    section: "Content",
    items: [
      { href: "/pages/",    label: "Pages",    icon: "▭" },
      { href: "/products/", label: "Products", icon: "▣" },
      { href: "/quotes/",   label: "Quotes",   icon: "✎" },
      { href: "/orders/",   label: "Orders",   icon: "▦" },
      { href: "/invoices/", label: "Invoices", icon: "📄" },
    ],
  },
  {
    section: "Production",
    items: [
      { href: "/printers/",        label: "Printers",        icon: "▲" },
      { href: "/printer-control/", label: "Printer Control", icon: "◈" },
      { href: "/print-queue/",     label: "Print Queue",     icon: "⇉" },
      { href: "/inventory/",       label: "Inventory",       icon: "◉" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/shipping/",     label: "Shipping",      icon: "✈" },
      { href: "/contact/",      label: "Messages",      icon: "✉" },
      { href: "/contact-form/", label: "Contact Form",  icon: "▤" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/appearance/", label: "Appearance",   icon: "✦" },
      { href: "/media/",      label: "Media Library", icon: "▣" },
      { href: "/stats/",      label: "Statistics",    icon: "≡" },
      { href: "/settings/",   label: "Settings",      icon: "⚙" },
      { href: "/update/",     label: "System Update", icon: "↻" },
    ],
  },
];

const STORAGE_KEY = "p3d_sidebar_collapsed";

export default function Sidebar() {
  const pathname  = usePathname() || "/";
  const searchRef = useRef<HTMLInputElement>(null);
  const isActive  = (href: string) =>
    href === "/" ? pathname === "/" || pathname === "" : pathname.startsWith(href);

  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery]         = useState("");
  const [brand, setBrand]         = useState<any>({
    brandName: "Print Studio", tagline: "Admin v1.0",
    logoMark: "3D", logoUrl: "", primaryColor: "#3b82f6",
  });

  // Restore collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) === "1";
    setCollapsed(saved);
    document.body.classList.toggle("sidebar-collapsed", saved);
  }, []);

  // Sync body class whenever collapsed changes
  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Keyboard shortcut: [ to toggle, / to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "[") setCollapsed((v) => !v);
      if (e.key === "/" && !collapsed) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed]);

  // Load brand settings
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

  // Filter nav items
  const q = query.trim().toLowerCase();
  const filtered = NAV.map((group) => ({
    ...group,
    items: q ? group.items.filter((it) => it.label.toLowerCase().includes(q)) : group.items,
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        {brand.logoUrl
          ? <img src={brand.logoUrl} alt={brand.brandName} style={{ height: 36, width: "auto" }} />
          : <div className="mark">{brand.logoMark}</div>}
        <div className="sidebar-brand-text">
          <div className="name">{brand.brandName}</div>
          <div className="ver">{brand.tagline}</div>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          ref={searchRef}
          placeholder="Search…  /"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
        />
      </div>

      {/* Nav groups */}
      {filtered.map((group, gi) => (
        <div key={gi}>
          {group.section && <div className="sidebar-section">{group.section}</div>}
          <nav className="sidebar-nav">
            {group.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={isActive(it.href) ? "active" : ""}
                title={collapsed ? it.label : undefined}
                onClick={() => setQuery("")}
              >
                <span className="icon">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      ))}

      {q && filtered.length === 0 && (
        <div style={{ padding: "1rem", color: "var(--text-dim)", fontSize: "0.82rem", textAlign: "center" }}>
          No results for "{query}"
        </div>
      )}

      {/* Footer: collapse toggle */}
      <div
        className="sidebar-footer"
        onClick={() => setCollapsed((v) => !v)}
        style={{ cursor: "pointer" }}
        title={collapsed ? "Expand sidebar  [" : "Collapse sidebar  ["}
      >
        <span style={{ fontSize: "1rem" }}>{collapsed ? "→" : "←"}</span>
        <span className="sidebar-footer-text" style={{ fontSize: "0.8rem" }}>
          {collapsed ? "" : "Collapse  ["}
        </span>
      </div>
    </aside>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m) return `rgba(59,130,246,${alpha})`;
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
