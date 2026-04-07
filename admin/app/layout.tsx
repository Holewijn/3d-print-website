import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Admin — 3D Print" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <aside className="sidebar">
            <h2>Admin Panel</h2>
            <Link href="/admin/dashboard/">Dashboard</Link>
            <Link href="/admin/pages/">Pages</Link>
            <Link href="/admin/products/">Products</Link>
            <Link href="/admin/orders/">Orders</Link>
            <Link href="/admin/quotes/">Quotes</Link>
            <Link href="/admin/inventory/">Inventory</Link>
            <Link href="/admin/printers/">Printers</Link>
            <Link href="/admin/contact/">Contact Forms</Link>
            <Link href="/admin/settings/">Settings</Link>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
