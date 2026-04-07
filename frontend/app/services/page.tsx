import Link from "next/link";

export default function Services() {
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Our Services</h1>
          <p>Complete 3D printing and design services for makers, businesses, and creators.</p>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="grid grid-3">
            <div className="card">
              <div className="icon">▲</div>
              <h3>FDM Printing</h3>
              <p>Fused deposition modeling for durable parts in PLA, PETG, ABS, ASA, TPU and engineering plastics. Build volumes up to 300×300×400mm.</p>
            </div>
            <div className="card">
              <div className="icon">◆</div>
              <h3>Resin Printing</h3>
              <p>SLA/MSLA for ultra-detailed miniatures, jewelry masters, and dental models. Layer heights down to 25 microns.</p>
            </div>
            <div className="card">
              <div className="icon">✎</div>
              <h3>3D Modeling</h3>
              <p>Custom CAD design from sketches, photos, or descriptions. Reverse engineering and file repair also available.</p>
            </div>
            <div className="card">
              <div className="icon">⚙</div>
              <h3>Rapid Prototyping</h3>
              <p>Quick-turn iterations for product development. Same-day printing on small parts when capacity allows.</p>
            </div>
            <div className="card">
              <div className="icon">⊞</div>
              <h3>Small Batch Production</h3>
              <p>Print runs of 10-500 parts with consistent quality. Ideal for kickstarter fulfillment and limited editions.</p>
            </div>
            <div className="card">
              <div className="icon">✦</div>
              <h3>Post-Processing</h3>
              <p>Sanding, priming, painting, and assembly services to finish your parts to spec.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="alt">
        <div className="container">
          <div className="cta-banner">
            <h3>Not sure which service fits your project?</h3>
            <Link href="/contact/" className="btn btn-lg">Talk to Us →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
