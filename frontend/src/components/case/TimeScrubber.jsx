import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { fmtTime } from "@/lib/api";

export const TimeScrubber = ({ geojson, acquisitionTime, windowAfterHours = 3, cursor, setCursor }) => {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600); // simulated seconds per real second
  const raf = useRef(null);

  const range = useMemo(() => {
    const tracks = (geojson?.features || []).filter((f) => f.properties.layer === "track");
    const acq = acquisitionTime ? new Date(acquisitionTime).getTime() : null;
    if (!tracks.length || !acq) return null;
    const all = tracks.flatMap((f) => f.properties.timestamps.map((t) => new Date(t).getTime()));
    return { min: Math.min(...all), max: Math.max(acq + windowAfterHours * 3600e3, ...all), acq };
  }, [geojson, acquisitionTime, windowAfterHours]);

  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useEffect(() => {
    if (!playing || !range) return;
    let last = performance.now();
    const step = (now) => {
      const dt = (now - last) / 1000; last = now;
      const next = (cursorRef.current ?? range.min) + dt * speed * 1000;
      if (next >= range.max) { setCursor(range.max); setPlaying(false); return; }
      setCursor(next);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, range, setCursor]);

  if (!range) return null;
  const value = cursor ?? range.max;
  const acqPct = ((range.acq - range.min) / (range.max - range.min)) * 100;
  const rel = cursor == null ? null : (cursor - range.acq) / 3600e3;

  return (
    <div className="rounded p-3" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-highlight)", backdropFilter: "blur(12px)" }} data-testid="time-scrubber">
      <div className="flex items-center gap-2">
        <button data-testid="scrubber-play" onClick={() => { if (cursor == null || cursor >= range.max) setCursor(range.min); setPlaying((p) => !p); }}
          className="grid h-7 w-7 place-items-center rounded bg-cyan-400 text-slate-950 hover:bg-cyan-300">{playing ? <Pause size={13} /> : <Play size={13} />}</button>
        <button data-testid="scrubber-reset" onClick={() => { setPlaying(false); setCursor(null); }} title="Show full tracks" className="grid h-7 w-7 place-items-center rounded border text-slate-300 hover:text-on-surface" style={{ borderColor: "var(--border-highlight)" }}><RotateCcw size={12} /></button>
        <div className="relative flex-1">
          <input data-testid="scrubber-slider" type="range" min={range.min} max={range.max} step={60000} value={value}
            onChange={(e) => { setPlaying(false); setCursor(+e.target.value); }} className="scrubber w-full" />
          <span className="pointer-events-none absolute -top-1 h-5 w-px" style={{ left: `${acqPct}%`, background: "#ba1a1a" }} title="satellite pass" />
        </div>
        <select data-testid="scrubber-speed" value={speed} onChange={(e) => setSpeed(+e.target.value)} className="rounded border bg-transparent px-1 py-0.5 font-mono text-[10px] text-slate-300 outline-none" style={{ borderColor: "var(--border-highlight)" }}>
          {[[300, "5 min/s"], [600, "10 min/s"], [1800, "30 min/s"], [3600, "1 h/s"]].map(([v, l]) => <option key={v} value={v} style={{ background: "#ffffff" }}>{l}</option>)}
        </select>
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><Clock size={10} /> <span data-testid="scrubber-time" className="text-slate-100">{cursor == null ? "full window" : fmtTime(new Date(cursor).toISOString())}</span></span>
        <span data-testid="scrubber-relative" style={{ color: rel == null ? "#707881" : rel < 0 ? "#b26a00" : "#ba1a1a" }}>{rel == null ? `${fmtTime(new Date(range.min).toISOString())} → ${fmtTime(new Date(range.max).toISOString())}` : rel < 0 ? `T${rel.toFixed(1)}h before satellite pass` : `T+${rel.toFixed(1)}h after pass`}</span>
      </div>
    </div>
  );
};
