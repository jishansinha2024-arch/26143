import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Siren, X, Wifi, RefreshCw } from "lucide-react";
import { useLive } from "@/context/LiveFeed";

export const LiveBell = () => {
  const live = useLive();
  const nav = useNavigate();
  if (!live) return null;

  return (
    <button
      data-testid="live-bell"
      onClick={() => {
        live.clearUnread();
        nav("/alerts");
      }}
      title={`Telemetry status: ${live.mode}`}
      className="relative inline-flex items-center gap-1.5 rounded-lg border border-[#1B2B44] bg-[#070D18]/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:text-white hover:border-cyan-400/40 transition-all shadow-sm"
    >
      <Bell size={13} className="text-slate-400" />
      {live.unread > 0 && (
        <span
          data-testid="live-bell-count"
          className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white shadow-md animate-pulse"
          style={{ background: "#EF4444" }}
        >
          {live.unread}
        </span>
      )}
      <span
        data-testid="live-mode"
        className="hidden lg:inline-flex items-center gap-1 font-semibold"
        style={{
          color: live.mode === "live" ? "#10B981" : live.mode === "polling" ? "#F59E0B" : "#64748B",
        }}
      >
        {live.mode === "live" ? <Wifi size={10} /> : <RefreshCw size={10} />}
        {live.mode}
      </span>
    </button>
  );
};

export const CriticalBanner = () => {
  const live = useLive();
  const nav = useNavigate();
  if (!live?.critical) return null;
  const a = live.critical;

  return (
    <div
      data-testid="critical-banner"
      className="flex items-center gap-3 px-4 sm:px-6 py-2 text-xs border-b border-rose-600/40 bg-gradient-to-r from-rose-950/90 via-red-900/80 to-rose-950/90 text-rose-100 shadow-lg z-30"
      role="alert"
    >
      <div className="flex items-center gap-2 shrink-0">
        <Siren size={15} className="animate-pulse text-rose-400" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] bg-rose-500/25 px-2 py-0.5 rounded border border-rose-500/40 text-rose-200">
          Critical Incident
        </span>
      </div>
      <span className="truncate text-rose-200 font-medium">{a.message}</span>
      {a.case_id && (
        <button
          data-testid="critical-banner-open"
          onClick={() => {
            live.dismissCritical();
            nav(`/cases/${a.case_id}`);
          }}
          className="ml-auto shrink-0 rounded-md bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-950 hover:bg-rose-100 shadow transition-colors"
        >
          Acknowledge &amp; Inspect →
        </button>
      )}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          data-testid="critical-banner-mute"
          onClick={live.toggleMute}
          title={live.muted ? "Unmute siren" : "Mute siren"}
          className="rounded p-1 text-rose-300 hover:bg-rose-800/40 hover:text-white transition-colors"
        >
          {live.muted ? <BellOff size={13} /> : <Bell size={13} />}
        </button>
        <button
          data-testid="critical-banner-dismiss"
          onClick={live.dismissCritical}
          title="Dismiss alert"
          className="rounded p-1 text-rose-300 hover:bg-rose-800/40 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
