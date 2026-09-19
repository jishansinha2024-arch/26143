import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { api, apiError } from "@/lib/api";

const inputCls = "w-full rounded border bg-mist px-2 py-1 font-mono text-xs text-slate-800 outline-none focus:border-tide/60";
const bd = { borderColor: "var(--border-highlight)" };
const REQUIRED = ["mmsi", "timestamp", "lat", "lon"];

export const CsvUpload = ({ onDone }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const pick = async (f) => {
    if (!f) return;
    setFile(f); setResult(null); setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const { data } = await api.post("/ais/csv/preview", fd);
      setPreview(data); setMapping(data.detected_mapping);
      toast.success(`${data.row_count} rows detected · ${Object.keys(data.detected_mapping).length} columns auto-mapped`);
    } catch (e) { toast.error(apiError(e)); setPreview(null); } finally { setBusy(false); }
  };

  const ingest = async () => {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("mapping", JSON.stringify(mapping));
      const { data } = await api.post("/ais/csv/ingest", fd);
      setResult(data);
      toast.success(`CSV ingested: ${data.inserted} inserted, ${data.duplicates} duplicates, ${data.row_error_count} row errors`);
      onDone?.();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const missing = REQUIRED.filter((k) => !mapping[k]);

  return (
    <div data-testid="csv-upload">
      <div data-testid="csv-dropzone" onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-6 text-center transition-colors"
        style={{ borderColor: drag ? "#2A93A8" : "var(--border-highlight)", background: drag ? "rgba(31,127,147,0.06)" : "rgba(17,24,39,0.5)" }}>
        <input ref={inputRef} data-testid="csv-file-input" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <FileSpreadsheet size={22} color="#2A93A8" />
        <p className="text-sm text-slate-700">{file ? file.name : "Drop an AIS CSV export here or click to browse"}</p>
        <p className="font-mono text-[10px] text-slate-500">MMSI · BaseDateTime/timestamp · LAT · LON · SOG · COG · Heading · VesselName · IMO · VesselType · up to 25 MB</p>
      </div>

      {preview && (
        <div className="mt-3 space-y-3 fade-up" data-testid="csv-preview">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-600">
            <span data-testid="csv-row-count">{preview.row_count} rows</span><span>{preview.headers.length} columns</span>
            {missing.length > 0 ? <span className="text-rose-600" data-testid="csv-missing">missing: {missing.join(", ")}</span> : <span className="text-emerald-700">required columns mapped</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="csv-mapping">
            {preview.fields.map((k) => (
              <label key={k} className="block"><span className="label-mono mb-0.5 block">{k}{REQUIRED.includes(k) && <span style={{ color: "#D4604D" }}> *</span>}</span>
                <select data-testid={`csv-map-${k}`} className={inputCls} style={bd} value={mapping[k] || ""} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })}>
                  <option value="">— skip —</option>{preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select></label>
            ))}
          </div>
          <div className="overflow-x-auto rounded border" style={{ borderColor: "var(--border-default)" }}>
            <table className="w-full text-[11px]">
              <thead><tr className="label-mono text-left">{preview.headers.map((h) => <th key={h} className="px-2 py-1.5 font-normal whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{preview.preview_rows.map((r, i) => <tr key={`${preview.headers.map((h) => r[h]).join("|")}-${i}`} className="border-t font-mono" style={{ borderColor: "var(--border-default)" }}>{preview.headers.map((h) => <td key={h} className="px-2 py-1 whitespace-nowrap text-slate-600">{r[h]}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {preview.sample_errors?.length > 0 && <p className="text-[11px] text-amber-700" data-testid="csv-sample-errors">Sample parse issues: {preview.sample_errors.map((e) => `row ${e.row}: ${e.error}`).join(" · ")}</p>}
          <button data-testid="btn-csv-ingest" disabled={busy || missing.length > 0} onClick={ingest} className="inline-flex items-center gap-1.5 rounded bg-ink px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-paper hover:bg-tide disabled:opacity-50"><Upload size={12} /> {busy ? "Ingesting…" : `Ingest ${preview.row_count} rows`}</button>
        </div>
      )}
      {result && (
        <div className="mt-3 rounded border p-3 font-mono text-[11px] text-slate-600 fade-up" style={{ borderColor: "rgba(46,139,106,0.4)" }} data-testid="csv-result">
          rows {result.rows_total} · inserted <span className="text-emerald-700">{result.inserted}</span> · duplicates <span className="text-amber-700">{result.duplicates}</span> · flagged {result.flagged} · row errors <span className="text-rose-600">{result.row_error_count}</span> · vessels {result.vessels}
          {result.row_errors?.length > 0 && <ul className="mt-1 text-slate-500">{result.row_errors.slice(0, 5).map((e) => <li key={`${e.row}-${e.error}`}>row {e.row}: {e.error}</li>)}</ul>}
        </div>
      )}
    </div>
  );
};
