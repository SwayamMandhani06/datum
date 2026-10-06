import React, { useState, useEffect } from 'react';
import type { DocumentItem, CompletenessAuditResult } from '../types';
import { getDocumentAudit } from '../api/client';

interface CompletenessAuditViewProps {
  document: DocumentItem | null;
}

const ShieldCheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

export const CompletenessAuditView: React.FC<CompletenessAuditViewProps> = ({ document }) => {
  const [data, setData] = useState<CompletenessAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const docId = document?.id;
  const isReady = document?.status === 'ready';

  useEffect(() => {
    if (!docId || !isReady) {
      setData(null);
      setError(null);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(null);

    getDocumentAudit(docId)
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Audit check failed.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [docId, isReady]);

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-0">
        <div className="max-w-xs">
          <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-text-subtle mb-4 mx-auto font-mono text-lg">
            [ ]
          </div>
          <h3 className="text-base font-bold text-text-primary mb-2 tracking-tight">No specification selected</h3>
          <p className="text-sm text-text-muted leading-relaxed">
            Select an AUTOSAR document from the left rail to run an automated architectural completeness audit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-surface-0 flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <div className="p-4 px-6 border-b border-border-theme bg-surface-1/90 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheckIcon />
            <h2 className="text-sm font-bold text-text-primary tracking-tight flex-shrink-0">
              Architecture Completeness &amp; Quality Audit
            </h2>
            <span
              className="glass-badge text-xs text-text-muted font-mono max-w-[180px] sm:max-w-xs md:max-w-sm truncate"
              title={document.filename}
            >
              {document.filename}
            </span>
          </div>

          {data && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-text-muted font-mono">Health Index:</span>
              <span
                className={`font-mono text-xs font-bold px-3 py-1 rounded-full border ${
                  data.health_score >= 90
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                    : data.health_score >= 75
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                    : 'bg-danger-soft text-danger border-danger/30'
                }`}
              >
                {data.health_score}% COMPLIANT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
        {isLoading && (
          <div className="space-y-4 max-w-5xl mx-auto py-8 fade-in-up">
            <div className="skeleton h-8 w-64 rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-5xl mx-auto p-4 rounded-xl border border-danger/30 bg-danger-soft text-danger text-sm font-medium fade-in-up">
            {error}
          </div>
        )}

        {data && !isLoading && (
          <div className="max-w-5xl mx-auto space-y-6 fade-in-up">
            {/* Score & Inventory Bar */}
            <div className="glass-card p-5 sm:p-6 !rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-5 items-center">
              <div className="md:col-span-2 flex items-center gap-4 border-b md:border-b-0 md:border-r border-border-theme pb-4 md:pb-0 pr-0 md:pr-4 min-w-0">
                <div
                  className={`w-16 h-16 sm:w-18 sm:h-18 flex-shrink-0 rounded-2xl flex flex-col items-center justify-center font-mono font-bold border-2 shadow-card ${
                    data.health_score >= 90
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                      : data.health_score >= 75
                      ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                      : 'border-danger text-danger bg-danger-soft'
                  }`}
                >
                  <span className="text-2xl leading-none font-extrabold">{data.health_score}</span>
                  <span className="text-[10px] text-text-subtle font-mono mt-0.5">/ 100</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    {data.health_score >= 90
                      ? 'Specification Verified'
                      : data.health_score >= 75
                      ? 'Acceptable with Notices'
                      : 'Requires Architecture Review'}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Evaluated across component declarations, port topologies, and signal bindings.
                  </p>
                </div>
              </div>

              {/* Elements Breakdown */}
              <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="glass-card-interactive p-3.5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold text-text-muted uppercase font-mono truncate" title="Components">Components</div>
                  <div className="text-xl font-mono font-extrabold text-accent mt-0.5 tracking-tight truncate">
                    {data.total_components}
                  </div>
                </div>
                <div className="glass-card-interactive p-3.5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold text-text-muted uppercase font-mono truncate" title="Ports">Ports</div>
                  <div className="text-xl font-mono font-extrabold text-blue-400 mt-0.5 tracking-tight truncate">
                    {data.total_ports}
                  </div>
                </div>
                <div className="glass-card-interactive p-3.5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold text-text-muted uppercase font-mono truncate" title="Interfaces">Interfaces</div>
                  <div className="text-xl font-mono font-extrabold text-emerald-400 mt-0.5 tracking-tight truncate">
                    {data.total_interfaces}
                  </div>
                </div>
                <div className="glass-card-interactive p-3.5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold text-text-muted uppercase font-mono truncate" title="Signals">Signals</div>
                  <div className="text-xl font-mono font-extrabold text-purple-400 mt-0.5 tracking-tight truncate">
                    {data.total_signals}
                  </div>
                </div>
              </div>
            </div>

            {/* Inconsistencies & Completeness Findings */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="section-label">Audit Checklist &amp; Findings</span>
                <span className="glass-badge text-xs text-text-muted font-mono">
                  {data.issues.length} {data.issues.length === 1 ? 'Notice' : 'Notices / Findings'}
                </span>
              </div>

              {data.issues.length === 0 ? (
                <div className="p-12 text-center glass-card !rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                    ✓
                  </div>
                  <span className="text-emerald-400 font-bold text-sm tracking-tight">
                    No architectural defects or missing bindings detected!
                  </span>
                  <p className="text-xs text-text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
                    All components possess documented descriptions, declared ports correspond to valid interface templates, and signals are properly scoped.
                  </p>
                </div>
              ) : (
                data.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="glass-card-interactive p-5 !rounded-2xl flex flex-col gap-2.5 group min-w-0"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase flex-shrink-0 ${
                            issue.severity === 'critical'
                              ? 'bg-danger-soft text-danger border border-danger/30'
                              : issue.severity === 'warning'
                              ? 'bg-warn-soft text-warn border border-warn/30'
                              : 'bg-surface-3 text-text-muted border border-border-theme'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs font-bold text-text-primary truncate">
                          {issue.category}
                        </span>
                      </div>
                      <code
                        className="text-xs font-mono font-bold text-accent glass-badge px-2.5 py-0.5 max-w-full truncate"
                        title={issue.entity_name}
                      >
                        {issue.entity_name}
                      </code>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed font-normal">
                      {issue.description}
                    </p>
                    {issue.recommendation && (
                      <div className="text-xs text-text-secondary bg-surface-2/80 p-3 rounded-xl border border-border-theme mt-1">
                        <strong className="text-text-primary font-bold">Resolution Guidance: </strong>
                        {issue.recommendation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
