import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { api, apiError } from "@/lib/api";

const SUGGEST = ["Summarise this case in plain language.", "Why is the top vessel ranked highest?", "What is uncertain or missing in this case?"];

export function AiAssistant({ caseId }) {
  const [enabled, setEnabled] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const endRef = useRef(null);

  useEffect(() => { api.get("/assistant/status").then((r) => setEnabled(r.data.enabled)).catch(() => setEnabled(false)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ask = async (question) => {
    const text = (question || q).trim();
    if (!text || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]); setQ(""); setBusy(true);
    try {
      const { data } = await api.post(`/cases/${caseId}/assistant`, { question: text });
      setMsgs((m) => [...m, { role: "ai", text: data.answer }]);
    } catch (e) { setMsgs((m) => [...m, { role: "ai", text: apiError(e), error: true }]); }
    finally { setBusy(false); }
  };

  if (enabled === false) return <p className="text-sm text-slate-400" data-testid="assistant-disabled">AI case assistant is <span className="text-amber-300">NOT CONFIGURED</span> on this deployment.</p>;

  return (
    <div className="flex h-[520px] flex-col" data-testid="ai-assistant">
      <div className="mb-2 flex items-center gap-2"><Sparkles size={15} color="#006194" /><h3 className="font-display text-sm font-semibold">Case assistant</h3>
        <span className="ml-auto font-mono text-[10px] text-slate-500">grounded in stored case evidence only</span></div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-md border p-3" style={{ borderColor: "var(--border-default)" }} data-testid="assistant-messages">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Ask about this case. Try:</p>
            {SUGGEST.map((s) => <button key={s} data-testid="assistant-suggest" onClick={() => ask(s)} className="block w-full rounded border px-3 py-1.5 text-left text-xs text-cyan-200 hover:bg-cyan-400/10" style={{ borderColor: "var(--border-default)" }}>{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-cyan-400/15 text-cyan-100" : "bg-slate-800/60 text-slate-200"}`} style={m.error ? { color: "#ba1a1a" } : {}}>{m.text}</div>
        ))}
        {busy && <div className="max-w-[85%] rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-400" data-testid="assistant-thinking">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="mt-2 flex gap-2">
        <input data-testid="assistant-input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask about this case…"
          className="flex-1 rounded border bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60" style={{ borderColor: "var(--border-highlight)" }} />
        <button data-testid="assistant-send" onClick={() => ask()} disabled={busy} className="inline-flex items-center gap-1 rounded bg-cyan-400 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><Send size={13} /></button>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">Grounded in stored case evidence only · decision support, not a legal determination.</p>
    </div>
  );
}
