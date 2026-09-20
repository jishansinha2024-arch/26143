import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Radio, Wifi, WifiOff } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const bd = { borderColor: "var(--border-highlight)" };
const REGION_LABELS = { west_coast: "West Coast", east_coast: "East Coast", south_india: "South India", andaman_nicobar: "Andaman & Nicobar", default: "All India (default)" };
const GLOBAL_REGIONS = { persian_gulf: "Persian Gulf", malacca_singapore: "Malacca / Singapore", south_china_sea: "South China Sea", red_sea_suez: "Red Sea / Suez", mediterranean: "Mediterranean", north_sea: "North Sea", gulf_of_mexico: "Gulf of Mexico", west_africa: "West Africa", east_asia: "East Asia", us_east_coast: "US East Coast", global: "Global (all)" };

export const LiveAis = ({ onChanged }) => {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [cov, setCov] = useState(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("ais-prompt-dismissed") === "1");
  const [busy, setBusy] = useState(false);
  const load = () => Promise.all([api.get("/ais/status").then((r) => setS(r.data)), api.get("/ais/coverage/check").then((r) => setCov(r.data)).catch(() => setCov(null))]).catch((e) => toast.error(apiError(e)));
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const setRegion = async (k, why) => {
    setBusy(true);
    try { const { data } = await api.post(`/ais/coverage/region/${k}`); toast.success(`AIS coverage region changed → ${data.name}${why ? ` — ${why}` : ""}`); setDismissed(false); await load(); onChanged?.(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const stay = () => { sessionStorage.setItem("ais-prompt-dismissed", "1"); setDismissed(true); };
  const test = async () => {
    setBusy(true);
    try { const { data } = await api.post("/ais/test-connection"); (data.message_received ? toast.success : toast.warning)(`key ${data.configured} · websocket ${data.websocket} · subscription ${data.subscription} · message ${data.message_received}${data.error ? ` · ${data.error}` : ""}`); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  if (!s) return null;
  const tone = s.state === "LIVE" ? "#006a61" : ["CONNECTED", "CONNECTING", "RECONNECTING", "STANDBY", "STALE"].includes(s.state) ? "#b26a00" : "#ba1a1a";
  const label = s.state === "LIVE" ? `LIVE AIS · ${s.messages_per_min} msg/min` : s.state === "CONNECTED" ? "CONNECTED — NO REGIONAL COVERAGE" : s.state === "NOT_CONFIGURED" ? "NOT CONFIGURED — API key not configured" : s.state === "STANDBY" ? "STANDBY" : s.state === "KEY_CONFLICT" ? "KEY CONFLICT" : s.state === "CONNECTING" || s.state === "RECONNECTING" ? s.state.toLowerCase() : `AIS OFFLINE — ${s.reason}`;
  const showPrompt = cov?.prompt && !dismissed;
  return (
    <div className="panel p-5 fade-up" data-testid="live-ais-panel">
      <div className="mb-2 flex items-center gap-2"><Radio size={16} color="#006194" /><h2 className="font-display text-lg font-semibold">Live AIS feed (AISStream)</h2>
        <span data-testid="live-ais-badge" className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: tone, border: `1px solid ${tone}66` }}>{s.state === "LIVE" ? <Wifi size={10} /> : <WifiOff size={10} />} {label}</span></div>
      {(s.state === "STANDBY" || s.state === "KEY_CONFLICT") && <p className="mb-2 rounded border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs text-amber-200" data-testid="live-ais-reason">{s.reason}</p>}
      {showPrompt && (
        <div className="mb-3 rounded border border-cyan-400/50 bg-cyan-400/5 p-3" data-testid="ais-coverage-prompt">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300">No recent AIS coverage in this AOI</p>
          <p className="mt-1 text-xs text-slate-300">{cov.message} Selected AOI: <b>{cov.aoi}</b> · {cov.recent_positions_in_aoi} positions in the last {cov.window_minutes} min.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {cov.suggested_region ? (
              <button data-testid="ais-prompt-switch" disabled={busy || !hasRole(user, "supervisor")} onClick={() => setRegion(cov.suggested_region.region, `${cov.suggested_region.recent_positions} genuine AIS positions received there in the last ${cov.window_minutes} min`)} className="rounded bg-cyan-400 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50">Switch to live region · {cov.suggested_region.name}</button>
            ) : <span className="font-mono text-[10px] text-slate-400" data-testid="ais-prompt-no-live-region">No region has received genuine AIS positions in the last {cov.window_minutes} min — nothing to switch to.</span>}
            <button data-testid="ais-prompt-stay" onClick={stay} className="rounded border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-300" style={bd}>Stay here</button>
            {!hasRole(user, "supervisor") && cov.suggested_region && <span className="font-mono text-[10px] text-slate-500">supervisor role required to switch</span>}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Staying keeps the AOI and the Sentinel investigation; AIS attribution will show as coverage unavailable. No vessels are ever fabricated.</p>
        </div>
      )}
      {cov && !cov.covered && dismissed && <p className="mb-2 font-mono text-[10px] text-slate-500" data-testid="ais-coverage-unavailable">AIS attribution: NO RECENT COVERAGE in {cov.aoi} (staying here). <button className="text-cyan-300 underline" onClick={() => setDismissed(false)}>show options</button></p>}
      <p className="mb-3 text-xs text-slate-400">Genuine AISStream WebSocket only — no simulated vessels. Key is read server-side from <code>AISSTREAM_API_KEY</code>{s.configured ? " (configured)" : " (NOT configured — add it to the backend environment)"}.</p>
      <div className="grid grid-cols-4 gap-3 font-mono text-[11px]" data-testid="live-ais-stats">
        {[["messages", s.messages_received], ["positions stored", s.positions_stored], ["active vessels", s.vessels_active], ["reconnects", s.reconnects]].map(([l, v]) => <div key={l} className="rounded border p-2" style={{ borderColor: "var(--border-default)" }}><div className="label-mono">{l}</div><div className="text-sm text-slate-100">{v}</div></div>)}
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-500" data-testid="live-ais-coverage">coverage {s.coverage_mode.toUpperCase()} · {s.coverage_name} · [S,W,N,E] {s.coverage_bbox.map((b) => b.map((x) => x.toFixed(1)).join(",")).join(" | ")} · last message {fmtTime(s.last_message_at)}{s.error && <span className="text-rose-300"> · {s.error}</span>}</p>
      {hasRole(user, "supervisor") && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="label-mono mr-1">Monitor region</span>
          {Object.entries(REGION_LABELS).map(([k, l]) => <button key={k} data-testid={`live-ais-region-${k}`} disabled={busy} onClick={() => setRegion(k)} className="rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:text-on-surface disabled:opacity-50" style={bd}>{l}</button>)}
          <select data-testid="live-ais-region-global" disabled={busy} defaultValue="" onChange={(e) => { if (e.target.value) setRegion(e.target.value); e.target.value = ""; }} className="rounded border bg-slate-900/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-300" style={bd}>
            <option value="">🌐 World region…</option>{Object.entries(GLOBAL_REGIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {hasRole(user, "admin") && <button data-testid="btn-test-ais" disabled={busy} onClick={test} className="ml-auto rounded bg-cyan-400 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50">Test connection</button>}
        </div>
      )}
    </div>
  );
};
