import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/* ---- Icons ---- */
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-rotate">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-rotate">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<'qa' | 'extract' | 'trace' | 'compare'>('qa');

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans selection:bg-accent-soft selection:text-accent relative overflow-x-hidden">
      
      {/* Ambient background glow lighting */}
      <div className="ambient-glow-top" />

      {/* ── HEADER / NAVIGATION ── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 h-16 flex items-center justify-between px-6 lg:px-12 select-none transition-all duration-200 ${
          navScrolled ? 'glass-nav shadow-glass' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center flex-shrink-0 shadow-btn transition-transform duration-200 group-hover:scale-105 group-hover:shadow-btn-hover">
            <span className="text-sm font-bold text-white leading-none tracking-tight">D</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-text-primary tracking-tight leading-none group-hover:text-accent transition-colors duration-150">
              Datum
            </span>
            <span className="text-[10px] text-text-muted font-mono tracking-widest mt-0.5 uppercase">
              AUTOSAR HLD AI
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full glass-badge text-text-muted mr-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="font-semibold text-text-secondary">Tata TechPulse CS1</span>
          </div>

          <button
            onClick={toggleTheme}
            className="w-9 h-9 btn-icon"
            title={`Switch to ${theme === 'blueprint' ? 'light' : 'dark'} mode`}
          >
            {theme === 'blueprint' ? <SunIcon /> : <MoonIcon />}
          </button>

          <a
            href="https://github.com/SwayamMandhani06/datum"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 btn-icon"
            title="GitHub Repository"
          >
            <GithubIcon />
          </a>

          <Link
            to="/workspace"
            className="btn-primary btn-shimmer h-9 px-4 text-xs font-semibold !rounded-xl group"
          >
            <span>Launch Workspace</span>
            <ArrowRightIcon />
          </Link>
        </nav>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="pt-32 pb-20 px-6 lg:px-12 border-b border-border-theme relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Kicker badge */}
          <div className="kicker-pill text-accent mb-6 fade-in-up">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(217,119,6,0.6)]" />
            <span className="font-bold">CASE STUDY 1</span>
            <span className="text-text-subtle">·</span>
            <span className="text-text-secondary font-medium">AUTOSAR HLD Document Analysis Assistant</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary tracking-tight leading-[1.14] max-w-4xl fade-in-up">
            Automating architectural knowledge &amp; traceability in AUTOSAR specifications.
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-text-muted max-w-3xl leading-relaxed fade-in-up font-normal">
            Datum ingests 400+ page AUTOSAR High-Level Design documents, extracts components, ports, interfaces, and signal flows, answers complex technical queries with verbatim page citations, and detects cross-document inconsistencies.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5 fade-in-up">
            <Link
              to="/workspace"
              className="btn-primary btn-shimmer h-12 px-7 text-sm font-semibold !rounded-xl group shadow-btn hover:shadow-btn-hover"
            >
              <span>Open Engineering Workspace</span>
              <ArrowRightIcon />
            </Link>

            <a
              href="#interactive-demo"
              className="btn-glass h-12 px-6 text-sm font-medium !rounded-xl"
            >
              Explore Live Architecture Sandbox
            </a>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost h-12 px-4 text-xs font-mono"
            >
              API Reference &rarr;
            </a>
          </div>

          {/* KPI Telemetry Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 pt-8 border-t border-border-theme fade-in-up">
            <div className="glass-card-interactive p-5 sm:p-6 !rounded-2xl min-w-0">
              <div className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold truncate" title="Pytest Suite">
                Pytest Suite
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1 tracking-tight truncate" title="17 / 17 Passed">
                17 / 17 Passed
              </div>
              <div className="text-xs text-text-subtle mt-1 font-medium">100% Automated CI Suite</div>
            </div>

            <div className="glass-card-interactive p-5 sm:p-6 !rounded-2xl min-w-0">
              <div className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold truncate" title="Citation Grounding">
                Citation Grounding
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-accent mt-1 tracking-tight truncate" title="100% Verbatim">
                100% Verbatim
              </div>
              <div className="text-xs text-text-subtle mt-1 font-medium">Exact section &amp; page evidence</div>
            </div>

            <div className="glass-card-interactive p-5 sm:p-6 !rounded-2xl min-w-0">
              <div className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold truncate" title="Vector Index">
                Vector Index
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-blue-400 mt-1 tracking-tight truncate" title="Qdrant Cloud">
                Qdrant Cloud
              </div>
              <div className="text-xs text-text-subtle mt-1 font-medium">BGE-Small dense vectors</div>
            </div>

            <div className="glass-card-interactive p-5 sm:p-6 !rounded-2xl min-w-0">
              <div className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold truncate" title="Hallucination Risk">
                Hallucination Risk
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-text-primary mt-1 tracking-tight truncate" title="0% (Strict Refusal)">
                0% (Strict Refusal)
              </div>
              <div className="text-xs text-text-subtle mt-1 font-medium">Out-of-scope question defense</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE LIVE ARCHITECTURE SANDBOX ── */}
      <section id="interactive-demo" className="py-20 px-6 lg:px-12 bg-surface-1/50 border-b border-border-theme relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="section-label mb-2">Live Architecture Sandbox</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Inspect Real AUTOSAR Engineering Outputs
              </h2>
            </div>
            <div className="glass-badge text-xs font-mono text-text-muted px-3 py-1">
              <span>Reference Spec:</span>
              <strong className="text-text-primary font-mono ml-1">AUTOSAR_CP_TPS_ECUResourceTemplate.pdf</strong>
            </div>
          </div>

          {/* Interactive Container with Glassmorphism */}
          <div className="glass-card !rounded-2xl overflow-hidden shadow-glass border-border-strong">
            {/* Tabs Bar */}
            <div className="h-13 border-b border-border-theme bg-surface-1/80 backdrop-blur-md px-4 flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setActiveDemoTab('qa')}
                className={`tab-pill ${activeDemoTab === 'qa' ? 'active' : ''}`}
              >
                <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">1</span>
                <span>Grounded Q&amp;A + Citation</span>
              </button>
              <button
                onClick={() => setActiveDemoTab('extract')}
                className={`tab-pill ${activeDemoTab === 'extract' ? 'active' : ''}`}
              >
                <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">2</span>
                <span>Architecture Extraction</span>
              </button>
              <button
                onClick={() => setActiveDemoTab('trace')}
                className={`tab-pill ${activeDemoTab === 'trace' ? 'active' : ''}`}
              >
                <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">3</span>
                <span>Interface Traceability</span>
              </button>
              <button
                onClick={() => setActiveDemoTab('compare')}
                className={`tab-pill ${activeDemoTab === 'compare' ? 'active' : ''}`}
              >
                <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">4</span>
                <span>Cross-Spec Inconsistency</span>
              </button>
            </div>

            {/* Tab 1: Q&A Demo */}
            {activeDemoTab === 'qa' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[350px] fade-in-up">
                <div className="lg:col-span-8 p-6 lg:p-8 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-border-theme">
                  {/* User Query */}
                  <div className="self-end max-w-md">
                    <div className="bg-gradient-to-r from-accent to-accent-dim text-white text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-btn leading-relaxed font-medium">
                      What hardware resources and driver configurations are defined for the ADC unit?
                    </div>
                    <div className="text-right text-[11px] text-text-subtle mt-1.5 font-mono px-1">10:14 · Systems Architect</div>
                  </div>

                  {/* AI Response */}
                  <div className="glass-card p-5 space-y-2 border-l-4 border-accent max-w-xl">
                    <div className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-bold">
                      Datum (Verified Response)
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">
                      The ADC peripheral configuration specifies hardware unit bindings through{' '}
                      <code className="font-mono text-xs bg-surface-2 border border-border px-1.5 py-0.5 rounded text-accent font-semibold">
                        HwElement
                      </code>{' '}
                      and describes multichannel sampling channels mapped to{' '}
                      <code className="font-mono text-xs bg-surface-2 border border-border px-1.5 py-0.5 rounded text-accent font-semibold">
                        HwPinGroup
                      </code>{' '}
                      <button className="citation-badge font-bold">
                        [1]
                      </button>
                      . Clock pre-scalers and reference voltage inputs are constrained according to the ECU resource template specification.
                    </p>
                  </div>

                  <div className="mt-auto pt-3 border-t border-border-theme text-xs text-text-subtle flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                      Confidence: <strong className="text-emerald-400 font-mono">HIGH (Grounded)</strong>
                    </span>
                    <span className="font-mono text-[11px]">Model: openai/gpt-oss-120b</span>
                  </div>
                </div>

                {/* Citation Evidence Panel */}
                <div className="lg:col-span-4 bg-evidence-bg/80 backdrop-blur-md p-6 flex flex-col gap-4 text-xs">
                  <div className="pb-3 border-b border-evidence-border flex items-center justify-between">
                    <span className="font-bold text-evidence-text uppercase tracking-wider text-[11px]">
                      Verified Source Evidence
                    </span>
                    <span className="citation-badge font-bold">
                      [1]
                    </span>
                  </div>
                  <div>
                    <span className="text-evidence-muted block mb-1 font-semibold">Source Specification</span>
                    <span
                      className="font-mono text-evidence-text font-medium break-words [word-break:break-word] glass-badge px-2.5 py-1 block"
                      title="AUTOSAR_CP_TPS_ECUResourceTemplate.pdf"
                    >
                      AUTOSAR_CP_TPS_ECUResourceTemplate.pdf
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass-card p-2.5">
                      <span className="text-evidence-muted block text-[10px] uppercase font-bold">Section</span>
                      <span className="font-mono text-evidence-text font-bold text-xs">Sec 3.4 HwElement</span>
                    </div>
                    <div className="glass-card p-2.5">
                      <span className="text-evidence-muted block text-[10px] uppercase font-bold">Page</span>
                      <span className="font-mono text-accent font-bold text-xs">Page 18</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-evidence-muted block mb-1 font-semibold">Verbatim Extracted Excerpt</span>
                    <p className="p-3.5 rounded-xl bg-surface-0/40 border border-evidence-border text-evidence-text font-mono text-[11px] leading-relaxed italic glass-card border-l-3 border-accent">
                      "A HwElement represents an architectural entity describing physical hardware units, pins, and peripherals such as ADC converters and bus controllers mapped to the microcontroller resources."
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Extraction Demo */}
            {activeDemoTab === 'extract' && (
              <div className="p-6 fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-text-muted font-medium">Extracted Architectural Elements (Sample 4 of 95)</span>
                  <span className="glass-badge text-xs font-mono text-emerald-400">Export formats: CSV &amp; JSON</span>
                </div>
                <div className="border border-border-theme rounded-xl overflow-hidden glass-card">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-surface-2 border-b border-border-theme text-text-muted font-mono font-bold">
                          <th className="py-3 px-4">Entity Name</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4 text-right">Page</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-theme">
                        <tr className="hover:bg-surface-1/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent glass-badge my-1">HwElement</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 font-bold">component</span></td>
                          <td className="py-3 px-4 text-text-secondary leading-relaxed">Hardware element entity representing physical microcontroller modules and pins.</td>
                          <td className="py-3 px-4 text-right font-mono text-accent font-bold">p.18</td>
                        </tr>
                        <tr className="hover:bg-surface-1/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent glass-badge my-1">HwPinGroup</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/25 font-bold">port</span></td>
                          <td className="py-3 px-4 text-text-secondary leading-relaxed">Port pin grouping providing multichannel connectivity to ECU external circuitry.</td>
                          <td className="py-3 px-4 text-right font-mono text-accent font-bold">p.24</td>
                        </tr>
                        <tr className="hover:bg-surface-1/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent glass-badge my-1">HwDescriptionEntity</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">interface</span></td>
                          <td className="py-3 px-4 text-text-secondary leading-relaxed">Formal description interface binding hardware characteristics to BSW drivers.</td>
                          <td className="py-3 px-4 text-right font-mono text-accent font-bold">p.31</td>
                        </tr>
                        <tr className="hover:bg-surface-1/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent glass-badge my-1">AdcClockPrescalerSignal</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/25 font-bold">signal</span></td>
                          <td className="py-3 px-4 text-text-secondary leading-relaxed">Clock frequency scaling parameter signal controlling ADC conversion timing.</td>
                          <td className="py-3 px-4 text-right font-mono text-accent font-bold">p.45</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Traceability Demo */}
            {activeDemoTab === 'trace' && (
              <div className="p-6 space-y-4 fade-in-up">
                <div className="glass-card p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-text-primary tracking-tight">HwElement (ADC Microcontroller Subsystem)</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">
                      Provided (Server)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="glass-card p-3.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2">Associated Ports</div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">HwPinGroup</span>
                        <span className="text-xs font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">AdcChannelPort</span>
                      </div>
                    </div>
                    <div className="glass-card p-3.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Coupled Interfaces</div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium">HwDescriptionEntity</span>
                      </div>
                    </div>
                    <div className="glass-card p-3.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-2">Carried Signals</div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs font-mono bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/20 font-medium">AdcClockPrescaler</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Comparison Demo */}
            {activeDemoTab === 'compare' && (
              <div className="p-6 space-y-4 fade-in-up">
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-border-theme mb-3">
                    <span className="text-xs font-mono text-text-muted">
                      Comparison: ECUResourceTemplate vs BSWModuleDescriptionTemplate
                    </span>
                    <span className="glass-badge text-xs font-mono font-bold text-accent">1 Inconsistency Flagged</span>
                  </div>
                  <div className="p-4 rounded-xl bg-warn-soft border border-warn/30 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-warn font-mono uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                        [WARNING] Specification Scope Divergence
                      </span>
                      <code className="text-accent bg-surface-2 px-2 py-0.5 rounded-md font-mono font-bold">BswModuleDescription</code>
                    </div>
                    <p className="text-text-primary leading-relaxed font-medium">
                      Significant divergence in architectural description depth between ECU Resource Template (p.12) and BSW Module Description Template (p.84).
                    </p>
                    <div className="mt-2.5 text-text-secondary bg-surface-2/80 p-2.5 rounded-lg border border-border-theme">
                      <strong className="text-text-primary">Resolution: </strong>Align interface documentation between high-level description and module template.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CASE STUDY 1 REQUIREMENTS COMPLIANCE MATRIX ── */}
      <section className="py-20 px-6 lg:px-12 border-b border-border-theme relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="section-label mb-2">Tata Technologies TechPulse FY-26</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Case Study 1 Requirements Compliance Matrix
            </h2>
            <p className="mt-3 text-base text-text-muted leading-relaxed font-normal">
              Datum satisfies every functional specification and expected output required under Case Study 1: AUTOSAR HLD Document Analysis Assistant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "1. Document Upload & Controlled Ingestion",
                desc: "PyMuPDF layout-aware parsing extracts headings, paragraphs, and tables from complex AUTOSAR specifications while discarding running headers and footers.",
              },
              {
                title: "2. Architecture Entity Recognition",
                desc: "Extracts software components, ports, interfaces, and signals with grounded page citations, source chunk IDs, and SQLite caching.",
              },
              {
                title: "3. Grounded Q&A with Verbatim Page Citations",
                desc: "Dense vector retrieval against Qdrant Cloud pairs user queries with relevant excerpts, enforcing strict inline citation tags (e.g. [1], [2]).",
              },
              {
                title: "4. Out-of-Scope Defense & Low-Confidence Refusal",
                desc: "Refuses out-of-domain questions with zero hallucination, flagging low-confidence warnings when specification coverage is absent.",
              },
              {
                title: "5. Document Comparison & Inconsistency Reporting",
                desc: "Performs cross-specification audits between documents or revisions, computing compatibility scores and highlighting classification conflicts.",
              },
              {
                title: "6. Interface & Dependency Traceability Mapping",
                desc: "Correlates components with associated ports, interfaces, and signals, categorizing data flow as Provided, Required, Bidirectional, or Internal.",
              },
              {
                title: "7. Structured Export for Downstream Tooling",
                desc: "One-click export of architectural findings, entities, and comparison audits into CSV, JSON, and Markdown files.",
              },
              {
                title: "8. Strict Human Governance Controls",
                desc: "Preserves human engineering review; AI outputs serve as evidence-grounded recommendations without unauthorized automated approval.",
              },
            ].map((item, idx) => (
              <div key={idx} className="glass-card-interactive p-5 sm:p-6 flex items-start gap-4 !rounded-2xl group min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm group-hover:scale-105 transition-transform">
                  <CheckIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-text-primary tracking-tight leading-snug">{item.title}</h3>
                  <p className="text-xs text-text-muted mt-1.5 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION SECTION ── */}
      <section className="py-20 px-6 lg:px-12 border-b border-border-theme relative z-10">
        <div className="max-w-4xl mx-auto glass-card p-10 lg:p-14 text-center !rounded-3xl relative overflow-hidden shadow-glass border-border-strong">
          <div className="ambient-glow-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10">
            <div className="kicker-pill text-accent mb-4 inline-flex">
              <span>READY FOR EVALUATION &amp; DEPLOYMENT</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Ready to analyze AUTOSAR specifications?
            </h2>
            <p className="mt-4 text-base text-text-muted max-w-xl mx-auto leading-relaxed">
              Launch the engineering workspace to query specifications, explore dependency graphs, and download verified architecture inventories.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/workspace"
                className="btn-primary btn-shimmer h-12 px-8 text-sm font-semibold !rounded-xl group shadow-btn hover:shadow-btn-hover"
              >
                <span>Launch Engineering Workspace</span>
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 lg:px-12 bg-surface-1/60 backdrop-blur-md text-xs text-text-muted select-none relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs shadow-btn">
              D
            </div>
            <div>
              <span className="font-bold text-text-primary tracking-tight">Datum</span> — AI-Powered AUTOSAR HLD Document Analysis Assistant
              <p className="text-text-subtle text-[11px] mt-0.5 font-mono">Tata Technologies TechPulse FY-26 · Capstone CS1</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-text-subtle text-xs font-medium">
            <Link to="/workspace" className="hover:text-text-primary transition-colors">
              Workspace
            </Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
              API Docs
            </a>
            <a href="https://github.com/SwayamMandhani06/datum" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
              GitHub Repository
            </a>
            <span className="font-mono text-[11px]">MIT License</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
