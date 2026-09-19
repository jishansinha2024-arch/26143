import { useEffect, useRef } from "react";
import { DETECTIONS, ROUTES } from "./entryData";

/**
 * Daylight globe drawn on a plain 2D canvas (orthographic projection).
 * Same look as the design template's WebGL scene — pale sphere, teal graticule,
 * surface dots, radar sweep, AIS arcs and pulsing detection markers — but with
 * no extra dependency (no three.js).
 */

const TIDE = "31,127,147";
const SEVERITY = { probable: "194,90,73", possible: "184,134,42", indeterminate: "31,127,147" };

const toVec = (lat, lon, r = 1) => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
};

const rotY = ([x, y, z], a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
};
const rotX = ([x, y, z], a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
};
const rotZ = ([x, y, z], a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c, z];
};

const bezier = (a, b, mid, t) => {
  const u = 1 - t;
  return [0, 1, 2].map((i) => u * u * a[i] + 2 * u * t * mid[i] + t * t * b[i]);
};

function buildStatic() {
  const graticule = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const line = [];
    for (let lon = -180; lon <= 180; lon += 4) line.push(toVec(lat, lon, 1.001));
    graticule.push(line);
  }
  for (let lon = -180; lon < 180; lon += 15) {
    const line = [];
    for (let lat = -88; lat <= 88; lat += 4) line.push(toVec(lat, lon, 1.001));
    graticule.push(line);
  }

  const dots = [];
  const count = 2600;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    dots.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }

  const segments = 140;
  const arcs = ROUTES.map(([from, to], index) => {
    const a = toVec(from.lat, from.lon, 1.005);
    const b = toVec(to.lat, to.lon, 1.005);
    const dist = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const len = Math.hypot(...sum) || 1;
    const lift = 1 + dist * 0.26;
    const mid = sum.map((v) => (v / len) * lift);
    const pts = [];
    for (let i = 0; i <= segments; i++) pts.push(bezier(a, b, mid, i / segments));
    return { pts, total: segments + 1, head: (index / ROUTES.length) * (segments + 1), speed: 0.35 + (index % 3) * 0.12 };
  });

  const markers = DETECTIONS.map((d, index) => ({
    pos: toVec(d.lat, d.lon, 1.008),
    color: SEVERITY[d.severity] || TIDE,
    offset: index * 0.42,
  }));

  return { graticule, dots, arcs, markers };
}

export function GlobeCanvas({ spinSpeed = 0.07 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const data = buildStatic();
    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let spin = -1.1;
    let w = 0;
    let h = 0;
    let frame = 0;
    let last = performance.now();
    const t0 = last;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const render = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = (now - t0) / 1000;
      frame = requestAnimationFrame(render);
      if (!w || !h) return;

      if (!reduced) spin += dt * spinSpeed;
      eased.x += (pointer.x - eased.x) * 0.05;
      eased.y += (pointer.y - eased.y) * 0.05;

      const R = h * 0.46;
      const cx = w / 2;
      const cy = h / 2;
      const xf = (v) => {
        let p = rotY(v, spin);
        p = rotZ(p, -0.36);
        p = rotY(p, eased.x * 0.28);
        p = rotX(p, 0.16 + eased.y * 0.16);
        return p;
      };
      const sx = (p) => cx + p[0] * R;
      const sy = (p) => cy - p[1] * R;

      ctx.clearRect(0, 0, w, h);

      // atmosphere halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.22);
      halo.addColorStop(0, "rgba(143,196,209,0.42)");
      halo.addColorStop(1, "rgba(143,196,209,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // sphere body
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.3, R * 0.1, cx, cy, R);
      body.addColorStop(0, "#fbfdfd");
      body.addColorStop(0.55, "#e9eef0");
      body.addColorStop(1, "#cfdde2");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // scan band — a soft light band drifting across the disc (no apex artefact)
      {
        const tilt = -0.36;
        const dx = Math.cos(tilt);
        const dy = Math.sin(tilt);
        const pos = reduced ? 0 : (((elapsed * 0.09) % 1) * 2.6 - 1.3) * R;
        const px = cx + dx * pos;
        const py = cy + dy * pos;
        const g = ctx.createLinearGradient(px - dx * R * 0.45, py - dy * R * 0.45, px + dx * R * 0.45, py + dy * R * 0.45);
        g.addColorStop(0, "rgba(47,147,168,0)");
        g.addColorStop(0.5, "rgba(47,147,168,0.16)");
        g.addColorStop(1, "rgba(47,147,168,0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      }

      // graticule
      ctx.strokeStyle = `rgba(${TIDE},0.16)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      data.graticule.forEach((line) => {
        let pen = false;
        line.forEach((v) => {
          const p = xf(v);
          if (p[2] > 0) {
            if (!pen) { ctx.moveTo(sx(p), sy(p)); pen = true; } else ctx.lineTo(sx(p), sy(p));
          } else pen = false;
        });
      });
      ctx.stroke();

      // surface dots
      ctx.fillStyle = `rgba(${TIDE},0.34)`;
      ctx.beginPath();
      data.dots.forEach((v) => {
        const p = xf(v);
        if (p[2] > 0) ctx.rect(sx(p) - 0.7, sy(p) - 0.7, 1.4, 1.4);
      });
      ctx.fill();
      ctx.restore();

      // AIS arcs
      data.arcs.forEach((arc) => {
        if (!reduced) arc.head = (arc.head + dt * arc.speed * 60) % (arc.total + 60);
        const pts = arc.pts.map(xf);
        ctx.strokeStyle = `rgba(${TIDE},0.24)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let pen = false;
        pts.forEach((p) => {
          if (p[2] > 0) {
            if (!pen) { ctx.moveTo(sx(p), sy(p)); pen = true; } else ctx.lineTo(sx(p), sy(p));
          } else pen = false;
        });
        ctx.stroke();

        const start = Math.max(0, Math.floor(arc.head) - 34);
        const end = Math.min(arc.total, Math.floor(arc.head));
        ctx.strokeStyle = "rgba(20,96,111,0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        pen = false;
        for (let i = start; i < end; i++) {
          const p = pts[i];
          if (p[2] > 0) {
            if (!pen) { ctx.moveTo(sx(p), sy(p)); pen = true; } else ctx.lineTo(sx(p), sy(p));
          } else pen = false;
        }
        ctx.stroke();
      });

      // detection markers
      data.markers.forEach((m) => {
        const p = xf(m.pos);
        if (p[2] <= 0.05) return;
        const x = sx(p);
        const y = sy(p);
        const t = reduced ? 0.35 : (elapsed * 0.55 + m.offset) % 1;
        ctx.strokeStyle = `rgba(${m.color},${0.75 * (1 - t)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(x, y, R * 0.025 * (1 + t * 1.9), R * 0.025 * (1 + t * 1.9) * Math.max(p[2], 0.35), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgb(${m.color})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2.4, R * 0.011), 0, Math.PI * 2);
        ctx.fill();
      });
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [spinSpeed]);

  return (
    <div ref={wrapRef} className="h-full w-full" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
