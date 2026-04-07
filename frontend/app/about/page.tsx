import Link from "next/link";

export default function About() {
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>About Us</h1>
          <p>A small studio with a big passion for additive manufacturing.</p>
        </div>
      </div>

      <section>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "2rem", marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>Built by makers, for makers</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>3D Print Studio started as a single printer in a garage and grew into a full-service print shop. We work with hobbyists, designers, engineers, and businesses to turn digital files into physical reality.</p>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>Every print is calibrated, inspected, and packaged by hand. We don't outsource and we don't cut corners — because we know how much your project means to you.</p>
            <p style={{ color: "var(--text-muted)" }}>Whether you need one custom part or a hundred, we'd love to work with you.</p>
          </div>
          <div>
            <img src="https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80" alt="Workshop" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }} />
          </div>
        </div>
      </section>

      <section className="alt">
        <div className="container">
          <div className="section-head">
            <h2>Our Values</h2>
          </div>
          <div className="grid grid-3">
            <div className="card">
              <div className="icon">✓</div>
              <h3>Quality First</h3>
              <p>Every print is inspected before it leaves the shop. If it's not right, we reprint it.</p>
            </div>
            <div className="card">
              <div className="icon">⚡</div>
              <h3>Fast Turnaround</h3>
              <p>Most orders ship within 48-72 hours. Rush service available for time-sensitive projects.</p>
            </div>
            <div className="card">
              <div className="icon">♻</div>
              <h3>Sustainable</h3>
              <p>We recycle failed prints and source biodegradable PLA whenever possible.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="cta-banner">
            <h3>Have a project in mind? Let's talk.</h3>
            <Link href="/contact/" className="btn btn-lg">Contact Us →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
