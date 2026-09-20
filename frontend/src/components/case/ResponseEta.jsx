import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { api, apiError } from "@/lib/api";

const fmtH = (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);

export const ResponseEta = ({ caseId }) => {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api.get(`/cases/${caseId}/response-eta`).then((r) => setD(r.data)).catch((e) => setErr(apiError(e))); }, [caseId]);
  return (
    <div className="mx-4 mt-4 rounded border p-3" style={{ borderColor: "rgba(0,106,97,0.4)", background: "rgba(0,106,97,0.04)" }} data-testid="response-eta">
      <div className="flex items-center gap-2"><LifeBuoy size={13} color="#006a61" /><span className="font-display text-sm font-semibold">Nearest response assets · ETA</span><span className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300" style={{ border: "1px solid currentColor" }}>approximate</span></div>
      {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      {d && !d.available && <p className="mt-2 text-xs text-slate-400" data-testid="response-eta-unavailable">{d.note} Nearest ICG station {d.nearest_station.name} is {d.nearest_station.distance_km} km away.</p>}
      {d?.available && (
        <>
          <p className="mt-2 font-mono text-[11px] text-slate-300" data-testid="response-eta-first">First on scene: <b className="text-emerald-300">{d.first_on_scene.label}</b> from {d.first_on_scene.station} · {d.first_on_scene.distance_km} km · ETA <b className="text-emerald-300">{fmtH(d.first_on_scene.eta_hours)}</b>{d.containment && <> · containment ({d.containment.label}) from {d.containment.station} ETA <b>{fmtH(d.containment.eta_hours)}</b></>}</p>
          <table className="mt-2 w-full text-[11px]" data-testid="response-eta-table">
            <thead><tr className="label-mono text-left">{["Asset", "Station", "Distance", "Speed", "Mobilise", "ETA"].map((h) => <th key={h} className="px-2 py-1 font-normal">{h}</th>)}</tr></thead>
            <tbody>{d.assets.map((a) => (
              <tr key={a.asset} className="border-t" style={{ borderColor: "var(--border-default)" }} data-testid={`response-asset-${a.asset}`}>
                <td className="px-2 py-1">{a.label}</td><td className="px-2 py-1 text-slate-300">{a.station}</td><td className="px-2 py-1 font-mono">{a.distance_km} km</td>
                <td className="px-2 py-1 font-mono">{a.speed_kn} kn</td><td className="px-2 py-1 font-mono">{a.mobilise_min} min</td><td className="px-2 py-1 font-mono text-emerald-300">{fmtH(a.eta_hours)}</td>
              </tr>))}</tbody>
          </table>
          <p className="mt-1 text-[10px] text-slate-500">{d.note}</p>
        </>
      )}
    </div>
  );
};
