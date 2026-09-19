import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Radar, LayoutDashboard, Satellite, Globe2, Images, ShieldAlert, Eye, Columns2,
  BookOpen, Map as MapIcon, HeartPulse, Users as UsersIcon, Bookmark, UserCog,
  BadgeCheck, ShieldCheck, CreditCard, ChevronsLeft, ChevronsRight, X, Info
} from "lucide-react";
import { api, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SECTIONS = [
  { title:"Operations", items:[
    {to:"/",label:"Surveillance",icon:LayoutDashboard,id:"nav-dashboard-link",end:true},
    {to:"/ingest",label:"Ingestion",icon:Satellite,id:"nav-ingest-link"},
    {to:"/explorer",label:"Scene Explorer",icon:Globe2,id:"nav-explorer-link"},
    {to:"/events",label:"Events",icon:Images,id:"nav-events-link"}]},
  { title:"Investigation", items:[
    {to:"/alerts",label:"Alerts",icon:ShieldAlert,id:"nav-alerts-link"},
    {to:"/watchlist",label:"Watchlist",icon:Eye,id:"nav-watchlist-link"},
    {to:"/compare",label:"Compare",icon:Columns2,id:"nav-compare-link"}]},
  { title:"Intelligence", items:[
    {to:"/archive",label:"Archive",icon:BookOpen,id:"nav-archive-link"},
    {to:"/zones",label:"Zones / Jurisdictions",icon:MapIcon,id:"nav-zones-link"},
    {to:"/validation",label:"Validation",icon:BadgeCheck,id:"nav-validation-link"},
    {to:"/health",label:"Data Sources",icon:HeartPulse,id:"nav-health-link"}]}
];

const Tip=({label})=><span className="pointer-events-none absolute left-full z-50 ml-2.5 hidden whitespace-nowrap rounded-xl border border-[color:var(--edge)] bg-ink-800 px-3 py-1.5 font-mono text-[10.5px] text-mist shadow-panel group-hover:block">{label}</span>;

const NavItem=({item,collapsed,onNavigate})=>{
  const Icon=item.icon;
  return <NavLink to={item.to} end={item.end} data-testid={item.id} onClick={onNavigate}
    title={collapsed?item.label:undefined}
    className={({isActive})=>`group relative flex h-11 items-center rounded-xl text-[13.5px] font-medium transition-all duration-150 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400/60 ${collapsed?"mx-1 justify-center":"mx-0 gap-3 px-3"} ${isActive?"text-mist":"text-mist-muted hover:bg-white/[.045] hover:text-mist"}`}>
    {({isActive})=><>
      {isActive&&<span className="absolute inset-0 rounded-xl border border-aqua-400/25 bg-aqua-500/[.12]"/>}
      <Icon size={18} className={`relative z-10 shrink-0 ${isActive?"text-aqua-300":"text-mist-faint group-hover:text-mist-soft"}`}/>
      {!collapsed&&<span className="relative z-10 truncate tracking-[-.01em]">{item.label}</span>}
      {collapsed&&<Tip label={item.label}/>}
    </>}
  </NavLink>;
};

const NavBody=({collapsed,onNavigate})=>{
  const {user}=useAuth(); const [ref,setRef]=useState(null);
  useEffect(()=>{api.get("/demo/reference").then(r=>setRef(r.data)).catch(()=>setRef(null))},[]);
  const pinned=ref?.pinned&&ref?.available;
  return <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-5" data-testid="sidebar-nav">
    {SECTIONS.map(sec=><div key={sec.title} className="mb-6">
      {!collapsed&&<p className="eyebrow mb-2 px-3 text-[10px]">{sec.title}</p>}
      <div className="space-y-1">{sec.items.map(it=><NavItem key={it.to} item={it} collapsed={collapsed} onNavigate={onNavigate}/>)}</div>
    </div>)}
    <div className="mt-auto border-t border-[color:var(--edge)] pt-3">
      {pinned&&<div className={`mb-2 flex items-center rounded-xl py-2 text-[11px] ${collapsed?"justify-center":"gap-2.5 px-3"}`}><Bookmark size={15} className="text-mint"/>{!collapsed&&<span className="font-mono text-[10px]"><span className="text-mist-faint">Reference case</span><br/><span className="font-bold text-mint">✓ {ref?.case_number||"Pinned"}</span></span>}</div>}
      {hasRole(user,"admin")&&<>
        {!collapsed&&<p className="eyebrow px-3 pb-2 pt-2 text-[9px]">Admin</p>}
        <NavItem item={{to:"/users",label:"Users & Roles",icon:UsersIcon,id:"nav-users-link"}} collapsed={collapsed} onNavigate={onNavigate}/>
        <NavItem item={{to:"/admin/security",label:"Security Center",icon:ShieldCheck,id:"nav-admin-security-link"}} collapsed={collapsed} onNavigate={onNavigate}/>
      </>}
      {!collapsed&&<p className="eyebrow px-3 pb-2 pt-3 text-[9px]">Session</p>}
      <NavItem item={{to:"/billing",label:"Plans & Billing",icon:CreditCard,id:"nav-billing-sidebar-link"}} collapsed={collapsed} onNavigate={onNavigate}/>
      <NavItem item={{to:"/account",label:"My Account",icon:UserCog,id:"nav-account-sidebar-link"}} collapsed={collapsed} onNavigate={onNavigate}/>
    </div>
  </nav>;
};

export const Sidebar=({collapsed,onToggleCollapse,mobileOpen,onCloseMobile})=><>
  <aside className={`relative hidden h-full shrink-0 flex-col border-r border-[color:var(--edge)] bg-ink-900/80 backdrop-blur-xl transition-[width] duration-200 ease-premium lg:flex ${collapsed?"w-[76px]":"w-[246px]"}`} data-testid="sidebar-desktop">
    <div className={`flex h-[68px] shrink-0 items-center border-b border-[color:var(--edge)] ${collapsed?"justify-center px-0":"px-5"}`}>
      <NavLink to="/" className="flex items-center gap-3">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-aqua-400/30 bg-gradient-to-br from-aqua-500/25 to-iris-500/20 shadow-glowAqua">
          <span className="absolute inset-[7px] rounded-full border border-aqua-300/55"/>
          <span className="absolute inset-[7px] rounded-full border-t-2 border-t-aqua-300 animate-spinSlow"/>
          <span className="h-1.5 w-1.5 rounded-full bg-aqua-300 shadow-[0_0_10px_3px_rgba(84,221,238,.5)]"/>
        </span>
        {!collapsed&&<span className="leading-none"><span className="block font-display text-[17px] font-extrabold tracking-[-.025em] text-mist">Varuna <span className="text-aqua-400">Netra</span></span><span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[.18em] text-mist-faint">Maritime domain awareness</span></span>}
      </NavLink>
    </div>
    <NavBody collapsed={collapsed}/>
    <button onClick={onToggleCollapse} data-testid="sidebar-collapse-toggle" className={`flex h-14 shrink-0 items-center gap-2 border-t border-[color:var(--edge)] font-mono text-[10.5px] uppercase tracking-[.15em] text-mist-faint transition-colors hover:bg-white/[.04] hover:text-mist-soft ${collapsed?"justify-center":"px-6"}`}>
      {collapsed?<ChevronsRight size={16}/>:<><ChevronsLeft size={16}/><span>Collapse</span></>}
    </button>
  </aside>
  {mobileOpen&&<div className="fixed inset-0 z-50 lg:hidden" data-testid="sidebar-mobile-overlay">
    <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onCloseMobile}/>
    <aside className="absolute inset-y-0 left-0 flex w-[246px] flex-col border-r border-[color:var(--edge)] bg-ink-900 shadow-panel" data-testid="sidebar-mobile">
      <div className="flex h-[68px] items-center justify-between border-b border-[color:var(--edge)] px-5">
        <div className="flex items-center gap-3 font-display font-bold text-mist"><Radar size={20} className="text-aqua-400"/>Varuna <span className="text-aqua-400">Netra</span></div>
        <button onClick={onCloseMobile} className="rounded-lg p-1.5 text-mist-muted hover:text-mist"><X size={18}/></button>
      </div>
      <NavBody collapsed={false} onNavigate={onCloseMobile}/>
    </aside>
  </div>}
</>;
