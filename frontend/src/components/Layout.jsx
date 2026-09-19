import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink, useLocation, Link } from "react-router-dom";
import { Radar, ShieldAlert, LogOut, Menu, MapPin, Info } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LiveBell, CriticalBanner } from "@/components/LiveBell";
import { Sidebar } from "@/components/Sidebar";

const ROLE_COLOR = {
  guest: "#5F7684",
  viewer: "#1F7F93",
  analyst: "#1F7F93",
  supervisor: "#B8862A",
  admin: "#C25A49",
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
    <div className="daylight flex h-screen flex-col overflow-hidden bg-paper text-ink">
      {/* Top command header — same daylight language as the login screen */}
      <header
        className="z-40 flex h-14 shrink-0 items-center gap-3.5 border-b border-ink/10 bg-mist/80 px-4 text-ink backdrop-blur"
      >
        <button
          data-testid="mobile-menu-button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1.5 text-fog transition-colors hover:bg-ink/5 hover:text-ink md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <NavLink to="/" data-testid="nav-brand" className="group flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-tide/25 bg-tide/10 text-tide transition-transform group-hover:scale-105">
            <Radar size={18} />
          </span>
          <div className="flex flex-col">
            <span className="whitespace-nowrap font-display text-lg font-semibold leading-none tracking-tight text-ink">
              Varuna <span className="text-tide">Netra</span>
            </span>
            <span className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.22em] text-fog">
              Command Console
            </span>
          </div>
        </NavLink>

        {/* Active Context Chip */}
        <ContextChip />

        {/* Counters & live status */}
        <div className="ml-auto flex shrink-0 items-center gap-3.5 sm:gap-4">
          {(stats || statsErr) && (
            <div className="hidden items-center gap-4 border-r border-ink/10 pr-4 xl:flex" title="Real database counts (demo/mock records excluded)">
              <Stat
                label="Active cases"
                value={statsErr ? "Unavailable" : stats.active_cases}
                color="#C25A49"
                testId="nav-stat-cases"
                onClick={() => nav("/?origin=real")}
              />
              <Stat
                label="Pending review"
                value={statsErr ? "Unavailable" : stats.pending_review}
                color="#B8862A"
                testId="nav-stat-pending"
                onClick={() => nav("/?origin=real&view=pending")}
              />
              <Stat
                label="Alerts"
                value={statsErr ? "Unavailable" : stats.alerts.unread}
                color="#C25A49"
                icon={<ShieldAlert size={12} className="text-flare" />}
                testId="nav-stat-alerts"
                onClick={() => nav("/alerts?alerts=unread")}
              />
              {stats?.demo?.imported > 0 && (
                <Stat
                  label="Imported"
                  value={stats.demo.imported}
                  color="#1F7F93"
                  testId="nav-stat-imported"
                  onClick={() => nav("/?origin=imported")}
                />
              )}
              {stats?.demo?.cases > 0 && (
                <Stat
                  label="Demo"
                  value={stats.demo.cases}
                  color="#5F7684"
                  testId="nav-stat-demo"
                  onClick={() => nav("/?origin=demo")}
                />
              )}
            </div>
          )}

          {!stats && !statsErr && (
            <div className="hidden items-center gap-4 border-r border-ink/10 pr-4 xl:flex" data-testid="nav-stats-loading">
              <Stat label="Cases" value="—" />
              <Stat label="Pending" value="—" color="#B8862A" />
              <Stat label="Alerts" value="—" color="#C25A49" />
            </div>
          )}

          {/* Quick About Link */}
          <Link
            to="/about"
            className="hidden items-center gap-1.5 rounded-full border border-tide/25 bg-tide/10 px-2.5 py-1 font-mono text-[11px] text-tide transition-colors hover:bg-tide/15 sm:inline-flex"
            title="About Varuna Netra & System Architecture"
          >
            <Info size={12} /> About
          </Link>

          {/* UTC Clock */}
          <div
            className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-ink/10 bg-paper/70 px-2.5 py-1 font-mono text-xs text-fog sm:flex"
            data-testid="utc-clock"
          >
            <span className="pulse-dot" />
            <span>{clock.toISOString().replace("T", " ").slice(0, 19)} UTC</span>
          </div>

          {/* Notification Bell */}
          <LiveBell />

          {/* User Status / Account */}
          {user && (
            <div className="flex items-center gap-2 border-l border-ink/10 pl-3.5" data-testid="user-chip">
              {user.role === "guest" && (
                <span
                  data-testid="guest-badge"
                  className="hidden rounded-full border border-ink/15 bg-paper/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fog sm:inline"
                >
                  Guest · Read Only
                </span>
              )}

              <NavLink
                to="/account"
                data-testid="nav-account-link"
                className="hidden text-right leading-tight transition-opacity hover:opacity-85 sm:block"
              >
                <div className="text-xs font-semibold text-ink" data-testid="user-name">
                  {user.name}
                </div>
                <div
                  className="font-mono text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: ROLE_COLOR[user.role] || "#5F7684" }}
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
                className="rounded-lg p-1.5 text-fog transition-colors hover:bg-flare/10 hover:text-flare"
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
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const Stat = ({ label, value, color = "#16262E", icon, testId, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-baseline gap-1.5 transition-opacity ${
      onClick ? "cursor-pointer hover:opacity-80" : "cursor-default"
    }`}
    data-testid={testId}
  >
    <span className="label-mono text-[10px]">{label}</span>
    <span className="flex items-center gap-1 font-mono text-sm font-semibold" style={{ color }}>
      {icon}
      {value}
    </span>
  </button>
);

const ContextChip = () => {
  const loc = useLocation();
  const [label, setLabel] = useState(null);
  const [tone, setTone] = useState("#1F7F93");

  useEffect(() => {
    let cancel = false;
    const m = loc.pathname.match(/^\/cases\/([^/]+)/);
    if (m) {
      setTone("#1F7F93");
      api
        .get(`/cases/${m[1]}`)
        .then((r) => {
          if (!cancel) setLabel(`CASE ${r.data.case_number}`);
        })
        .catch(() => {
          if (!cancel) setLabel("CASE");
        });
    } else {
      setTone("#1F7F93");
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
      className="hidden max-w-[280px] items-center gap-1.5 rounded-full border border-tide/25 bg-tide/10 px-3 py-1 lg:flex"
    >
      <MapPin size={12} color={tone} className="shrink-0" />
      <span className="truncate font-mono text-[11px] font-semibold" style={{ color: tone }}>
        {label}
      </span>
    </div>
  );
};
