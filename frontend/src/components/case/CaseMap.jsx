import { useCallback, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, Popup, Tooltip, ImageOverlay, Rectangle, useMap } from "react-leaflet";
import L from "leaflet";
import { fmtTime } from "@/lib/api";
import { GibsLayer } from "@/components/map/GibsLayer";
import { TILE_PERF, OSM_URL } from "@/components/map/tiles";
import { LiveVesselLayer } from "@/components/map/LiveVesselLayer";

const FitTo = ({ bounds }) => {
  const map = useMap();
  useEffect(() => { if (bounds) map.flyToBounds(bounds, FIT_PAD); }, [bounds, map]);
  return null;
};

const RANK_COLORS = ["#ba1a1a", "#b26a00", "#006194", "#6f4fa8", "#007bb9", "#006a61"];
export const ZONE_STYLE = {
  territorial: { color: "#c2410c", weight: 2.2, opacity: 0.9, dashArray: null, fillColor: "#c2410c" },
  contiguous: { color: "#b26a00", weight: 1.6, opacity: 0.85, dashArray: "8,5", fillColor: "#b26a00" },
  eez: { color: "#007bb9", weight: 1.2, opacity: 0.7, dashArray: "2,6", fillColor: "#007bb9" },
  port_state: { color: "#006a61", weight: 1.4, opacity: 0.8, dashArray: "1,4", fillColor: "#006a61" },
  custom: { color: "#707881", weight: 1, opacity: 0.6, dashArray: "4,4", fillColor: "#707881" },
};
export const ZONE_LABEL = { territorial: "Territorial Sea (12 NM)", contiguous: "Contiguous Zone (24 NM)", eez: "EEZ (200 NM)", port_state: "Port state waters", custom: "Custom zone" };
const rankColorFor = (rank) => RANK_COLORS[Math.min((rank || 1) - 1, RANK_COLORS.length - 1)];

const MAP_CENTER = [53.5, 3.8];
const FIT_PAD = { padding: [80, 80], maxZoom: 13, duration: 0.8 };
const FOCUS_OFFSET = [0, -14];
const ASSET_STYLE = { color: "#b26a00", weight: 2, dashArray: "8,4", fillColor: "#b26a00", fillOpacity: 0.06 };
const CORRIDOR_STYLE = { color: "#006194", weight: 1, dashArray: "6,6", fillColor: "#006194", fillOpacity: 0.05 };
const DRIFT_ENV_STYLE = { color: "#8a63d2", weight: 1.5, dashArray: "2,4", fillColor: "#6f4fa8", fillOpacity: 0.12 };
const DRIFT_LIKELY_STYLE = { color: "#8a63d2", weight: 2, fillColor: "#8a63d2", fillOpacity: 0.22 };
const DRIFT_PATH_OPTS = { color: "#8a63d2", weight: 2, dashArray: "1,6", opacity: 0.9 };
const HIGHLIGHT_OPTS = {
  confirmed: { color: "#ba1a1a", weight: 3, fillOpacity: 0.15, dashArray: null },
  candidate: { color: "#b26a00", weight: 3, fillOpacity: 0.15, dashArray: "4,4" },
};
const zoneStyle = (ft) => ({ ...ZONE_STYLE[ft.properties.zone_type] || ZONE_STYLE.custom, fillOpacity: 0.05 });
const zoneTooltip = (ft, layer) => layer.bindTooltip(`${ft.properties.name || ft.properties.code} · ${ZONE_LABEL[ft.properties.zone_type] || ft.properties.zone_type} · ${ft.properties.authority}`, { sticky: true });
const toLatLng = (coords) => coords.map(([lon, lat]) => [lat, lon]);
const spillStyle = (color, visible) => ({ color, weight: 2, dashArray: "4,4", fillColor: color, fillOpacity: visible ? 0.35 : 0.06, opacity: visible ? 1 : 0.35 });
const trackOpts = (color, dim, interpolated) => ({ color, weight: dim ? 1.5 : interpolated ? 2 : 3, opacity: dim ? 0.3 : interpolated ? 0.7 : 0.85, dashArray: interpolated ? "6,8" : null });
const headOpts = (fill, dim, gap) => ({ color: "#191c1e", fillColor: fill, fillOpacity: dim ? 0.3 : 1, weight: 2, dashArray: gap ? "3,3" : null, opacity: dim ? 0.3 : 1 });
const fixOpts = (color, isSelected) => ({ color, fillColor: color, fillOpacity: isSelected ? 1 : 0.7, weight: 2 });
const bpOpts = (fill, dimmed) => ({ color: "#191c1e", fillColor: fill, fillOpacity: 0.9, weight: 1, dashArray: "2,2", opacity: dimmed ? 0.2 : 0.9 });
const DARK_BOX = { color: "#ba1a1a", weight: 2, fillOpacity: 0.08, fillColor: "#ba1a1a" };
const AIS_BOX = { color: "#707881", weight: 1, fillOpacity: 0.03, dashArray: "2,3" };
const DARK_TRAJ = { color: "#ba1a1a", weight: 1.5, dashArray: "6,6", opacity: 0.8 };
const darkBounds = (t) => { const [w, s, e, n] = t.bbox; const pad = 0.01; return [[s - pad, w - pad], [n + pad, e + pad]]; };

