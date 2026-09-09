import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/* ---- Inline SVG Icons ---- */
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const LayersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
const ZapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

/* ---- Animated Counter ---- */
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({
  target, suffix = '', duration = 1500
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* ---- Feature Card ---- */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  delay?: number;
}
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, gradient, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="glass-card rounded-2xl p-6 group cursor-default"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${gradient} text-white`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [navScrolled, setNavScrolled] = useState(false);
  const [pulseMarker, setPulseMarker] = useState(false);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseMarker(true);
      setTimeout(() => setPulseMarker(false), 700);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: <ShieldIcon />,
      title: 'Zero Hallucinations',
      description: 'Every factual claim is grounded in your document. The LLM is explicitly forbidden from using outside knowledge — only what your specification says.',
      gradient: 'bg-gradient-to-br from-indigo-500 to-violet-600',
      delay: 0,
    },
    {
      icon: <SearchIcon />,
      title: 'Exact Page Citations',
      description: 'Inline citation markers [1] link directly to the verbatim excerpt with section heading, page number, and cryptographic verification.',
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
      delay: 100,
    },
    {
      icon: <LayersIcon />,
      title: 'Section-Aware Chunking',
      description: 'Hierarchical PDF parsing preserves chapter structure, numbered headings, and section boundaries across 380+ page AUTOSAR specifications.',
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      delay: 200,
    },
    {
      icon: <ZapIcon />,
      title: 'Structural Extraction',
      description: 'Automatically extract and classify every component, port, interface, and signal from your specification with CSV/JSON export.',
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      delay: 300,
    },
  ];

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans relative overflow-x-hidden">

      {/* Sticky Glassmorphic Nav */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-12 select-none transition-all duration-300 ${
          navScrolled
            ? 'glass border-b border-glass-border shadow-lg'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center glow-sm">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold gradient-text">Datum</span>
            <span className="text-xs text-text-muted hidden sm:inline font-medium">Automotive HLD Assistant</span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {/* Theme toggle pill */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border-theme hover:border-accent-border transition-all duration-200 text-sm text-text-muted hover:text-text-primary"
          >
            {theme === 'blueprint' ? <MoonIcon /> : <SunIcon />}
            <span className="hidden sm:inline">{theme === 'blueprint' ? 'Dark' : 'Light'}</span>
          </button>
          <a
            href="https://github.com/SwayamMandhani06/datum"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-200"
          >
            <GithubIcon />
          </a>
          <Link
            to="/workspace"
            className="h-9 px-5 text-sm font-semibold rounded-xl gradient-bg text-white hover:opacity-90 active:scale-95 transition-all duration-200 flex items-center gap-2 glow-sm"
          >
            Launch App
            <ArrowRightIcon />
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16">

        {/* ── HERO SECTION ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 lg:px-12 overflow-hidden">

          {/* Aurora background orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="aurora-orb-1 absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
            <div className="aurora-orb-2 absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
            <div className="aurora-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)' }} />
            {/* Dot grid */}
            <div className="absolute inset-0 grid-dots opacity-40" />
          </div>

          {/* Badge */}
          <div className="relative z-10 mb-8 reveal-up" style={{ animationDelay: '0ms' }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-accent-border text-sm text-accent font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>AUTOSAR Classic &amp; Adaptive • Citation-Grounded AI</span>
            </div>
          </div>

          {/* Headline */}
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <h1
              className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6 reveal-up"
              style={{ animationDelay: '100ms' }}
            >
              <span className="text-text-primary">Every answer</span>
              <br />
              <span className="gradient-text">traced to its source.</span>
            </h1>
            <p
              className="text-lg lg:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed mb-10 reveal-up"
              style={{ animationDelay: '200ms' }}
            >
              Datum reads AUTOSAR High-Level Design specifications and answers engineering questions
              with the <strong className="text-text-secondary">exact section, page, and verbatim excerpt</strong> behind every single claim.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal-up" style={{ animationDelay: '300ms' }}>
              <Link
                to="/workspace"
                className="h-12 px-8 text-base font-semibold rounded-xl gradient-bg text-white hover:opacity-90 active:scale-95 transition-all duration-200 flex items-center gap-2 glow"
              >
                Open Workspace
                <ArrowRightIcon />
              </Link>
              <a
                href="https://github.com/SwayamMandhani06/datum"
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-8 text-base font-semibold rounded-xl glass border border-border-strong text-text-primary hover:border-accent-border hover:text-accent transition-all duration-200 flex items-center gap-2"
              >
                <GithubIcon />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Hero Demo Preview */}
          <div
            className="relative z-10 mt-16 w-full max-w-5xl mx-auto reveal-up"
            style={{ animationDelay: '450ms' }}
          >
            <div className="glass-strong rounded-2xl overflow-hidden border border-border-strong shadow-elevated">
              {/* Window chrome */}
              <div className="h-10 px-4 flex items-center gap-2 border-b border-glass-border bg-surface-2/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 flex justify-center">
                  <span className="text-xs text-text-muted font-mono">datum — workspace</span>
                </div>
              </div>

              {/* Mockup content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[340px]">
                {/* Chat thread */}
                <div className="lg:col-span-8 p-6 lg:p-8 flex flex-col gap-6 bg-surface-0/80">
                  {/* User question */}
                  <div className="flex justify-end">
                    <div className="max-w-sm gradient-bg rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm font-medium shadow-glow-sm">
                      What ports does the EngineSpeedSensor component expose?
                    </div>
                  </div>

                  {/* AI answer */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">D</span>
                      </div>
                      <span className="text-xs text-text-muted font-medium">Datum</span>
                    </div>
                    <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3">
                      <p className="text-sm text-text-primary leading-relaxed">
                        The EngineSpeedSensor component specifies{' '}
                        <code className="font-mono text-xs bg-surface-3 text-accent px-1.5 py-0.5 rounded">pp_EngineSpeed</code>
                        {' '}as a PPortPrototype typed by SenderReceiverInterface{' '}
                        <code className="font-mono text-xs bg-surface-3 text-accent px-1.5 py-0.5 rounded">If_EngineSpeed</code>
                        {' '}
                        <button className={`inline-flex items-center font-mono text-xs px-1.5 py-0.5 rounded-md text-accent border border-accent-border hover:bg-accent-soft transition-all ${pulseMarker ? 'animate-citation-glow' : ''}`}>
                          [1]
                        </button>
                        . This port transmits filtered engine velocity at 10ms periodic cycle.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evidence panel */}
                <div className="lg:col-span-4 p-5 flex flex-col gap-4 bg-evidence-bg border-t lg:border-t-0 lg:border-l border-evidence-border">
                  <div className="flex items-center justify-between pb-3 border-b border-evidence-border">
                    <span className="text-sm font-semibold text-evidence-text">Source Evidence</span>
                    <span className="font-mono text-xs px-2 py-1 rounded-md bg-accent-soft text-accent border border-accent-border">[1]</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-evidence-muted">Document locator</p>
                    <p className="font-mono text-xs font-semibold text-evidence-text">Section 4.2, Page 38</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-evidence-muted">Verified excerpt</p>
                    <blockquote className="text-xs text-evidence-text leading-relaxed bg-surface-3/30 p-3 rounded-lg border-l-2 border-accent">
                      "The EngineSpeedSensor component specifies PPortPrototype pp_EngineSpeed referencing SenderReceiverInterface If_EngineSpeed with data element EngineSpeed_Rpm..."
                    </blockquote>
                  </div>
                  <div className="pt-2 border-t border-evidence-border">
                    <span className="text-xs font-mono text-success">✓ SHA-256 verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow under demo */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-accent/20 blur-3xl rounded-full pointer-events-none" />
          </div>

          {/* Scroll indicator */}
          <div className="relative z-10 mt-16 flex flex-col items-center gap-2 text-text-muted reveal-up" style={{ animationDelay: '600ms' }}>
            <span className="text-xs">Scroll to explore</span>
            <div className="w-px h-8 bg-gradient-to-b from-accent/50 to-transparent" />
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <section className="px-6 lg:px-12 py-16 border-y border-border-theme bg-surface-1/50">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 17, suffix: '', label: 'Passing Tests' },
              { value: 100, suffix: '%', label: 'Groundedness Rate' },
              { value: 380, suffix: '+', label: 'Page Docs Handled' },
              { value: 0, suffix: ' hallucinations', label: 'Verified' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <div className="text-4xl font-extrabold gradient-text">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-text-muted font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section className="px-6 lg:px-12 py-24 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-border-theme text-xs text-accent font-medium mb-6">
              Built for AUTOSAR Engineers
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight">
              Why Datum is <span className="gradient-text">different</span>
            </h2>
            <p className="mt-4 text-lg text-text-muted max-w-xl mx-auto">
              Not another generic AI chatbot. A precision grounding engine for automotive software architecture.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="px-6 lg:px-12 py-24 bg-surface-1/50 border-y border-border-theme">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                How it works
              </h2>
              <p className="mt-3 text-lg text-text-muted max-w-xl mx-auto">
                A deterministic sequential pipeline with zero guesswork.
              </p>
            </div>

            <div className="relative">
              {/* Connecting line on desktop */}
              <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: '01',
                    title: 'Upload Specification',
                    desc: 'Drag and drop any AUTOSAR HLD PDF. Span-level parsing preserves chapter numbers, section hierarchy, and page boundaries.',
                    color: 'from-indigo-500 to-violet-600',
                  },
                  {
                    step: '02',
                    title: 'Ask a Question',
                    desc: 'Query port definitions, interface contracts, runnables, and timing envelopes in plain engineering language.',
                    color: 'from-violet-500 to-purple-600',
                  },
                  {
                    step: '03',
                    title: 'Verify the Evidence',
                    desc: 'Every claim links to an exact page excerpt. Click any [1] citation marker to inspect the verbatim source text.',
                    color: 'from-purple-500 to-pink-600',
                  },
                ].map(({ step, title, desc, color }) => (
                  <div key={step} className="glass-card rounded-2xl p-6 text-center group hover:scale-105 transition-transform duration-300">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-4 shadow-glow-sm group-hover:glow transition-all duration-300`}>
                      <span className="font-mono text-xl font-bold text-white">{step}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── EVIDENCE SPLIT ── */}
        <section className="px-6 lg:px-12 py-24 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
              Built on <span className="gradient-text">evidence</span>, not guesses
            </h2>
            <p className="mt-4 text-lg text-text-muted max-w-xl mx-auto">
              Synthesized answers and immutable document evidence live side-by-side with a visual separator.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Synthesized answer */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-theme">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm font-semibold text-text-primary">AI Synthesized Answer</span>
                </div>
                <span className="text-xs font-mono text-text-muted px-2 py-1 rounded bg-surface-2">grounded</span>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                The EngineSpeedSensor component specifies{' '}
                <code className="font-mono text-xs bg-surface-3 text-accent px-1.5 py-0.5 rounded">pp_EngineSpeed</code>
                {' '}as a PPortPrototype typed by{' '}
                <code className="font-mono text-xs bg-surface-3 text-accent px-1.5 py-0.5 rounded">If_EngineSpeed</code>
                {' '}
                <span className="inline-flex items-center font-mono text-xs px-1.5 py-0.5 rounded-md text-accent border border-accent-border bg-accent-soft">
                  [1]
                </span>
                . This port transmits the filtered engine rotational velocity at a 10ms periodic cycle.
              </p>
              <p className="mt-4 text-xs text-text-muted">Click any citation marker to open the verified source excerpt →</p>
            </div>

            {/* Evidence panel */}
            <div className="rounded-2xl p-6 bg-evidence-bg border border-evidence-border">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-evidence-border">
                <span className="text-sm font-semibold text-evidence-text">Primary Source Excerpt</span>
                <span className="text-xs font-mono text-evidence-muted px-2 py-1 rounded bg-surface-3/20">immutable</span>
              </div>
              <p className="text-xs text-evidence-muted mb-1">Document locator</p>
              <p className="font-mono text-sm font-semibold text-evidence-text mb-4">Section 4.2, Page 38</p>
              <blockquote className="text-sm text-evidence-text leading-relaxed bg-surface-3/20 p-4 rounded-xl border-l-2 border-accent">
                "A SensorActuatorSoftwareComponentType represents a sensor or actuator hardware abstraction. The EngineSpeedSensor component specifies PPortPrototype pp_EngineSpeed referencing SenderReceiverInterface If_EngineSpeed with data element EngineSpeed_Rpm (uint16, resolution 0.25 rpm, range 0..8000 rpm)."
              </blockquote>
              <p className="mt-4 text-xs font-mono text-success">✓ SHA-256 verified excerpt</p>
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="px-6 lg:px-12 py-20 relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg opacity-10 pointer-events-none" />
          <div className="absolute inset-0 grid-dots opacity-30 pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-extrabold text-text-primary tracking-tight mb-4">
              Ready to audit your specification?
            </h2>
            <p className="text-lg text-text-muted mb-8">
              Upload any AUTOSAR HLD PDF and start asking engineering questions in seconds.
            </p>
            <Link
              to="/workspace"
              className="inline-flex items-center gap-2 h-13 px-10 text-base font-bold rounded-xl gradient-bg text-white hover:opacity-90 active:scale-95 transition-all duration-200 glow"
            >
              <UploadIcon />
              Open Workspace
              <ArrowRightIcon />
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border-theme bg-surface-1/50 py-10 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div>
              <div className="font-bold gradient-text">Datum</div>
              <div className="text-xs text-text-muted">AUTOSAR HLD Intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <Link to="/workspace" className="hover:text-accent transition-colors">Workspace</Link>
            <a href="https://github.com/SwayamMandhani06/datum" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors flex items-center gap-1.5">
              <GithubIcon /> GitHub
            </a>
            <span>MIT License</span>
          </div>
          <div className="text-xs text-text-muted">
            © {new Date().getFullYear()} Datum. Built with FastAPI + React + Groq.
          </div>
        </div>
      </footer>
    </div>
  );
};
