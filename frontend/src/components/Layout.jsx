import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LiveBell, CriticalBanner } from "@/components/LiveBell";
import { Sidebar } from "@/components/Sidebar";

const ROLE_COLOR = { guest: "#5b86b3", viewer: "#1479c4", analyst: "#0a4f94", supervisor: "#b26a00", admin: "#ba1a1a" };
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
      {/* Top bar — white command-console header (Varuna Netra redesign) */}
      <header className="z-40 flex h-16 shrink-0 items-center gap-space-lg border-b border-[var(--border-default)] bg-surface-container-lowest px-space-lg shadow-[0_1px_10px_rgba(10,79,148,0.06)]">
        <button data-testid="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container md:hidden">
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <NavLink to="/" data-testid="nav-brand" className="flex shrink-0 items-center gap-space-md">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[22px]">radar</span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[19px] font-semibold tracking-tight text-on-surface">Varuna <span className="text-blue-grad">Netra</span></span>
            <span className="mt-1 hidden font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500 lg:block">Command console</span>
          </span>
        </NavLink>

        <ContextChip />

        {/* Live counters */}
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-space-lg">
          {(stats || statsErr) && (
            <div className="hidden items-center gap-space-lg xl:flex" title="Real database counts (demo/mock records excluded)">
              <Stat label="Active cases" value={statsErr ? "Unavailable" : stats.active_cases} tone="text-error" testId="nav-stat-cases" onClick={() => nav("/?origin=real")} />
              <Stat label="Pending review" value={statsErr ? "Unavailable" : stats.pending_review} tone="text-[#b26a00]" testId="nav-stat-pending" onClick={() => nav("/?origin=real&view=pending")} />
              <Stat label="Alerts" value={statsErr ? "Unavailable" : stats.alerts.unread} tone="text-error" icon="notifications_active" testId="nav-stat-alerts" onClick={() => nav("/alerts?alerts=unread")} />
              {stats?.demo?.imported > 0 && <Stat label="Imported" value={stats.demo.imported} tone="text-primary" testId="nav-stat-imported" onClick={() => nav("/?origin=imported")} />}
              {stats?.demo?.cases > 0 && <Stat label="Demo" value={stats.demo.cases} tone="text-on-surface" testId="nav-stat-demo" onClick={() => nav("/?origin=demo")} />}
            </div>
          )}
          {!stats && !statsErr && (
            <div className="hidden items-center gap-space-lg xl:flex" data-testid="nav-stats-loading">
              <Stat label="Cases" value="—" /><Stat label="Pending" value="—" /><Stat label="Alerts" value="—" />
            </div>
          )}

          <NavLink to="/about" data-testid="nav-about-pill" className="hidden items-center gap-1.5 rounded-full border border-[var(--border-highlight)] bg-primary-fixed/60 px-3.5 py-1.5 font-label-lg text-label-lg text-primary transition-colors hover:bg-primary-fixed lg:flex">
            <span className="material-symbols-outlined text-[16px]">info</span>About
          </NavLink>

          <div className="hidden shrink-0 items-center gap-space-sm whitespace-nowrap rounded-full border border-[var(--border-default)] bg-surface-container-low px-space-lg py-1.5 font-code-telemetry text-code-telemetry text-on-surface sm:flex" data-testid="utc-clock">
            <span className="pulse-dot" />
            {clock.toISOString().replace("T", " ").slice(0, 19)} UTC
          </div>

          <LiveBell />

          {user && (
            <div className="flex items-center gap-space-sm border-l border-[var(--border-default)] pl-space-lg" data-testid="user-chip">
              {user.role === "guest" && <span data-testid="guest-badge" className="hidden rounded-full border border-[var(--border-default)] bg-surface-container-low px-2.5 py-1 font-code-telemetry-sm text-code-telemetry-sm uppercase tracking-wider text-on-surface-variant sm:inline">Guest · read only</span>}
              <NavLink to="/account" data-testid="nav-account-link" className="hidden flex-col text-right leading-tight hover:opacity-80 lg:flex">
                <span className="font-label-lg text-label-lg font-semibold text-on-surface" data-testid="user-name">{user.name}</span>
                <span className="font-code-telemetry-sm text-code-telemetry-sm font-semibold uppercase tracking-wider" style={{ color: ROLE_COLOR[user.role] || "#5b86b3" }} data-testid="user-role">{user.role}</span>
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

const Stat = ({ label, value, tone = "text-on-surface", icon, testId, onClick }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-2 ${onClick ? "cursor-pointer hover:opacity-75" : "cursor-default"}`} data-testid={testId}>
    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</span>
    <span className={`flex items-center gap-0.5 font-code-telemetry text-[15px] font-semibold ${tone}`}>
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
    <div title={label} data-testid="context-chip" className={`hidden max-w-[300px] items-center gap-1.5 rounded-full border px-space-lg py-1.5 lg:flex ${isCase ? "border-secondary/30 bg-secondary-fixed/60 text-on-secondary-fixed" : "border-primary/25 bg-primary-fixed/70 text-on-primary-fixed"}`}>
      <span className="material-symbols-outlined text-[14px]">{isCase ? "policy" : "location_on"}</span>
      <span className="truncate font-code-telemetry-sm text-code-telemetry-sm font-semibold">{label}</span>
    </div>
  );
};