const FitBounds = ({ geojson }) => {
  const map = useMap();
  useEffect(() => {
    if (!geojson?.features?.length) return;
    const b = L.geoJSON(geojson).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
    setTimeout(() => map.invalidateSize(), 50);
  }, [geojson, map]);
  return null;
};

// Position of a track at time t (ms): interpolated between fixes; null if before first fix.
export const trackPositionAt = (feature, t) => {
  const ts = feature.properties.timestamps.map((x) => new Date(x).getTime());
  const coords = feature.geometry.coordinates;
  if (t < ts[0]) return null;
  if (t >= ts[ts.length - 1]) return { lat: coords[ts.length - 1][1], lon: coords[ts.length - 1][0], idx: ts.length - 1, stale: t - ts[ts.length - 1] > 2 * 3600e3 };
  let i = 0;
  while (i < ts.length - 1 && ts[i + 1] <= t) i++;
  const f = (t - ts[i]) / Math.max(ts[i + 1] - ts[i], 1);
  return { lat: coords[i][1] + (coords[i + 1][1] - coords[i][1]) * f, lon: coords[i][0] + (coords[i + 1][0] - coords[i][0]) * f, idx: i, gap: ts[i + 1] - ts[i] > 2 * 3600e3 };
};

const DarkVesselLayer = ({ targets }) => {
  if (!targets?.length) return null;
  const dark = targets.filter((t) => t.dark_candidate);
  return (
    <>
      {targets.map((t) => (
        <Rectangle key={`dv-${t.id}`} bounds={darkBounds(t)} pathOptions={t.dark_candidate ? DARK_BOX : AIS_BOX}>
          <Tooltip sticky><span data-testid={`dark-box-tip-${t.id}`}>{t.dark_candidate ? `DARK VESSEL CANDIDATE D${dark.indexOf(t) + 1} — no AIS ≤ 3 km` : `SAR target matched to AIS ${t.matched_name || t.matched_mmsi}`} · SNR {t.snr}σ · ≈{t.est_length_m} m</span></Tooltip>
        </Rectangle>
      ))}
      {dark.filter((t) => t.trajectory).map((t) => (
        <Polyline key={`dvt-${t.id}`} positions={[[t.lat, t.lon], ...t.trajectory.map((p) => [p.lat, p.lon])]} pathOptions={DARK_TRAJ}><Tooltip sticky>Dead-reckoned escape cue · {t.escape_heading_deg}° @ {t.assumed_speed_kn} kn (1–6 h)</Tooltip></Polyline>
      ))}
    </>
  );
};

const DriftLayers = ({ layers }) => (
  <>
    {layers.corridor.map((f, i) => <GeoJSON key={`c${i}`} data={f} style={CORRIDOR_STYLE} />)}
    {layers.driftEnv.map((f, i) => (
      <GeoJSON key={`de${i}`} data={f} style={DRIFT_ENV_STYLE}>
        <Tooltip sticky><span data-testid="drift-envelope-tip">Origin envelope · 2σ · {f.properties.hours}h backward Lagrangian model</span></Tooltip>
      </GeoJSON>
    ))}
    {layers.driftLikely.map((f, i) => (
      <GeoJSON key={`dl${i}`} data={f} style={DRIFT_LIKELY_STYLE}>
        <Tooltip sticky>Most-likely origin window: {f.properties.window_hours[0]}–{f.properties.window_hours[1]} h before acquisition</Tooltip>
      </GeoJSON>
    ))}
    {layers.driftPath.map((f, i) => <Polyline key={`dp${i}`} positions={toLatLng(f.geometry.coordinates)} pathOptions={DRIFT_PATH_OPTS} />)}
  </>
);

