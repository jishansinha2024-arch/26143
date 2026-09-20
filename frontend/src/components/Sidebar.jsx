import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const Icon = ({ name, className = "" }) => <span className={`material-symbols-outlined shrink-0 text-[20px] ${className}`}>{name}</span>;

const SECTIONS = [
  { title: "Operations", items: [
    { to: "/", label: "Surveillance", icon: "radar", id: "nav-dashboard-link", end: true },
    { to: "/ingest", label: "Ingestion", icon: "satellite_alt", id: "nav-ingest-link" },
    { to: "/explorer", label: "Scene Explorer", icon: "travel_explore", id: "nav-explorer-link" },
    { to: "/events", label: "Events", icon: "photo_library", id: "nav-events-link" },
  ] },
  { title: "Investigation", items: [
    { to: "/alerts", label: "Alerts", icon: "policy", id: "nav-alerts-link" },
    { to: "/watchlist", label: "Watchlist", icon: "visibility", id: "nav-watchlist-link" },
    { to: "/compare", label: "Compare", icon: "compare", id: "nav-compare-link" },
  ] },
  { title: "Intelligence", items: [
    { to: "/archive", label: "Archive", icon: "inventory_2", id: "nav-archive-link" },
    { to: "/zones", label: "Zones / Jurisdictions", icon: "map", id: "nav-zones-link" },
    { to: "/validation", label: "Validation", icon: "verified", id: "nav-validation-link" },
    { to: "/health", label: "Data Sources", icon: "monitor_heart", id: "nav-health-link" },
  ] },
];

const itemBase = "group relative flex items-center rounded-lg py-2 font-label-lg text-label-lg outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/50";
const itemState = (isActive) => (isActive ? "bg-primary-container text-on-primary-container font-semibold" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface");

const Tip = ({ label }) => (
  <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-inverse-surface px-2 py-1 font-code-telemetry-sm text-code-telemetry-sm text-inverse-on-surface shadow-lg group-hover:block group-focus-visible:block">{label}</span>
);

const NavItem = ({ item, collapsed, onNavigate }) => (
  <NavLink to={item.to} end={item.end} data-testid={item.id} onClick={onNavigate} title={collapsed ? item.label : undefined}
    className={({ isActive }) => `${itemBase} ${itemState(isActive)} ${collapsed ? "justify-center px-0" : "gap-space-md px-space-md"}`}>
    <Icon name={item.icon} />
    {!collapsed && <span className="truncate">{item.label}</span>}
    {collapsed && <Tip label={item.label} />}
  </NavLink>
);

const SectionLabel = ({ children }) => <p className="px-space-md pb-space-xs pt-space-xs font-label-md text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">{children}</p>;

const NavBody = ({ collapsed, onNavigate }) => {
  const { user } = useAuth();
  const [ref, setRef] = useState(null);
  useEffect(() => { api.get("/demo/reference").then((r) => setRef(r.data)).catch(() => setRef(null)); }, []);
  const refPinned = ref?.pinned && ref?.available;

  return (
    <nav className="flex flex-1 flex-col gap-space-md overflow-y-auto overflow-x-hidden px-space-sm py-space-md [&::-webkit-scrollbar]:w-1.5" data-testid="sidebar-nav">
      {SECTIONS.map((sec) => (
        <div key={sec.title} className="flex flex-col gap-1">
          {!collapsed && <SectionLabel>{sec.title}</SectionLabel>}
          {sec.items.map((it) => <NavItem key={it.to} item={it} collapsed={collapsed} onNavigate={onNavigate} />)}
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-1 border-t border-surface-container-high pt-space-md">
        {refPinned && (
          <div title={collapsed ? `Reference case pinned: ${ref?.case_number || ""}` : undefined}
            className={`group relative mb-space-xs flex items-center rounded-xl bg-surface-container-low py-space-sm ${collapsed ? "justify-center px-0" : "gap-space-md px-space-md"}`} data-testid="sidebar-reference-status">
            <Icon name="bookmark_added" className="text-secondary" />
            {!collapsed && (
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="font-label-md text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">Reference case</span>
                <span className="truncate font-code-telemetry-sm text-code-telemetry-sm font-semibold text-secondary" data-testid="sidebar-ref-pinned">✓ {ref.case_number || "Pinned"}</span>
              </span>
            )}
            {collapsed && <Tip label={`Reference: ${ref?.case_number || "pinned"}`} />}
          </div>
        )}

        {hasRole(user, "admin") && (
          <>
            {!collapsed && <SectionLabel>Admin</SectionLabel>}
            <NavItem item={{ to: "/users", label: "Users & Roles", icon: "group", id: "nav-users-link" }} collapsed={collapsed} onNavigate={onNavigate} />
            <NavItem item={{ to: "/admin/security", label: "Security Center", icon: "verified_user", id: "nav-admin-security-link" }} collapsed={collapsed} onNavigate={onNavigate} />
          </>
        )}
        {!collapsed && <SectionLabel>Session</SectionLabel>}
        <NavItem item={{ to: "/billing", label: "Plans & Billing", icon: "credit_card", id: "nav-billing-link" }} collapsed={collapsed} onNavigate={onNavigate} />
        <NavItem item={{ to: "/account", label: "Account", icon: "manage_accounts", id: "nav-account-sidebar-link" }} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </nav>
  );
};

export const Sidebar = ({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => (
  <>
    {/* Desktop */}
    <aside className={`hidden shrink-0 flex-col bg-surface-container-lowest shadow-[1px_0_8px_rgba(0,0,0,0.04)] md:flex ${collapsed ? "w-[68px]" : "w-64"} z-30 transition-[width] duration-200`} data-testid="sidebar-desktop">
      <NavBody collapsed={collapsed} />
      <button data-testid="sidebar-collapse-toggle" onClick={onToggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center justify-center gap-2 border-t border-surface-container-high py-2.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
        <Icon name={collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"} className="!text-[18px]" />
        {!collapsed && <span className="font-label-md text-label-md font-semibold uppercase tracking-wider">Collapse</span>}
      </button>
    </aside>

    {/* Mobile drawer */}
    {mobileOpen && (
      <div className="fixed inset-0 z-50 md:hidden" data-testid="sidebar-mobile-overlay">
        <div className="absolute inset-0 bg-inverse-surface/50" onClick={onCloseMobile} />
        <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface-container-lowest shadow-2xl" data-testid="sidebar-mobile">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-surface-container-high px-space-lg">
            <span className="flex items-center gap-space-sm font-headline-sm text-headline-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-on-primary"><span className="material-symbols-outlined text-[20px]">radar</span></span> VARUNA NETRA</span>
            <button data-testid="sidebar-mobile-close" onClick={onCloseMobile} aria-label="Close menu" className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined text-[20px]">close</span></button>
          </div>
          <NavBody collapsed={false} onNavigate={onCloseMobile} />
        </aside>
      </div>
    )}
  </>
);
