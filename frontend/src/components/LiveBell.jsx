import { useNavigate } from "react-router-dom";
import { useLive } from "@/context/LiveFeed";

export const LiveBell = () => {
  const live = useLive();
  const nav = useNavigate();
  if (!live) return null;
  const modeTone = live.mode === "live" ? "text-secondary" : live.mode === "polling" ? "text-[#b26a00]" : "text-outline";
  return (
    <button data-testid="live-bell" onClick={() => { live.clearUnread(); nav("/alerts"); }} title={`Live feed: ${live.mode}`}
      className="relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
      <span className="material-symbols-outlined text-[20px]">notifications</span>
      {live.unread > 0 && <span data-testid="live-bell-count" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 font-code-telemetry-sm text-[9px] font-bold text-on-error">{live.unread}</span>}
      <span data-testid="live-mode" className={`hidden items-center gap-0.5 font-code-telemetry-sm text-code-telemetry-sm font-semibold uppercase tracking-wider lg:inline-flex ${modeTone}`}>
        <span className="material-symbols-outlined text-[12px]">{live.mode === "live" ? "wifi" : "sync"}</span> {live.mode}
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
    <div data-testid="critical-banner" className="critical-banner flex items-center gap-3 px-5 py-2 text-xs" role="alert">
      <span className="material-symbols-outlined shrink-0 animate-pulse text-[18px]">crisis_alert</span>
      <span className="font-code-telemetry text-[10px] font-bold uppercase tracking-[0.2em]">Critical</span>
      <span className="truncate">{a.message}</span>
      {a.case_id && <button data-testid="critical-banner-open" onClick={() => { live.dismissCritical(); nav(`/cases/${a.case_id}`); }} className="ml-auto shrink-0 rounded-lg bg-white px-3 py-1 font-code-telemetry text-[10px] font-bold uppercase tracking-wider text-error">Acknowledge &amp; respond</button>}
      <button data-testid="critical-banner-mute" onClick={live.toggleMute} title={live.muted ? "unmute siren" : "mute siren"} className="shrink-0 rounded p-1 hover:bg-white/20"><span className="material-symbols-outlined text-[16px]">{live.muted ? "notifications_off" : "notifications_active"}</span></button>
      <button data-testid="critical-banner-dismiss" onClick={live.dismissCritical} className="shrink-0 rounded p-1 hover:bg-white/20"><span className="material-symbols-outlined text-[16px]">close</span></button>
    </div>
  );
};
