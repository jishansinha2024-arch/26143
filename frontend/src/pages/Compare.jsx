import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ShieldCheck, Radar, Ship, MapPin } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";

const fields=[
 ["Acquired (UTC)",c=>c.acquisition_time?new Date(c.acquisition_time).toISOString().replace("T"," ").slice(0,19)+"Z":"—"],
 ["Source",c=>c.source||"dark_spot_detector"],
 ["Jurisdiction",c=>c.primary_jurisdiction?.code||c.jurisdiction||"—"],
 ["Detector confidence",c=>`${Math.round((c.detection_confidence||c.confidence||0)*100)}%`],
 ["Slick area",c=>c.area_km2!=null?`${c.area_km2} km²`:"—"],
 ["Candidate vessels",c=>String(c.candidate_vessels_count??c.candidates_count??"—")],
 ["Provenance",c=>c.origin||c.provenance||"real"]
];

function RadarDecor({side}){return <div className={`pointer-events-none absolute -top-10 ${side==="left"? "-left-10":"-right-10"} h-32 w-32 opacity-50`}>
 <div className="absolute inset-0 rounded-full border border-aqua-300/30"/><div className="absolute inset-5 rounded-full border border-aqua-300/25"/><div className="absolute inset-10 rounded-full border border-aqua-300/20"/><div className="absolute left-1/2 top-1/2 h-px w-full origin-left bg-aqua-300/30"/>
</div>}

function CasePanel({value,onChange,c,side,cases}) {
 const confidence=c?Math.round((c.detection_confidence||c.confidence||0)*100):0;
 return <section className="surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
  <RadarDecor side={side}/>
  <div className="relative">
   <select value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-[color:var(--edge)] bg-ink-950/70 px-4 py-3 font-mono text-[12px] text-mist outline-none focus:border-aqua-400/40">
    <option value="">Select case</option>{cases.map(x=><option key={x.id} value={x.id}>{x.case_number||x.id}</option>)}
   </select>
   {c?<><div className="mt-7 font-display text-[46px] font-extrabold leading-none tracking-[-.045em] text-mist">{confidence}%</div>
    <div className="mt-2 font-mono text-[10.5px] uppercase tracking-[.12em] text-mist-faint">detector confidence</div>
    <div className="mt-5"><StatusBadge status={c.attribution_status||"indeterminate"}/></div>
    <dl className="mt-6 space-y-3">{fields.map(([label,fn])=><div key={label} className="flex items-start justify-between gap-4 border-b border-[color:var(--edge)] pb-3 text-[13px] last:border-0"><dt className="font-mono text-[10.5px] uppercase tracking-[.12em] text-mist-faint">{label}</dt><dd className="max-w-[55%] text-right text-mist-soft">{fn(c)}</dd></div>)}</dl>
    <div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-mist-faint"><Radar size={13} className="text-aqua-400"/> evidence chain linked</div>
   </>:<div className="grid min-h-[360px] place-items-center text-sm text-mist-faint">Select a case to inspect.</div>}
  </div>
 </section>
}

export default function Compare(){
 const [sp,setSp]=useSearchParams(); const [cases,setCases]=useState([]); const [data,setData]=useState(null);
 const a=sp.get("a")||""; const b=sp.get("b")||"";
 useEffect(()=>{api.get("/cases?limit=1000").then(r=>{const cs=r.data||[];setCases(cs);if(!a&&cs[0]){const n=new URLSearchParams(sp);n.set("a",cs[0].id);setSp(n,{replace:true})}if(!b&&cs[1]){const n=new URLSearchParams(navigatorURL(sp));n.set("b",cs[1].id);setSp(n,{replace:true})}}).catch(e=>toast.error(apiError(e)))},[]);
 useEffect(()=>{if(!a||!b||a===b){setData(null);return}api.get(`/cases/compare/${a}/${b}`).then(r=>setData(r.data)).catch(e=>toast.error(apiError(e)))},[a,b]);
 const set=(k,v)=>{const n=new URLSearchParams(sp);n.set(k,v);setSp(n)};
 const ca=data?.a?.case||cases.find(x=>x.id===a); const cb=data?.b?.case||cases.find(x=>x.id===b);
 return <div className="vn-page min-h-full">
   <div className="mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl"><p className="eyebrow">Side-by-side adjudication</p><h1 className="mt-2.5 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-.035em] text-mist sm:text-[42px]">Compare</h1><p className="mt-3 text-[14.5px] leading-relaxed text-mist-muted">Put two cases against each other to sanity-check detector output before promoting an attribution.</p></div>
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[.12em] text-mist-faint"><ShieldCheck size={14} className="text-aqua-400"/> Analyst review surface</div>
    </div>
    <div className="mt-8 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <CasePanel value={a} onChange={v=>set("a",v)} c={ca} side="left" cases={cases}/>
      <div className="hidden self-center lg:block"><button onClick={()=>{const n=new URLSearchParams(sp);n.set("a",b);n.set("b",a);setSp(n)}} className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--edge)] bg-white/[.04] text-mist-muted transition-all hover:rotate-180 hover:border-aqua-400/40 hover:text-aqua-300" aria-label="Swap cases"><ArrowLeftRight size={16}/></button></div>
      <CasePanel value={b} onChange={v=>set("b",v)} c={cb} side="right" cases={cases}/>
    </div>
    {data&&<div className="mt-5 surface rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Shared candidate vessels</p><h2 className="mt-1 font-display text-lg font-bold text-mist">{data.shared_vessels?.length||0} shared vessel{(data.shared_vessels?.length||0)===1?"":"s"}</h2></div><span className="font-mono text-[10px] uppercase tracking-[.12em] text-mist-faint">correlation evidence</span></div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{(data.shared_vessels||[]).map(v=><div key={v.mmsi} className="rounded-xl border border-amber/25 bg-amber/[.05] p-3"><div className="flex items-center gap-2"><Ship size={14} className="text-amber"/><span className="font-display font-semibold text-mist">{v.vessel_name||"UNKNOWN"}</span><span className="font-mono text-[10px] text-mist-faint">{v.mmsi}</span><span className="ml-auto text-xs text-amber">{Number(v.score||0).toFixed(2)}</span></div></div>)}</div>
    </div>}
   </div>
 </div>
}
function navigatorURL(sp){return new URLSearchParams(sp)}
