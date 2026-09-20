import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, Plus, Trash2, Play } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const SEV = { high: "#ba1a1a", medium: "#b26a00", low: "#707881" };
const empty = { name: "", zone_code: "", min_area_km2: "", min_confidence: "", severity: "high", primary_only: false, note: "" };

export const ZoneRules = ({ zones }) => {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const sup = hasRole(user, "supervisor");
  const activeZones = useMemo(() => zones.filter((z) => z.active), [zones]);
  const activeRules = useMemo(() => rules.filter((r) => r.active).length, [rules]);
  const load = () => api.get("/zone-rules").then((r) => setRules(r.data)).catch((e) => toast.error(apiError(e)));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      await api.post("/zone-rules", { ...f, min_area_km2: f.min_area_km2 === "" ? null : +f.min_area_km2, min_confidence: f.min_confidence === "" ? null : +f.min_confidence, note: f.note || null });
      toast.success("Zone rule created"); setF(empty); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const toggle = async (r) => { try { await api.patch(`/zone-rules/${r.id}`, { active: !r.active }); load(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (r) => { try { await api.delete(`/zone-rules/${r.id}`); toast.success("Rule deleted"); load(); } catch (e) { toast.error(apiError(e)); } };
  const evaluate = async () => {
    setBusy(true);
    try { const { data } = await api.post("/zone-rules/evaluate"); toast.success(`Evaluated ${data.cases} cases · ${data.alerts_raised} new alert(s)`); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mt-5 rounded border p-4" style={{ borderColor: "rgba(194,65,12,0.4)", background: "rgba(194,65,12,0.04)" }} data-testid="zone-rules">
      <div className="mb-2 flex items-center gap-2"><BellRing size={14} color="#c2410c" /><h2 className="font-display font-semibold">Zone alert rules</h2><span className="ml-auto font-mono text-[10px] text-slate-500">{activeRules} active</span></div>
      <p className="mb-3 text-[11px] text-slate-400">Any spill inside the chosen zone raises an alert (and emails supervisors) when it meets the optional thresholds. Evaluated when a case opens and after each correlation run.</p>
      <div className="space-y-2" data-testid="zone-rules-list">
        {rules.map((r) => (
          <div key={r.id} data-testid={`zone-rule-${r.id}`} className="rounded border p-2.5 text-xs" style={{ borderColor: "var(--border-default)", opacity: r.active ? 1 : 0.5 }}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: SEV[r.severity] }}>{r.severity}</span>
              <span className="font-display font-semibold">{r.name}</span>
              <span className="font-mono text-cyan-300">{r.zone_code}</span>
              {sup && <span className="ml-auto flex items-center gap-1">
                <button data-testid={`zone-rule-toggle-${r.id}`} onClick={() => toggle(r)} className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-400 hover:text-amber-300">{r.active ? "disable" : "enable"}</button>
                <button data-testid={`zone-rule-delete-${r.id}`} onClick={() => remove(r)} className="rounded p-1 text-slate-400 hover:text-rose-400"><Trash2 size={12} /></button>
              </span>}
            </div>
            <div className="mt-1 font-mono text-[10px] text-slate-400">
              {r.min_area_km2 != null ? `area ≥ ${r.min_area_km2} km²` : "any area"} · {r.min_confidence != null ? `confidence ≥ ${r.min_confidence}` : "any confidence"}{r.primary_only ? " · primary jurisdiction only" : ""} · hits {r.hits}{r.last_hit_case ? ` (last ${r.last_hit_case} ${fmtTime(r.last_hit_at)})` : ""}
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-xs text-slate-500" data-testid="zone-rules-empty">No rules yet.</p>}
      </div>
      {sup && (
        <div className="mt-3 grid grid-cols-2 gap-2" data-testid="zone-rule-form">
          <input data-testid="rule-name-input" placeholder="rule name" className={inputCls} style={bd} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <select data-testid="rule-zone-select" className={inputCls} style={bd} value={f.zone_code} onChange={(e) => setF({ ...f, zone_code: e.target.value })}>
            <option value="">— zone —</option>{activeZones.map((z) => <option key={z.code} value={z.code}>{z.code} · {z.name}</option>)}
          </select>
          <input data-testid="rule-min-area-input" type="number" min="0" step="0.1" placeholder="min area km² (optional)" className={inputCls} style={bd} value={f.min_area_km2} onChange={(e) => setF({ ...f, min_area_km2: e.target.value })} />
          <input data-testid="rule-min-confidence-input" type="number" min="0" max="1" step="0.05" placeholder="min detection confidence 0–1 (optional)" className={inputCls} style={bd} value={f.min_confidence} onChange={(e) => setF({ ...f, min_confidence: e.target.value })} />
          <select data-testid="rule-severity-select" className={inputCls} style={bd} value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>{["high", "medium", "low"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <label className="flex items-center gap-2 font-mono text-[11px] text-slate-300"><input data-testid="rule-primary-only-toggle" type="checkbox" checked={f.primary_only} onChange={(e) => setF({ ...f, primary_only: e.target.checked })} /> primary jurisdiction only</label>
          <input data-testid="rule-note-input" placeholder="note shown in the alert (optional)" className={`${inputCls} col-span-2`} style={bd} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <div className="col-span-2 flex items-center gap-2">
            <button data-testid="btn-create-rule" disabled={busy || f.name.trim().length < 2 || !f.zone_code} onClick={create} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50" style={{ background: "#c2410c" }}><Plus size={12} /> Create rule</button>
            <button data-testid="btn-evaluate-rules" disabled={busy} onClick={evaluate} className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:text-on-surface disabled:opacity-50" style={bd}><Play size={12} /> Evaluate existing cases</button>
          </div>
        </div>
      )}
    </div>
  );
};
