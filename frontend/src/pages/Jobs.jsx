import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, RefreshCw, ShieldAlert, CheckCircle2, ChevronRight, Anchor } from "lucide-react";
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
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F7F6F2] text-slate-900" data-testid="alerts-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Tactical Alerts &amp; Advisories
              </h1>
              <span className="font-mono text-[10px] uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-semibold">
                DISPATCH QUEUE
              </span>
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              Live automated alerts · Sentinel radar observations, AIS dark-vessel scans, EEZ boundary violations
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              data-testid="alerts-filter-toggle"
              onClick={() => setParams(unreadOnly ? {} : { alerts: "unread" })}
              className={`rounded-xl border px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all shadow-xs ${
                unreadOnly
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-700 hover:text-slate-900"
              }`}
            >
              {unreadOnly ? `Unread only (${shown.length})` : `All alerts (${shown.length})`}
            </button>
            <button
              data-testid="btn-refresh-alerts"
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all shadow-xs"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="panel p-5 border-slate-200 bg-white" data-testid="alerts-list">
          {err && (
            <div
              className="rounded-xl border p-4 text-xs text-rose-800 bg-rose-50 border-rose-200"
              data-testid="alerts-unavailable"
            >
              Alerts stream unavailable — backend connectivity lost. Retrying automatically…
            </div>
          )}

          {!err && alerts === null && (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-sky-600" />
              Loading active alerts…
            </div>
          )}

          {!err && alerts && shown.length === 0 && (
            <div className="py-16 text-center text-slate-500" data-testid="alerts-empty">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
              <p className="font-display text-base font-semibold text-slate-800">
                {unreadOnly ? "No unacknowledged alerts pending." : "No alerts recorded."}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                The maritime domain is currently clear of unaddressed priority notifications.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((a) => {
              const isUrgent = !a.acknowledged && (a.severity === "high" || a.severity === "critical");
              const isMedium = !a.acknowledged && a.severity === "medium";
              return (
                <div
                  key={a.id}
                  className="rounded-xl border p-4 text-xs flex flex-col justify-between transition-all duration-200 hover:shadow-sm"
                  style={{
                    borderColor: isUrgent
                      ? "#EBC7BF"
                      : isMedium
                      ? "#E9D49A"
                      : a.acknowledged
                      ? "#E2DFD6"
                      : "#B3DBE3",
                    background: isUrgent
                      ? "#FBEFEC"
                      : isMedium
                      ? "#FAF4E4"
                      : a.acknowledged
                      ? "#F7F6F2"
                      : "#FFFFFF",
                  }}
                  data-testid={`jobs-alert-${a.id}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert
                          size={15}
                          className={
                            a.severity === "high" || a.severity === "critical"
                              ? "text-rose-600"
                              : a.severity === "medium"
                              ? "text-amber-600"
                              : "text-slate-500"
                          }
                        />
                        <span className="font-mono text-[10.5px] uppercase font-bold tracking-wider text-slate-800">
                          {a.kind?.replace(/_/g, " ")}
                        </span>
                      </span>

                      {a.case_id ? (
                        <button
                          className="font-mono text-sky-800 font-bold hover:underline inline-flex items-center gap-1"
                          onClick={() => nav(`/cases/${a.case_id}`)}
                        >
                          {a.case_number} <ChevronRight size={12} />
                        </button>
                      ) : (
                        <span className="font-mono text-[9.5px] uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Scene Watch
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-slate-700 leading-relaxed font-normal">{a.message}</p>

                    <div className="mt-3 space-y-1.5">
                      <p className="font-mono text-[10px] text-slate-400">
                        Timestamp: {fmtTime(a.created_at)}
                      </p>

                      {a.icg && (
                        <p
                          className="font-mono text-[10px] text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                          data-testid={`jobs-alert-icg-${a.id}`}
                        >
                          <Anchor size={12} className="shrink-0" />
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
                                ? "#2E8B6A"
                                : a.notification.status === "not_configured"
                                ? "#B8862A"
                                : "#5F7684",
                          }}
                        >
                          Dispatch: {a.notification.status.replace(/_/g, " ")} ·{" "}
                          {a.notification.sent}/{a.notification.recipients?.length || 0} recipients
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    {a.acknowledged ? (
                      <span className="font-mono text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Check size={13} /> Acknowledged by {a.acknowledged_by}
                      </span>
                    ) : hasRole(user, "supervisor") ? (
                      <button
                        onClick={() => ack(a.id)}
                        data-testid={`jobs-alert-ack-${a.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-white hover:bg-emerald-700 transition-colors shadow-xs"
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
