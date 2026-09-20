import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { toast } from "sonner";
import {
  Search,
  Crosshair,
  ShieldAlert,
  Check,
  Waves,
  Ship,
  Clock,
  FileCheck,
  BookOpen,
  ExternalLink,
  Map as MapIcon,
  BarChart3,
  ArrowUpDown,
  Compass,
  ChevronRight,
  AlertTriangle,
  Scale,
  Radio,
} from "lucide-react";
import { api, apiError, fmtTime, pct, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge, ScoreBar } from "@/components/StatusBadge";
import { DetectorPrecision } from "@/components/dashboard/DetectorPrecision";
import { useLive } from "@/context/LiveFeed";
import { OSM_URL, TILE_PERF } from "@/components/map/tiles";

const MAP_CENTER = [20, 12];
const COLORS = {
  probable: "#B8862A",
  analyst_confirmed: "#2E8B6A",
  possible: "#96691A",
  insufficient_evidence: "#5F7684",
  indeterminate: "#7C5CBF",
};

const coordsOf = (c) => {
  const p = c?.centroid?.coordinates || c?.spill_observation?.centroid?.coordinates;
  return Array.isArray(p) && Number.isFinite(+p[0]) && Number.isFinite(+p[1]) ? [+p[1], +p[0]] : null;
};

const parseCoord = (q) => {
  const m = q.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const a = [+m[1], +m[2]];
  if (Math.abs(a[0]) <= 90 && Math.abs(a[1]) <= 180) return a;
  if (Math.abs(a[1]) <= 90 && Math.abs(a[0]) <= 180) return [a[1], a[0]];
  return null;
};

const MapFocus = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 7), { duration: 0.7 });
  }, [map, target]);
  return null;
};

const caseColor = (c) => COLORS[c.attribution_status] || "#1F7F93";

