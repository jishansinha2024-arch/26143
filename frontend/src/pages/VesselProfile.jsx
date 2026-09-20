import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Ship, Radio, Gavel, AlertTriangle, Eye } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";

const Kpi = ({ label, value, color = "#191c1e", testId }) => (
  <div className="panel p-3" data-testid={testId}><span className="label-mono">{label}</span><div className="mt-1 font-mono text-xl font-semibold" style={{ color }}>{value}</div></div>
);
const DECISION_COLOR = { confirm: "#006a61", reject: "#ba1a1a", needs_more_data: "#b26a00", supervisor_override: "#b26a00" };

export default function VesselProfile() {
  const { mmsi } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [watch, setWatch] = useState(null);
  const loadWatch = useCallback(() => api.get("/watchlist").then((r) => setWatch(r.data.find((w) => w.active && w.mmsi === mmsi) || null)).catch(() => {}), [mmsi]);
  useEffect(() => { api.get(`/vessels/${mmsi}/profile`).then((r) => setP(r.data)).catch((e) => { setErr(apiError(e)); toast.error(apiError(e)); }); loadWatch(); }, [mmsi, loadWatch]);
  const flag = async () => {
    const reason = window.prompt("Reason for watchlisting this vessel:");
    if (!reason || reason.trim().length < 3) return;
    try { await api.post("/watchlist", { mmsi, vessel_name: p?.vessel_name || null, reason, severity: "high" }); toast.success("Vessel added to watchlist"); loadWatch(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const unflag = async () => { try { await api.delete(`/watchlist/${watch.id}`); toast.success("Removed from watchlist"); loadWatch(); } catch (e) { toast.error(apiError(e)); } };

  if (err) return <div className="p-6 text-sm text-rose-300" data-testid="vessel-error">{err}</div>;
  if (!p) return <div className="p-6 font-mono text-xs text-slate-400" data-testid="vessel-loading">Loading vessel profile…</div>;
  const a = p.ais_summary;

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="vessel-profile">
      <Link to="/" data-testid="vessel-back" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-400 hover:text-on-surface"><ArrowLeft size={12} /> Surveillance</Link>
      <div className="mt-2 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono mb-1">Vessel profile · MMSI {p.mmsi}{p.imo ? ` · IMO ${p.imo}` : ""}{p.vessel_type ? ` · ${p.vessel_type}` : ""}</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl flex items-center gap-3"><Ship size={28} color="#006194" /> <span data-testid="vessel-name">{p.vessel_name || "UNKNOWN VESSEL"}</span></h1>
          {p.name_variants.length > 1 && <p className="mt-1 font-mono text-[11px] text-amber-300" data-testid="vessel-name-variants"><AlertTriangle size={11} className="inline mr-1" />name variants seen in AIS: {p.name_variants.join(" / ")}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          {watch && <span data-testid="vessel-watchlist-badge" className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: "#ba1a1a", background: "rgba(186,26,26,0.12)", border: "1px solid rgba(186,26,26,0.5)" }} title={watch.reason}><Eye size={11} /> on watchlist · {watch.severity}</span>}
          {hasRole(user, "supervisor") && (watch
            ? <button data-testid="btn-unflag-vessel" onClick={unflag} className="rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:text-on-surface" style={{ borderColor: "var(--border-highlight)" }}>Remove from watchlist</button>
            : <button data-testid="btn-flag-vessel" onClick={flag} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950" style={{ background: "#ba1a1a" }}><Eye size={12} /> Flag vessel</button>)}
          <p className="max-w-md text-right text-[11px] text-slate-500" data-testid="vessel-disclaimer">{p.disclaimer}</p>
        </div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Case appearances" value={p.summary.appearances} color="#006194" testId="vessel-kpi-appearances" />
        <Kpi label="Ranked #1" value={p.summary.top_ranked} color="#ba1a1a" testId="vessel-kpi-top" />
        <Kpi label="Probable / confirmed" value={p.summary.probable_or_confirmed} color="#c2410c" testId="vessel-kpi-probable" />
        <Kpi label="Analyst confirmations" value={p.summary.confirmed} color="#006a61" testId="vessel-kpi-confirmed" />
        <Kpi label="Analyst rejections" value={p.summary.rejected} color="#707881" testId="vessel-kpi-rejected" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="panel overflow-hidden" data-testid="vessel-cases">
            <div className="flex items-center gap-2 border-b px-4 py-3 font-display font-semibold" style={{ borderColor: "var(--border-default)" }}><Gavel size={14} color="#b26a00" /> Cases where this vessel was a candidate</div>
            <table className="w-full text-xs">
              <thead><tr className="label-mono text-left">{["Case", "Acquired", "Rank", "Score", "Candidate status", "Case outcome", "Dist km", "Gap h", "Jurisdiction"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
              <tbody>
                {p.appearances.map((c) => (
                  <tr key={c.case_id} data-testid={`vessel-case-${c.case_number}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                    <td className="px-4 py-2.5"><Link to={`/cases/${c.case_id}`} className="font-mono text-cyan-300 hover:underline">{c.case_number}</Link></td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{fmtTime(c.acquisition_time)}</td>
                    <td className="px-4 py-2.5 font-mono">#{c.rank}<span className="text-slate-500">/{c.candidate_count}</span></td>
                    <td className="px-4 py-2.5 font-mono">{c.score.toFixed(3)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.candidate_status} testId={`vessel-cand-status-${c.case_number}`} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.case_attribution_status} testId={`vessel-case-status-${c.case_number}`} />{c.confirmed_this_vessel && <span className="ml-1 font-mono text-[10px] text-emerald-300">this vessel</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{c.distance_km}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{c.time_gap_hours}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{c.primary_jurisdiction || "—"}</td>
                  </tr>
                ))}
                {p.appearances.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">Never ranked as a candidate.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="panel overflow-hidden" data-testid="vessel-decisions">
            <div className="border-b px-4 py-3 font-display font-semibold" style={{ borderColor: "var(--border-default)" }}>Analyst decisions naming this vessel ({p.decisions.length})</div>
            <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
              {p.decisions.map((d) => (
                <div key={d.id} className="px-4 py-3 text-xs" style={{ borderColor: "var(--border-default)" }} data-testid={`vessel-decision-${d.id}`}>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span style={{ color: DECISION_COLOR[d.decision] || "#707881" }}>{d.decision.toUpperCase()}</span>
                    <Link to={`/cases/${d.case_id}`} className="text-cyan-300 hover:underline">{d.case_number}</Link>
                    <span className="text-slate-400">{d.analyst}{d.analyst_role ? ` (${d.analyst_role})` : ""} · {fmtTime(d.created_at)}</span>
                  </div>
                  {d.reason_codes?.length > 0 && <div className="mt-1 font-mono text-[10px] text-cyan-300">{d.reason_codes.join(" · ")}</div>}
                  {d.notes && <p className="mt-1 text-slate-300">{d.notes}</p>}
                </div>
              ))}
              {p.decisions.length === 0 && <p className="px-4 py-6 text-center text-slate-500 text-xs">No analyst decisions reference this vessel.</p>}
            </div>
          </div>
        </div>
        <div className="panel p-4 text-xs" data-testid="vessel-ais-summary">
          <div className="mb-3 flex items-center gap-2 font-display font-semibold"><Radio size={14} color="#007bb9" /> AIS coverage</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px]">
            <dt className="text-slate-500">fixes</dt><dd>{a.fixes}</dd>
            <dt className="text-slate-500">first seen</dt><dd>{fmtTime(a.first_seen)}</dd>
            <dt className="text-slate-500">last seen</dt><dd>{fmtTime(a.last_seen)}</dd>
            <dt className="text-slate-500">last position</dt><dd>{a.last_position.lat.toFixed(4)}, {a.last_position.lon.toFixed(4)} · {a.last_position.sog_kn ?? "—"} kn · {a.last_position.cog_deg ?? "—"}°</dd>
            <dt className="text-slate-500">gaps &gt; 2h</dt><dd style={{ color: a.gaps_over_2h ? "#b26a00" : "#191c1e" }}>{a.gaps_over_2h}</dd>
            <dt className="text-slate-500">sources</dt><dd>{a.sources.join(", ") || "—"}</dd>
            <dt className="text-slate-500">quality flags</dt><dd style={{ color: a.quality_flags.length ? "#b26a00" : "#191c1e" }}>{a.quality_flags.join(", ") || "none"}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
