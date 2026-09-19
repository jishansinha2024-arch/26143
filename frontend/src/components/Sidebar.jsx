import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Radar,
  LayoutDashboard,
  Satellite,
  Globe2,
  Images,
  ShieldAlert,
  Eye,
  Columns2,
  BookOpen,
  Map as MapIcon,
  HeartPulse,
  Users as UsersIcon,
  Bookmark,
  UserCog,
  BadgeCheck,
  ShieldCheck,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
  X,
  Info,
} from "lucide-react";
import { api, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SECTIONS = [
  {
    title: "Operations",
    items: [
      { to: "/", label: "Surveillance", icon: LayoutDashboard, id: "nav-dashboard-link", end: true },
      { to: "/ingest", label: "Ingestion", icon: Satellite, id: "nav-ingest-link" },
      { to: "/explorer", label: "Scene Explorer", icon: Globe2, id: "nav-explorer-link" },
      { to: "/events", label: "Events", icon: Images, id: "nav-events-link" },
    ],
  },
  {
    title: "Investigation",
    items: [
      { to: "/alerts", label: "Alerts", icon: ShieldAlert, id: "nav-alerts-link" },
      { to: "/watchlist", label: "Watchlist", icon: Eye, id: "nav-watchlist-link" },
      { to: "/compare", label: "Compare", icon: Columns2, id: "nav-compare-link" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/about", label: "About Varuna Netra", icon: Info, id: "nav-about-link" },
      { to: "/archive", label: "Archive", icon: BookOpen, id: "nav-archive-link" },
      { to: "/zones", label: "Zones / Jurisdictions", icon: MapIcon, id: "nav-zones-link" },
      { to: "/validation", label: "Validation", icon: BadgeCheck, id: "nav-validation-link" },
      { to: "/health", label: "Data Sources", icon: HeartPulse, id: "nav-health-link" },
    ],
  },
];

const itemBase =
  "group relative flex items-center rounded-lg py-2 text-xs font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sky-400";
const itemState = (isActive) =>
  isActive
    ? "bg-sky-500/15 text-sky-400 shadow-xs font-semibold border-l-2 border-sky-400"
    : "text-slate-400 hover:bg-[#162B4D]/60 hover:text-slate-200 border-l-2 border-transparent";

const Tip = ({ label }) => (
  <span className="pointer-events-none absolute left-full z-50 ml-2.5 hidden whitespace-nowrap rounded-md bg-[#0F1D38] px-2.5 py-1 font-mono text-[10.5px] text-slate-100 shadow-lg border border-[#1E2E4A] group-hover:block group-focus-visible:block">
    {label}
  </span>
);

const NavItem = ({ item, collapsed, onNavigate }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      data-testid={item.id}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `${itemBase} ${itemState(isActive)} ${collapsed ? "justify-center px-0 mx-1" : "gap-2.5 px-3 mx-1"}`
      }
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && <Tip label={item.label} />}
    </NavLink>
  );
};

