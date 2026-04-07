import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="logo">
          <span className="logo-mark">▲</span>
          <span>3D Print Studio</span>
        </Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/services/">Services</Link>
          <Link href="/webshop/">Shop</Link>
          <Link href="/portfolio/">Portfolio</Link>
          <Link href="/about/">About</Link>
          <Link href="/contact/">Contact</Link>
          <Link href="/quote/" className="btn">Get a Quote</Link>
        </nav>
      </div>
    </header>
  );
}
