import { useEffect, useState } from "react";
import { api, fmtTime } from "@/lib/api";

const TONE = { scene_acquisition: "#6f4fa8", detection: "#ba1a1a", corridor_entry: "#007bb9", closest_approach: "#b26a00", corridor_exit: "#007bb9", correlation: "#006194", review: "#006a61", case_created: "#707881", case_updated: "#707881" };

/** Evidence timeline — every entry is a stored timestamp returned by the backend; unavailable events are listed, never estimated. */
export const ChronoTimeline = ({ caseId }) => {
  const [t, setT] = useState(null);
  useEffect(() => { api.get(`/cases/${caseId}/evidence-timeline`).then((r) => setT(r.data)).catch(() => setT(false)); }, [caseId]);
  if (t === null) return <p className="p-4 font-mono text-xs text-slate-500">Loading evidence timeline…</p>;
  if (!t) return <p className="p-4 font-mono text-xs text-rose-300" data-testid="evidence-timeline-error">Evidence timeline unavailable.</p>;
  return (
    <section className="border-b p-4" style={{ borderColor: "var(--border-default)" }} data-testid="evidence-timeline">
      <h3 className="label-mono mb-3">Evidence timeline · stored timestamps only</h3>
      <ol className="relative ml-2 space-y-2.5 border-l pl-4" style={{ borderColor: "var(--border-highlight)" }}>
        {t.events.map((e, i) => (
          <li key={`${e.kind}-${i}`} className="relative text-xs" data-testid={`timeline-event-${e.kind}`}>
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: TONE[e.kind] || "#707881", background: "var(--bg-card)" }} />
            <div className="font-mono text-[11px]"><span style={{ color: TONE[e.kind] || "#707881" }}>{e.label}</span> <span className="text-slate-500">· {fmtTime(e.time)} UTC</span></div>
            {e.detail && <div className="text-slate-400">{e.detail} <span className="text-slate-600">· {e.source}</span></div>}
          </li>
        ))}
      </ol>
      {t.unavailable.length > 0 && (
        <div className="mt-3 space-y-0.5" data-testid="timeline-unavailable">
          {t.unavailable.map((u) => <div key={u.kind} className="font-mono text-[10px] text-slate-500">{u.label}: <span className="text-slate-400">{u.state}</span></div>)}
        </div>
      )}
    </section>
  );
};
