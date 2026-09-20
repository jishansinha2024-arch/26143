import { useEffect, useRef, useState } from "react";
import { GeoJSON, useMapEvents } from "react-leaflet";
import { api } from "@/lib/api";

export const TYPE_COLOR = { territorial: "#c2410c", contiguous: "#b26a00", eez: "#007bb9", port_state: "#006a61", custom: "#6f4fa8" };
export const TYPE_LABEL = { territorial: "Territorial Sea (12 NM)", contiguous: "Contiguous Zone (24 NM)", eez: "EEZ (200 NM)", port_state: "Port state", custom: "Custom" };
const TYPE_DASH = { territorial: null, contiguous: "8,5", eez: null, port_state: "1,4", custom: "4,4" };
export const PROV_COLOR = { AUTHORITATIVE: "#006a61", REFERENCE: "#007bb9", DEMO: "#b26a00", "USER-DEFINED": "#6f4fa8", PRESET: "#191c1e", UNVERIFIED: "#707881" };

export const zoneStyle = (ft, selected) => ({ color: TYPE_COLOR[ft.properties.zone_type] || "#707881", weight: selected === ft.properties.code ? 3 : ft.properties.zone_type === "territorial" ? 2 : 1.5, fillOpacity: selected === ft.properties.code ? 0.28 : 0.13, dashArray: TYPE_DASH[ft.properties.zone_type] ?? null });

/** Viewport-driven zone features: only zones intersecting the current map bounds, simplified below zoom 7. */
export const ZonesLayer = ({ types, selected, onPick, onStats }) => {
  const [fc, setFc] = useState(null);
  const timer = useRef(null);
  const map = useMapEvents({ moveend: () => schedule(), zoomend: () => schedule() });
  const schedule = () => { clearTimeout(timer.current); timer.current = setTimeout(load, 350); };
  const load = async () => {
    const b = map.getBounds();
    const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((x) => x.toFixed(3)).join(",");
    const detail = map.getZoom() >= 7 ? "high" : "low";
    try {
      const { data } = await api.get(`/jurisdictions/geojson?bbox=${bbox}&detail=${detail}${types?.length ? `&zone_type=${types.join(",")}` : ""}`);
      setFc(data); onStats?.({ count: data.count, truncated: data.truncated, detail });
    } catch { onStats?.({ error: true }); }
  };
  useEffect(() => { load(); return () => clearTimeout(timer.current); }, [types?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!fc) return null;
  return <GeoJSON key={fc.features.map((f) => f.properties.code + f.properties.detail).join("|") + selected} data={fc} style={(ft) => zoneStyle(ft, selected)}
    onEachFeature={(ft, layer) => { layer.bindTooltip(`${ft.properties.code} · ${ft.properties.name} · ${ft.properties.provenance}`, { sticky: true, className: "zone-tip" }); layer.on("click", () => onPick?.(ft.properties)); }} />;
};
