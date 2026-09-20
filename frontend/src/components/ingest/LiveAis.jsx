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
  const reconnect = async () => {
    setBusy(true);
    try {
      await api.post("/ais/reconnect");
      toast.success("Reconnecting to AISStream…");
      setTimeout(load, 2000);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  if (!s) return null;
  const tone = s.state === "LIVE" ? "#2E8B6A" : ["CONNECTED", "CONNECTING", "RECONNECTING", "STANDBY", "STALE"].includes(s.state) ? "#C48A22" : "#D4604D";
  const label = s.state === "LIVE" ? `LIVE AIS · ${s.messages_per_min} msg/min` : s.state === "CONNECTED" ? "CONNECTED — NO REGIONAL COVERAGE" : s.state === "NOT_CONFIGURED" ? "NOT CONFIGURED — API key not configured" : s.state === "STANDBY" ? "STANDBY" : s.state === "KEY_CONFLICT" ? "CONNECTION LIMIT — ANOTHER CLIENT IS CONNECTED" : s.state === "CONNECTING" || s.state === "RECONNECTING" ? s.state.toLowerCase() : "AIS OFFLINE";
  const showPrompt = cov?.prompt && !dismissed;
  return (
    <div className="panel p-5 fade-up" data-testid="live-ais-panel">
      <div className="mb-2 flex items-center gap-2"><Radio size={16} color="#2A93A8" /><h2 className="font-display text-lg font-semibold">Live AIS feed (AISStream)</h2>
        <span data-testid="live-ais-badge" className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: tone, border: `1px solid ${tone}66` }}>{s.state === "LIVE" ? <Wifi size={10} /> : <WifiOff size={10} />} {label}</span></div>
      {(s.state === "STANDBY" || s.state === "KEY_CONFLICT") && (
        <div className="mb-3 rounded border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-900" data-testid="live-ais-reason">
          <div className="flex items-center gap-2 font-semibold">
            <Radio size={14} className="text-amber-700" />
            <span>{s.state === "KEY_CONFLICT" ? "Connection Conflict: Single-Client Limit" : "AIS Feed Standby"}</span>
          </div>
          <p className="mt-1 text-slate-700">{s.reason}</p>
          {s.state === "KEY_CONFLICT" && (
            <div className="mt-2 border-t border-amber-400/30 pt-2 text-[11px] text-slate-600">
              <span className="font-semibold text-amber-800">Resolution Steps:</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">
                <li>AISStream allows only 1 active WebSocket connection per account.</li>
                <li>Ensure secondary environments (local dev or staging) have <code>AIS_INGEST_ENABLED=false</code>.</li>
                <li>If redeploying on Render, wait ~60 seconds for the old container to shut down, then click <b>Reconnect now</b> below.</li>
              </ul>
            </div>
          )}
        </div>
      )}
      {showPrompt && (
        <div className="mb-3 rounded border border-tide/50 bg-tide/5 p-3" data-testid="ais-coverage-prompt">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-tide">No recent AIS coverage in this AOI</p>
          <p className="mt-1 text-xs text-slate-600">{cov.message} Selected AOI: <b>{cov.aoi}</b> · {cov.recent_positions_in_aoi} positions in the last {cov.window_minutes} min.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {cov.suggested_region ? (
              <button data-testid="ais-prompt-switch" disabled={busy || !hasRole(user, "supervisor")} onClick={() => setRegion(cov.suggested_region.region, `${cov.suggested_region.recent_positions} genuine AIS positions received there in the last ${cov.window_minutes} min`)} className="rounded bg-ink px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-paper disabled:opacity-50">Switch to live region · {cov.suggested_region.name}</button>
            ) : <span className="font-mono text-[10px] text-slate-400" data-testid="ais-prompt-no-live-region">No region has received genuine AIS positions in the last {cov.window_minutes} min — nothing to switch to.</span>}
            <button data-testid="ais-prompt-stay" onClick={stay} className="rounded border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-600" style={bd}>Stay here</button>
            {!hasRole(user, "supervisor") && cov.suggested_region && <span className="font-mono text-[10px] text-slate-500">supervisor role required to switch</span>}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Staying keeps the AOI and the Sentinel investigation; AIS attribution will show as coverage unavailable. No vessels are ever fabricated.</p>
        </div>
      )}
      {cov && !cov.covered && dismissed && <p className="mb-2 font-mono text-[10px] text-slate-500" data-testid="ais-coverage-unavailable">AIS attribution: NO RECENT COVERAGE in {cov.aoi} (staying here). <button className="text-tide underline" onClick={() => setDismissed(false)}>show options</button></p>}
      <p className="mb-3 text-xs text-slate-400">Genuine AISStream WebSocket only — no simulated vessels. Key is read server-side from <code>AISSTREAM_API_KEY</code>{s.configured ? " (configured)" : " (NOT configured — add it to the backend environment)"}.</p>
      <div className="grid grid-cols-4 gap-3 font-mono text-[11px]" data-testid="live-ais-stats">
        {[["messages", s.messages_received], ["positions stored", s.positions_stored], ["active vessels", s.vessels_active], ["reconnects", s.reconnects]].map(([l, v]) => <div key={l} className="rounded border p-2" style={{ borderColor: "var(--border-default)" }}><div className="label-mono">{l}</div><div className="text-sm text-slate-800">{v}</div></div>)}
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-500" data-testid="live-ais-coverage">coverage {s.coverage_mode.toUpperCase()} · {s.coverage_name} · [S,W,N,E] {s.coverage_bbox.map((b) => b.map((x) => x.toFixed(1)).join(",")).join(" | ")} · last message {fmtTime(s.last_message_at)}{s.error && <span className="text-rose-600"> · {s.error}</span>}</p>
      {hasRole(user, "supervisor") && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="label-mono mr-1">Monitor region</span>
          {Object.entries(REGION_LABELS).map(([k, l]) => <button key={k} data-testid={`live-ais-region-${k}`} disabled={busy} onClick={() => setRegion(k)} className="rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-600 hover:text-white disabled:opacity-50" style={bd}>{l}</button>)}
          <select data-testid="live-ais-region-global" disabled={busy} defaultValue="" onChange={(e) => { if (e.target.value) setRegion(e.target.value); e.target.value = ""; }} className="rounded border bg-mist px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-600" style={bd}>
            <option value="">🌐 World region…</option>{Object.entries(GLOBAL_REGIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button data-testid="btn-reconnect-ais" disabled={busy} onClick={reconnect} className="ml-auto rounded border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-600 hover:text-white disabled:opacity-50" style={bd}>Reconnect now</button>
          {hasRole(user, "admin") && <button data-testid="btn-test-ais" disabled={busy || s.state === "KEY_CONFLICT"} onClick={test} title={s.state === "KEY_CONFLICT" ? "AISStream has an account-level concurrent connection limit; resolve the other connection first." : "Check the existing AIS worker connection without opening another socket."} className="rounded bg-ink px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-paper disabled:opacity-50">Test connection</button>}
        </div>
      )}
    </div>
  );
};
