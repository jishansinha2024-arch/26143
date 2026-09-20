import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Anchor, Save, RefreshCw } from "lucide-react";
import { api, apiError, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const REGION_COLOR = { NW: "#b26a00", W: "#c2410c", E: "#007bb9", NE: "#6f4fa8", AN: "#006a61" };
export const icgColor = (code) => REGION_COLOR[code] || "#707881";

export const IcgDistricts = ({ onChanged }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [geom, setGeom] = useState("");
  const [busy, setBusy] = useState(false);
  const admin = hasRole(user, "admin");
  const load = useCallback(() => api.get("/icg/districts").then((r) => setData(r.data)).catch((e) => toast.error(apiError(e))), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const body = { name: edit.name, district_hq: edit.district_hq, active: edit.active };
      if (edit.recipients_text != null) body.recipients = edit.recipients_text.split(",").map((s) => s.trim()).filter(Boolean);
      if (geom.trim()) body.geometry = JSON.parse(geom);
      await api.put(`/icg/districts/${edit.code}`, body);
      toast.success(`${edit.code} updated`); setEdit(null); setGeom(""); await load(); onChanged?.();
    } catch (e) { toast.error(e instanceof SyntaxError ? "Geometry must be valid GeoJSON" : apiError(e)); } finally { setBusy(false); }
  };
  const resolveAll = async () => {
    setBusy(true);
    try { const { data: r } = await api.post("/icg/resolve-all"); toast.success(`Re-routed ${r.routed_to_icg}/${r.cases} cases to ICG districts`); onChanged?.(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  if (!data) return null;
  return (
    <div className="mt-5 rounded border p-4" style={{ borderColor: "rgba(0,106,97,0.4)", background: "rgba(0,106,97,0.04)" }} data-testid="icg-districts">
      <div className="mb-1 flex items-center gap-2"><Anchor size={14} color="#006a61" /><h2 className="font-display font-semibold">Indian Coast Guard alert routing</h2>
        {admin && <button data-testid="btn-icg-resolve-all" disabled={busy} onClick={resolveAll} className="ml-auto inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:text-on-surface disabled:opacity-50" style={bd}><RefreshCw size={10} /> Re-route all cases</button>}
      </div>
      <p className="mb-3 text-[11px] text-amber-300/90" data-testid="icg-disclaimer">{data.disclaimer}. Admins can replace any polygon with an official boundary.</p>
      <div className="grid gap-1.5 md:grid-cols-2" data-testid="icg-district-list">
        {data.districts.map((d) => (
          <div key={d.code} data-testid={`icg-district-${d.code}`} className="flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs" style={{ borderColor: "var(--border-default)", opacity: d.active ? 1 : 0.5 }}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: icgColor(d.region_code) }} />
            <span className="font-mono text-[10px] text-slate-400">{d.code}</span>
            <span className="truncate text-slate-100">{d.name}</span>
            <span className="ml-auto shrink-0 font-mono text-[9px] uppercase text-slate-500">{d.recipients?.length ? `${d.recipients.length} desk email(s) · ` : ""}{d.region_code} · {d.approximate ? "approx" : "official"}</span>
            {admin && <button data-testid={`icg-edit-${d.code}`} onClick={() => { setEdit({ ...d }); setGeom(""); }} className="font-mono text-[10px] text-cyan-300 hover:underline">edit</button>}
          </div>
        ))}
      </div>
      {edit && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded border p-3" style={bd} data-testid="icg-edit-form">
          <input data-testid="icg-edit-name" className={inputCls} style={bd} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <input data-testid="icg-edit-hq" className={inputCls} style={bd} value={edit.district_hq} onChange={(e) => setEdit({ ...edit, district_hq: e.target.value })} placeholder="district HQ" />
          <input data-testid="icg-edit-recipients" className={`${inputCls} col-span-2`} style={bd} value={edit.recipients_text ?? (edit.recipients || []).join(", ")} onChange={(e) => setEdit({ ...edit, recipients_text: e.target.value })} placeholder="district desk alert recipients — emails, comma separated" />
          <textarea data-testid="icg-edit-geometry" className={`${inputCls} col-span-2 h-20`} style={bd} value={geom} onChange={(e) => setGeom(e.target.value)} placeholder='Optional replacement GeoJSON Polygon {"type":"Polygon","coordinates":[...]} — marks the district as official' />
          <label className="flex items-center gap-2 font-mono text-[11px] text-slate-300"><input data-testid="icg-edit-active" type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> active</label>
          <div className="flex justify-end gap-2">
            <button data-testid="icg-edit-cancel" onClick={() => setEdit(null)} className="rounded border px-3 py-1.5 font-mono text-[11px] uppercase text-slate-400" style={bd}>Cancel</button>
            <button data-testid="icg-edit-save" disabled={busy} onClick={save} className="inline-flex items-center gap-1 rounded bg-emerald-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase text-slate-950 disabled:opacity-50"><Save size={11} /> Save</button>
          </div>
        </div>
      )}
    </div>
  );
};
