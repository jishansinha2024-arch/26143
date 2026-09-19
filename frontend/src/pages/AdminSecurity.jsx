import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { api, fmtTime } from "@/lib/api";

const STATE_STYLE = {
  PASS: { color: "#2E8B6A", bg: "rgba(46,139,106,0.1)", bd: "rgba(46,139,106,0.35)" },
  WARNING: { color: "#C48A22", bg: "rgba(184,134,42,0.1)", bd: "rgba(184,134,42,0.35)" },
  FAIL: { color: "#D4604D", bg: "rgba(194,90,73,0.1)", bd: "rgba(194,90,73,0.35)" },
  "NOT CONFIGURED": { color: "#7D919C", bg: "rgba(95,118,132,0.1)", bd: "rgba(95,118,132,0.3)" },
};

export default function AdminSecurity() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/security").then((r) => setD(r.data)).catch(() => setD(false)); }, []);

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="admin-security-page">
      <div className="mb-6 fade-up">
        <p className="label-mono mb-1">Platform administration</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Security Center</h1>
        <p className="mt-2 text-sm text-slate-400">Read-only. States reflect enforced controls &amp; current configuration — no secrets are ever shown. The platform is never claimed to be unhackable.</p>
      </div>

      {d === false && <p className="text-rose-600" data-testid="admin-security-error">Access denied or unavailable.</p>}

      {d && (
        <div className="grid gap-2 mb-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="security-checks">
          {d.checks.map((c) => {
            const st = STATE_STYLE[c.state] || STATE_STYLE["NOT CONFIGURED"];
            return (
              <div key={c.category} className="panel p-4 fade-up" data-testid={`security-check-${c.category.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{c.category}</span>
                  <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: st.color, background: st.bg, border: `1px solid ${st.bd}` }}>{c.state}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{c.detail}</p>
              </div>
            );
          })}
        </div>
      )}

      {d && (
        <div className="panel overflow-hidden fade-up" data-testid="security-audit">
          <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
            <ShieldAlert size={15} color="#C48A22" /><h2 className="font-display font-semibold">Recent audit events</h2>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="label-mono text-left">{["Time", "Actor", "Action", "Entity"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>
              {(d.recent_events || []).map((e, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                  <td className="px-4 py-2 font-mono text-slate-400">{fmtTime(e.at || e.created_at)}</td>
                  <td className="px-4 py-2 text-slate-600">{e.actor || "system"}</td>
                  <td className="px-4 py-2 font-mono text-tide">{e.action}</td>
                  <td className="px-4 py-2 text-slate-400">{e.entity}{e.entity_id ? ` · ${String(e.entity_id).slice(0, 8)}` : ""}</td>
                </tr>
              ))}
              {d.recent_events && d.recent_events.length === 0 && <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">No audit events.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
