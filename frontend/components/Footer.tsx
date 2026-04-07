import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="logo" style={{ color: "#fff", marginBottom: "1rem" }}>
              <span className="logo-mark">▲</span>
              <span>3D Print Studio</span>
            </div>
            <p>Professional 3D printing services. From rapid prototypes to production runs, we bring your ideas to life with precision and quality.</p>
          </div>
          <div className="footer-col">
            <h4>Services</h4>
            <Link href="/services/">FDM Printing</Link>
            <Link href="/services/">Resin Printing</Link>
            <Link href="/services/">3D Modeling</Link>
            <Link href="/quote/">Get a Quote</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link href="/about/">About Us</Link>
            <Link href="/portfolio/">Portfolio</Link>
            <Link href="/contact/">Contact</Link>
            <Link href="/login/">Login</Link>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <p>info@3dprintstudio.local<br />+31 (0) 10 123 4567<br />Rotterdam, Netherlands</p>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} 3D Print Studio. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
