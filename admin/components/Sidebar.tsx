"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { section: null, items: [{ href: "/", label: "Dashboard", icon: "▤" }] },
  {
    section: "Content",
    items: [
      { href: "/pages/", label: "Pages", icon: "▭" },
      { href: "/products/", label: "Products", icon: "▣" },
      { href: "/quotes/", label: "Quotes", icon: "✎" },
      { href: "/orders/", label: "Orders", icon: "▦" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/printers/", label: "Printers", icon: "▲" },
      { href: "/inventory/", label: "Inventory", icon: "◉" },
      { href: "/shipping/", label: "Shipping", icon: "✈" },
      { href: "/contact/", label: "Messages", icon: "✉" },
      { href: "/contact-form/", label: "Contact Form", icon: "▤" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/stats/", label: "Statistics", icon: "≡" },
      { href: "/settings/", label: "Settings", icon: "⚙" },
      { href: "/update/", label: "System Update", icon: "↻" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(href);
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="mark">3D</div>
        <div>
          <div className="name">Print Studio</div>
          <div className="ver">Admin v1.0</div>
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
