import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Bell, ChevronDown, Info, Menu, RefreshCw, Target, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LiveBell, CriticalBanner } from "@/components/LiveBell";
import { Sidebar } from "@/components/Sidebar";

const ROLE_COLOR={guest:"#606E88",viewer:"#54DDEE",analyst:"#8CEEF8",supervisor:"#F5B544",admin:"#FB7185"};

const Stat=({label,value,tone="text-mist"})=><div className="flex items-baseline gap-1.5">
  <span className="font-mono text-[10px] uppercase tracking-[.14em] text-mist-faint">{label}</span>
  <span className={`tnum font-display text-[15px] font-bold ${tone}`}>{value}</span>
</div>;

const ContextChip=()=>{
 const loc=useLocation(); const [label,setLabel]=useState("Persian Gulf / Strait of Hormuz");
 useEffect(()=>{let cancel=false; const m=loc.pathname.match(/^\/cases\/([^/]+)/);
  if(m) api.get(`/cases/${m[1]}`).then(r=>{if(!cancel)setLabel(`CASE ${r.data.case_number}`)}).catch(()=>{});
  else api.get("/aoi").then(r=>{if(!cancel){const a=r.data?.aoi;setLabel(a?.name||a?.label||"Persian Gulf / Strait of Hormuz")}}).catch(()=>{});
  return()=>{cancel=true};
 },[loc.pathname]);
 return <div className="relative hidden sm:block">
   <button className="flex h-10 max-w-[290px] items-center gap-2 rounded-xl border border-[color:var(--edge)] bg-white/[.035] px-3 text-[13px] text-mist transition-all hover:border-aqua-400/35 hover:bg-white/[.06]">
     <Target size={16} className="shrink-0 text-aqua-400"/><span className="truncate font-medium">{label}</span><ChevronDown size={15} className="shrink-0 text-mist-faint"/>
   </button>
 </div>
};

export const Layout=()=>{
 const {user,logout}=useAuth(); const nav=useNavigate(); const [clock,setClock]=useState(new Date());
 const [stats,setStats]=useState(null); const [collapsed,setCollapsed]=useState(()=>localStorage.getItem("vn_sidebar_collapsed")==="1"); const [mobileOpen,setMobileOpen]=useState(false);
 useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000); const load=()=>api.get("/dashboard/summary").then(r=>setStats(r.data)).catch(()=>setStats(null)); load(); const s=setInterval(load,15000); return()=>{clearInterval(t);clearInterval(s)}},[]);
 const toggle=()=>setCollapsed(v=>{const n=!v;localStorage.setItem("vn_sidebar_collapsed",n?"1":"0");return n});
 return <div className="vn-shell app-field relative flex h-screen w-full overflow-hidden bg-ink-950 text-mist">
   <div className="pointer-events-none absolute inset-0 grid-field" aria-hidden/>
   <aside className="relative z-30 hidden shrink-0 lg:block"><Sidebar collapsed={collapsed} onToggleCollapse={toggle} mobileOpen={false} onCloseMobile={()=>{}}/></aside>
   <Sidebar collapsed={false} onToggleCollapse={()=>setMobileOpen(false)} mobileOpen={mobileOpen} onCloseMobile={()=>setMobileOpen(false)}/>
   <div className="relative z-10 flex min-w-0 flex-1 flex-col">
     <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center gap-3 border-b border-[color:var(--edge)] bg-ink-950/75 px-4 backdrop-blur-xl sm:px-6">
       <button onClick={()=>setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--edge)] text-mist-muted hover:text-mist lg:hidden"><Menu size={17}/></button>
       <ContextChip/>
       <div className="ml-1 hidden items-center gap-5 xl:flex">
         <Stat label="Active" value={stats?.active_cases??"—"} tone="text-aqua-300"/>
         <Stat label="Pending" value={stats?.pending_review??"—"} tone="text-amber"/>
         <Stat label="Alerts" value={stats?.alerts?.unread??"—"} tone="text-rose"/>
         <Stat label="Imported" value={stats?.demo?.imported??"—"} tone="text-mist-soft"/>
       </div>
       <div className="ml-auto flex items-center gap-2 sm:gap-3">
         <span className="hidden font-mono text-[11.5px] tnum text-mist-muted md:inline">{clock.toISOString().slice(0,19).replace("T"," ")} UTC</span>
         <span className="hidden items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-mint sm:inline-flex"><span className="pulse-emerald"/>Polling<RefreshCw size={12} className="animate-spinSlow"/></span>
         <Link to="/about" className="hidden h-9 items-center gap-1.5 rounded-lg border border-[color:var(--edge)] px-2.5 text-mist-muted hover:border-aqua-400/35 hover:text-mist sm:flex"><Info size={15}/></Link>
         <LiveBell/>
         {user&&<div className="flex items-center gap-2 border-l border-[color:var(--edge)] pl-3">
           <Link to="/account" className="hidden text-right leading-tight sm:block"><div className="text-xs font-semibold text-mist">{user.name}</div><div className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{color:ROLE_COLOR[user.role]||"#8d9ab3"}}>{user.role}</div></Link>
           <button onClick={async()=>{await logout();nav("/login")}} className="rounded-lg p-1.5 text-mist-muted hover:bg-white/[.04] hover:text-rose"><LogOut size={16}/></button>
         </div>}
       </div>
     </header>
     <CriticalBanner/>
     <main className="min-h-0 flex-1 overflow-y-auto"><Outlet/></main>
   </div>
 </div>;
};
