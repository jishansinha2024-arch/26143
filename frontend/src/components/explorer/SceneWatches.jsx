import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Radar, Trash2, Play } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };

export const SceneWatches = ({ bbox, collection }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const sup = hasRole(user, "supervisor");
  const load = () => api.get("/scene-watches").then((r) => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async () => {
    setBusy(true);
    try { await api.post("/scene-watches", { name, bbox, collection, auto_detect: auto }); toast.success(`Scene watch "${name}" saved — polled every 3 h`); setName(""); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const run = async (w) => { setBusy(true); try { const { data } = await api.post(`/scene-watches/${w.id}/run?sync=true`, null, { timeout: 180000 }); const r = data.result?.watches?.[0]; toast.success(r ? `${r.watch}: ${r.searched} passes found, ${r.registered.length} new registered` : "Poll finished"); load(); } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); } };
  const toggle = async (w) => { try { await api.patch(`/scene-watches/${w.id}`, { active: !w.active }); load(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (w) => { try { await api.delete(`/scene-watches/${w.id}`); load(); } catch (e) { toast.error(apiError(e)); } };
  return (
    <div className="border-t p-4" style={{ borderColor: "var(--border-default)" }} data-testid="scene-watches">
      <div className="mb-1 flex items-center gap-2"><Radar size={13} color="#b26a00" /><span className="font-display text-sm font-semibold">Auto Scene Watch</span><span className="ml-auto font-mono text-[10px] text-slate-500">cron every 3 h</span></div>
      <p className="mb-2 text-[11px] text-slate-400">Saved regions are polled for new passes; new scenes are registered, optionally run through the experimental detector, and raise a <span className="font-mono">new_scene</span> alert.</p>
      <div className="space-y-1.5" data-testid="scene-watches-list">
        {rows.map((w) => (
          <div key={w.id} data-testid={`scene-watch-${w.id}`} className="rounded border p-2 text-[11px]" style={{ borderColor: "var(--border-default)", opacity: w.active ? 1 : 0.5 }}>
            <div className="flex items-center gap-2"><span className="font-display font-semibold">{w.name}</span><span className="font-mono text-[10px] text-slate-500">{w.collection}{w.auto_detect ? " · auto-detect" : ""}</span>
              {sup && <span className="ml-auto flex gap-1"><button data-testid={`scene-watch-run-${w.id}`} disabled={busy} onClick={() => run(w)} title="Poll now" className="rounded p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-40"><Play size={11} /></button><button data-testid={`scene-watch-toggle-${w.id}`} onClick={() => toggle(w)} className="rounded px-1.5 font-mono text-[10px] text-slate-400 hover:text-amber-300">{w.active ? "pause" : "resume"}</button><button data-testid={`scene-watch-delete-${w.id}`} onClick={() => remove(w)} className="rounded p-1 text-slate-400 hover:text-rose-400"><Trash2 size={11} /></button></span>}</div>
            <div className="font-mono text-[10px] text-slate-500">bbox {w.bbox.join(", ")} · {w.scenes_registered} scenes · last poll {fmtTime(w.last_polled)}</div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-[11px] text-slate-500" data-testid="scene-watches-empty">No regions watched yet.</p>}
      </div>
      {sup && (
        <div className="mt-2 flex items-center gap-2">
          <input data-testid="scene-watch-name-input" className={inputCls} style={bd} value={name} onChange={(e) => setName(e.target.value)} placeholder="watch name for current map view" />
          <label className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-slate-300"><input type="checkbox" data-testid="scene-watch-auto-toggle" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> detect</label>
          <button data-testid="btn-create-scene-watch" disabled={busy || name.trim().length < 2 || !bbox} onClick={create} className="shrink-0 rounded px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50" style={{ background: "#b26a00" }}>Watch this view</button>
        </div>
      )}
    </div>
  );
};
