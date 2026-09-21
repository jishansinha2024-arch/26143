import { Satellite, Ship, Scale, ShieldCheck, Radar, FileCheck } from "lucide-react";

const STEPS = [
  { icon: Satellite, title: "Detect", text: "Sentinel-1 SAR scenes are screened for dark-spot candidates. The detector currently in use is experimental (Otsu / CFAR heuristics) and is labelled as such throughout the console." },
  { icon: Ship, title: "Correlate", text: "Genuine AIS trajectories are matched against each candidate slick. Where AIS coverage is missing the case says so — vessels are never fabricated." },
  { icon: Scale, title: "Jurisdiction", text: "Cases are intersected with maritime zones (territorial sea, contiguous zone, EEZ) for context. An intersection is investigation context, not a legal determination." },
  { icon: FileCheck, title: "Evidence", text: "Provenance, timelines and analyst decisions are recorded so every conclusion can be audited before anyone files a claim." },
];

export default function About() {
  return (
    <div className="h-full overflow-y-auto p-6" data-testid="about-page">
      <div className="mb-6">
        <p className="label-mono mb-1">AI-assisted maritime oil-spill intelligence</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">About Varuna Netra</h1>
      </div>

      <div className="panel fade-up mb-4 p-6">
        <div className="mb-3 flex items-center gap-2"><Radar size={18} color="#1479c4" /><h2 className="font-display text-lg font-semibold">Detect spills. Correlate vessels. Explain the evidence.</h2></div>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
          Sentinel-1 radar finds the slick. AIS trajectories name the ship. Jurisdiction and evidence are sealed before anyone files a claim.
          Varuna Netra is decision support for analysts and supervisors — it is not a legal determination.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="panel fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/20 bg-primary-fixed"><Icon size={17} color="#1479c4" /></span>
              <h2 className="font-display text-lg font-semibold">{title}</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">{text}</p>
          </div>
        ))}
      </div>

      <div className="panel fade-up mt-4 flex items-start gap-3 p-5">
        <ShieldCheck size={18} color="#1479c4" className="mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-slate-400">
          Metrics that have not been measured read <b className="text-slate-200">NOT YET VALIDATED</b> on the Validation page — they are never fabricated.
          Guests have read-only access to the demo, reference case, archive, zones and data sources.
        </p>
      </div>
    </div>
  );
}
