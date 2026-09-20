import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LiveBell, CriticalBanner } from "@/components/LiveBell";
import { Sidebar } from "@/components/Sidebar";

const ROLE_COLOR = { guest: "#707881", viewer: "#007bb9", analyst: "#006194", supervisor: "#b26a00", admin: "#ba1a1a" };
const COLLAPSE_KEY = "vn_sidebar_collapsed";

export const Layout = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [clock, setClock] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem(COLLAPSE_KEY, n ? "1" : "0"); } catch { /* ignore */ } return n; });

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    const load = () => api.get("/dashboard/summary").then((r) => { setStats(r.data); setStatsErr(false); }).catch(() => setStatsErr(true));
    load();
    const s = setInterval(load, 15000);
    const onEvt = () => load();
    window.addEventListener("varuna:refresh-counters", onEvt);
    return () => { clearInterval(t); clearInterval(s); window.removeEventListener("varuna:refresh-counters", onEvt); };
  }, []);

  const initials = (user?.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-on-surface">
      {/* Top bar — white, floating shadow, telemetry pill (Varuna Netra redesign) */}
      <header className="z-40 flex h-16 shrink-0 items-center gap-space-lg bg-surface-container-lowest px-space-lg shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <button data-testid="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container md:hidden">
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <NavLink to="/" data-testid="nav-brand" className="flex shrink-0 items-center gap-space-md">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[22px]">radar</span>
          </span>
          <span className="flex flex-col">
            <span className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-on-surface">VARUNA NETRA</span>
              <span className="hidden rounded bg-primary-fixed px-space-xs py-0.5 font-label-md text-label-md font-semibold uppercase tracking-wider text-on-primary-fixed lg:inline">Maritime Intelligence Console</span>
            </span>
          </span>
        </NavLink>

        <ContextChip />

        {/* Live counters pill */}
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-space-md">
          {(stats || statsErr) && (
            <div className="hidden items-center gap-space-sm rounded-full bg-surface-container-low px-space-md py-1 xl:flex" title="Real database counts (demo/mock records excluded)">
              <Stat label="Active cases" value={statsErr ? "Unavailable" : stats.active_cases} tone="text-error" testId="nav-stat-cases" onClick={() => nav("/?origin=real")} />
              <Sep />
              <Stat label="Pending" value={statsErr ? "Unavailable" : stats.pending_review} tone="text-[#b26a00]" testId="nav-stat-pending" onClick={() => nav("/?origin=real&view=pending")} />
              <Sep />
              <Stat label="Alerts" value={statsErr ? "Unavailable" : stats.alerts.unread} tone="text-error" icon="notifications_active" testId="nav-stat-alerts" onClick={() => nav("/alerts?alerts=unread")} />
              {stats?.demo?.imported > 0 && (<><Sep /><Stat label="Imported" value={stats.demo.imported} tone="text-primary" testId="nav-stat-imported" onClick={() => nav("/?origin=imported")} /></>)}
              {stats?.demo?.cases > 0 && (<><Sep /><Stat label="Demo" value={stats.demo.cases} tone="text-on-surface-variant" testId="nav-stat-demo" onClick={() => nav("/?origin=demo")} /></>)}
            </div>
          )}
          {!stats && !statsErr && (
            <div className="hidden items-center gap-space-sm rounded-full bg-surface-container-low px-space-md py-1 xl:flex" data-testid="nav-stats-loading">
              <Stat label="Cases" value="—" /><Sep /><Stat label="Pending" value="—" /><Sep /><Stat label="Alerts" value="—" />
            </div>
          )}

          <div className="hidden shrink-0 items-center gap-space-xs whitespace-nowrap rounded-lg bg-surface-container px-space-md py-1.5 font-code-telemetry text-code-telemetry text-on-surface-variant sm:flex" data-testid="utc-clock">
            <span className="pulse-dot" />
            {clock.toISOString().replace("T", " ").slice(0, 19)} UTC
          </div>

          <LiveBell />

          {user && (
            <div className="flex items-center gap-space-sm border-l border-surface-container-high pl-space-md" data-testid="user-chip">
              {user.role === "guest" && <span data-testid="guest-badge" className="hidden rounded-full bg-surface-container-high px-2 py-0.5 font-code-telemetry-sm text-code-telemetry-sm uppercase tracking-wider text-on-surface-variant sm:inline">Guest · read only</span>}
              <NavLink to="/account" data-testid="nav-account-link" className="hidden flex-col text-right leading-tight hover:opacity-80 lg:flex">
                <span className="font-label-lg text-label-lg font-semibold text-on-surface" data-testid="user-name">{user.name}</span>
                <span className="font-code-telemetry-sm text-code-telemetry-sm font-semibold uppercase tracking-wider" style={{ color: ROLE_COLOR[user.role] || "#707881" }} data-testid="user-role">{user.role}</span>
              </NavLink>
              <NavLink to="/account" aria-label="Account" className="grid h-8 w-8 place-items-center rounded-full bg-primary font-label-lg text-label-lg font-bold text-on-primary lg:hidden">{initials}</NavLink>
              <button data-testid="logout-button" onClick={async () => { await logout(); nav("/login"); }} title="Sign out" aria-label="Sign out" className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-error">
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <CriticalBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <main className="flex-1 overflow-hidden bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const Sep = () => <span className="font-code-telemetry-sm text-code-telemetry-sm text-outline-variant">|</span>;

const Stat = ({ label, value, tone = "text-on-surface", icon, testId, onClick }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-1.5 ${onClick ? "cursor-pointer hover:opacity-75" : "cursor-default"}`} data-testid={testId}>
    <span className="font-code-telemetry-sm text-code-telemetry-sm font-medium uppercase tracking-wider text-on-surface-variant">{label}</span>
    <span className={`flex items-center gap-0.5 font-code-telemetry text-code-telemetry font-semibold ${tone}`}>
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {value}
    </span>
  </button>
);

const ContextChip = () => {
  const loc = useLocation();
  const [label, setLabel] = useState(null);
  const [isCase, setIsCase] = useState(false);
  useEffect(() => {
    let cancel = false;
    const m = loc.pathname.match(/^\/cases\/([^/]+)/);
    if (m) {
      setIsCase(true);
      api.get(`/cases/${m[1]}`).then((r) => { if (!cancel) setLabel(`CASE ${r.data.case_number}`); }).catch(() => { if (!cancel) setLabel("CASE"); });
    } else {
      setIsCase(false);
      api.get("/aoi").then((r) => { if (!cancel) { const a = r.data?.aoi; setLabel(a ? `AOI · ${a.name || a.label || a.kind || "custom"}` : "AOI · Global (none set)"); } }).catch(() => { if (!cancel) setLabel(null); });
    }
    return () => { cancel = true; };
  }, [loc.pathname]);
  if (!label) return null;
  return (
    <div title={label} data-testid="context-chip" className={`hidden max-w-[260px] items-center gap-1.5 rounded-full px-space-md py-1 lg:flex ${isCase ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary-fixed text-on-primary-fixed"}`}>
      <span className="material-symbols-outlined text-[14px]">{isCase ? "policy" : "location_on"}</span>
      <span className="truncate font-code-telemetry-sm text-code-telemetry-sm font-semibold">{label}</span>
    </div>
  );
};
