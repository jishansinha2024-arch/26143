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
      className="relative inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-paper/70 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fog transition-colors hover:border-tide/50 hover:text-ink"
    >
      <Bell size={13} className="text-fog" />
      {live.unread > 0 && (
        <span
          data-testid="live-bell-count"
          className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white shadow-md animate-pulse"
          style={{ background: "#C25A49" }}
        >
          {live.unread}
        </span>
      )}
      <span
        data-testid="live-mode"
        className="hidden lg:inline-flex items-center gap-1 font-semibold"
        style={{
          color: live.mode === "live" ? "#2E8B6A" : live.mode === "polling" ? "#B8862A" : "#5F7684",
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
      className="z-30 flex items-center gap-3 border-b border-flare/40 bg-flare px-4 py-2 text-xs text-white shadow-lg sm:px-6"
      role="alert"
    >
      <div className="flex items-center gap-2 shrink-0">
        <Siren size={15} className="animate-pulse text-white" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] rounded border border-white/30 bg-white/15 px-2 py-0.5 text-white">
          Critical Incident
        </span>
      </div>
      <span className="truncate font-medium text-white">{a.message}</span>
      {a.case_id && (
        <button
          data-testid="critical-banner-open"
          onClick={() => {
            live.dismissCritical();
            nav(`/cases/${a.case_id}`);
          }}
          className="ml-auto shrink-0 rounded-md bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-flare shadow transition-colors hover:bg-paper"
        >
          Acknowledge &amp; Inspect →
        </button>
      )}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          data-testid="critical-banner-mute"
          onClick={live.toggleMute}
          title={live.muted ? "Unmute siren" : "Mute siren"}
          className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          {live.muted ? <BellOff size={13} /> : <Bell size={13} />}
        </button>
        <button
          data-testid="critical-banner-dismiss"
          onClick={live.dismissCritical}
          title="Dismiss alert"
          className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
