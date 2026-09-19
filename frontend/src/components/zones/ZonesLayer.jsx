import { useEffect, useRef, useState } from "react";
import { GeoJSON, useMapEvents } from "react-leaflet";
import { api } from "@/lib/api";

export const TYPE_COLOR = { territorial: "#D9762E", contiguous: "#C48A22", eez: "#1F7F93", port_state: "#2E8B6A", custom: "#8B6BCB" };
export const TYPE_LABEL = { territorial: "Territorial Sea (12 NM)", contiguous: "Contiguous Zone (24 NM)", eez: "EEZ (200 NM)", port_state: "Port state", custom: "Custom" };
const TYPE_DASH = { territorial: null, contiguous: "8,5", eez: null, port_state: "1,4", custom: "4,4" };
export const PROV_COLOR = { AUTHORITATIVE: "#2E8B6A", REFERENCE: "#1F7F93", DEMO: "#C48A22", "USER-DEFINED": "#8B6BCB", PRESET: "#F7F6F2", UNVERIFIED: "#7D919C" };

export const zoneStyle = (ft, selected) => ({ color: TYPE_COLOR[ft.properties.zone_type] || "#7D919C", weight: selected === ft.properties.code ? 3 : ft.properties.zone_type === "territorial" ? 2 : 1.5, fillOpacity: selected === ft.properties.code ? 0.28 : 0.13, dashArray: TYPE_DASH[ft.properties.zone_type] ?? null });

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
