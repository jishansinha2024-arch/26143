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
  Database,
  ArrowRight,
  ExternalLink,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
  Cpu,
  Globe2,
} from "lucide-react";

const PIPELINE = [
  {
    step: "01",
    title: "Spaceborne Radar Ingestion",
    icon: Satellite,
    tag: "SENTINEL-1 SAR",
    color: "#00E5FF",
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
    color: "#38BDF8",
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
    color: "#F59E0B",
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
    color: "#10B981",
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
    color: "#A855F7",
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
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#070D18]" data-testid="about-page">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="panel p-6 sm:p-8 relative overflow-hidden border-[#1B2B44] bg-gradient-to-br from-[#0B1527] via-[#0D192F] to-[#070D18]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-cyan-300 mb-4">
              <Radar size={12} className="text-[#00E5FF] animate-pulse" />
              Operational Maritime Domain Awareness
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Varuna <span className="text-[#00E5FF]">Netra</span>
            </h1>
            <p className="font-mono text-sm sm:text-base text-slate-300 mt-2 font-medium">
              AI-Assisted Satellite Marine Oil-Spill Intelligence &amp; Multi-Sensor Vessel Correlation System
            </p>
            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-400 max-w-3xl">
              Varuna Netra (वरुण नेत्र — &quot;Eyes of the Ocean God&quot;) is a specialized command and decision-support platform designed for maritime safety agencies, coast guards, port state controllers, and environmental surveillance analysts. It bridges the critical gap between spaceborne radar detections of marine pollution and actionable, court-admissible vessel attribution.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#070D18] shadow-lg shadow-cyan-500/20 hover:bg-[#38BDF8] transition-all"
              >
                Launch Surveillance Console <ArrowRight size={14} />
              </Link>
              <Link
                to="/zones"
                className="inline-flex items-center gap-2 rounded-lg border border-[#1E314B] bg-[#0A1324] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-[#111F36] hover:text-white transition-colors"
              >
                <Compass size={14} className="text-cyan-400" /> Explore EEZ Zones
              </Link>
              <Link
                to="/health"
                className="inline-flex items-center gap-2 rounded-lg border border-[#1E314B] bg-[#0A1324] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-[#111F36] hover:text-white transition-colors"
              >
                <Activity size={14} className="text-emerald-400" /> Sensor Health
              </Link>
            </div>
          </div>
        </div>

        {/* 5-Stage Architecture Pipeline */}
        <div>
          <div className="mb-4">
            <p className="label-mono text-cyan-400">System Architecture</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white mt-1">
              End-to-End Intelligence Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              From low-Earth orbit satellite acquisition to legal enforcement dossier generation.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
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
                      ? "border-cyan-400/80 bg-[#12213A] shadow-lg shadow-cyan-500/10"
                      : "border-[#1B2B44] bg-[#0B1526]/80 hover:border-slate-600 hover:bg-[#0E1B31]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-extrabold text-slate-400">{p.step}</span>
                    <span
                      className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold"
                      style={{ background: `${p.color}22`, color: p.color }}
                    >
                      {p.tag}
                    </span>
                  </div>
                  <div
                    className="grid h-9 w-9 place-items-center rounded-lg mb-3"
                    style={{ background: `${p.color}15`, border: `1px solid ${p.color}40` }}
                  >
                    <Icon size={18} style={{ color: p.color }} />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-white leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {p.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Step Deep-Dive Card */}
          <div className="panel p-6 mt-4 border-[#1B2B44] bg-[#0E1A2E] fade-up">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1B2B44] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-xs px-2.5 py-1 rounded font-bold"
                  style={{
                    background: `${PIPELINE[activeStep].color}20`,
                    color: PIPELINE[activeStep].color,
                    border: `1px solid ${PIPELINE[activeStep].color}40`,
                  }}
                >
                  STAGE {PIPELINE[activeStep].step}
                </span>
                <h3 className="font-display text-xl font-bold text-white">
                  {PIPELINE[activeStep].title}
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-400">
                Component Specification &amp; Workflow
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {PIPELINE[activeStep].desc}
            </p>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {PIPELINE[activeStep].details.map((d, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#1E314B] bg-[#080E1C] p-3.5 text-xs text-slate-300 flex items-start gap-2.5"
                >
                  <CheckCircle2 size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Specifications Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* System Tolerances & Technical Specs */}
          <div className="panel p-6 border-[#1B2B44] bg-[#0A1424]">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-cyan-400" />
              <h2 className="font-display text-lg font-bold text-white">Technical Specifications</h2>
            </div>
            <div className="space-y-3">
              {SPECS.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between rounded-md border border-[#1B2B44] bg-[#070D18] px-3.5 py-2.5 text-xs"
                >
                  <span className="label-mono text-slate-400">{s.label}</span>
                  <span className="font-mono font-medium text-slate-200">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Governance & IMO MARPOL Compliance */}
          <div className="panel p-6 border-[#1B2B44] bg-[#0A1424] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-amber-400" />
                <h2 className="font-display text-lg font-bold text-white">Governance &amp; Decision Support</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Varuna Netra is engineered strictly in compliance with the International Convention for the Prevention of Pollution from Ships (MARPOL Annex I) and UNCLOS legal evidentiary guidelines:
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Candidate Ranking:</strong> Outputs ranked probability distributions of potential suspect vessels based on physical parameters, not definitive culpability.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Analyst Oversight:</strong> Final incident confirmation and formal enforcement referrals require explicit authorized human reviewer sign-off.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Forensic Integrity:</strong> Cryptographic hashes guarantee no retrospective tampering with sensor data or algorithm parameters.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-[11px] font-mono text-amber-200">
              LEGAL NOTICE: Varuna Netra serves as an operational decision-support tool. Formal sanctions require corroboration via on-water physical sampling or aerial maritime patrol verification.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
