import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ShieldAlert, Waves, Wrench, Clock, Lightbulb } from "lucide-react";
import { api } from "@/lib/api";

export function ArchiveLessons() {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("tactics");

  useEffect(() => {
    let mounted = true;
    api.get("/archive/lessons")
      .then((res) => {
        if (mounted) setData(res.data);
      })
      .catch((err) => console.error("Failed to load archive lessons", err));
    return () => { mounted = false; };
  }, []);

  if (!data) return null;

  return (
    <div
      data-testid="archive-lessons"
      className="panel mb-5 overflow-hidden border border-cyan-500/20 bg-slate-900/80 backdrop-blur"
    >
      <div
        className="flex items-center justify-between p-3.5 cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid="archive-lessons-toggle"
      >
        <div className="flex items-center gap-2.5">
          <ShieldAlert size={16} className="text-cyan-400 shrink-0" />
          <span className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Historical Incident Lessons & Standard Operational Tactics
          </span>
          <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-400/20">
            {data.incidents} Incidents Synthesized
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-cyan-300"
        >
          {expanded ? "Collapse Playbook" : "View Operational Lessons"}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-800/80 p-4 pt-3">
          {/* Tabs */}
          <div className="mb-4 flex gap-2 border-b border-slate-800 pb-2">
            {[
              { id: "tactics", label: "4-Phase Response Tactics", icon: Clock },
              { id: "ecosystems", label: "Ecosystem Impacts", icon: Waves },
              { id: "remediation", label: "Remediation Techniques", icon: Wrench },
              { id: "key_lessons", label: "Incident Key Lessons", icon: Lightbulb },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                    activeTab === tab.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === "tactics" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="archive-tactics">
              {data.solutions?.response_tactics?.map((t, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 flex flex-col">
                  <div className="font-mono text-[11px] font-semibold text-cyan-400 pb-1.5 mb-2 border-b border-slate-800/80">
                    {t.phase}
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-xs">
                    {t.actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-cyan-500 font-bold shrink-0 mt-0.5">•</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {activeTab === "ecosystems" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Marine and coastal habitats most frequently degraded in historical precedents:
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {data.problems?.ecosystems_affected?.map((eco, idx) => (
                  <div key={idx} className="rounded border border-slate-800 bg-slate-950/40 p-2.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-slate-200 text-xs">{eco.ecosystem}</span>
                      <span className="font-mono text-[10px] text-cyan-400 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-400/40">
                        {eco.incidents} incidents
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      Examples: {eco.examples.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "remediation" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Remediation methods recorded across global response actions:
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {data.solutions?.remediation_used?.map((rem, idx) => (
                  <div key={idx} className="rounded border border-slate-800 bg-slate-950/40 p-2.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-slate-200 text-xs">{rem.method}</span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-400/40">
                        {rem.incidents} uses
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      Examples: {rem.examples.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "key_lessons" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {data.solutions?.lessons?.map((item, idx) => (
                <div key={idx} className="rounded border border-slate-800 bg-slate-950/50 p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-cyan-300 text-xs">{item.incident}</span>
                    <span className="font-mono text-[10px] text-slate-500">{item.date?.slice(0, 10)}</span>
                  </div>
                  <p className="text-xs text-slate-300 italic">{item.lesson}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3.5 pt-2 border-t border-slate-800/60 font-mono text-[10px] text-slate-500">
            {data.note}
          </div>
        </div>
      )}
    </div>
  );
}
export default ArchiveLessons;
