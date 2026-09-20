import { useEffect, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { api } from "@/lib/api";

const TYPE_COLOR = { oil_field: "#b26a00", basin: "#c2410c", terminal: "#007bb9", shipping_lane: "#006a61", country: "#707881", eez: "#006194", other: "#3f4850" };

export const AssetSearch = ({ onSelect, compact }) => {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const t = useRef(null);
  useEffect(() => {
    clearTimeout(t.current);
    if (q.trim().length < 2) { setHits([]); return undefined; }
    t.current = setTimeout(() => api.get("/gazetteer/search", { params: { q, limit: 8 } }).then((r) => { setHits(r.data); setOpen(true); }).catch(() => {}), 220);
    return () => clearTimeout(t.current);
  }, [q]);
  const pick = (h) => { setOpen(false); setQ(h.name); onSelect?.(h); };
  return (
    <div className={`relative ${compact ? "w-72" : "w-96"}`} data-testid="asset-search">
      <div className="flex items-center gap-2 rounded border bg-slate-900/80 px-2.5 py-1.5" style={{ borderColor: "var(--border-highlight)", backdropFilter: "blur(12px)" }}>
        <Search size={12} color="#707881" />
        <input data-testid="asset-search-input" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={(e) => e.key === "Enter" && hits[0] && pick(hits[0])}
          placeholder="Search country, EEZ, oil field… e.g. Bombay High, KG Basin" className="w-full bg-transparent font-mono text-xs text-slate-100 outline-none placeholder:text-slate-500" />
      </div>
      {open && hits.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[1200] mt-1 max-h-80 overflow-y-auto rounded border" style={{ background: "rgba(255,255,255,0.96)", borderColor: "var(--border-highlight)", backdropFilter: "blur(12px)" }} data-testid="asset-search-results">
          {hits.map((h) => (
            <button key={h.id} data-testid={`asset-hit-${h.id}`} onMouseDown={() => pick(h)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-slate-800/70">
              <MapPin size={11} color={TYPE_COLOR[h.type] || "#3f4850"} />
              <span className="truncate text-slate-100">{h.name}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider" style={{ color: TYPE_COLOR[h.type] || "#3f4850" }}>{h.type}</span>
              {h.country && <span className="shrink-0 font-mono text-[10px] text-slate-500">{h.country}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const assetBounds = (h) => [[h.bbox[1], h.bbox[0]], [h.bbox[3], h.bbox[2]]];
