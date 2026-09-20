import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export const DensityLayer = ({ cells }) => {
  const map = useMap();
  useEffect(() => {
    if (!cells?.length) return undefined;
    const layer = L.heatLayer(cells.map((c) => [c.lat, c.lon, c.w]), { radius: 22, blur: 18, minOpacity: 0.25, maxZoom: 10, gradient: { 0.2: "#007bb9", 0.5: "#b26a00", 0.8: "#c2410c", 1: "#ba1a1a" } }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [cells, map]);
  return null;
};
