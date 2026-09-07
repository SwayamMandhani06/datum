import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';

export const LandingPage: React.FC = () => {
  const [navScrolled, setNavScrolled] = useState(false);
  const [tracerActive, setTracerActive] = useState(false);
  const [pulseMarker, setPulseMarker] = useState(false);
  const [connectingLineWidth, setConnectingLineWidth] = useState(0);
  const [highlightSwept, setHighlightSwept] = useState(false);

  const howItWorksRef = useRef<HTMLElement>(null);
  const builtOnEvidenceRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  // 1. Sticky Nav scroll listener: subtle border/shadow once past hero
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setNavScrolled(scrollY > 40);

      // 2. "How it works" line drawing tied to scroll position
      if (howItWorksRef.current) {
        const rect = howItWorksRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // Start drawing when the section is partially visible, complete before it leaves
        const startY = windowHeight * 0.85;
        const endY = windowHeight * 0.35;
        const currentY = rect.top;

        if (currentY <= startY) {
          const progress = Math.min(1, Math.max(0, (startY - currentY) / (startY - endY)));
          setConnectingLineWidth((prev) => Math.max(prev, Math.round(progress * 100)));
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 3. Hero load animation: thin line draws from headline down into preview panel, pulses citation [1]
  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    // Trigger tracer line drawing
    const tracerTimer = setTimeout(() => {
      setTracerActive(true);
    }, 250);

    // After line finishes drawing (~650ms), pulse citation marker [1] once (~600ms)
    const pulseTimer = setTimeout(() => {
      setPulseMarker(true);
      setTimeout(() => {
        setPulseMarker(false);
      }, 650);
    }, 950);

    return () => {
      clearTimeout(tracerTimer);
      clearTimeout(pulseTimer);
    };
  }, []);

  // 4. "Built on evidence" section: IntersectionObserver triggers single soft highlight sweep (~500ms)
  useEffect(() => {
    const element = builtOnEvidenceRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Timed slightly after section enters view (~250ms)
          setTimeout(() => {
            setHighlightSwept(true);
          }, 250);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans relative">
      {/* a) Sticky Glass Nav */}
      <header
        className={`sticky top-0 z-30 h-16 glass-chrome flex items-center justify-between px-6 lg:px-12 select-none transition-all duration-200 ${
          navScrolled ? 'border-b border-glass-border shadow-sm' : 'border-b border-transparent'
        }`}
      >
        <div className="flex items-baseline space-x-3">
          <Link
            to="/"
            className="text-scale-22 font-semibold text-text-primary tracking-tight hover:text-accent transition-colors"
          >
            Datum
          </Link>
          <span className="text-scale-13 text-text-muted hidden sm:inline">
            Automotive HLD Assistant
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link
            to="/workspace"
            className="h-9 px-4 text-scale-15 font-medium bg-accent text-surface-0 hover:opacity-90 active:opacity-80 transition-opacity flex items-center justify-center"
          >
            Open workspace
          </Link>
        </div>
      </header>

      {/* Main Content Area: natural document flow, unrestricted height */}
      <main className="flex-1">
        {/* b) Hero Section */}
        <section ref={heroRef} className="px-6 lg:px-12 pt-16 pb-20 max-w-6xl mx-auto relative">
          <div className="max-w-3xl">
            <h1 className="text-scale-36 lg:text-[42px] lg:leading-[50px] font-semibold text-text-primary tracking-tight">
              Every answer, traced back to the page it came from.
            </h1>
            <p className="mt-5 text-scale-17 text-text-muted leading-relaxed">
              Datum reads AUTOSAR High-Level Design specifications and answers questions with the exact section and page behind every claim.
            </p>
            <div className="mt-8 flex items-center space-x-4">
              <Link
                to="/workspace"
                className="inline-flex items-center justify-center h-11 px-6 text-scale-15 font-medium bg-accent text-surface-0 hover:opacity-90 active:opacity-80 transition-opacity"
              >
                Open workspace
              </Link>
            </div>
          </div>

          {/* Tracer line drawing down from headline area to preview panel */}
          <div
            className="hidden lg:block absolute left-12 w-[1px] bg-accent transition-all duration-700 ease-out pointer-events-none"
            style={{
              top: '235px',
              height: tracerActive ? '75px' : '0px',
              opacity: tracerActive ? 0.7 : 0,
            }}
            aria-hidden="true"
          />

          {/* Hero Visual: Styled static rendering of a real cited Q&A exchange */}
          <div className="mt-14 border border-border-theme bg-surface-1 overflow-hidden relative">
            {/* Header bar of visual mockup */}
            <div className="h-10 px-4 border-b border-border-theme bg-surface-2 flex items-center justify-between text-scale-13">
              <div className="flex items-center space-x-2">
                <span className="text-text-muted">Document:</span>
                <span className="font-mono text-text-primary">
                  AUTOSAR_TPS_SoftwareComponentTemplate.pdf
                </span>
              </div>
              <span className="font-mono text-text-muted">Interactive preview</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[320px]">
              {/* Center thread peek (8 cols) */}
              <div className="lg:col-span-8 p-6 lg:p-8 flex flex-col justify-between bg-surface-0">
                <div className="space-y-6">
                  {/* User question: right-aligned, no bubble */}
                  <div className="flex flex-col items-end">
                    <div className="text-right text-scale-17 text-text-primary max-w-lg">
                      What ports does the EngineSpeedSensor component expose?
                    </div>
                    <div className="font-mono text-scale-13 text-text-muted mt-1">
                      14:32
                    </div>
                  </div>

                  {/* AI Answer with cited marker */}
                  <div className="pt-4 border-t border-border-theme">
                    <p className="text-scale-15 text-text-primary leading-relaxed">
                      The EngineSpeedSensor component specifies{' '}
                      <span className="font-mono text-scale-13 bg-surface-1 px-1 py-0.5 border border-border-theme">
                        pp_EngineSpeed
                      </span>{' '}
                      as a PPortPrototype typed by the SenderReceiverInterface named{' '}
                      <span className="font-mono text-scale-13 bg-surface-1 px-1 py-0.5 border border-border-theme">
                        If_EngineSpeed
                      </span>{' '}
                      <span
                        className={`inline-block font-mono text-scale-13 text-accent underline decoration-accent decoration-2 underline-offset-2 font-medium px-1 rounded-sm transition-all duration-300 ${
                          pulseMarker ? 'animate-marker-pulse' : ''
                        }`}
                      >
                        [1]
                      </span>
                      . This port transmits the filtered engine rotational velocity at a 10ms periodic cycle.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border-theme flex items-center justify-between text-scale-13 text-text-muted">
                  <span>Clicking citation markers opens the verified excerpt</span>
                  <span className="font-mono text-accent">[1] Grounded evidence</span>
                </div>
              </div>

              {/* Evidence panel peek (4 cols) on immutable paper tone #DCD3BC with #233041 border */}
              <div className="lg:col-span-4 bg-evidence-paper text-[#15202B] border-t lg:border-t-0 lg:border-l border-evidence-border p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#C8BFAB] pb-3">
                    <span className="text-scale-15 font-medium text-[#15202B]">
                      Cited evidence
                    </span>
                    <span className="font-mono text-scale-13 text-[#5A6573]">
                      [1]
                    </span>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="text-scale-13 text-[#5A6573]">Document locator</div>
                    <div className="font-mono text-scale-13 font-medium text-[#15202B]">
                      Section 4.2, Page 38
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-scale-13 text-[#5A6573] mb-1">Source excerpt</div>
                    <blockquote className="text-scale-15 text-[#15202B] leading-relaxed bg-white/70 p-3 border-l-2 border-[#8A94A0]">
                      "A SensorActuatorSoftwareComponentType represents a sensor or actuator hardware abstraction. The EngineSpeedSensor component specifies PPortPrototype pp_EngineSpeed referencing SenderReceiverInterface If_EngineSpeed with data element EngineSpeed_Rpm..."
                    </blockquote>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#C8BFAB] text-scale-13 text-[#5A6573]">
                  <span className="font-mono text-scale-13 text-[#15202B]">
                    Checksum verified SHA-256
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* c) "How it works" — exactly 3 steps connected by animated line */}
        <section
          ref={howItWorksRef}
          className="px-6 lg:px-12 py-20 bg-surface-1 border-y border-border-theme relative"
        >
          <div className="max-w-6xl mx-auto">
            <div className="max-w-xl">
              <h2 className="text-scale-28 font-semibold text-text-primary tracking-tight">
                How it works
              </h2>
              <p className="mt-3 text-scale-15 text-text-muted">
                A deterministic sequential pipeline for automotive software architecture.
              </p>
            </div>

            {/* Steps container with horizontal connecting line on desktop */}
            <div className="mt-14 relative">
              {/* Thin connecting line drawing from left to right tied to scroll position */}
              <div
                className="hidden md:block absolute top-[18px] left-8 right-8 h-[1px] bg-border-theme z-0"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-accent transition-all duration-150 ease-out"
                  style={{ width: `${connectingLineWidth}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {/* Step 1 */}
                <div className="p-6 bg-surface-0 border border-border-theme flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-scale-13 text-accent font-medium inline-block bg-surface-1 px-2 py-0.5 border border-border-theme">
                      01
                    </div>
                    <h3 className="mt-4 text-scale-17 font-medium text-text-primary">
                      Upload your specification
                    </h3>
                    <p className="mt-2 text-scale-15 text-text-muted leading-relaxed">
                      Parse AUTOSAR HLD PDFs and ARXML models preserving structural hierarchy and section numbers.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-6 bg-surface-0 border border-border-theme flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-scale-13 text-accent font-medium inline-block bg-surface-1 px-2 py-0.5 border border-border-theme">
                      02
                    </div>
                    <h3 className="mt-4 text-scale-17 font-medium text-text-primary">
                      Ask a question
                    </h3>
                    <p className="mt-2 text-scale-15 text-text-muted leading-relaxed">
                      Query port definitions, interfaces, runnables, and timing envelopes in natural language.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-6 bg-surface-0 border border-border-theme flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-scale-13 text-accent font-medium inline-block bg-surface-1 px-2 py-0.5 border border-border-theme">
                      03
                    </div>
                    <h3 className="mt-4 text-scale-17 font-medium text-text-primary">
                      Verify the cited source
                    </h3>
                    <p className="mt-2 text-scale-15 text-text-muted leading-relaxed">
                      Inspect the exact source excerpt on the evidence panel behind every synthesized claim.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* d) "Built on evidence, not guesses" Section */}
        <section
          ref={builtOnEvidenceRef}
          className="px-6 lg:px-12 py-20 max-w-6xl mx-auto"
        >
          <div className="max-w-2xl">
            <h2 className="text-scale-28 font-semibold text-text-primary tracking-tight">
              Built on evidence, not guesses
            </h2>
            <p className="mt-3 text-scale-15 text-text-muted leading-relaxed">
              Automotive software requires verifiable traceability. Datum separates synthesized claims from immutable document evidence through a strict visual and structural split.
            </p>
          </div>

          {/* Two-Column Split */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 border border-border-theme">
            {/* Left Column: Ink / Dark style AI answer sentence */}
            <div className="p-8 bg-surface-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border-theme">
                  <span className="text-scale-15 font-medium text-text-primary">
                    Synthesized answer
                  </span>
                  <span className="font-mono text-scale-13 text-text-muted">
                    AI response stream
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="text-scale-13 text-text-muted">
                    EngineSpeedSensor Port Definition:
                  </div>
                  <p className="text-scale-15 text-text-primary leading-relaxed">
                    The EngineSpeedSensor component specifies{' '}
                    <span className="font-mono text-scale-13 bg-surface-2 px-1 py-0.5 border border-border-theme">
                      pp_EngineSpeed
                    </span>{' '}
                    as a PPortPrototype typed by the SenderReceiverInterface named{' '}
                    <span className="font-mono text-scale-13 bg-surface-2 px-1 py-0.5 border border-border-theme">
                      If_EngineSpeed
                    </span>{' '}
                    <span className="font-mono text-scale-13 text-accent underline decoration-accent decoration-2 underline-offset-2 font-medium">
                      [1]
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border-theme text-scale-13 text-text-muted">
                Synthesized claim with formal monospace citation marker
              </div>
            </div>

            {/* Right Column: Paper-toned excerpt with phrase highlight sweep */}
            <div className="p-8 bg-evidence-paper text-[#15202B] border-t lg:border-t-0 lg:border-l border-evidence-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#C8BFAB]">
                  <span className="text-scale-15 font-medium text-[#15202B]">
                    Primary source excerpt
                  </span>
                  <span className="font-mono text-scale-13 text-[#5A6573]">
                    Immutable document evidence
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="font-mono text-scale-13 font-medium text-[#15202B]">
                    Section 4.2, Page 38
                  </div>
                  <blockquote className="text-scale-17 text-[#15202B] leading-relaxed bg-white/70 p-4 border-l-2 border-[#8A94A0]">
                    "A SensorActuatorSoftwareComponentType represents a sensor or actuator hardware abstraction. The EngineSpeedSensor component{' '}
                    <span
                      className={`phrase-highlight px-1 py-0.5 rounded-sm font-medium ${
                        highlightSwept ? 'is-swept' : ''
                      }`}
                    >
                      specifies PPortPrototype pp_EngineSpeed referencing SenderReceiverInterface If_EngineSpeed
                    </span>{' '}
                    with data element EngineSpeed_Rpm (uint16, resolution 0.25 rpm, range 0..8000 rpm)."
                  </blockquote>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#C8BFAB] text-scale-13 text-[#5A6573]">
                Soft highlight sweep visually correlates the supporting phrase upon view
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* c) Minimal Footer */}
      <footer className="border-t border-border-theme bg-surface-1 py-8 px-6 lg:px-12 select-none">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-scale-13 text-text-muted">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-text-primary">Datum</span>
            <span>Pilot project for an AUTOSAR HLD analysis assistant</span>
          </div>
          <div>
            <Link
              to="/"
              className="text-text-muted hover:text-text-primary transition-colors py-1"
            >
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
