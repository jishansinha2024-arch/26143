import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Radar,
  Satellite,
  Waypoints,
  Lightbulb,
  FileCheck2,
  Scale,
  Shield,
  Anchor,
  Compass,
  ArrowRight,
  Activity,
  CheckCircle2,
  Cpu,
} from "lucide-react";

const PIPELINE = [
  {
    step: "01",
    title: "Spaceborne Radar Ingestion",
    icon: Satellite,
    tag: "SENTINEL-1 SAR",
    color: "#0284C7",
    desc: "Processes Copernicus Sentinel-1 C-band Synthetic Aperture Radar (SAR) imagery. Uses backscatter thresholding to detect dark slick signatures caused by oil-damped capillary-gravity waves.",
    details: [
      "Interferometric Wide (IW) swath mode with 10m spatial resolution",
      "Wind-normalized surface backscatter calibration",
      "Automated polygon boundary extraction & centroid calculation",
    ],
  },
  {
    step: "02",
    title: "AIS Trajectory Reconstruction",
    icon: Waypoints,
    tag: "TERRESTRIAL & SAT AIS",
    color: "#0EA5E9",
    desc: "Ingests millions of global AIS vessel position reports. Reconstructs historical trajectories across customizable search corridors and temporal observation windows.",
    details: [
      "Dead-reckoning trajectory interpolation across time intervals",
      "Vessel identification via MMSI, IMO number, callsign, and flag state",
      "Automated dark-vessel scanning to detect AIS transponder shut-offs",
    ],
  },
  {
    step: "03",
    title: "6-Factor Attribution Engine",
    icon: Lightbulb,
    tag: "SCORING ALGORITHM",
    color: "#D97706",
    desc: "A transparent, deterministic multi-factor mathematical scoring model that explains why candidate vessels are ranked, eliminating black-box uncertainty.",
    details: [
      "Spatial proximity (closest distance to spill polygon)",
      "Temporal gap (hours elapsed between fix and slick formation)",
      "Track continuity (frequency of AIS fixes vs anomalies)",
      "Heading consistency (vessel course alignment with slick orientation)",
      "Drift simulation (wind and surface current vector modeling)",
      "AIS behaviour reliability (historical transponder continuity)",
    ],
  },
  {
    step: "04",
    title: "Maritime Jurisdiction & ICG Routing",
    icon: Scale,
    tag: "UNCLOS & EEZ RULES",
    color: "#059669",
    desc: "Evaluates the incident against UNCLOS 1982 maritime boundaries. Automatically determines coastal state rights, enforcement authorities, and Coast Guard District dispatching.",
    details: [
      "Territorial Sea (0–12 nm): Full coastal state sovereignty & strict enforcement",
      "Contiguous Zone (12–24 nm): Fiscal, customs & pollution control jurisdiction",
      "Exclusive Economic Zone (EEZ, up to 200 nm): Sovereign resource jurisdiction",
      "Indian Coast Guard (ICG) Regional HQ routing & response ETA modeling",
    ],
  },
  {
    step: "05",
    title: "Cryptographic Evidence Vault",
    icon: FileCheck2,
    tag: "MARPOL COMPLIANT",
    color: "#7C3AED",
    desc: "Generates tamper-evident forensic packages for legal prosecution and environmental tribunal proceedings. Every fact is permanently recorded in an auditable ledger.",
    details: [
      "SHA-256 cryptographic hashing of raw telemetry and satellite quicklooks",
      "Court-admissible PDF & GeoJSON evidence dossier generation",
      "Compliant with IMO MARPOL Annex I legal standards for marine discharges",
    ],
  },
];

const SPECS = [
  { label: "SAR Sensor Support", value: "Sentinel-1A/B C-SAR, PlanetScope, Multi-Spectral" },
  { label: "Spatial Corridor", value: "10 to 50 Nautical Miles (Customizable)" },
  { label: "Temporal Window", value: "±48 Hours Pre/Post Observation" },
  { label: "Position Tracking", value: "Class A & B AIS, Satellite AIS, Terrestrial Base Stations" },
  { label: "Jurisdiction Engine", value: "UNCLOS 1982, Marine Regions EEZ v12, Custom AOIs" },
  { label: "Audit Ledger", value: "Immutable SHA-256 Digest Chain with Timestamping" },
];

