import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink, useLocation, Link } from "react-router-dom";
import { Radar, ShieldAlert, LogOut, Menu, MapPin, Info } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LiveBell, CriticalBanner } from "@/components/LiveBell";
import { Sidebar } from "@/components/Sidebar";

const ROLE_COLOR = {
  guest: "#64748B",
  viewer: "#0284C7",
  analyst: "#0EA5E9",
  supervisor: "#D97706",
  admin: "#E11D48",
};

const COLLAPSE_KEY = "vn_sidebar_collapsed";

export const Layout = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [clock, setClock] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      const n = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, n ? "1" : "0");
      } catch {
        /* ignore */
      }
      return n;
    });

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    const load = () =>
      api
        .get("/dashboard/summary")
        .then((r) => {
          setStats(r.data);
          setStatsErr(false);
        })
        .catch(() => setStatsErr(true));
    load();
    const s = setInterval(load, 15000);
    const onEvt = () => load();
    window.addEventListener("varuna:refresh-counters", onEvt);
    return () => {
      clearInterval(t);
      clearInterval(s);
      window.removeEventListener("varuna:refresh-counters", onEvt);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-900 bg-[#F8FAFC]">
      {/* Top Tactical Command Header */}
      <header
        className="flex h-14 shrink-0 items-center gap-3.5 border-b px-4 z-40 bg-[#0B1528] text-slate-100 border-[#1E2E4A] shadow-xs"
      >
        <button
          data-testid="mobile-menu-button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-[#162B4D] hover:text-white md:hidden transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <NavLink to="/" data-testid="nav-brand" className="flex shrink-0 items-center gap-2.5 group">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg shadow-sm bg-gradient-to-br from-sky-500/25 to-sky-600/10 border border-sky-400/30 text-sky-400 group-hover:scale-105 transition-transform"
          >
            <Radar size={17} />
          </span>
          <div className="flex flex-col">
            <span className="whitespace-nowrap font-display text-lg font-bold tracking-tight text-white leading-none">
              Varuna <span className="text-sky-400 font-extrabold">Netra</span>
            </span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-slate-400 mt-0.5">
              Command Console
            </span>
          </div>
        </NavLink>

        {/* Active Context Chip */}
        <ContextChip />

        {/* Tactical Counters & Live Status */}
        <div className="ml-auto flex shrink-0 items-center gap-3.5 sm:gap-4">
          {(stats || statsErr) && (
            <div className="hidden items-center gap-4 xl:flex border-r border-[#1E2E4A] pr-4" title="Real database counts (demo/mock records excluded)">
              <Stat
                label="Active cases"
                value={statsErr ? "Unavailable" : stats.active_cases}
                color="#F87171"
                testId="nav-stat-cases"
                onClick={() => nav("/?origin=real")}
              />
              <Stat
                label="Pending review"
                value={statsErr ? "Unavailable" : stats.pending_review}
                color="#FBBF24"
                testId="nav-stat-pending"
                onClick={() => nav("/?origin=real&view=pending")}
              />
              <Stat
                label="Alerts"
                value={statsErr ? "Unavailable" : stats.alerts.unread}
                color="#FB7185"
                icon={<ShieldAlert size={12} className="text-rose-400" />}
                testId="nav-stat-alerts"
                onClick={() => nav("/alerts?alerts=unread")}
              />
              {stats?.demo?.imported > 0 && (
                <Stat
                  label="Imported"
                  value={stats.demo.imported}
                  color="#38BDF8"
                  testId="nav-stat-imported"
                  onClick={() => nav("/?origin=imported")}
                />
              )}
              {stats?.demo?.cases > 0 && (
                <Stat
                  label="Demo"
                  value={stats.demo.cases}
                  color="#94A3B8"
                  testId="nav-stat-demo"
                  onClick={() => nav("/?origin=demo")}
                />
              )}
            </div>
          )}

          {!stats && !statsErr && (
            <div className="hidden items-center gap-4 xl:flex border-r border-[#1E2E4A] pr-4" data-testid="nav-stats-loading">
              <Stat label="Cases" value="—" />
              <Stat label="Pending" value="—" color="#FBBF24" />
              <Stat label="Alerts" value="—" color="#FB7185" />
            </div>
          )}

          {/* Quick About Link */}
          <Link
            to="/about"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-950/60 px-2.5 py-1 text-[11px] font-mono text-sky-300 hover:bg-sky-900/40 transition-colors shadow-xs"
            title="About Varuna Netra & System Architecture"
          >
            <Info size={12} /> About
          </Link>

          {/* UTC Clock */}
          <div
            className="hidden shrink-0 items-center gap-2 whitespace-nowrap font-mono text-xs text-slate-300 sm:flex bg-[#070E1A] border border-[#1E2E4A] px-2.5 py-1 rounded-lg shadow-xs"
            data-testid="utc-clock"
          >
            <span className="pulse-dot" />
            <span>{clock.toISOString().replace("T", " ").slice(0, 19)} UTC</span>
          </div>

          {/* Notification Bell */}
          <LiveBell />

          {/* User Status / Account Dropdown */}
          {user && (
            <div
              className="flex items-center gap-2 border-l border-[#1E2E4A] pl-3.5"
              data-testid="user-chip"
            >
              {user.role === "guest" && (
                <span
                  data-testid="guest-badge"
                  className="hidden rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider sm:inline text-slate-400 border-slate-600/40 bg-slate-800/60"
                >
                  Guest · Read Only
                </span>
              )}

              <NavLink
                to="/account"
                data-testid="nav-account-link"
                className="hidden text-right leading-tight sm:block hover:opacity-85 transition-opacity"
              >
                <div className="text-xs font-semibold text-slate-200" data-testid="user-name">
                  {user.name}
                </div>
                <div
                  className="font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: ROLE_COLOR[user.role] || "#94A3B8" }}
                  data-testid="user-role"
                >
                  {user.role}
                </div>
              </NavLink>

              <button
                data-testid="logout-button"
                onClick={async () => {
                  await logout();
                  nav("/login");
                }}
                title="Sign out of console"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-[#162B4D] hover:text-rose-300 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Critical Alert Advisory Banner */}
      <CriticalBanner />

      {/* Workspace Area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-hidden bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const Stat = ({ label, value, color = "#F8FAFC", icon, testId, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-baseline gap-1.5 transition-opacity ${
      onClick ? "cursor-pointer hover:opacity-80" : "cursor-default"
    }`}
    data-testid={testId}
  >
    <span className="label-mono text-[10px] text-slate-400">{label}</span>
    <span
      className="font-mono text-sm font-bold flex items-center gap-1"
      style={{ color }}
    >
      {icon}
      {value}
    </span>
  </button>
);

const ContextChip = () => {
  const loc = useLocation();
  const [label, setLabel] = useState(null);
  const [tone, setTone] = useState("#38BDF8");

  useEffect(() => {
    let cancel = false;
    const m = loc.pathname.match(/^\/cases\/([^/]+)/);
    if (m) {
      setTone("#38BDF8");
      api
        .get(`/cases/${m[1]}`)
        .then((r) => {
          if (!cancel) setLabel(`CASE ${r.data.case_number}`);
        })
        .catch(() => {
          if (!cancel) setLabel("CASE");
        });
    } else {
      setTone("#38BDF8");
      api
        .get("/aoi")
        .then((r) => {
          if (!cancel) {
            const a = r.data?.aoi;
            setLabel(a ? `AOI · ${a.name || a.label || a.kind || "custom"}` : "AOI · Global Domain");
          }
        })
        .catch(() => {
          if (!cancel) setLabel(null);
        });
    }
    return () => {
      cancel = true;
    };
  }, [loc.pathname]);

  if (!label) return null;

  return (
    <div
      title={label}
      data-testid="context-chip"
      className="hidden max-w-[280px] items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-950/40 px-3 py-1 lg:flex shadow-xs"
    >
      <MapPin size={12} color={tone} className="shrink-0" />
      <span className="truncate font-mono text-[11px] font-semibold" style={{ color: tone }}>
        {label}
      </span>
    </div>
  );
};
