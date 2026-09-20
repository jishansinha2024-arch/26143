import { fmtTime } from "@/lib/api";

const ICON = { "case.opened": "#006194", "case.correlated": "#007bb9", "review.confirm": "#006a61", "review.reject": "#ba1a1a", "review.needs_more_data": "#b26a00", "alert.raised": "#ba1a1a", "spill.created": "#ba1a1a", "scene.registered": "#6f4fa8" };

export const EvidenceTimeline = ({ evidence }) => {
  if (!evidence) return null;
  const { audit_history = [], reviews = [], result_versions = [], source_references, calculations } = evidence;
  return (
    <div className="space-y-5 p-4 text-sm" data-testid="evidence-panel">
      <section>
        <h3 className="label-mono mb-2">Source references</h3>
        <div className="rounded border p-3 font-mono text-[11px] leading-relaxed text-slate-300" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }} data-testid="evidence-sources">
          <div>Scene: {source_references.scene ? `${source_references.scene.provider} · ${source_references.scene.provider_scene_id}` : "— (external polygon)"}</div>
          <div>Storage: {source_references.storage_ref || "—"}</div>
          <div>Spill obs: {source_references.spill_observation.id} · {source_references.spill_observation.processing_version}</div>
          <div>AIS fixes referenced: {source_references.ais_fix_ids.length}</div>
          {calculations && <div>Algorithm: {calculations.algorithm_version} · input hash <span className="text-cyan-300">{calculations.input_hash.slice(0, 16)}…</span>{calculations.degraded && <span className="text-purple-300"> · DEGRADED (no drift inputs)</span>}</div>}
        </div>
      </section>
      <section>
        <h3 className="label-mono mb-2">Result versions</h3>
        <div className="space-y-1">
          {result_versions.map((v) => (
            <div key={v.version} className="flex items-center gap-3 font-mono text-[11px]" data-testid={`result-version-${v.version}`}>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">v{v.version}</span>
              <span className="text-slate-400">{fmtTime(v.created_at)}</span>
              <span>{v.overall_status}</span>
              <span className="text-slate-500">{v.algorithm_version} · {v.input_hash.slice(0, 10)}</span>
            </div>
          ))}
          {result_versions.length === 0 && <p className="text-xs text-slate-500">No correlation run yet.</p>}
        </div>
      </section>
      <section>
        <h3 className="label-mono mb-2">Analyst decisions ({reviews.length})</h3>
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded border p-2.5 text-xs" style={{ borderColor: "var(--border-default)" }} data-testid={`review-${r.id}`}>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span style={{ color: ICON[`review.${r.decision}`] }}>{r.decision.toUpperCase()}</span>
                <span className="text-slate-400">{r.analyst} · {fmtTime(r.created_at)} · on v{r.result_version ?? "—"}</span>
                {r.vessel_mmsi && <span className="text-slate-300">MMSI {r.vessel_mmsi}</span>}
              </div>
              {r.reason_codes.length > 0 && <div className="mt-1 font-mono text-[10px] text-cyan-300">{r.reason_codes.join(" · ")}</div>}
              {r.notes && <p className="mt-1 text-slate-300">{r.notes}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-xs text-slate-500">No analyst decisions recorded.</p>}
        </div>
      </section>
      <section>
        <h3 className="label-mono mb-2">Audit history ({audit_history.length})</h3>
        <ol className="relative ml-2 space-y-2 border-l pl-4" style={{ borderColor: "var(--border-highlight)" }} data-testid="audit-timeline">
          {[...audit_history].reverse().map((e) => (
            <li key={e.id} className="relative text-xs">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: ICON[e.action] || "#707881", background: "var(--bg-card)" }} />
              <div className="font-mono text-[11px]"><span style={{ color: ICON[e.action] || "#707881" }}>{e.action}</span> <span className="text-slate-500">· {e.actor} · {fmtTime(e.created_at)}</span></div>
              <div className="text-slate-400">{e.entity_type} {e.entity_id.slice(0, 8)} {Object.keys(e.payload || {}).length > 0 && <span className="text-slate-500">{JSON.stringify(e.payload).slice(0, 140)}</span>}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
