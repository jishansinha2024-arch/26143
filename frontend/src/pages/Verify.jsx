import { useState } from "react";
import axios from "axios";
import { ShieldCheck, ShieldAlert, Upload, Hash } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const inputCls = "w-full rounded border bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";

export default function Verify() {
  const [hash, setHash] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const byHash = async () => { setBusy(true); try { setRes((await axios.get(`${API}/verify/${hash.trim()}`)).data); } catch (e) { setRes({ verified: false, status: "error", message: e.message }); } finally { setBusy(false); } };
  const byFile = async (file) => { if (!file) return; setBusy(true); const fd = new FormData(); fd.append("file", file); try { setRes((await axios.post(`${API}/verify`, fd)).data); } catch (e) { setRes({ verified: false, status: "error", message: e.message }); } finally { setBusy(false); } };
  const ok = res?.verified;
  return (
    <div className="min-h-screen px-6 py-12" style={{ background: "var(--bg-primary, #ffffff)", color: "#191c1e" }} data-testid="verify-page">
      <div className="mx-auto max-w-2xl">
        <p className="label-mono mb-1">Varuna Netra · evidence integrity verification</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Verify a prosecution bundle</h1>
        <p className="mt-2 text-sm text-slate-400">Regulators and courts can confirm that an exported evidence bundle is byte-identical to what the supervising officer exported. Upload the ZIP (every file is re-hashed with SHA-256 and compared to its MANIFEST and to the Varuna Netra ledger) or paste the bundle hash.</p>
        <label className="mt-6 flex cursor-pointer flex-col items-center gap-2 rounded border-2 border-dashed p-8 text-sm text-slate-300 hover:border-cyan-400/60" style={{ borderColor: "var(--border-highlight, #bfc7d2)" }} data-testid="verify-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); byFile(e.dataTransfer.files?.[0]); }}>
          <Upload size={22} color="#006194" /> Drop the bundle ZIP here or click to choose
          <input data-testid="verify-file-input" type="file" accept=".zip" className="hidden" onChange={(e) => byFile(e.target.files?.[0])} />
        </label>
        <div className="mt-4 flex gap-2">
          <input data-testid="verify-hash-input" className={inputCls} value={hash} onChange={(e) => setHash(e.target.value)} placeholder="or paste SHA-256 bundle / content hash" />
          <button data-testid="verify-hash-btn" disabled={busy || hash.trim().length < 16} onClick={byHash} className="inline-flex shrink-0 items-center gap-1.5 rounded bg-cyan-400 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50"><Hash size={12} /> Check</button>
        </div>
        {res && (
          <div data-testid="verify-result" className="mt-6 rounded border p-4" style={{ borderColor: ok ? "#006a61" : "#ba1a1a", background: ok ? "rgba(0,106,97,0.08)" : "rgba(186,26,26,0.08)" }}>
            <div className="flex items-center gap-2 font-display text-lg font-semibold">{ok ? <ShieldCheck color="#006a61" /> : <ShieldAlert color="#ba1a1a" />}<span data-testid="verify-status">{ok ? "VERIFIED — integrity intact" : `NOT VERIFIED — ${res.status}`}</span></div>
            {res.message && <p className="mt-1 text-sm text-slate-300">{res.message}</p>}
            {(res.export || res.ledger || res.manifest) && (
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
                {Object.entries({ case: (res.export || res.ledger || res.manifest)?.case_number, exported: (res.export || res.ledger || res.manifest)?.exported_at, officer: (res.export || res.ledger || res.manifest)?.exporting_officer?.email, "bundle sha256": res.bundle_sha256 || res.export?.bundle_sha256, "content hash": res.content_hash || res.export?.content_hash, verifications: (res.export || res.ledger)?.verifications }).map(([k, v]) => v != null && <div key={k} className="rounded bg-slate-900/60 p-2 break-all"><div className="label-mono">{k}</div>{String(v)}</div>)}
              </div>
            )}
            {res.files && <div className="mt-3 space-y-0.5 font-mono text-[10px]" data-testid="verify-files">{res.files.map((f) => <div key={f.file} className="flex gap-2"><span style={{ color: f.ok ? "#006a61" : "#ba1a1a" }}>{f.ok ? "✓" : "✗"}</span><span className="text-slate-300">{f.file}</span><span className="ml-auto text-slate-500">{f.actual?.slice(0, 16)}…</span></div>)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
