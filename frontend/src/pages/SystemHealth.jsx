import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Satellite, Radio, Database, Cpu, Trash2, Download, ShieldAlert } from "lucide-react";
import { api, apiError, fmtTime, hasRole, pollJob } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const Dot = ({ ok, warn }) => <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-400 shadow-[0_0_8px_#006a61]" : warn ? "bg-amber-400 shadow-[0_0_8px_#b26a00]" : "bg-rose-500 shadow-[0_0_8px_#ba1a1a]"}`} />;
const card = { border: "1px solid var(--border-default)", background: "var(--bg-secondary)" };
const Card = ({ icon: Icon, title, ok, warn, children, testid }) => (
  <section className="rounded p-4" style={card} data-testid={testid}>
    <div className="mb-2 flex items-center gap-2"><Icon size={14} className="text-cyan-300" /><h2 className="font-display text-sm font-semibold">{title}</h2><span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400"><Dot ok={ok} warn={warn} />{ok ? "online" : warn ? "connecting" : "offline"}</span></div>
    <div className="space-y-1 font-mono text-[11px] text-slate-300">{children}</div>
  </section>
);
const Row = ({ k, v, testid }) => <div className="flex justify-between gap-3"><span className="text-slate-500">{k}</span><span className="text-right" data-testid={testid}>{v ?? "—"}</span></div>;
const age = (iso) => { if (!iso) return "never"; const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function SystemHealth() {
  const { user } = useAuth();
  const [h, setH] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get("/system/health").then((r) => setH(r.data)).catch((e) => toast.error(apiError(e))), []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const purge = async () => {
    if (!window.confirm("Permanently delete all seeded DEMO scenes, spills, cases and AIS fixes? Real Sentinel-1 cases, zones, users, gazetteer and archive are kept.")) return;
    setBusy(true);
    try { const { data } = await api.post("/system/purge-demo"); toast.success(`Demo data purged: ${Object.entries(data.purged).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") || "nothing to purge"}`); await load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const ingest = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/scene-watches/ingest-now", null, { params: { days: 7 } });
      toast.info(`Queued ${data.queued} watch polls over the last 7 days of Sentinel-1 — this takes a few minutes`);
      const done = await Promise.allSettled(data.job_ids.slice(0, 3).map((id) => pollJob(id)));
      toast.success(`${done.filter((d) => d.status === "fulfilled" && d.value.status === "succeeded").length} watch(es) completed so far; remaining continue in background (see Jobs)`);
      await load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const setRegion = async (k) => {
    setBusy(true);
    try { const { data } = await api.post(`/ais/coverage/region/${k}`); toast.success(`AIS coverage → ${data.name} (${data.mode})`); await load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  if (!h) return <p className="p-6 font-mono text-xs text-slate-500">Running health checks…</p>;
  const dm = h.data_mode;
  return (
    <div className="h-full overflow-y-auto p-6" data-testid="system-health-page">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div><p className="label-mono">Data sources · system health</p><h1 className="font-display text-2xl font-extrabold tracking-tight">Live operations</h1></div>
        <span data-testid="data-mode-badge" className={`rounded px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${dm.mode === "PRODUCTION" ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/50" : "bg-amber-400/15 text-amber-300 border border-amber-400/50"}`}>{dm.mode} mode</span>
        <span className="font-mono text-[11px] text-slate-400">checked {fmtTime(h.checked_at)} · backend uptime {Math.floor(h.uptime_s / 60)} min · refreshes every 15 s</span>
        <span className="ml-auto flex gap-2">
          {hasRole(user, "supervisor") && <button data-testid="btn-ingest-now" disabled={busy} onClick={ingest} className="inline-flex items-center gap-1 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50"><Download size={12} /> Ingest last 7 days of Sentinel-1</button>}
          {hasRole(user, "admin") && dm.demo_data_present && <button data-testid="btn-purge-demo" disabled={busy} onClick={purge} className="inline-flex items-center gap-1 rounded border border-rose-500/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><Trash2 size={12} /> Purge demo data</button>}
        </span>
      </div>
      {!h.ais.connected && (
        <div className="mb-4 flex items-start gap-2 rounded border border-amber-400/50 bg-amber-400/5 px-3 py-2 text-xs" data-testid="ais-unavailable-banner">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-300" /><div><b className="text-amber-300">AISStream {h.ais.state}</b> — {h.ais.reason}. {h.ais.note} Satellite investigation continues in {dm.mode} mode. {!h.ais.configured && <span className="text-slate-400">Add <code>AISSTREAM_API_KEY</code> (free at aisstream.io) to the <b>backend</b> deployment environment, then redeploy the backend. No demo vessels are ever substituted.</span>}</div>
        </div>
      )}
      {h.ais.connected && h.ais.state !== "LIVE" && (
        <div className="mb-4 flex items-start gap-2 rounded border border-cyan-400/40 bg-cyan-400/5 px-3 py-2 text-xs" data-testid="ais-no-coverage-banner">
          <Radio size={14} className="mt-0.5 shrink-0 text-cyan-300" /><div><b className="text-cyan-300">AISStream connected · no recent AIS observations in this AOI</b> — terrestrial AIS receivers are sparse for {h.ais.coverage_name}. Connection and subscription are healthy; switch to a dense region to see genuine live traffic.</div>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {h.authentication && (
          <Card icon={ShieldAlert} title={`Authentication · Google ${h.authentication.google.status}`} ok={h.authentication.google.status === "READY"} warn={h.authentication.google.status !== "CONFIGURATION_ERROR"} testid="health-auth">
            <Row k="email / password" v={h.authentication.email_password ? "ENABLED" : "DISABLED"} testid="health-auth-password" />
            <Row k="google sign-in" v={h.authentication.google.status} testid="health-auth-google" /><Row k="provider" v={h.authentication.google.provider} /><Row k="policy" v="invite-only · role from user record" />
          </Card>
        )}
        <Card icon={Satellite} title="Sentinel-1 STAC" ok={h.sentinel_stac.online} testid="health-stac">
          <Row k="provider" v={h.sentinel_stac.provider} /><Row k="latency" v={h.sentinel_stac.latency_ms != null ? `${h.sentinel_stac.latency_ms} ms` : h.sentinel_stac.error} />
          <Row k="last real scene" v={h.last_scene ? `${h.last_scene.provider_scene_id?.slice(0, 32)}` : "none yet"} testid="health-last-scene" /><Row k="acquired" v={h.last_scene ? `${fmtTime(h.last_scene.acquisition_time)} (${age(h.last_scene.acquisition_time)})` : "—"} />
          <Row k="active watches" v={`${h.watches.active} (${h.watches.auto_detect} auto-detect)`} /><Row k="scenes / detections 24 h" v={`${h.last_24h.scenes_registered} / ${h.last_24h.detections}`} />
        </Card>
        <Card icon={Radio} title={`AISStream · ${h.ais.state === "LIVE" ? "LIVE" : h.ais.state === "NOT_CONFIGURED" ? "UNCONFIGURED" : h.ais.state === "CONNECTED" ? "CONNECTED · NO REGIONAL COVERAGE" : h.ais.state === "KEY_CONFLICT" ? "KEY CONFLICT" : h.ais.state}`} ok={h.ais.state === "LIVE"} warn={["CONNECTING", "CONNECTED", "RECONNECTING", "STALE", "STANDBY"].includes(h.ais.state)} testid="health-ais">
          <Row k="environment · ingest enabled" v={`${h.ais.environment || "—"} · ${String(h.ais.ingest_enabled)}`} testid="health-ais-env" /><Row k="worker role · socket owner" v={`${h.ais.worker_role} · ${h.ais.worker_owner || "—"}`} testid="health-ais-owner" />
          <Row k="connection" v={h.ais.websocket_open ? "CONNECTED (socket open)" : h.ais.state === "RECONNECTING" ? "RECONNECTING" : h.ais.state === "CONNECTING" ? "CONNECTING" : "OFFLINE"} testid="health-ais-connection" />
          <Row k="subscription" v={h.ais.subscription_confirmed ? `CONFIRMED${h.ais.subscription_kind ? ` · ${h.ais.subscription_kind}` : ""}` : "PENDING"} testid="health-ais-subscription" />
          <Row k="feed" v={h.ais.feed || h.ais.state} testid="health-ais-state" /><Row k="configured (key present)" v={String(h.ais.configured)} testid="health-ais-configured" /><Row k="connected" v={String(h.ais.connected)} testid="health-ais-connected" />
          <Row k="messages received" v={h.ais.messages_received} /><Row k="messages / min" v={h.ais.messages_per_min} testid="health-ais-rate" /><Row k="positions stored" v={h.ais.positions_stored} /><Row k="active vessels (30 min)" v={h.ais.vessels_active} /><Row k="last message" v={h.ais.last_message_at ? age(h.ais.last_message_at) : "never"} /><Row k="reconnects" v={h.ais.reconnects} />
          {h.ais.last_error && <Row k="last error" v={`${h.ais.last_error}${h.ais.last_close_code ? ` (close ${h.ais.last_close_code})` : ""}`} testid="health-ais-error" />}
          <Row k="ingest worker" v={`${h.ais.worker_role || "—"} · ${h.ais.worker_owner || "—"}`} testid="health-ais-worker" />
          <Row k="coverage" v={`${h.ais.coverage_mode.toUpperCase()} · ${h.ais.coverage_name}`} testid="health-ais-coverage" /><Row k="bbox [S,W,N,E]" v={h.ais.coverage_bbox.map((b) => b.map((x) => x.toFixed(1)).join(",")).join(" | ")} />
          {h.ais.state === "CONNECTED" && hasRole(user, "supervisor") && <button data-testid="btn-view-live-ais-region" disabled={busy} onClick={() => setRegion("malacca_singapore")} className="mt-2 rounded border border-cyan-400/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/10">View live AIS region (Singapore Strait — dense terrestrial coverage)</button>}
          {hasRole(user, "supervisor") && (
            <div className="mt-2 flex flex-wrap gap-1" data-testid="monitor-region-select">
              <span className="label-mono mr-1 self-center">Monitor region</span>
              {[["west_coast", "West Coast"], ["east_coast", "East Coast"], ["south_india", "South India"], ["andaman_nicobar", "Andaman & Nicobar"], ["default", "All India"]].map(([k, l]) => (
                <button key={k} data-testid={`region-${k}`} disabled={busy} onClick={() => setRegion(k)} className="rounded border px-2 py-0.5 text-[10px] uppercase text-slate-300 hover:text-on-surface disabled:opacity-50" style={{ borderColor: "var(--border-highlight)" }}>{l}</button>
              ))}
            </div>
          )}
        </Card>
        <Card icon={Database} title="Database (MongoDB)" ok={h.database.online} testid="health-db">
          <Row k="ping" v={h.database.online ? "ok" : "failed"} /><Row k="real Sentinel-1 scenes" v={dm.real_scenes} /><Row k="demo data present" v={String(dm.demo_data_present)} testid="health-demo-present" /><Row k="demo purged" v={dm.demo_purged ? fmtTime(dm.purged_at) : "no"} /><Row k="alerts / jobs 24 h" v={`${h.last_24h.alerts} / ${h.last_24h.jobs}`} />
        </Card>
        <Card icon={Cpu} title="Detection inference" ok={h.ml_inference.ready} testid="health-ml">
          <Row k="model" v={h.ml_inference.model || h.ml_inference.error} /><Row k="opencv" v={h.ml_inference.opencv} /><Row k="status" v={h.ml_inference.ready ? "READY" : "ERROR"} />
        </Card>
        <Card icon={Activity} title="Alert routing" ok={h.icg_districts > 0} testid="health-icg">
          <Row k="ICG districts active" v={h.icg_districts} /><Row k="DEMO_MODE env" v={String(dm.demo_mode_env)} />
        </Card>
      </div>
      <p className="mt-4 text-[11px] text-slate-500">All values above are live checks (STAC collection GET, Mongo ping, AIS worker state, OpenCV import) — nothing is hard-coded. Satellite data is REAL but never "live": Sentinel-1 revisits India every 1–6 days; acquisition age is shown per scene.</p>
    </div>
  );
}
