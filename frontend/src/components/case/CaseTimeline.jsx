import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Share2, FileDown, Link2, Ban } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const KIND_COLOR = { scene: "#6f4fa8", spill: "#ba1a1a", ais: "#007bb9", case: "#006194", env: "#8a63d2", correlation: "#006194", decision: "#006a61", alert: "#c2410c", export: "#707881" };
const btn = "inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:text-on-surface disabled:opacity-50";

export const CaseTimeline = ({ caseId, caseNumber }) => {
  const { user } = useAuth();
  const [tl, setTl] = useState(null);
  const [shares, setShares] = useState([]);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState(168);
  const [note, setNote] = useState("");
  const load = useCallback(() => Promise.all([api.get(`/cases/${caseId}/timeline`), api.get(`/cases/${caseId}/shares`)]).then(([t, s]) => { setTl(t.data); setShares(s.data); }).catch((e) => toast.error(apiError(e))), [caseId]);
  useEffect(() => { load(); }, [load]);

  const exportHtml = async () => {
    try {
      const { data } = await api.get(`/cases/${caseId}/timeline.html`, { responseType: "blob" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(data); a.download = `${caseNumber}-timeline.html`; a.click(); URL.revokeObjectURL(a.href);
      toast.success("Timeline exported"); load();
    } catch (e) { toast.error(apiError(e)); }
  };
  const share = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/cases/${caseId}/share`, { expires_hours: +hours, recipient_note: note || null });
      await navigator.clipboard?.writeText(data.url).catch(() => {});
      toast.success("Share link created and copied to clipboard"); setNote(""); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const revoke = async (s) => { try { await api.delete(`/cases/${caseId}/shares/${s.id}`); toast.success("Share link revoked"); load(); } catch (e) { toast.error(apiError(e)); } };

  if (!tl) return <p className="p-4 font-mono text-xs text-slate-500">Loading timeline…</p>;
  return (
    <div className="p-4" data-testid="case-timeline">
      <div className="flex flex-wrap items-center gap-2">
        <button data-testid="btn-export-timeline" onClick={exportHtml} className={btn} style={{ borderColor: "var(--border-highlight)" }}><FileDown size={12} /> Export HTML</button>
        {hasRole(user, "supervisor") && (
          <>
            <select data-testid="share-expiry-select" value={hours} onChange={(e) => setHours(e.target.value)} className="rounded border bg-slate-900/60 px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none" style={{ borderColor: "var(--border-highlight)" }}>
              {[[24, "24 h"], [72, "3 days"], [168, "7 days"], [720, "30 days"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input data-testid="share-note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="recipient / agency (optional)" className="w-44 rounded border bg-slate-900/60 px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none" style={{ borderColor: "var(--border-highlight)" }} />
            <button data-testid="btn-create-share" disabled={busy} onClick={share} className={btn} style={{ borderColor: "rgba(178,106,0,0.5)", color: "#b26a00" }}><Share2 size={12} /> {busy ? "Creating…" : "Create share link"}</button>
          </>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-500" data-testid="timeline-disclaimer">{tl.disclaimer}</p>
      {shares.length > 0 && (
        <div className="mt-3 space-y-1" data-testid="share-links">
          {shares.map((s) => {
            const dead = s.revoked || new Date(s.expires_at) < new Date();
            return (
              <div key={s.id} data-testid={`share-link-${s.id}`} className="flex items-center gap-2 rounded border px-2.5 py-1.5 font-mono text-[10px]" style={{ borderColor: "var(--border-default)", opacity: dead ? 0.5 : 1 }}>
                <Link2 size={11} color={dead ? "#707881" : "#b26a00"} />
                <span className="text-slate-300">{s.recipient_note || "share link"}</span>
                <span className="text-slate-500">by {s.created_by} · {s.revoked ? "revoked" : `expires ${fmtTime(s.expires_at)}`} · {s.views} views</span>
                {!dead && hasRole(user, "supervisor") && <button data-testid={`revoke-share-${s.id}`} onClick={() => revoke(s)} className="ml-auto inline-flex items-center gap-1 text-rose-300 hover:underline"><Ban size={10} /> revoke</button>}
              </div>
            );
          })}
        </div>
      )}
      <ol className="relative ml-2 mt-4 space-y-3 border-l pl-5" style={{ borderColor: "var(--border-highlight)" }} data-testid="timeline-events">
        {tl.events.map((e, i) => (
          <li key={`${e.at || e.t || ""}-${e.kind}-${i}`} className="relative text-xs" data-testid={`timeline-event-${e.kind}`}>
            <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[e.kind] || "#707881", boxShadow: "0 0 0 3px var(--bg-secondary)" }} />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-[10px] text-slate-400">{fmtTime(e.t)}</span>
              <span className="label-mono" style={{ color: KIND_COLOR[e.kind] }}>{e.kind}</span>
              <span className="font-display font-semibold text-slate-100">{e.title}</span>
              {e.actor && <span className="font-mono text-[10px] text-cyan-300">{e.actor}{e.role ? ` · ${e.role}` : ""}</span>}
            </div>
            <p className="mt-0.5 leading-relaxed text-slate-400">{e.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};
