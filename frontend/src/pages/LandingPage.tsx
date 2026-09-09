import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/* ---- Tiny icon set ---- */
const SunIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

/* ---- Scroll-reveal hook ---- */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const howRef = useInView(0.1);
  const featRef = useInView(0.1);
  const evidenceRef = useInView(0.1);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans">

      {/* ── NAV ── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-6 lg:px-12 select-none transition-colors duration-200 ${
          navScrolled ? 'bg-surface-1 border-b border-border-theme' : 'bg-transparent'
        }`}
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white leading-none">D</span>
          </div>
          <span className="font-semibold text-base text-text-primary tracking-tight">Datum</span>
        </Link>

        <nav className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
            title={`Switch to ${theme === 'blueprint' ? 'light' : 'dark'} mode`}
          >
            {theme === 'blueprint' ? <SunIcon /> : <MoonIcon />}
          </button>
          <a
            href="https://github.com/SwayamMandhani06/datum"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
          >
            <GithubIcon />
          </a>
          <Link
            to="/workspace"
            className="h-8 px-4 flex items-center text-sm font-medium rounded bg-accent text-white hover:bg-accent-dim transition-colors duration-150"
          >
            Open app
          </Link>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 pb-24 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">

          {/* Kicker line */}
          <p className="section-label mb-6 fade-in-up" style={{ animationDelay: '0ms' }}>
            AUTOSAR HLD Intelligence
          </p>

          {/* Headline — big, plain, heavy */}
          <h1
            className="text-5xl lg:text-6xl font-extrabold text-text-primary tracking-tight leading-tight max-w-3xl fade-in-up"
            style={{ animationDelay: '60ms' }}
          >
            Every answer, traced back to its source.
          </h1>

          <p
            className="mt-6 text-lg text-text-muted max-w-xl leading-relaxed fade-in-up"
            style={{ animationDelay: '120ms' }}
          >
            Datum reads AUTOSAR High-Level Design specifications and answers engineering
            questions with the exact section, page, and verbatim excerpt behind every claim.
            No hallucinations. No guessing.
          </p>

          <div className="mt-10 flex items-center gap-3 fade-in-up" style={{ animationDelay: '180ms' }}>
            <Link
              to="/workspace"
              className="h-10 px-6 flex items-center text-sm font-semibold rounded bg-accent text-white hover:bg-accent-dim transition-colors duration-150"
            >
              Open workspace
            </Link>
            <a
              href="https://github.com/SwayamMandhani06/datum"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 flex items-center gap-2 text-sm font-medium rounded border border-border-strong text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150"
            >
              <GithubIcon />
              GitHub
            </a>
          </div>
        </div>

        {/* Hero demo — static, flat, document-like */}
        <div
          className="max-w-5xl mx-auto mt-16 border border-border-theme bg-surface-1 rounded overflow-hidden fade-in-up"
          style={{ animationDelay: '240ms' }}
        >
          {/* Chrome bar */}
          <div className="h-9 px-4 border-b border-border-theme bg-surface-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">Grounded in:</span>
              <code className="text-xs font-mono text-text-primary bg-surface-3 border border-border-theme px-2 py-0.5 rounded-sm">
                AUTOSAR_TPS_SoftwareComponentTemplate.pdf
              </code>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success opacity-80" />
              <span className="text-xs text-text-muted">Ready · 381 pp</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[300px]">
            {/* Chat thread */}
            <div className="lg:col-span-8 p-6 lg:p-8 bg-surface-0 flex flex-col gap-6">
              {/* User message */}
              <div className="self-end max-w-sm">
                <div className="bg-accent text-white text-sm px-4 py-2.5 rounded-sm leading-relaxed">
                  What ports does the EngineSpeedSensor component expose?
                </div>
                <div className="text-right text-xs text-text-subtle mt-1 font-mono">14:32</div>
              </div>

              {/* AI response */}
              <div className="border-l-2 border-accent pl-4 max-w-xl">
                <div className="text-xs text-text-muted mb-2 font-mono uppercase tracking-wider">Datum</div>
                <p className="text-sm text-text-primary leading-relaxed">
                  The EngineSpeedSensor component specifies{' '}
                  <code className="font-mono text-xs bg-surface-2 border border-border-theme px-1 py-0.5 rounded-sm">pp_EngineSpeed</code>
                  {' '}as a PPortPrototype typed by{' '}
                  <code className="font-mono text-xs bg-surface-2 border border-border-theme px-1 py-0.5 rounded-sm">If_EngineSpeed</code>
                  {' '}
                  <span className="font-mono text-xs text-accent border border-accent-border bg-accent-soft px-1 py-0.5 rounded-sm cursor-pointer hover:bg-accent hover:text-white transition-colors duration-150">
                    [1]
                  </span>
                  . This port transmits filtered engine rotational velocity at a 10ms periodic cycle.
                </p>
              </div>

              <div className="text-xs text-text-subtle border-t border-border-theme pt-3">
                Click any citation marker to open the verified source excerpt
              </div>
            </div>

            {/* Evidence panel */}
            <div className="lg:col-span-4 bg-evidence-bg border-t lg:border-t-0 lg:border-l border-evidence-border p-5 flex flex-col gap-4">
              <div className="pb-3 border-b border-evidence-border flex items-center justify-between">
                <span className="text-sm font-semibold text-evidence-text">Source evidence</span>
                <code className="text-xs font-mono text-evidence-muted bg-surface-3/30 border border-evidence-border px-1.5 py-0.5 rounded-sm">[1]</code>
              </div>
              <div>
                <div className="text-xs text-evidence-muted mb-1">Location</div>
                <div className="font-mono text-xs font-medium text-evidence-text">Section 4.2 · Page 38</div>
              </div>
              <div>
                <div className="text-xs text-evidence-muted mb-2">Excerpt</div>
                <blockquote className="text-xs text-evidence-text leading-relaxed bg-surface-0/30 p-3 rounded-sm border-l-2 border-accent/40">
                  "The EngineSpeedSensor component specifies PPortPrototype pp_EngineSpeed referencing SenderReceiverInterface If_EngineSpeed with data element EngineSpeed_Rpm..."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROPERTIES STRIP ── */}
      <section className="border-y border-border-theme bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-6 grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-border-theme">
          {[
            { value: '100%', label: 'Citation-grounded' },
            { value: '0',    label: 'Hallucinations' },
            { value: '17',   label: 'Tests passing' },
            { value: '380+', label: 'Pages per doc' },
          ].map(({ value, label }) => (
            <div key={label} className="px-6 py-2 first:pl-0 last:pr-0">
              <div className="text-2xl font-bold text-accent font-mono">{value}</div>
              <div className="text-xs text-text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        ref={howRef.ref}
        className="py-24 px-6 lg:px-12"
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="fade-in-up"
            style={{ animationPlayState: howRef.visible ? 'running' : 'paused', opacity: howRef.visible ? undefined : 0 }}
          >
            <p className="section-label mb-4">Pipeline</p>
            <h2 className="text-3xl font-bold text-text-primary tracking-tight">How it works</h2>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-px bg-border-theme border border-border-theme">
            {[
              {
                n: '01',
                title: 'Upload specification',
                body: 'Drop in any AUTOSAR HLD PDF. Section-aware parsing preserves chapter hierarchy and heading numbers — even across 380-page specs.',
              },
              {
                n: '02',
                title: 'Ask a question',
                body: 'Write a plain-English question about port definitions, interface contracts, runnables, or timing envelopes. No special syntax.',
              },
              {
                n: '03',
                title: 'Verify the source',
                body: 'Every synthesized claim links to a numbered citation. Click it — the exact verbatim excerpt and page number open immediately.',
              },
            ].map(({ n, title, body }, i) => (
              <div
                key={n}
                className="bg-surface-0 p-8"
                style={{
                  opacity: howRef.visible ? 1 : 0,
                  transform: howRef.visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.45s ease ${i * 80}ms, transform 0.45s ease ${i * 80}ms`,
                }}
              >
                <div className="font-mono text-xs text-text-subtle mb-5">{n}</div>
                <h3 className="text-base font-semibold text-text-primary mb-3">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY IT'S DIFFERENT ── */}
      <section
        ref={featRef.ref}
        className="py-24 px-6 lg:px-12 bg-surface-1 border-y border-border-theme"
      >
        <div className="max-w-5xl mx-auto">
          <div
            style={{
              opacity: featRef.visible ? 1 : 0,
              transform: featRef.visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.45s ease, transform 0.45s ease',
            }}
          >
            <p className="section-label mb-4">Why Datum</p>
            <h2 className="text-3xl font-bold text-text-primary tracking-tight">Not a chatbot. A grounding engine.</h2>
            <p className="mt-3 text-base text-text-muted max-w-xl">
              The problem with LLMs on engineering documents isn't intelligence — it's accountability. Datum forces every claim to carry its source.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'No outside knowledge',
                body: 'The LLM prompt explicitly forbids using anything not present in the retrieved chunks. If it\'s not in your document, Datum won\'t claim it is.',
              },
              {
                title: 'Exact page citations',
                body: 'Every factual statement is marked with a [1] citation that expands to the section heading, page range, and word-for-word source text.',
              },
              {
                title: 'Section-aware chunking',
                body: 'Headers are stripped before embedding to prevent spurious matches. Chunks are segmented at chapter boundaries, not arbitrary character counts.',
              },
              {
                title: 'Structural extraction',
                body: 'Run a full-document sweep to classify every component, port, interface, and signal. Export as CSV or JSON for downstream tooling.',
              },
            ].map(({ title, body }, i) => (
              <div
                key={title}
                className="flat-card p-6 rounded"
                style={{
                  opacity: featRef.visible ? 1 : 0,
                  transform: featRef.visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.45s ease ${i * 70}ms, transform 0.45s ease ${i * 70}ms`,
                }}
              >
                <div className="w-1 h-8 bg-accent rounded-full mb-4" />
                <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVIDENCE SPLIT ── */}
      <section
        ref={evidenceRef.ref}
        className="py-24 px-6 lg:px-12"
      >
        <div className="max-w-5xl mx-auto">
          <div
            style={{
              opacity: evidenceRef.visible ? 1 : 0,
              transform: evidenceRef.visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.45s ease, transform 0.45s ease',
            }}
          >
            <p className="section-label mb-4">Traceability</p>
            <h2 className="text-3xl font-bold text-text-primary tracking-tight">Synthesis and evidence, kept separate.</h2>
            <p className="mt-3 text-base text-text-muted max-w-lg">
              AUTOSAR work requires traceability. Datum never conflates what the model inferred with what the document actually says.
            </p>
          </div>

          <div
            className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-px bg-border-theme border border-border-theme"
            style={{
              opacity: evidenceRef.visible ? 1 : 0,
              transition: 'opacity 0.5s ease 120ms',
            }}
          >
            {/* Synthesized */}
            <div className="bg-surface-0 p-7">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-theme">
                <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">AI Synthesized Answer</span>
                <code className="text-xs font-mono text-text-muted">grounded</code>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                The EngineSpeedSensor component specifies{' '}
                <code className="font-mono text-xs bg-surface-2 border border-border-theme px-1 py-0.5 rounded-sm">pp_EngineSpeed</code>
                {' '}as a PPortPrototype typed by{' '}
                <code className="font-mono text-xs bg-surface-2 border border-border-theme px-1 py-0.5 rounded-sm">If_EngineSpeed</code>
                {' '}
                <span className="font-mono text-xs text-accent border border-accent-border bg-accent-soft px-1 py-0.5 rounded-sm">
                  [1]
                </span>
                .
              </p>
              <p className="mt-5 text-xs text-text-subtle">Click a citation marker to see the source →</p>
            </div>

            {/* Evidence */}
            <div className="bg-evidence-bg p-7">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-evidence-border">
                <span className="text-xs font-semibold text-evidence-text uppercase tracking-wider">Primary Source Excerpt</span>
                <code className="text-xs font-mono text-evidence-muted">immutable</code>
              </div>
              <div className="mb-3">
                <div className="text-xs text-evidence-muted mb-0.5">Section 4.2 · Page 38</div>
              </div>
              <blockquote className="text-sm text-evidence-text leading-relaxed bg-surface-0/10 p-4 rounded-sm border-l-2 border-accent/50">
                "A SensorActuatorSoftwareComponentType represents a sensor or actuator hardware abstraction. The EngineSpeedSensor component specifies PPortPrototype pp_EngineSpeed referencing SenderReceiverInterface If_EngineSpeed with data element EngineSpeed_Rpm (uint16, resolution 0.25 rpm, range 0–8000 rpm)."
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 lg:px-12 bg-surface-1 border-t border-border-theme">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Ready to audit your specification?</h2>
            <p className="mt-2 text-base text-text-muted">Upload any AUTOSAR HLD PDF and start asking engineering questions.</p>
          </div>
          <Link
            to="/workspace"
            className="flex-shrink-0 h-10 px-8 flex items-center text-sm font-semibold rounded bg-accent text-white hover:bg-accent-dim transition-colors duration-150"
          >
            Open workspace
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border-theme py-8 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-accent flex items-center justify-center">
              <span className="text-[8px] font-bold text-white leading-none">D</span>
            </div>
            <span className="font-medium text-text-secondary">Datum</span>
            <span className="text-text-subtle">AUTOSAR HLD Intelligence · MIT License</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/workspace" className="hover:text-text-primary transition-colors duration-150">Workspace</Link>
            <a href="https://github.com/SwayamMandhani06/datum" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors duration-150">GitHub</a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
