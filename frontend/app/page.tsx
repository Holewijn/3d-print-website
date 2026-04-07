import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="hero" style={{ padding: 0 }}>
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="container">
          <div className="hero-content">
            <h1>Professional<br />3D Printing Services</h1>
            <p>Bringing your ideas to life with precision and quality. Upload your design, get an instant quote, and we'll handle the rest.</p>
            <div className="btn-row">
              <Link href="/quote/" className="btn btn-lg">Get a Quote →</Link>
              <Link href="/portfolio/" className="btn btn-lg btn-outline" style={{ color: "#fff", borderColor: "#fff" }}>View Portfolio</Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "2rem" }}>
          <div className="stat"><div className="num">500+</div><div className="label">Projects Completed</div></div>
          <div className="stat"><div className="num">12</div><div className="label">Materials Available</div></div>
          <div className="stat"><div className="num">48h</div><div className="label">Average Turnaround</div></div>
          <div className="stat"><div className="num">99%</div><div className="label">Customer Satisfaction</div></div>
        </div>
      </div>

      {/* SERVICES */}
      <section>
        <div className="container">
          <div className="section-head">
            <h2>Our Services</h2>
            <p>From rapid prototyping to small-batch production, we offer a complete range of 3D printing solutions.</p>
          </div>
          <div className="grid grid-3">
            <div className="card">
              <div className="icon">⚙</div>
              <h3>Rapid Prototyping</h3>
              <p>Quickly bring your concepts to life with fast iteration cycles and detailed prototypes.</p>
            </div>
            <div className="card">
              <div className="icon">▲</div>
              <h3>Custom 3D Printing</h3>
              <p>Tailored printing solutions for your unique needs in PLA, PETG, ABS, TPU and more.</p>
            </div>
            <div className="card">
              <div className="icon">✎</div>
              <h3>3D Design & Modeling</h3>
              <p>Expert CAD design and 3D modeling services to turn your ideas into print-ready files.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="alt">
        <div className="container">
          <div className="section-head">
            <h2>How It Works</h2>
            <p>Get from idea to printed object in four simple steps.</p>
          </div>
          <div className="steps">
            <div className="step"><div className="num">1</div><h4>Upload STL</h4><p>Drop your 3D model file into our quote tool.</p></div>
            <div className="step"><div className="num">2</div><h4>Get Quote</h4><p>Instant pricing based on material, time, and complexity.</p></div>
            <div className="step"><div className="num">3</div><h4>We Print</h4><p>Your design is printed on our calibrated machines.</p></div>
            <div className="step"><div className="num">4</div><h4>Delivery</h4><p>Receive your finished part within days.</p></div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section>
        <div className="container">
          <div className="section-head">
            <h2>Featured Projects</h2>
            <p>A small selection of recent work from our studio.</p>
          </div>
          <div className="grid grid-3">
            <div className="project-card">
              <div className="img"><img src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80" alt="Robotic Hand" /></div>
              <div className="body"><h3>Robotic Hand</h3><p>Functional prosthetic prototype with articulated fingers.</p></div>
            </div>
            <div className="project-card">
              <div className="img"><img src="https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600&q=80" alt="Architecture model" /></div>
              <div className="body"><h3>Miniature Architecture</h3><p>Detailed scale model of a modern building complex.</p></div>
            </div>
            <div className="project-card">
              <div className="img"><img src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&q=80" alt="Custom Drone" /></div>
              <div className="body"><h3>Custom Drone Frame</h3><p>Lightweight quadcopter frame designed for racing.</p></div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link href="/portfolio/" className="btn btn-outline">View Full Portfolio</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-banner">
            <h3>Ready to start your next 3D printing project?</h3>
            <Link href="/quote/" className="btn btn-lg">Get Started →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
