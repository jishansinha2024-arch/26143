import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, RefreshCw, ShieldAlert } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState(null);
  const [err, setErr] = useState(false);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const unreadOnly = params.get("alerts") === "unread";
  const shown = (alerts || []).filter((a) => !unreadOnly || !a.acknowledged);
  const load = () => api.get("/alerts?limit=200").then((r) => { setAlerts(r.data); setErr(false); }).catch(() => setErr(true));
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const ack = async (id) => { try { await api.post(`/alerts/${id}/ack`); toast.success("Alert acknowledged"); load(); window.dispatchEvent(new Event("varuna:refresh-counters")); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="alerts-page">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="label-mono mb-1">Live alerts · new scenes, new spills, dark vessels, zone rules</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Alerts</h1>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="alerts-filter-toggle" onClick={() => setParams(unreadOnly ? {} : { alerts: "unread" })} className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${unreadOnly ? "border-rose-400/50 text-rose-300" : "border-slate-700 text-slate-400"}`}>{unreadOnly ? `unread only · ${shown.length}` : `all · ${shown.length}`}</button>
          <button data-testid="btn-refresh-alerts" onClick={load} className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:text-on-surface" style={{ borderColor: "var(--border-highlight)" }}><RefreshCw size={12} /> Refresh</button>
        </div>
      </div>
      <div className="panel overflow-hidden" data-testid="alerts-list">
        <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
          {err && <p className="text-xs text-rose-300" data-testid="alerts-unavailable">Alerts UNAVAILABLE — backend not reachable.</p>}
          {!err && alerts === null && <p className="text-xs text-slate-500">Loading…</p>}
          {!err && alerts && shown.length === 0 && <p className="text-xs text-slate-500" data-testid="alerts-empty">{unreadOnly ? "No unacknowledged alerts." : "No alerts raised."}</p>}
          {shown.map((a) => (
            <div key={a.id} className="rounded border p-3 text-xs" style={{ borderColor: a.acknowledged ? "var(--border-default)" : "rgba(186,26,26,0.5)", background: a.acknowledged ? "transparent" : "rgba(186,26,26,0.05)" }} data-testid={`jobs-alert-${a.id}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5"><ShieldAlert size={12} color={a.severity === "high" ? "#ba1a1a" : a.severity === "medium" ? "#b26a00" : "#707881"} /><span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{a.kind?.replace("_", " ")}</span></span>
                {a.case_id ? <button className="font-mono text-cyan-300 hover:underline" onClick={() => nav(`/cases/${a.case_id}`)}>{a.case_number}</button> : <span className="font-mono text-[10px] text-slate-500">scene watch</span>}
              </div>
              <p className="mt-1.5 text-slate-200 leading-relaxed">{a.message}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{fmtTime(a.created_at)}</p>
              {a.icg && <p className="mt-1 font-mono text-[10px] text-emerald-300" data-testid={`jobs-alert-icg-${a.id}`}>⚓ routed → {a.icg.code} · {a.icg.district_hq}{a.icg.approximate ? " (approx.)" : ""}</p>}
              {a.notification && <p className="mt-1 font-mono text-[10px]" data-testid={`alert-notification-${a.id}`} style={{ color: a.notification.status === "sent" ? "#006a61" : a.notification.status === "not_configured" ? "#b26a00" : "#707881" }}>email: {a.notification.status.replace("_", " ")} · {a.notification.sent}/{a.notification.recipients?.length || 0} recipients</p>}
              {a.acknowledged ? <p className="mt-1 font-mono text-[10px] text-emerald-300">ack by {a.acknowledged_by}</p> : hasRole(user, "supervisor") ?
                <button onClick={() => ack(a.id)} data-testid={`jobs-alert-ack-${a.id}`} className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300 hover:underline"><Check size={12} /> Acknowledge</button>
                : <p className="mt-1 font-mono text-[10px] text-slate-500">supervisor acknowledgement required</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
