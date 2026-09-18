import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, RefreshCw, ShieldAlert, Bell, Filter, CheckCircle2, ChevronRight, Anchor } from "lucide-react";
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

  const load = () =>
    api
      .get("/alerts?limit=200")
      .then((r) => {
        setAlerts(r.data);
        setErr(false);
      })
      .catch(() => setErr(true));

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const ack = async (id) => {
    try {
      await api.post(`/alerts/${id}/ack`);
      toast.success("Alert acknowledged");
      load();
      window.dispatchEvent(new Event("varuna:refresh-counters"));
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#070D18]" data-testid="alerts-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1B2B44] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Tactical Alerts &amp; Advisories
              </h1>
              <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                DISPATCH QUEUE
              </span>
            </div>
            <p className="label-mono mt-1 text-slate-400 text-xs">
              Live automated alerts · Sentinel radar observations, AIS dark-vessel scans, EEZ boundary violations
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              data-testid="alerts-filter-toggle"
              onClick={() => setParams(unreadOnly ? {} : { alerts: "unread" })}
              className={`rounded-lg border px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all ${
                unreadOnly
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-sm"
                  : "border-[#1B2B44] bg-[#0A1221] text-slate-300 hover:text-white"
              }`}
            >
              {unreadOnly ? `Unread only (${shown.length})` : `All alerts (${shown.length})`}
            </button>
            <button
              data-testid="btn-refresh-alerts"
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B2B44] bg-[#0A1221] px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300 hover:text-white hover:border-cyan-400/40 transition-all shadow-sm"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="panel p-5 border-[#1B2B44] bg-[#0A1424]" data-testid="alerts-list">
          {err && (
            <div
              className="rounded-lg border p-4 text-xs text-rose-300 bg-rose-500/10 border-rose-500/30"
              data-testid="alerts-unavailable"
            >
              Alerts stream unavailable — backend connectivity lost. Retrying automatically…
            </div>
          )}

          {!err && alerts === null && (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-cyan-400" />
              Loading active alerts…
            </div>
          )}

          {!err && alerts && shown.length === 0 && (
            <div className="py-16 text-center text-slate-500" data-testid="alerts-empty">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500/50" />
              <p className="font-display text-base font-semibold text-slate-300">
                {unreadOnly ? "No unacknowledged alerts pending." : "No alerts recorded."}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                The maritime domain is currently clear of unaddressed priority notifications.
              </p>
            </div>
          )}

          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((a) => {
              const isUrgent = !a.acknowledged && (a.severity === "high" || a.severity === "critical");
              const isMedium = !a.acknowledged && a.severity === "medium";
              return (
                <div
                  key={a.id}
                  className="rounded-xl border p-4 text-xs flex flex-col justify-between transition-all duration-200 hover:border-slate-600"
                  style={{
                    borderColor: isUrgent
                      ? "rgba(239, 68, 68, 0.45)"
                      : isMedium
                      ? "rgba(245, 158, 11, 0.4)"
                      : a.acknowledged
                      ? "#1B2B44"
                      : "rgba(56, 189, 248, 0.3)",
                    background: isUrgent
                      ? "rgba(239, 68, 68, 0.05)"
                      : a.acknowledged
                      ? "#080F1E"
                      : "rgba(10, 18, 33, 0.8)",
                  }}
                  data-testid={`jobs-alert-${a.id}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-[#1B2B44]/60 pb-2 mb-2">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert
                          size={14}
                          className={
                            a.severity === "high" || a.severity === "critical"
                              ? "text-rose-400"
                              : a.severity === "medium"
                              ? "text-amber-400"
                              : "text-slate-400"
                          }
                        />
                        <span className="font-mono text-[10.5px] uppercase font-bold tracking-wider text-slate-300">
                          {a.kind?.replace(/_/g, " ")}
                        </span>
                      </span>

                      {a.case_id ? (
                        <button
                          className="font-mono text-[#00E5FF] font-semibold hover:underline inline-flex items-center gap-1"
                          onClick={() => nav(`/cases/${a.case_id}`)}
                        >
                          {a.case_number} <ChevronRight size={11} />
                        </button>
                      ) : (
                        <span className="font-mono text-[9.5px] uppercase text-slate-500 bg-[#142036] px-1.5 py-0.5 rounded">
                          Scene Watch
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-slate-200 leading-relaxed font-normal">{a.message}</p>

                    <div className="mt-3 space-y-1.5">
                      <p className="font-mono text-[10px] text-slate-500">
                        Timestamp: {fmtTime(a.created_at)}
                      </p>

                      {a.icg && (
                        <p
                          className="font-mono text-[10px] text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                          data-testid={`jobs-alert-icg-${a.id}`}
                        >
                          <Anchor size={11} className="shrink-0" />
                          Routed: {a.icg.code} · {a.icg.district_hq}
                          {a.icg.approximate ? " (approx.)" : ""}
                        </p>
                      )}

                      {a.notification && (
                        <p
                          className="font-mono text-[10px]"
                          data-testid={`alert-notification-${a.id}`}
                          style={{
                            color:
                              a.notification.status === "sent"
                                ? "#10B981"
                                : a.notification.status === "not_configured"
                                ? "#F59E0B"
                                : "#94A3B8",
                          }}
                        >
                          Dispatch: {a.notification.status.replace(/_/g, " ")} ·{" "}
                          {a.notification.sent}/{a.notification.recipients?.length || 0} recipients
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#1B2B44]/60 flex items-center justify-between">
                    {a.acknowledged ? (
                      <span className="font-mono text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={12} /> Acknowledged by {a.acknowledged_by}
                      </span>
                    ) : hasRole(user, "supervisor") ? (
                      <button
                        onClick={() => ack(a.id)}
                        data-testid={`jobs-alert-ack-${a.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/25 transition-colors border border-emerald-500/30"
                      >
                        <Check size={12} /> Acknowledge Alert
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] text-slate-500">
                        Supervisor acknowledgement required
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