const VesselTracks = ({ tracks, selected, timeCursor, colorFor, selectHandler }) => (
  <>
    {tracks.map((f) => {
      const p = f.properties;
      const dim = selected && selected !== p.mmsi;
      let coords = f.geometry.coordinates;
      if (timeCursor != null) {
        const head = trackPositionAt(f, timeCursor);
        if (!head) return null;
        coords = [...coords.slice(0, head.idx + 1), [head.lon, head.lat]];
      }
      return (
        <Polyline key={`t${p.side || ""}${p.mmsi}-${p.segment ?? 0}`} positions={toLatLng(coords)} pathOptions={trackOpts(colorFor(p.rank, p.side), dim, p.interpolated)} eventHandlers={selectHandler(p.mmsi)}>
          {p.interpolated && <Tooltip sticky><span data-testid="interpolated-tip">Interpolated (dead reckoning across AIS gap) — not a transmitted position</span></Tooltip>}
        </Polyline>
      );
    })}
    {timeCursor != null && tracks.map((f) => {
      const p = f.properties;
      const head = trackPositionAt(f, timeCursor);
      if (!head) return null;
      const dim = selected && selected !== p.mmsi;
      return (
        <CircleMarker key={`h${p.side || ""}${p.mmsi}`} center={[head.lat, head.lon]} radius={p.rank === 1 ? 9 : 7} pathOptions={headOpts(colorFor(p.rank, p.side), dim, head.gap || head.stale)} eventHandlers={selectHandler(p.mmsi)}>
          <Popup><b>#{p.rank} {p.vessel_name || p.mmsi}</b><br />{fmtTime(new Date(timeCursor).toISOString())}{head.gap || head.stale ? <><br /><i>inside AIS gap — position interpolated</i></> : null}</Popup>
        </CircleMarker>
      );
    })}
  </>
);

const ClosestFixes = ({ fixes, bp, selected, colorFor, selectHandler }) => (
  <>
    {fixes.map((f) => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      return (
        <CircleMarker key={`f${p.side || ""}${p.mmsi}`} center={[lat, lon]} radius={p.rank === 1 ? 8 : 6} pathOptions={fixOpts(colorFor(p.rank, p.side), selected === p.mmsi)} eventHandlers={selectHandler(p.mmsi)}>
          <Popup>
            <b>#{p.rank} {p.vessel_name || p.mmsi}</b><br />MMSI {p.mmsi} · score {p.score?.toFixed(3)} · {p.status}<br />
            Closest approach {fmtTime(p.timestamp)}<br />{p.distance_km} km from slick · {p.time_gap_hours}h {p.time_gap_hours >= 0 ? "before" : "after"} acquisition<br />
            SOG {p.sog_kn ?? "—"} kn · COG {p.cog_deg ?? "—"}°
          </Popup>
        </CircleMarker>
      );
    })}
    {bp.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      return (
        <CircleMarker key={`b${f.properties.side || ""}${f.properties.mmsi}`} center={[lat, lon]} radius={4} pathOptions={bpOpts(colorFor(f.properties.rank, f.properties.side), selected && selected !== f.properties.mmsi)}>
          <Popup>Drift back-projection of slick centroid to closest approach of {f.properties.vessel_name || f.properties.mmsi}</Popup>
        </CircleMarker>
      );
    })}
  </>
);

