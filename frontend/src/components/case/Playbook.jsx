import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, LifeBuoy, Droplets, FlaskConical, CalendarClock, MapPin } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";

const Flag = ({ ok, label, reason }) => (
  <div className="flex items-start gap-2 text-xs" data-testid={`playbook-${label.replace(/\s/g, "-").toLowerCase()}`}>
    <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: ok ? "#006a61" : "#ba1a1a", border: "1px solid currentColor" }}>{ok ? "suitable" : "not suitable"}</span>
    <span><span className="font-semibold text-slate-100">{label}</span> <span className="text-slate-400">— {reason}</span></span>
  </div>
);

export const Playbook = ({ caseId }) => {
  const [pb, setPb] = useState(null);
  useEffect(() => { api.get(`/cases/${caseId}/playbook`).then((r) => setPb(r.data)).catch((e) => toast.error(apiError(e))); }, [caseId]);
  if (!pb) return <p className="p-4 font-mono text-xs text-slate-500">Building remediation playbook…</p>;
  const i = pb.inputs;
  const [t1, t2, t3] = pb.tiers;
  return (
    <div className="space-y-4 p-4" data-testid="playbook-panel">
      <div className="rounded border px-3 py-2 text-[11px]" style={{ borderColor: "rgba(178,106,0,0.5)", background: "repeating-linear-gradient(135deg, rgba(178,106,0,0.06) 0 8px, transparent 8px 16px)" }} data-testid="playbook-advisory">
        <span className="font-mono font-bold uppercase tracking-[0.2em] text-amber-300">Advisory</span> <span className="text-slate-300">{pb.disclaimer}</span> <span className="font-mono text-slate-500">· {pb.version}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 font-mono text-[11px]" data-testid="playbook-inputs">
        {[["area", `${i.area_km2} km²`], ["volume (thin/thick)", `${i.estimated_volume_tonnes.thin} / ${i.estimated_volume_tonnes.thick} t`], ["coast distance", `${i.coast_distance_km} km`], ["depth class", i.depth_class],
          ["wind / sea", `${i.wind_ms ?? "—"} m/s · ${i.sea_state ?? "unknown"}`], ["drift", i.drift_bearing_deg != null ? `${i.drift_speed_ms} m/s → ${i.drift_bearing_deg}°` : "no forcing"], ["ETA coast", i.eta_to_coast_hours != null ? `${i.eta_to_coast_hours} h` : "—"], ["jurisdiction", i.primary_jurisdiction || "—"]].map(([l, v]) => (
          <div key={l} className="rounded border p-2" style={{ borderColor: "var(--border-default)" }}><div className="label-mono">{l}</div><div className="text-slate-100">{v}</div></div>))}
      </div>
      <section className="rounded border p-3" style={{ borderColor: "rgba(186,26,26,0.5)" }} data-testid="playbook-tier1">
        <div className="mb-1 flex items-center gap-2"><LifeBuoy size={13} color="#ba1a1a" /><span className="font-display text-sm font-semibold">Tier 1 · {t1.title}</span><span className="ml-auto font-mono text-[10px] uppercase text-rose-300">{t1.priority}</span></div>
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-300">{t1.actions.map((a) => <li key={a}>{a}</li>)}</ul>
        {t1.constraints.map((c) => <p key={c} className="mt-1 text-[11px] text-amber-300">{c}</p>)}
        {pb.tactical_coordinates.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[10px]" data-testid="playbook-tactical">
            {pb.tactical_coordinates.map((c) => <div key={c.id} className="flex items-center gap-1.5 rounded bg-slate-900/60 px-2 py-1"><MapPin size={10} color="#b26a00" /><span className="text-amber-300">{c.id}</span> {c.lat.toFixed(4)}, {c.lon.toFixed(4)} <span className="text-slate-500">· {c.role}</span></div>)}
          </div>)}
      </section>
      <section className="rounded border p-3 space-y-1.5" style={{ borderColor: "rgba(111,79,168,0.5)" }} data-testid="playbook-tier2">
        <div className="mb-1 flex items-center gap-2"><FlaskConical size={13} color="#6f4fa8" /><span className="font-display text-sm font-semibold">Tier 2 · {t2.title}</span></div>
        <Flag ok={t2.dispersant.suitable} label="Chemical dispersant" reason={`${t2.dispersant.reason}. ${t2.dispersant.note}`} />
        <Flag ok={t2.in_situ_burning.suitable} label="In-situ burning" reason={t2.in_situ_burning.reason} />
        <Flag ok={t2.bioremediation.suitable} label="Bioremediation" reason={t2.bioremediation.reason} />
      </section>
      <section className="rounded border p-3" style={{ borderColor: "rgba(0,106,97,0.5)" }} data-testid="playbook-tier3">
        <div className="mb-1 flex items-center gap-2"><CalendarClock size={13} color="#006a61" /><span className="font-display text-sm font-semibold">Tier 3 · {t3.title}</span></div>
        <div className="space-y-0.5 text-xs">{t3.schedule.map((s) => <div key={s.when} className="flex gap-2"><span className="w-32 shrink-0 font-mono text-[10px] text-slate-500">{fmtTime(s.when)}</span><span className="text-slate-300">{s.task}</span></div>)}</div>
      </section>
      <p className="flex items-center gap-1 text-[10px] text-slate-500"><Droplets size={10} /> Volume = area × assumed thickness (0.1 / 1 / 10 µm) × 0.9 t/m³; coast distance from 1-km land mask; depth class inferred from distance — refine with bathymetry. <BookOpen size={10} className="ml-2" /> See Precedents for comparable incidents.</p>
    </div>
  );
};