export default function About() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] text-slate-900" data-testid="about-page">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="panel p-6 sm:p-8 relative overflow-hidden bg-white border-slate-200 shadow-sm">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-sky-800 mb-4 font-semibold">
              <Radar size={13} className="text-sky-600 animate-pulse" />
              Operational Maritime Domain Awareness
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Varuna <span className="text-sky-600">Netra</span>
            </h1>
            <p className="font-mono text-sm sm:text-base text-slate-600 mt-2 font-medium">
              AI-Assisted Satellite Marine Oil-Spill Intelligence &amp; Multi-Sensor Vessel Correlation System
            </p>
            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600 max-w-3xl">
              Varuna Netra (वरुण नेत्र — &quot;Eyes of the Ocean God&quot;) is a specialized command and decision-support platform designed for maritime safety agencies, coast guards, port state controllers, and environmental surveillance analysts. It bridges the critical gap between spaceborne radar detections of marine pollution and actionable, court-admissible vessel attribution.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1528] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#162B4D] transition-all"
              >
                Launch Surveillance Console <ArrowRight size={14} />
              </Link>
              <Link
                to="/zones"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Compass size={14} className="text-sky-600" /> Explore EEZ Zones
              </Link>
              <Link
                to="/health"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Activity size={14} className="text-emerald-600" /> Sensor Health
              </Link>
            </div>
          </div>
        </div>

        {/* 5-Stage Architecture Pipeline */}
        <div>
          <div className="mb-4">
            <p className="label-mono text-sky-700">System Architecture</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-1">
              End-to-End Intelligence Pipeline
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              From low-Earth orbit satellite acquisition to legal enforcement dossier generation.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((p, idx) => {
              const Icon = p.icon;
              const isSelected = activeStep === idx;
              return (
                <button
                  type="button"
                  key={p.step}
                  onClick={() => setActiveStep(idx)}
                  className={`panel p-4 text-left transition-all duration-200 cursor-pointer relative ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/50 shadow-md ring-1 ring-sky-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-extrabold text-slate-400">{p.step}</span>
                    <span
                      className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: `${p.color}15`, color: p.color }}
                    >
                      {p.tag}
                    </span>
                  </div>
                  <div
                    className="grid h-9 w-9 place-items-center rounded-lg mb-3 shadow-xs"
                    style={{ background: `${p.color}15`, border: `1px solid ${p.color}35` }}
                  >
                    <Icon size={18} style={{ color: p.color }} />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-slate-900 leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {p.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Step Deep-Dive Card */}
          <div className="panel p-6 mt-4 border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background: `${PIPELINE[activeStep].color}15`,
                    color: PIPELINE[activeStep].color,
                    border: `1px solid ${PIPELINE[activeStep].color}35`,
                  }}
                >
                  STAGE {PIPELINE[activeStep].step}
                </span>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {PIPELINE[activeStep].title}
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Component Specification &amp; Workflow
              </span>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              {PIPELINE[activeStep].desc}
            </p>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {PIPELINE[activeStep].details.map((d, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 flex items-start gap-2.5"
                >
                  <CheckCircle2 size={15} className="text-sky-600 shrink-0 mt-0.5" />
                  <span className="leading-snug font-medium">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Specifications Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* System Tolerances & Technical Specs */}
          <div className="panel p-6 border-slate-200 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-sky-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">Technical Specifications</h2>
            </div>
            <div className="space-y-2.5">
              {SPECS.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs"
                >
                  <span className="label-mono text-slate-500">{s.label}</span>
                  <span className="font-mono font-semibold text-slate-800">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Governance & IMO MARPOL Compliance */}
          <div className="panel p-6 border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-amber-600" />
                <h2 className="font-display text-lg font-bold text-slate-900">Governance &amp; Decision Support</h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Varuna Netra is engineered strictly in compliance with the International Convention for the Prevention of Pollution from Ships (MARPOL Annex I) and UNCLOS legal evidentiary guidelines:
              </p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-sky-600 font-bold">•</span>
                  <span><strong>Candidate Ranking:</strong> Outputs ranked probability distributions of potential suspect vessels based on physical parameters, not definitive culpability.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-600 font-bold">•</span>
                  <span><strong>Analyst Oversight:</strong> Final incident confirmation and formal enforcement referrals require explicit authorized human reviewer sign-off.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-600 font-bold">•</span>
                  <span><strong>Forensic Integrity:</strong> Cryptographic hashes guarantee no retrospective tampering with sensor data or algorithm parameters.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11px] font-mono text-amber-800">
              LEGAL NOTICE: Varuna Netra serves as an operational decision-support tool. Formal sanctions require corroboration via on-water physical sampling or aerial maritime patrol verification.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
