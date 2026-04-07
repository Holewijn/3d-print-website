const PROJECTS = [
  { title: "Robotic Hand", desc: "Functional prosthetic prototype", img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80" },
  { title: "Architecture Model", desc: "Scale building complex", img: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600&q=80" },
  { title: "Drone Frame", desc: "Custom racing quadcopter", img: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&q=80" },
  { title: "Cosplay Helmet", desc: "Wearable sci-fi prop", img: "https://images.unsplash.com/photo-1635002962487-2c1d4d2f63c2?w=600&q=80" },
  { title: "Mechanical Gears", desc: "Working planetary gearbox", img: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&q=80" },
  { title: "Custom Enclosure", desc: "Electronics housing prototype", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80" },
];

export default function Portfolio() {
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Portfolio</h1>
          <p>A selection of projects we've brought to life — from prototypes to finished products.</p>
        </div>
      </div>
      <section>
        <div className="container">
          <div className="grid grid-3">
            {PROJECTS.map((p, i) => (
              <div className="project-card" key={i}>
                <div className="img"><img src={p.img} alt={p.title} /></div>
                <div className="body">
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