const NavBody = ({ collapsed, onNavigate }) => {
  const { user } = useAuth();
  const [ref, setRef] = useState(null);

  useEffect(() => {
    api.get("/demo/reference").then((r) => setRef(r.data)).catch(() => setRef(null));
  }, []);

  const refPinned = ref?.pinned && ref?.available;

  return (
    <nav
      className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 py-3.5 [&::-webkit-scrollbar]:w-1"
      data-testid="sidebar-nav"
    >
      {SECTIONS.map((sec) => (
        <div key={sec.title} className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="label-mono px-3 pb-1 pt-1 text-[9px] text-slate-400 font-semibold tracking-[0.15em]">
              {sec.title}
            </p>
          )}
          {sec.items.map((it) => (
            <NavItem key={it.to} item={it} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ))}

      {/* Footer reference, admin and session links */}
      <div className="mt-auto flex flex-col gap-0.5 border-t border-[#1E2E4A] pt-2.5">
        {refPinned && (
          <div
            title={
              collapsed
                ? refPinned
                  ? `Reference case pinned: ${ref?.case_number || ""}`
                  : "Reference case not pinned"
                : undefined
            }
            className={`group relative flex items-center rounded-lg py-1.5 ${
              collapsed ? "justify-center px-0 mx-1" : "gap-2.5 px-3 mx-1"
            }`}
            data-testid="sidebar-reference-status"
          >
            <Bookmark size={15} className="shrink-0" style={{ color: refPinned ? "#10B981" : "#64748B" }} />
            {!collapsed && (
              <span className="truncate font-mono text-[10px] leading-tight">
                <span className="text-slate-400">Reference case</span>
                <br />
                {ref === null ? (
                  <span className="text-slate-500">checking…</span>
                ) : refPinned ? (
                  <span className="text-emerald-400 font-bold" data-testid="sidebar-ref-pinned">
                    ✓ {ref.case_number || "Pinned"}
                  </span>
                ) : (
                  <span className="text-slate-500" data-testid="sidebar-ref-unpinned">
                    Not configured
                  </span>
                )}
              </span>
            )}
            {collapsed && (
              <Tip label={refPinned ? `Reference: ${ref?.case_number || "pinned"}` : "Reference not pinned"} />
            )}
          </div>
        )}

        {hasRole(user, "admin") && (
          <>
            {!collapsed && (
              <p className="label-mono px-3 pb-1 pt-2 text-[9px] text-slate-400 font-semibold tracking-[0.15em]">
                Admin
              </p>
            )}
            <NavItem
              item={{ to: "/users", label: "Users & Roles", icon: UsersIcon, id: "nav-users-link" }}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
            <NavItem
              item={{
                to: "/admin/security",
                label: "Security Center",
                icon: ShieldCheck,
                id: "nav-admin-security-link",
              }}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </>
        )}

        {!collapsed && (
          <p className="label-mono px-3 pb-1 pt-2 text-[9px] text-slate-400 font-semibold tracking-[0.15em]">
            Session
          </p>
        )}
        <NavItem
          item={{ to: "/billing", label: "Plans & Billing", icon: CreditCard, id: "nav-billing-link" }}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavItem
          item={{ to: "/account", label: "My Account", icon: UserCog, id: "nav-account-sidebar-link" }}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
};

export const Sidebar = ({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => (
  <>
    {/* Desktop Sidebar */}
    <aside
      className={`hidden shrink-0 flex-col border-r md:flex ${
        collapsed ? "w-[68px]" : "w-60"
      } transition-[width] duration-200 z-30 bg-[#0B1528] text-slate-100 border-[#1E2E4A] shadow-xs`}
      data-testid="sidebar-desktop"
    >
      <NavBody collapsed={collapsed} />
      <button
        data-testid="sidebar-collapse-toggle"
        onClick={onToggleCollapse}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center justify-center gap-2 border-t border-[#1E2E4A] py-2.5 text-slate-400 hover:bg-[#162B4D] hover:text-sky-300 transition-colors"
      >
        {collapsed ? (
          <ChevronsRight size={16} />
        ) : (
          <>
            <ChevronsLeft size={16} />
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Collapse Sidebar</span>
          </>
        )}
      </button>
    </aside>

    {/* Mobile Drawer */}
    {mobileOpen && (
      <div className="fixed inset-0 z-50 md:hidden" data-testid="sidebar-mobile-overlay">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCloseMobile} />
        <aside
          className="absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-[#0B1528] text-slate-100 border-[#1E2E4A] shadow-2xl"
          data-testid="sidebar-mobile"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1E2E4A] px-4">
            <span className="flex items-center gap-2 font-display text-base font-bold text-white">
              <Radar size={17} className="text-sky-400" /> Varuna <span className="text-sky-400">Netra</span>
            </span>
            <button
              data-testid="sidebar-mobile-close"
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#162B4D] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <NavBody collapsed={false} onNavigate={onCloseMobile} />
        </aside>
      </div>
    )}
  </>
);