export const CaseMap = ({ geojson, selected, onSelect, showTracks = true, showCorridor = true, timeCursor = null, acquisitionTime = null, zones = null, zoneKinds = null, sideColors = null, gibs = null, overlay = null, fitTo = null, highlight = null, asset = null, darkVessels = null, liveVessels = null }) => {
  const colorFor = useCallback((rank, side) => (sideColors && side ? sideColors[side] : rankColorFor(rank)), [sideColors]);
  const selectHandler = useCallback((mmsi) => ({ click: () => onSelect?.(mmsi) }), [onSelect]);
  const zoneFilter = useCallback((ft) => !zoneKinds || zoneKinds[ft.properties.zone_type] !== false, [zoneKinds]);
  const layers = useMemo(() => {
    const f = geojson?.features || [];
    return {
      spill: f.filter((x) => x.properties.layer === "spill"),
      corridor: f.filter((x) => x.properties.layer === "corridor"),
      tracks: f.filter((x) => x.properties.layer === "track"),
      fixes: f.filter((x) => x.properties.layer === "closest_fix"),
      bp: f.filter((x) => x.properties.layer === "backprojected_centroid"),
      driftEnv: f.filter((x) => x.properties.layer === "drift_envelope"),
      driftLikely: f.filter((x) => x.properties.layer === "drift_likely"),
      driftPath: f.filter((x) => x.properties.layer === "drift_path"),
    };
  }, [geojson]);
  const acqMs = acquisitionTime ? new Date(acquisitionTime).getTime() : null;
  const spillVisible = timeCursor == null || acqMs == null || timeCursor >= acqMs;

  return (
    <div className="h-full w-full" data-testid="case-map">
    <MapContainer center={MAP_CENTER} zoom={9} className="h-full w-full" zoomControl>
      <TileLayer url={OSM_URL} attribution='&copy; OpenStreetMap contributors' className="dark-tiles" {...TILE_PERF} />
      {gibs && acquisitionTime && <GibsLayer layer={gibs.layer} date={acquisitionTime.slice(0, 10)} template={gibs.template} />}
      {overlay?.url && overlay.bounds && <ImageOverlay url={overlay.url} bounds={overlay.bounds} opacity={overlay.opacity ?? 0.8} zIndex={5} />}
      <FitTo bounds={fitTo} />
      {asset?.geometry && <GeoJSON key={`asset-${asset.id}`} data={asset.geometry} style={ASSET_STYLE}><Tooltip permanent direction="top"><span data-testid="asset-footprint-label">{asset.name} · {asset.type}</span></Tooltip></GeoJSON>}
      {highlight && (
        <CircleMarker center={[highlight.lat, highlight.lon]} radius={14} pathOptions={highlight.confirmed ? HIGHLIGHT_OPTS.confirmed : HIGHLIGHT_OPTS.candidate}>
          <Tooltip permanent direction="top" offset={FOCUS_OFFSET} className="focus-tip"><span data-testid="focus-vessel-label">{highlight.confirmed ? "RESPONSIBLE (analyst confirmed)" : "TOP CANDIDATE — not confirmed"} · {highlight.name}</span></Tooltip>
        </CircleMarker>
      )}
      <FitBounds geojson={geojson} />
      <DarkVesselLayer targets={darkVessels} />
      <LiveVesselLayer vessels={liveVessels} />
      {zones?.features?.length > 0 && (
        <GeoJSON key={`zones-${zones.features.length}-${zoneKinds ? Object.values(zoneKinds).join("") : ""}`} data={zones} filter={zoneFilter} style={zoneStyle} onEachFeature={zoneTooltip} />
      )}
      {showCorridor && <DriftLayers layers={layers} />}
      {layers.spill.map((f, i) => (
        <GeoJSON key={`s${i}-${f.properties.id}-${spillVisible}`} data={f} style={spillStyle(sideColors?.[f.properties.side] || "#ba1a1a", spillVisible)}>
          <Popup><b>Spill observation</b><br />Acquired {fmtTime(f.properties.acquisition_time)}<br />Confidence {Math.round(f.properties.detection_confidence * 100)}% · {f.properties.estimated_area_km2} km²<br />{f.properties.quality_flags?.join(", ") || "no quality flags"}</Popup>
        </GeoJSON>
      ))}
      {showTracks && <VesselTracks tracks={layers.tracks} selected={selected} timeCursor={timeCursor} colorFor={colorFor} selectHandler={selectHandler} />}
      {timeCursor == null && <ClosestFixes fixes={layers.fixes} bp={layers.bp} selected={selected} colorFor={colorFor} selectHandler={selectHandler} />}
    </MapContainer>
    </div>
  );
};

export const rankColor = rankColorFor;