function CaseMap({ cases, selected, onSelect, target }) {
  return (
    <div
      className="relative h-full min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-ink shadow-xs"
      data-testid="dashboard-map"
    >
      <MapContainer
        center={MAP_CENTER}
        zoom={3}
        minZoom={2}
        maxZoom={15}
        className="h-full w-full"
        zoomControl
      >
        <TileLayer
          url={OSM_URL}
          className="dark-tiles"
          {...TILE_PERF}
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapFocus target={target} />
        {cases.map((c) => {
          const pos = coordsOf(c);
          if (!pos) return null;
          const color = caseColor(c);
          const isSelected = selected?.id === c.id;
          return (
            <CircleMarker
              key={c.id}
              center={pos}
              radius={isSelected ? 10 : 6.5}
              pathOptions={{
                color: isSelected ? "#1F7F93" : color,
                fillColor: color,
                fillOpacity: isSelected ? 0.95 : 0.8,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(c) }}
              data-testid={`map-case-${c.case_number}`}
            >
              <Popup>
                <div className="min-w-[220px] text-xs">
                  <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-ink/10 pb-1.5">
                    <b className="font-mono text-tide text-sm">{c.case_number}</b>
                    <StatusBadge status={c.attribution_status} />
                  </div>
                  <div className="text-slate-700 font-medium">
                    {c.vessel_name ? `Suspect: ${c.vessel_name}` : c.source || "Satellite observation"}
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] text-slate-400">
                    Pos: {pos[0].toFixed(4)}°, {pos[1].toFixed(4)}°
                    <br />
                    Acquired: {fmtTime(c.acquisition_time)}
                  </div>
                  <button
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-tide/10 px-2.5 py-1 text-tide hover:bg-tide/20 font-mono text-[11px] font-semibold transition-colors"
                    onClick={() => onSelect(c)}
                  >
                    Inspect case <ExternalLink size={11} />
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Top Map HUD Overlay */}
      <div
        className="pointer-events-none absolute left-3.5 top-3.5 z-[1000] rounded-lg border border-ink/10 bg-mist/90 px-3.5 py-2 text-ink shadow-md backdrop-blur-md"
      >
        <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold tracking-wider text-tide">
          <span className="pulse-dot" />
          GLOBAL SPILL SURVEILLANCE
        </div>
        <div className="mt-0.5 text-[11px] text-slate-600 font-mono">
          {cases.length} active observation markers · click to inspect
        </div>
      </div>

      {/* Bottom Map Legend */}
      <div
        className="pointer-events-none absolute bottom-3.5 left-3.5 z-[1000] flex flex-wrap gap-2.5 rounded-lg border border-ink/10 bg-mist/90 px-3 py-2 text-[10px] font-mono uppercase tracking-wider backdrop-blur-md shadow-md"
      >
        {Object.entries(COLORS).map(([k, color]) => (
          <span key={k} className="flex items-center gap-1.5 text-slate-600">
            <i className="h-2 w-2 rounded-full" style={{ background: color }} />
            {k.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();

  const [activeTab, setActiveTab] = useState("map"); // 'map' | 'analytics'
  const view = ["pending", "probable"].includes(params.get("view")) ? params.get("view") : "all";
  const origin = ["real", "imported", "demo", "all"].includes(params.get("origin"))
    ? params.get("origin")
    : "real";

  const [cases, setCases] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [target, setTarget] = useState(null);
  const [sortField, setSortField] = useState("acquisition_time");
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([
      api.get(`/cases?origin=${origin}&limit=1000`),
      api.get("/alerts"),
    ]);
    setCases(c.data);
    setAlerts(a.data);
    try {
      const s = await api.get("/dashboard/summary");
      setStats(s.data);
      setStatsErr(false);
    } catch {
      setStatsErr(true);
    }
  }, [origin]);

  useEffect(() => {
    load().catch((e) => toast.error(apiError(e)));
  }, [load]);

  const live = useLive();
  useEffect(() => {
    const a = live?.alerts?.[0];
    if (a) setAlerts((p) => (p.some((x) => x.id === a.id) ? p : [a, ...p]));
  }, [live?.alerts]);

  useEffect(() => {
    if (live?.lastJob?.status === "succeeded") load().catch(() => {});
  }, [live?.lastJob, load]);

  const ack = async (id) => {
    try {
      await api.post(`/alerts/${id}/ack`);
      toast.success("Alert acknowledged");
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const all = cases || [];
  const base =
    view === "pending"
      ? all.filter((c) => c.status === "open" && c.review_state === "pending")
      : view === "probable"
      ? all.filter((c) => ["probable", "analyst_confirmed"].includes(c.attribution_status))
      : all;

  const filtered = filter === "all" ? base : base.filter((c) => c.attribution_status === filter);

  // Sorting
  const shown = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (sortField === "acquisition_time") {
        vA = new Date(vA || 0).getTime();
        vB = new Date(vB || 0).getTime();
      }
      if (sortField === "detection_confidence") {
        vA = vA || 0;
        vB = vB || 0;
      }
      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const coord = parseCoord(query);
    return shown
      .filter(
        (c) =>
          `${c.case_number} ${c.id} ${c.confirmed_vessel_mmsi || ""} ${c.vessel_mmsi || ""} ${
            c.vessel_name || ""
          } ${c.source || ""}`
            .toLowerCase()
            .includes(q) ||
          (coord &&
            coordsOf(c) &&
            Math.abs(coordsOf(c)[0] - coord[0]) < 0.02 &&
            Math.abs(coordsOf(c)[1] - coord[1]) < 0.02)
      )
      .slice(0, 8);
  }, [query, shown]);

  const selectCase = (c) => {
    setSelected(c);
    const pos = coordsOf(c);
    if (pos) setTarget(pos);
  };

  const executeSearch = () => {
    const coord = parseCoord(query);
    if (coord) {
      setTarget(coord);
      setSelected(null);
      toast.success(`Map centered on ${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`);
      return;
    }
    const hit = searchResults[0];
    if (hit) selectCase(hit);
    else if (query.trim()) toast.error("No case, vessel, MMSI, or coordinate match");
  };

  const locateSpill = () => {
    const first = shown.find((c) => coordsOf(c));
    if (!first) return toast.error("No mapped spill observations in this view");
    selectCase(first);
  };

  const kv = (v) => (statsErr ? "UNAVAILABLE" : stats ? v : "—");

  // Modern hierarchical KPI cards
  const kpis = [
    {
      label: "Active Cases",
      sub: "Open investigations",
      value: kv(stats?.active_cases),
      icon: Waves,
      theme: "critical", // red priority
      accentColor: "#C25A49",
      bgLight: "#FBEFEC",
      borderLight: "#EBC7BF",
      to: "/?origin=real",
    },
    {
      label: "Probable / Confirmed",
      sub: "Suspects attributed",
      value: kv(stats?.probable_confirmed),
      icon: Ship,
      theme: "warning", // amber priority
      accentColor: "#B8862A",
      bgLight: "#FAF4E4",
      borderLight: "#E9D49A",
      to: "/?origin=real&view=probable",
    },
    {
      label: "Pending Review",
      sub: "Awaiting analyst sign-off",
      value: kv(stats?.pending_review),
      icon: Clock,
      theme: "pending", // amber/blue
      accentColor: "#96691A",
      bgLight: "#FAF4E4",
      borderLight: "#E9D49A",
      to: "/?origin=real&view=pending",
    },
    {
      label: "AIS Fixes Indexed",
      sub: "Spatio-temporal vectors",
      value: kv(stats?.ais_fixes_indexed),
      icon: FileCheck,
      theme: "marine", // sky/marine
      accentColor: "#1F7F93",
      bgLight: "#EEF7F9",
      borderLight: "#B3DBE3",
      to: "/ingest",
    },
    {
      label: "Historical / Demo",
      sub: "Corpus training data",
      value: kv(stats?.demo?.imported),
      icon: BookOpen,
      theme: "neutral", // slate
      accentColor: "#506672",
      bgLight: "#F7F6F2",
      borderLight: "#E2DFD6",
      to: "/?origin=imported",
    },
  ];

  const analyzeEligible = async () => {
    try {
      const { data } = await api.post("/cases/analyze-eligible");
      toast.success(`Queued ${data.queued.length} correlation run(s)`);
      setTimeout(() => load().catch(() => {}), 1500);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-transparent text-slate-900">
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
        {/* Console Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Spill Surveillance Console
              </h1>
              <span className="font-mono text-[10px] uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 font-semibold flex items-center gap-1.5">
                <span className="pulse-dot" /> ACTIVE RADAR
              </span>
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              AI-assisted multi-sensor radar detection &amp; AIS vessel correlation · Decision Support System
            </p>
          </div>

          {/* View Mode Toggle & Map Actions */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("map")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  activeTab === "map"
                    ? "bg-ink text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MapIcon size={13} /> Surveillance Map
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  activeTab === "analytics"
                    ? "bg-ink text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 size={13} /> Analytics &amp; Trends
              </button>
            </div>

            <button
              onClick={locateSpill}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-sky-900 hover:bg-sky-100 transition-all shadow-xs"
              data-testid="locate-spill"
              title="Fly to first mapped spill observation"
            >
              <Crosshair size={14} /> Locate Spill
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {kpis.map((k) => (
            <button
              type="button"
              key={k.label}
              onClick={() => nav(k.to)}
              className="panel-interactive p-4 text-left group flex flex-col justify-between"
              style={{
                borderColor: k.borderLight,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="label-mono text-[11px] text-slate-500 group-hover:text-slate-800 transition-colors">
                  {k.label}
                </span>
                <span
                  className="grid h-8 w-8 place-items-center rounded-lg transition-transform group-hover:scale-105 shadow-xs"
                  style={{ background: k.bgLight, border: `1px solid ${k.borderLight}`, color: k.accentColor }}
                >
                  <k.icon size={15} />
                </span>
              </div>
              <div className="mt-3 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900" style={{ color: k.accentColor }}>
                {k.value}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">{k.sub}</p>
            </button>
          ))}
        </div>

        {/* Unified Search Bar */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && executeSearch()}
            placeholder="Search case number, MMSI, vessel name, or lat/lon coordinates (e.g. 18.92, 72.83)..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-24 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 shadow-xs"
            data-testid="unified-case-search"
          />
          <button
            onClick={executeSearch}
            className="absolute right-2 top-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-tide"
          >
            Search
          </button>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div
              className="absolute left-0 right-0 top-12 z-[1100] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
            >
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    selectCase(c);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors"
                >
                  <span>
                    <b className="font-mono text-sky-700">{c.case_number}</b>
                    <span className="ml-2.5 text-slate-800 font-medium">
                      {c.vessel_name || c.vessel_mmsi || c.source || "spill observation"}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {coordsOf(c)?.map((x) => x.toFixed(3)).join(", ") || "no coords"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: OPERATIONS MAP VIEW */}
        {activeTab === "map" && (
          <>
            {/* Map & Click-to-Summary Grid */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
              <CaseMap cases={shown} selected={selected} onSelect={selectCase} target={target} />

              {/* Click-to-Summary Panel */}
              <section className="panel min-h-[520px] overflow-hidden flex flex-col" data-testid="click-summary">
                {selected ? (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-200 p-4 bg-slate-50/70">
                      <div className="label-mono text-sky-700 font-bold">CASE SUMMARY DOSSIER</div>
                      <div className="mt-1.5 flex items-start justify-between gap-2">
                        <h2 className="font-display text-xl font-bold text-slate-900">
                          {selected.case_number}
                        </h2>
                        <StatusBadge status={selected.attribution_status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {selected.source || "Satellite observation"} · acquired{" "}
                        {fmtTime(selected.acquisition_time)}
                      </p>
                    </div>

                    <div className="space-y-4 overflow-y-auto p-4 text-xs flex-1">
                      {/* Detection Metric & Candidates */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <span className="label-mono text-[10px] text-slate-500">SAR Confidence</span>
                          <b className="mt-1 block text-lg font-mono text-amber-700">
                            {selected.detection_confidence_source === "detector"
                              ? pct(selected.detection_confidence)
                              : "N/A"}
                          </b>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <span className="label-mono text-[10px] text-slate-500">Candidate Vessels</span>
                          <b className="mt-1 block text-lg font-mono text-sky-700">
                            {selected.candidate_count ?? "—"}
                          </b>
                        </div>
                      </div>

                      {/* Coordinates & Jurisdiction */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                        <div>
                          <span className="label-mono text-[9.5px] block text-slate-500">Coordinates</span>
                          <span className="font-mono text-xs text-slate-800 font-semibold">
                            {coordsOf(selected)?.map((x) => x.toFixed(5)).join("°, ") || "Not available"}°
                          </span>
                        </div>
                        <div>
                          <span className="label-mono text-[9.5px] block text-slate-500">Maritime Jurisdiction</span>
                          <span className="font-mono text-xs text-sky-800 font-semibold">
                            {selected.primary_jurisdiction?.name ||
                              selected.primary_jurisdiction?.code ||
                              "Global EEZ / Unassigned"}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600">
                        {selected.review_state === "pending"
                          ? "Awaiting analyst sign-off. Open full case to review AIS trajectories, candidate scoring matrix, and evidence chain."
                          : "Stored forensic package is available for export and legal review."}
                      </p>

                      <button
                        onClick={() => nav(`/cases/${selected.id}`)}
                        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-tide transition-all"
                      >
                        Open Full Case Dossier <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-full place-items-center p-8 text-center my-auto">
                    <div>
                      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-sky-300 bg-sky-50 text-sky-600">
                        <Crosshair size={26} />
                      </div>
                      <h2 className="font-display text-lg font-bold text-slate-800">Select a spill marker</h2>
                      <p className="mt-1.5 text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                        Click any observation marker on the map or search to view incident evidence and candidate vessel correlation.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Cases Table Section */}
            <div className="mt-5 panel overflow-hidden">
              {/* Table Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-base font-bold text-slate-900">Investigation Cases</h2>
                  <span className="font-mono text-xs font-semibold text-sky-800 bg-sky-100/70 px-2.5 py-0.5 rounded-full border border-sky-200">
                    {shown.length} records
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Origin Tabs */}
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
                    {["real", "imported", "demo", "all"].map((o) => (
                      <button
                        key={o}
                        onClick={() => setParams({ origin: o, ...(view !== "all" ? { view } : {}) })}
                        className={`rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                          origin === o
                            ? "bg-sky-600 text-white font-bold shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>

                  {/* Supervisor Analyze Action */}
                  {hasRole(user, "supervisor") && origin === "real" && (
                    <button
                      onClick={analyzeEligible}
                      className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-sky-900 hover:bg-sky-100 transition-colors shadow-xs"
                    >
                      Analyze Eligible Cases
                    </button>
                  )}

                  {/* Status Filter Chips */}
                  <div className="flex flex-wrap gap-1">
                    {["all", "probable", "possible", "indeterminate", "insufficient_evidence", "analyst_confirmed"].map(
                      (f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                            filter === f
                              ? "border-sky-500 bg-sky-50 text-sky-800 font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          {f.replace(/_/g, " ")}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="label-mono text-left border-b border-slate-200 bg-slate-50/70 text-slate-600">
                      <th
                        className="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900"
                        onClick={() => toggleSort("case_number")}
                      >
                        <div className="flex items-center gap-1">
                          Case <ArrowUpDown size={11} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-semibold cursor-pointer hover:text-slate-900"
                        onClick={() => toggleSort("acquisition_time")}
                      >
                        <div className="flex items-center gap-1">
                          Acquired (UTC) <ArrowUpDown size={11} />
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold">Source Sensor</th>
                      <th
                        className="px-4 py-3 font-semibold cursor-pointer hover:text-slate-900"
                        onClick={() => toggleSort("detection_confidence")}
                      >
                        <div className="flex items-center gap-1">
                          Det. Conf <ArrowUpDown size={11} />
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold">Attribution Status</th>
                      <th className="px-4 py-3 font-semibold">Review State</th>
                      <th className="px-5 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {shown.map((c) => {
                      const isSelected = selected?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => selectCase(c)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-sky-50/70" : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="px-5 py-3.5 font-mono font-bold text-sky-800">
                            {c.case_number}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-700">
                            {fmtTime(c.acquisition_time)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{c.source}</td>
                          <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">
                            {c.detection_confidence_source === "detector"
                              ? pct(c.detection_confidence)
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={c.attribution_status} />
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[10px] uppercase">
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold border ${
                                c.review_state === "confirmed"
                                  ? "border-emerald-200 text-emerald-800 bg-emerald-50"
                                  : "border-slate-200 text-slate-600 bg-slate-50"
                              }`}
                            >
                              {c.review_state}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                nav(`/cases/${c.id}`);
                              }}
                              className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                            >
                              Open <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {cases === null && (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="skeleton-box h-4 w-48" />
                            <span className="font-mono text-xs">Loading surveillance telemetry…</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {cases !== null && shown.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                          <Compass className="mx-auto mb-2 text-slate-400" size={28} />
                          <p className="font-semibold text-slate-700">No cases match the selected filter or timeframe.</p>
                          <p className="text-xs text-slate-500 mt-0.5">Try resetting the attribution filter or changing the origin mode.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: EXECUTIVE ANALYTICS DASHBOARD VIEW */}
        {activeTab === "analytics" && (
          <div className="space-y-5">
            {/* Analytics Header Summary */}
            <div className="panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Operational Intelligence Breakdown
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Telemetry metrics, attribution probability distributions, and jurisdictional impact analysis.
                  </p>
                </div>
                <span className="font-mono text-xs text-sky-800 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 font-semibold">
                  TOTAL CASES: {all.length}
                </span>
              </div>

              {/* Analytics Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="label-mono text-[10px] text-slate-500">Attribution Rate</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-emerald-700">
                    {all.length
                      ? pct(
                          all.filter((c) =>
                            ["probable", "analyst_confirmed"].includes(c.attribution_status)
                          ).length / all.length
                        )
                      : "0%"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Cases with high-suspect correlation
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="label-mono text-[10px] text-slate-500">Pending Sign-off</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-amber-700">
                    {all.filter((c) => c.review_state === "pending").length}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Require analyst review
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="label-mono text-[10px] text-slate-500">High Confidence Slicks</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-sky-700">
                    {all.filter((c) => (c.detection_confidence || 0) >= 0.75).length}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    SAR confidence ≥ 75%
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="label-mono text-[10px] text-slate-500">Open Critical Alerts</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-rose-700">
                    {alerts.filter((a) => !a.acknowledged).length}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Active unacknowledged triggers
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Distribution Grids */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Attribution Status Breakdown */}
              <div className="panel p-6">
                <h3 className="font-display text-base font-bold text-slate-900 mb-1">
                  Attribution Status Distribution
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Distribution of cases across forensic correlation certainty tiers.
                </p>

                <div className="space-y-3.5">
                  {Object.entries(COLORS).map(([status, color]) => {
                    const count = all.filter((c) => c.attribution_status === status).length;
                    const ratio = all.length ? count / all.length : 0;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-700 font-medium capitalize">
                            {status.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono font-bold" style={{ color }}>
                            {count} ({pct(ratio)})
                          </span>
                        </div>
                        <ScoreBar value={ratio} color={color} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Jurisdiction Distribution */}
              <div className="panel p-6">
                <h3 className="font-display text-base font-bold text-slate-900 mb-1">
                  Maritime Zone Impact
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Incident occurrences mapped against UNCLOS 1982 jurisdiction zones.
                </p>

                <div className="space-y-3.5">
                  {[
                    { label: "Territorial Sea (12 nm)", code: "territorial", color: "#C25A49" },
                    { label: "Contiguous Zone (24 nm)", code: "contiguous", color: "#B8862A" },
                    { label: "Exclusive Economic Zone (EEZ, 200 nm)", code: "eez", color: "#1F7F93" },
                    { label: "High Seas / International Waters", code: "high_seas", color: "#1F7F93" },
                  ].map((z) => {
                    const count = all.filter((c) => c.primary_jurisdiction?.kind === z.code).length;
                    const ratio = all.length ? count / all.length : 0;
                    return (
                      <div key={z.code} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">{z.label}</span>
                          <span className="font-mono font-bold" style={{ color: z.color }}>
                            {count} cases
                          </span>
                        </div>
                        <ScoreBar value={ratio} color={z.color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Live Alerts & Precision Right Sidebar */}
      <aside
        className="hidden w-80 shrink-0 flex-col border-l border-slate-200 bg-white xl:flex"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3.5 bg-slate-50/70">
          <ShieldAlert size={16} className="text-rose-600" />
          <h2 className="font-display text-sm font-bold text-slate-900">Live Alert Stream</h2>
          <span className="ml-auto font-mono text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            {alerts.filter((a) => !a.acknowledged).length} Open
          </span>
        </div>

        {/* Detector Precision Widget */}
        <div className="border-b border-slate-200 p-3.5 bg-white">
          <DetectorPrecision />
        </div>

        {/* Alerts List */}
        <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5 [&::-webkit-scrollbar]:w-1">
          {alerts.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500">
              No tactical alerts active.
            </div>
          )}
          {alerts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border p-3 text-xs transition-colors shadow-xs"
              style={{
                borderColor: a.acknowledged ? "#E2DFD6" : "#EBC7BF",
                background: a.acknowledged ? "#F7F6F2" : "#FBEFEC",
              }}
            >
              <div className="flex items-center justify-between">
                <button
                  className="font-mono text-sky-800 font-bold hover:underline"
                  onClick={() => nav(`/cases/${a.case_id}`)}
                >
                  {a.case_number}
                </button>
                <span className="font-mono text-[9.5px] text-slate-500">
                  {fmtTime(a.created_at)}
                </span>
              </div>
              <p className="mt-1.5 text-slate-700 leading-snug text-[11px]">{a.message}</p>
              {!a.acknowledged && hasRole(user, "supervisor") && (
                <button
                  onClick={() => ack(a.id)}
                  className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <Check size={11} /> Acknowledge
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
