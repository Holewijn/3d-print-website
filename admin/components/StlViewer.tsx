"use client";
import { useEffect, useRef, useState } from "react";

declare global { interface Window { THREE: any; } }

interface Props {
  stlUploadId: string;
  height?: number;
  color?: string;
}

export default function StlViewer({ stlUploadId, height = 360, color = "#2563eb" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dims, setDims] = useState<{ x: number; y: number; z: number } | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const stateRef = useRef<any>({});

  // Load Three.js from CDN once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.THREE) { init(); return; }

    const s1 = document.createElement("script");
    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s1.async = true;
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js";
      s2.async = true;
      s2.onload = () => {
        const s3 = document.createElement("script");
        s3.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js";
        s3.async = true;
        s3.onload = () => init();
        s3.onerror = () => setErr("Failed to load 3D viewer");
        document.head.appendChild(s3);
      };
      s2.onerror = () => setErr("Failed to load STL loader");
      document.head.appendChild(s2);
    };
    s1.onerror = () => setErr("Failed to load Three.js");
    document.head.appendChild(s1);

    return () => {
      // cleanup on unmount
      const st = stateRef.current;
      if (st.renderer) {
        try { st.renderer.dispose(); } catch {}
        try { st.controls?.dispose(); } catch {}
        if (st.animationId) cancelAnimationFrame(st.animationId);
        if (st.renderer.domElement?.parentNode) st.renderer.domElement.parentNode.removeChild(st.renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stlUploadId]);

  function init() {
    if (!containerRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fafc");

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
    camera.position.set(80, 80, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dir1.position.set(100, 200, 100);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir2.position.set(-100, -100, -100);
    scene.add(dir2);

    // Grid
    const grid = new THREE.GridHelper(200, 20, 0xcccccc, 0xeeeeee);
    scene.add(grid);

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    stateRef.current = { scene, camera, renderer, controls, mesh: null };

    // Load STL
    const loader = new THREE.STLLoader();
    loader.load(
      `/api/stl/${stlUploadId}/file`,
      (geometry: any) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const bbox = geometry.boundingBox;
        const sizeX = bbox.max.x - bbox.min.x;
        const sizeY = bbox.max.y - bbox.min.y;
        const sizeZ = bbox.max.z - bbox.min.z;
        setDims({ x: sizeX, y: sizeY, z: sizeZ });

        // Center geometry on origin
        const cx = (bbox.max.x + bbox.min.x) / 2;
        const cy = (bbox.max.y + bbox.min.y) / 2;
        const cz = (bbox.max.z + bbox.min.z) / 2;
        geometry.translate(-cx, -cy, -cz);

        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(color),
          specular: 0x111111,
          shininess: 30,
          wireframe: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        stateRef.current.mesh = mesh;
        stateRef.current.material = material;

        // Auto-fit camera
        const maxDim = Math.max(sizeX, sizeY, sizeZ);
        const dist = maxDim * 2.2;
        camera.position.set(dist, dist * 0.8, dist);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        setLoading(false);
      },
      undefined,
      (e: any) => {
        console.error(e);
        setErr("Failed to load STL file");
        setLoading(false);
      }
    );

    function animate() {
      stateRef.current.animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handling
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth;
      camera.aspect = newW / h;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, h);
    });
    ro.observe(container);
    stateRef.current.ro = ro;
  }

  function toggleWireframe() {
    const next = !wireframe;
    setWireframe(next);
    if (stateRef.current.material) stateRef.current.material.wireframe = next;
  }

  function resetView() {
    const { camera, controls } = stateRef.current;
    if (!camera || !controls) return;
    const d = dims ? Math.max(dims.x, dims.y, dims.z) * 2.2 : 150;
    camera.position.set(d, d * 0.8, d);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  return (
    <div style={{ position: "relative", border: "1px solid var(--border, #e2e8f0)", borderRadius: 8, overflow: "hidden", background: "#f8fafc" }}>
      <div ref={containerRef} style={{ width: "100%", height }} />
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#64748b", fontSize: "0.9rem", background: "rgba(248,250,252,0.9)" }}>
          Loading 3D model…
        </div>
      )}
      {err && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#dc2626", fontSize: "0.9rem", background: "rgba(254,242,242,0.95)" }}>
          {err}
        </div>
      )}
      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: "0.4rem" }}>
        <button onClick={toggleWireframe} style={btnStyle} title="Toggle wireframe">{wireframe ? "Solid" : "Wires"}</button>
        <button onClick={resetView} style={btnStyle} title="Reset view">Reset</button>
      </div>
      {dims && (
        <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(15,23,42,0.85)", color: "#fff", padding: "0.4rem 0.7rem", borderRadius: 6, fontSize: "0.75rem", fontFamily: "ui-monospace, monospace" }}>
          {dims.x.toFixed(1)} × {dims.y.toFixed(1)} × {dims.z.toFixed(1)} mm
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.95)",
  border: "1px solid #e2e8f0",
  padding: "0.35rem 0.75rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  borderRadius: 6,
  cursor: "pointer",
  color: "#0f172a",
};
