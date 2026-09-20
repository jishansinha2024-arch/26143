import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, Plus, Trash2, Ship } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const SEV = { high: "#ba1a1a", medium: "#b26a00", low: "#707881" };

export default function Watchlist() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ mmsi: "", vessel_name: "", reason: "", severity: "high" });
  const [busy, setBusy] = useState(false);
  const sup = hasRole(user, "supervisor");
  const load = () => api.get("/watchlist").then((r) => setRows(r.data)).catch((e) => toast.error(apiError(e)));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setBusy(true);
    try { await api.post("/watchlist", { ...f, vessel_name: f.vessel_name || null }); toast.success(`MMSI ${f.mmsi} added to watchlist`); setF({ mmsi: "", vessel_name: "", reason: "", severity: "high" }); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const remove = async (w) => { try { await api.delete(`/watchlist/${w.id}`); toast.success("Removed from watchlist"); load(); } catch (e) { toast.error(apiError(e)); } };
  const active = rows.filter((r) => r.active);
  const past = rows.filter((r) => !r.active);

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="watchlist-page">
      <div className="mb-6">
        <p className="label-mono mb-1">Vessels of interest · any new case naming them raises an immediate alert</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Watchlist</h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {sup ? (
          <div className="panel p-5 fade-up" data-testid="watchlist-form">
            <div className="mb-4 flex items-center gap-2"><Eye size={16} color="#ba1a1a" /><h2 className="font-display text-lg font-semibold">Flag a vessel</h2></div>
            <div className="space-y-2.5">
              <label className="block"><span className="label-mono mb-1 block">MMSI</span><input data-testid="watchlist-mmsi-input" className={inputCls} style={bd} value={f.mmsi} onChange={(e) => setF({ ...f, mmsi: e.target.value })} /></label>
              <label className="block"><span className="label-mono mb-1 block">Vessel name (optional, auto from AIS)</span><input data-testid="watchlist-name-input" className={inputCls} style={bd} value={f.vessel_name} onChange={(e) => setF({ ...f, vessel_name: e.target.value })} /></label>
              <label className="block"><span className="label-mono mb-1 block">Severity</span><select data-testid="watchlist-severity-select" className={inputCls} style={bd} value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>{["high", "medium", "low"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
              <label className="block"><span className="label-mono mb-1 block">Reason</span><textarea data-testid="watchlist-reason-input" rows={3} className={inputCls} style={bd} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Prior incidents, intelligence, repeated AIS gaps…" /></label>
              <button data-testid="btn-add-watchlist" disabled={busy || !f.mmsi || f.reason.trim().length < 3} onClick={add} className="inline-flex items-center gap-1.5 rounded px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50" style={{ background: "#ba1a1a" }}><Plus size={12} /> Add to watchlist</button>
            </div>
          </div>
        ) : <div className="panel p-5 text-xs text-slate-400" data-testid="watchlist-readonly">Supervisors and admins manage the watchlist. Analysts see watchlist badges on candidates and alerts.</div>}
        <div className="space-y-4">
          <div className="panel overflow-hidden fade-up" data-testid="watchlist-active">
            <div className="border-b px-4 py-3 font-display font-semibold" style={{ borderColor: "var(--border-default)" }}>Active ({active.length})</div>
            <table className="w-full text-xs">
              <thead><tr className="label-mono text-left">{["Vessel", "Severity", "Reason", "Added", "Hits", ""].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
              <tbody>
                {active.map((w) => (
                  <tr key={w.id} data-testid={`watchlist-row-${w.mmsi}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                    <td className="px-4 py-2.5"><button data-testid={`watchlist-vessel-${w.mmsi}`} onClick={() => nav(`/vessels/${w.mmsi}`)} className="flex items-center gap-2 hover:underline"><Ship size={12} color="#006194" /><span className="font-display font-semibold">{w.vessel_name || "UNKNOWN"}</span><span className="font-mono text-slate-400">{w.mmsi}</span></button></td>
                    <td className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: SEV[w.severity] }}>{w.severity}</td>
                    <td className="px-4 py-2.5 text-slate-300 max-w-xs">{w.reason}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{w.added_by}<br />{fmtTime(w.created_at)}</td>
                    <td className="px-4 py-2.5 font-mono" data-testid={`watchlist-hits-${w.mmsi}`}>{w.hits}{w.last_hit_case && <span className="block text-[10px] text-slate-500">{w.last_hit_case}</span>}</td>
                    <td className="px-4 py-2.5 text-right">{sup && <button data-testid={`watchlist-remove-${w.mmsi}`} onClick={() => remove(w)} className="rounded p-1 text-slate-400 hover:text-rose-400"><Trash2 size={13} /></button>}</td>
                  </tr>
                ))}
                {active.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No vessels flagged.</td></tr>}
              </tbody>
            </table>
          </div>
          {past.length > 0 && (
            <div className="panel overflow-hidden" data-testid="watchlist-past">
              <div className="border-b px-4 py-3 font-display font-semibold text-slate-400" style={{ borderColor: "var(--border-default)" }}>Removed ({past.length})</div>
              {past.map((w) => <div key={w.id} className="border-t px-4 py-2 font-mono text-[11px] text-slate-500" style={{ borderColor: "var(--border-default)" }}>{w.vessel_name || w.mmsi} · {w.mmsi} · removed by {w.removed_by} {fmtTime(w.removed_at)}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
