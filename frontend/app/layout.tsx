import "./globals.css";
import Link from "next/link";

export const metadata = { title: "3D Print Studio" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="logo">3D Print Studio</Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/services/">Services</Link>
            <Link href="/webshop/">Webshop</Link>
            <Link href="/quote/">Quote</Link>
            <Link href="/portfolio/">Portfolio</Link>
            <Link href="/about/">About</Link>
            <Link href="/contact/">Contact</Link>
            <Link href="/login/">Login</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">© 3D Print Studio</footer>
      </body>
    </html>
  );
}
