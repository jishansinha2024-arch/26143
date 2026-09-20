import { useEffect, useMemo, useState } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import { api } from "@/lib/api";

export const useLiveVessels = (intervalMs = 15000) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let live = true;
    const tick = () => api.get("/ais/vessels").then((r) => { if (live) { setData(r.data); setError(null); } }).catch((e) => { if (live) setError(e.response?.data?.detail || e.message); });
    tick();
    const t = setInterval(tick, intervalMs);
    return () => { live = false; clearInterval(t); };
  }, [intervalMs]);
  return { data, error };
};

export const LiveVesselLayer = ({ vessels }) => {
  const pts = useMemo(() => (vessels || []).filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon)), [vessels]);
  return (
    <>
      {pts.map((v) => (
        <CircleMarker key={v.mmsi} center={[v.lat, v.lon]} radius={5} pathOptions={{ color: "#006a61", fillColor: "#006a61", fillOpacity: 0.85, weight: 1 }} data-testid={`live-vessel-${v.mmsi}`}>
          <Tooltip direction="top" offset={[0, -6]}>
            <div className="font-mono text-[10px]">
              <b>{v.ship_name || "unknown"}</b> · MMSI {v.mmsi}<br />
              {v.lat.toFixed(4)}, {v.lon.toFixed(4)} · {v.sog != null ? `${v.sog} kn` : "—"} · {v.cog != null ? `${v.cog}°` : "—"}<br />
              {v.timestamp} · AISStream
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
};
