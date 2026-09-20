import { useEffect, useState } from "react";
import { Polygon, useMapEvents } from "react-leaflet";

/** Click-to-draw maritime polygon (lon/lat GeoJSON out). No extra deps. */
export const DrawAoi = ({ active, onDone, onCancel }) => {
  const [pts, setPts] = useState([]);
  useMapEvents({
    click: (e) => { if (active) setPts((p) => [...p, [e.latlng.lat, e.latlng.lng]]); },
    dblclick: () => { if (active && pts.length >= 3) finish(); },
  });
  const finish = () => {
    const ring = pts.map(([lat, lng]) => [+lng.toFixed(5), +lat.toFixed(5)]);
    onDone({ type: "Polygon", coordinates: [[...ring, ring[0]]] });
    setPts([]);
  };
  useEffect(() => { if (!active) setPts([]); }, [active]);
  useEffect(() => {
    const onKey = (e) => { if (!active) return; if (e.key === "Escape") { setPts([]); onCancel?.(); } if (e.key === "Enter" && pts.length >= 3) finish(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [active, pts]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!active || pts.length === 0) return null;
  return <Polygon positions={pts} pathOptions={{ color: "#6f4fa8", weight: 2, dashArray: "6,4", fillOpacity: 0.12 }} />;
};

export const DrawHint = ({ active, count }) => active ? (
  <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded px-3 py-1.5 font-mono text-[11px] text-slate-100" style={{ background: "rgba(111,79,168,0.85)" }} data-testid="draw-aoi-hint">
    Click vertices on the sea · Enter / double-click to finish (≥3) · Esc to cancel
  </div>) : null;
