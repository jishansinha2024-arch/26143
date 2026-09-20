import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Paperclip, Trash2, Download, Image as ImageIcon, FileText, UploadCloud } from "lucide-react";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CHUNK = 4 * 1024 * 1024;
const KINDS = ["sar_scene", "optical_scene", "aerial_photo", "report", "ais_export", "other"];
const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };

const Thumb = ({ att }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!att.is_image) return undefined;
    let u;
    api.get(`/attachments/${att.id}/download`, { responseType: "blob" }).then((r) => { u = URL.createObjectURL(r.data); setUrl(u); }).catch(() => {});
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [att.id, att.is_image]);
  if (!att.is_image) return <div className="grid h-20 w-full place-items-center rounded bg-slate-900/60"><FileText size={22} color="#707881" /></div>;
  return url ? <img src={url} alt={att.caption || att.original_filename} className="h-20 w-full rounded object-cover" data-testid={`attachment-thumb-${att.id}`} /> : <div className="grid h-20 w-full place-items-center rounded bg-slate-900/60"><ImageIcon size={22} color="#707881" /></div>;
};

export const Attachments = ({ caseId, onChanged }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState("sar_scene");
  const [progress, setProgress] = useState(null);
  const load = useCallback(() => api.get(`/cases/${caseId}/attachments`).then((r) => setRows(r.data)).catch((e) => toast.error(apiError(e))), [caseId]);
  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    if (!file) return;
    const total = Math.max(1, Math.ceil(file.size / CHUNK));
    setProgress(0);
    try {
      const { data: up } = await api.post("/uploads/init", { case_id: caseId, filename: file.name, size: file.size, total_chunks: total });
      for (let i = 0; i < total; i++) {
        const fd = new FormData();
        fd.append("chunk", file.slice(i * CHUNK, (i + 1) * CHUNK), `${i}`);
        await api.put(`/uploads/${up.id}/chunks/${i}`, fd);
        setProgress(Math.round(((i + 1) / total) * 90));
      }
      await api.post(`/uploads/${up.id}/complete`, { caption: caption || null, kind });
      setProgress(100); toast.success(`${file.name} attached`); setFile(null); setCaption(""); load(); onChanged?.();
    } catch (e) { toast.error(apiError(e)); } finally { setTimeout(() => setProgress(null), 600); }
  };
  const download = async (a) => {
    try { const { data } = await api.get(`/attachments/${a.id}/download`, { responseType: "blob" }); const el = document.createElement("a"); el.href = URL.createObjectURL(data); el.download = a.original_filename; el.click(); URL.revokeObjectURL(el.href); }
    catch (e) { toast.error(apiError(e)); }
  };
  const remove = async (a) => { try { await api.delete(`/attachments/${a.id}`); toast.success("Attachment removed"); load(); onChanged?.(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="p-4 space-y-4" data-testid="attachments-panel">
      <div className="rounded border p-3" style={{ borderColor: "rgba(178,106,0,0.4)", background: "rgba(178,106,0,0.04)" }} data-testid="attachment-upload-form">
        <div className="mb-2 flex items-center gap-2"><UploadCloud size={14} color="#b26a00" /><span className="font-display text-sm font-semibold">Attach source imagery / evidence file</span></div>
        <p className="mb-2 text-[11px] text-slate-400">PNG, JPG, WebP, GeoTIFF, PDF, CSV, GeoJSON up to 50 MB · stored in object storage · images embedded in the evidence PDF and listed on the timeline.</p>
        <input data-testid="attachment-file-input" type="file" accept=".png,.jpg,.jpeg,.webp,.tif,.tiff,.pdf,.csv,.txt,.json,.geojson" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:text-cyan-300" />
        <div className="mt-2 grid grid-cols-[1fr_140px] gap-2">
          <input data-testid="attachment-caption-input" className={inputCls} style={bd} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="caption (e.g. Sentinel-1 VV, 2026-06-10 05:42Z)" />
          <select data-testid="attachment-kind-select" className={inputCls} style={bd} value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button data-testid="btn-upload-attachment" disabled={!file || progress !== null} onClick={upload} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50" style={{ background: "#b26a00" }}><Paperclip size={12} /> {progress !== null ? `Uploading ${progress}%` : "Upload"}</button>
          {progress !== null && <div className="h-1.5 flex-1 rounded bg-slate-800" data-testid="attachment-progress"><div className="h-1.5 rounded bg-amber-400 transition-[width]" style={{ width: `${progress}%` }} /></div>}
        </div>
      </div>
      {rows === null && <p className="font-mono text-xs text-slate-500">Loading attachments…</p>}
      {rows?.length === 0 && <p className="text-xs text-slate-500" data-testid="attachments-empty">No files attached to this case yet.</p>}
      <div className="grid grid-cols-2 gap-3" data-testid="attachments-list">
        {rows?.map((a) => (
          <div key={a.id} data-testid={`attachment-${a.id}`} className="rounded border p-2 text-xs" style={{ borderColor: "var(--border-default)" }}>
            <Thumb att={a} />
            <div className="mt-2 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display font-semibold text-slate-100" title={a.original_filename}>{a.caption || a.original_filename}</div>
                <div className="font-mono text-[10px] text-slate-500">{a.kind} · {(a.size / 1024).toFixed(0)} KB · {a.uploaded_by}<br />{fmtTime(a.created_at)}</div>
              </div>
              <button data-testid={`attachment-download-${a.id}`} onClick={() => download(a)} title="Download" className="rounded p-1 text-slate-400 hover:text-cyan-300"><Download size={12} /></button>
              {hasRole(user, "supervisor") && <button data-testid={`attachment-delete-${a.id}`} onClick={() => remove(a)} title="Remove" className="rounded p-1 text-slate-400 hover:text-rose-400"><Trash2 size={12} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
