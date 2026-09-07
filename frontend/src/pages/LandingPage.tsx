import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans relative">
      {/* a) Sticky Glass Nav */}
      <header className="sticky top-0 z-30 h-16 glass-chrome border-b flex items-center justify-between px-6 lg:px-12 select-none">
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

      {/* Main Landing Content */}
      <main className="flex-1">
        {/* b) Hero Section */}
        <section className="px-6 lg:px-12 pt-16 pb-20 max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-scale-36 lg:text-[42px] lg:leading-[50px] font-semibold text-text-primary tracking-tight">
              Every answer, traced back to the page it came from.
            </h1>
            <p className="mt-5 text-scale-17 text-text-muted leading-relaxed">
              Datum reads AUTOSAR High-Level Design specifications and answers questions with the exact section and page behind every claim.
            </p>
            <div className="mt-8">
              <Link
                to="/workspace"
                className="inline-flex items-center justify-center h-11 px-6 text-scale-15 font-medium bg-accent text-surface-0 hover:opacity-90 active:opacity-80 transition-opacity"
              >
                Open workspace
              </Link>
            </div>
          </div>

          {/* Hero Visual: Styled static rendering of a real cited Q&A exchange */}
          <div className="mt-14 border border-border-theme bg-surface-1 overflow-hidden">
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
                  {/* User question */}
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
                      <span className="font-mono text-scale-13 text-accent underline decoration-accent decoration-2 underline-offset-2 font-medium">
                        [1]
                      </span>
                      . This port transmits the filtered engine rotational velocity at a 10ms periodic cycle.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border-theme flex items-center justify-between text-scale-13 text-text-muted">
                  <span>Clicking citation markers slides open the grounded excerpt</span>
                  <span className="font-mono text-accent">[1] Selected</span>
                </div>
              </div>

              {/* Evidence panel peek (4 cols) on evidence-paper tone */}
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
                    Checksum verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* c) "How it works" — exactly 3 steps */}
        <section className="px-6 lg:px-12 py-20 bg-surface-1 border-y border-border-theme">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-xl">
              <h2 className="text-scale-28 font-semibold text-text-primary tracking-tight">
                How it works
              </h2>
              <p className="mt-3 text-scale-15 text-text-muted">
                A deterministic pipeline built for safety-critical automotive engineering.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="p-6 bg-surface-0 border border-border-theme">
                <div className="font-mono text-scale-17 text-accent font-medium">
                  01
                </div>
                <h3 className="mt-3 text-scale-17 font-medium text-text-primary">
                  Upload your specification
                </h3>
                <p className="mt-2 text-scale-15 text-text-muted leading-relaxed">
                  Provide AUTOSAR High-Level Design PDFs or Software Component Descriptions. Documents are chunked and indexed preserving hierarchical section numbers and page boundaries.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 bg-surface-0 border border-border-theme">
                <div className="font-mono text-scale-17 text-accent font-medium">
                  02
                </div>
                <h3 className="mt-3 text-scale-17 font-medium text-text-primary">
                  Ask a question
                </h3>
                <p className="mt-2 text-scale-15 text-text-muted leading-relaxed">
                  Ask technical questions about component ports, interfaces, runnable mappings, or timing budgets in natural language without writing custom scripts.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 bg-surface-0 border border-border-theme">
                <div className="font-mono text-scale-17 text-accent font-medium">
                  03
                </div>
                <h3 className="mt-3 text-scale-17 font-medium text-text-primary">
                  Verify the cited source
                </h3>
                <p className="mt-2 text-scale-15 text-text-muted leading-relaxed">
                  Every claim links directly to its source excerpt. Click any citation tag to view the exact text from the original PDF section on the evidence panel.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* d) "Built on evidence, not guesses" Section */}
        <section className="px-6 lg:px-12 py-20 max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <h2 className="text-scale-28 font-semibold text-text-primary tracking-tight">
              Built on evidence, not guesses
            </h2>
            <p className="mt-3 text-scale-15 text-text-muted leading-relaxed">
              Automotive software requires auditable traceability. Datum separates synthesized answers from immutable document evidence through a rigorous visual and structural duality.
            </p>
          </div>

          {/* Visual split: Ink (AI Answer) vs Paper (Source Excerpt) */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 border border-border-theme">
            {/* Ink side: AI Answer */}
            <div className="p-8 bg-surface-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border-theme">
                  <span className="text-scale-15 font-medium text-text-primary">
                    Synthesized answer
                  </span>
                  <span className="font-mono text-scale-13 text-text-muted">
                    AI response pane
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="text-scale-13 text-text-muted">
                    EngineSpeedSensor Internal Behavior:
                  </div>
                  <p className="text-scale-15 text-text-primary leading-relaxed">
                    The runnable entity{' '}
                    <span className="font-mono text-scale-13 bg-surface-2 px-1 py-0.5 border border-border-theme">
                      RE_SampleEngineSpeed
                    </span>{' '}
                    is triggered cyclically by a TimingEvent with a 10ms period{' '}
                    <span className="font-mono text-scale-13 text-accent underline decoration-accent decoration-2 underline-offset-2 font-medium">
                      [3]
                    </span>
                    . It accesses the data element directly via DataWriteAccess to support periodic sampling.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border-theme text-scale-13 text-text-muted">
                Left-aligned concise prose with clickable monospace citation markers
              </div>
            </div>

            {/* Paper side: Cited Excerpt */}
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
                    Section 6.3.2, Page 84
                  </div>
                  <blockquote className="text-scale-17 text-[#15202B] leading-relaxed bg-white/70 p-4 border-l-2 border-[#8A94A0]">
                    "RunnableEntity RE_SampleEngineSpeed is configured with canBeInvokedConcurrently set to false. It is bound to TimingEvent TE_10ms referencing period 0.01. DataWriteAccess is granted for data element EngineSpeed_Rpm of port pp_EngineSpeed."
                  </blockquote>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#C8BFAB] text-scale-13 text-[#5A6573]">
                Presented on dedicated paper tone with exact section and page grounding
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* e) Minimal Footer */}
      <footer className="border-t border-border-theme bg-surface-1 py-8 px-6 lg:px-12 select-none">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-scale-13 text-text-muted">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-text-primary">Datum</span>
            <span>Grounded AI assistant for AUTOSAR HLD specifications</span>
          </div>
          <div>Pilot project for automotive software engineering</div>
        </div>
      </footer>
    </div>
  );
};
