import React, { useState, useEffect } from 'react';
import type { DocumentItem, ComparisonResult } from '../types';
import { compareDocuments, getComparisonExportUrl } from '../api/client';

interface DocumentComparisonViewProps {
  documents: DocumentItem[];
  activeDocument: DocumentItem | null;
}

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-y-0.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CompareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
    <path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>
  </svg>
);

export const DocumentComparisonView: React.FC<DocumentComparisonViewProps> = ({
  documents,
  activeDocument,
}) => {
  const readyDocs = documents.filter((d) => d.status === 'ready');
  const [docAId, setDocAId] = useState<string>(activeDocument?.id || readyDocs[0]?.id || '');
  const [docBId, setDocBId] = useState<string>(
    readyDocs.find((d) => d.id !== (activeDocument?.id || readyDocs[0]?.id))?.id || ''
  );

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inconsistencies' | 'shared' | 'unique_a' | 'unique_b'>('inconsistencies');

  useEffect(() => {
    if (activeDocument && activeDocument.id !== docAId) {
      setDocAId(activeDocument.id);
      if (docBId === activeDocument.id) {
        const other = readyDocs.find((d) => d.id !== activeDocument.id);
        if (other) setDocBId(other.id);
      }
    }
  }, [activeDocument, readyDocs, docAId, docBId]);

  const handleRunComparison = async () => {
    if (!docAId || !docBId || docAId === docBId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await compareDocuments(docAId, docBId);
      setComparison(res);
    } catch (err: any) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (docAId && docBId && docAId !== docBId && !comparison && !isLoading) {
      handleRunComparison();
    }
  }, [docAId, docBId]);

  if (readyDocs.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-0">
        <div className="max-w-md">
          <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center mx-auto mb-4 text-text-muted shadow-glass">
            <CompareIcon />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2 tracking-tight">Two Specifications Required</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            Cross-specification inconsistency detection requires at least two indexed AUTOSAR documents (e.g. BSW Module Description Template vs ECU Resource Template).
          </p>
          <p className="text-xs text-text-subtle glass-badge">
            Upload another specification from the document rail to begin automated audits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-surface-0 flex flex-col h-full overflow-hidden">
      {/* Top Selector & Action Bar */}
      <div className="p-4 px-6 border-b border-border-theme bg-surface-1/90 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider font-mono">Spec A:</span>
              <select
                value={docAId}
                onChange={(e) => { setDocAId(e.target.value); setComparison(null); }}
                className="glass-input text-xs font-mono px-3 py-1.5 cursor-pointer max-w-[170px] sm:max-w-xs truncate"
                title={readyDocs.find((d) => d.id === docAId)?.filename}
              >
                {readyDocs.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === docBId}>
                    {d.filename}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-accent font-mono text-xs font-bold px-1">VS</span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider font-mono">Spec B:</span>
              <select
                value={docBId}
                onChange={(e) => { setDocBId(e.target.value); setComparison(null); }}
                className="glass-input text-xs font-mono px-3 py-1.5 cursor-pointer max-w-[170px] sm:max-w-xs truncate"
                title={readyDocs.find((d) => d.id === docBId)?.filename}
              >
                {readyDocs.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === docAId}>
                    {d.filename}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunComparison}
              disabled={isLoading || !docAId || !docBId || docAId === docBId}
              className="btn-primary btn-shimmer h-8 px-4 text-xs font-semibold !rounded-lg"
            >
              {isLoading ? 'Analyzing…' : 'Run Cross-Spec Audit'}
            </button>
          </div>

          {comparison && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted hidden sm:inline font-mono">Export:</span>
              <a
                href={getComparisonExportUrl(docAId, docBId, 'markdown')}
                download
                className="btn-secondary h-8 px-3 text-xs gap-1.5 group"
                title="Download Markdown Report"
              >
                <DownloadIcon />
                <span>Markdown</span>
              </a>
              <a
                href={getComparisonExportUrl(docAId, docBId, 'json')}
                download
                className="btn-secondary h-8 px-3 text-xs gap-1.5 group"
                title="Download JSON Spec"
              >
                <DownloadIcon />
                <span>JSON</span>
              </a>
              <a
                href={getComparisonExportUrl(docAId, docBId, 'csv')}
                download
                className="btn-secondary h-8 px-3 text-xs gap-1.5 group"
                title="Download CSV Inconsistencies"
              >
                <DownloadIcon />
                <span>CSV</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
        {isLoading && (
          <div className="space-y-4 max-w-5xl mx-auto py-8 fade-in-up">
            <div className="skeleton h-8 w-64 rounded-xl" />
            <div className="skeleton h-28 w-full rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="skeleton h-20 rounded-2xl" />
              <div className="skeleton h-20 rounded-2xl" />
              <div className="skeleton h-20 rounded-2xl" />
              <div className="skeleton h-20 rounded-2xl" />
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-5xl mx-auto p-4 rounded-xl border border-danger/30 bg-danger-soft text-danger text-sm font-medium fade-in-up">
            {error}
          </div>
        )}

        {comparison && !isLoading && (
          <div className="max-w-5xl mx-auto space-y-6 fade-in-up">
            {/* Executive Summary Card */}
            <div className="glass-card p-5 sm:p-6 !rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-theme">
                <span className="section-label">Cross-Specification Audit Synthesis</span>
                <span className="text-xs font-mono text-text-muted glass-badge">
                  {new Date(comparison.generated_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                {comparison.summary}
              </p>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                <div className="glass-card-interactive p-4 sm:p-5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold font-mono uppercase text-text-muted truncate" title="Compatibility Score">
                    Compatibility Score
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold font-mono text-accent mt-1 tracking-tight truncate">
                    {comparison.compatibility_score}%
                  </div>
                </div>
                <div className="glass-card-interactive p-4 sm:p-5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold font-mono uppercase text-text-muted truncate" title="Shared Entities">
                    Shared Entities
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1 tracking-tight truncate">
                    {comparison.shared_entities.length}
                  </div>
                </div>
                <div className="glass-card-interactive p-4 sm:p-5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold font-mono uppercase text-text-muted truncate" title="Inconsistency Warnings">
                    Inconsistency Warnings
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold font-mono text-warn mt-1 tracking-tight truncate">
                    {comparison.inconsistencies.length}
                  </div>
                </div>
                <div className="glass-card-interactive p-4 sm:p-5 !rounded-xl min-w-0">
                  <div className="text-[11px] font-bold font-mono uppercase text-text-muted truncate" title="Total Elements">
                    Total Elements
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold font-mono text-text-primary mt-1 tracking-tight truncate">
                    {comparison.total_entities_a + comparison.total_entities_b}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              <button
                onClick={() => setActiveTab('inconsistencies')}
                className={`tab-pill ${activeTab === 'inconsistencies' ? 'active' : ''}`}
              >
                <span>Inconsistencies &amp; Warnings</span>
                <span className="font-mono text-[10px] opacity-75">({comparison.inconsistencies.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('shared')}
                className={`tab-pill ${activeTab === 'shared' ? 'active' : ''}`}
              >
                <span>Shared Elements</span>
                <span className="font-mono text-[10px] opacity-75">({comparison.shared_entities.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('unique_a')}
                className={`tab-pill ${activeTab === 'unique_a' ? 'active' : ''}`}
              >
                <span>Unique to Spec A</span>
                <span className="font-mono text-[10px] opacity-75">({comparison.unique_to_a.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('unique_b')}
                className={`tab-pill ${activeTab === 'unique_b' ? 'active' : ''}`}
              >
                <span>Unique to Spec B</span>
                <span className="font-mono text-[10px] opacity-75">({comparison.unique_to_b.length})</span>
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'inconsistencies' && (
              <div className="space-y-3.5">
                {comparison.inconsistencies.length === 0 ? (
                  <div className="p-12 text-center glass-card !rounded-2xl">
                    <span className="text-emerald-400 font-bold text-sm tracking-tight">No architectural inconsistencies detected</span>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">Both specifications share aligned entity classifications and interface definitions.</p>
                  </div>
                ) : (
                  comparison.inconsistencies.map((inc, i) => (
                    <div
                      key={i}
                      className="glass-card-interactive p-5 !rounded-2xl flex flex-col gap-3 group min-w-0"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase flex-shrink-0 ${
                              inc.severity === 'critical'
                                ? 'bg-danger-soft text-danger border border-danger/30'
                                : inc.severity === 'warning'
                                ? 'bg-warn-soft text-warn border border-warn/30'
                                : 'bg-surface-3 text-text-muted border border-border-theme'
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider truncate">{inc.category}</span>
                        </div>
                        <code
                          className="text-xs font-mono font-bold text-accent glass-badge px-2.5 py-0.5 max-w-full truncate"
                          title={inc.entity_name}
                        >
                          {inc.entity_name}
                        </code>
                      </div>
                      <p className="text-sm text-text-primary leading-relaxed font-normal">
                        {inc.description}
                      </p>
                      {inc.recommendation && (
                        <div className="text-xs text-text-secondary bg-surface-2/80 p-3 rounded-xl border border-border-theme">
                          <strong className="text-text-primary font-bold">Recommended Alignment: </strong>
                          {inc.recommendation}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'shared' && (
              <div className="border border-border-theme rounded-2xl glass-card overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border-theme bg-surface-2/80 text-text-muted font-bold font-mono">
                        <th className="py-3 px-4">Element</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Page Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-theme">
                      {comparison.shared_entities.map((ent, idx) => (
                        <tr key={idx} className="hover:bg-surface-2/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent glass-badge my-1 break-words [word-break:break-word]">{ent.name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-surface-3 text-text-muted font-bold">
                              {ent.entity_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-text-secondary max-w-md break-words leading-relaxed">{ent.description}</td>
                          <td className="py-3 px-4 text-right font-mono text-accent font-bold">p.{ent.page_start}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(activeTab === 'unique_a' || activeTab === 'unique_b') && (
              <div className="border border-border-theme rounded-2xl glass-card overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border-theme bg-surface-2/80 text-text-muted font-bold font-mono">
                        <th className="py-3 px-4">Element</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Page Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-theme">
                      {(activeTab === 'unique_a' ? comparison.unique_to_a : comparison.unique_to_b).map((ent, idx) => (
                        <tr key={idx} className="hover:bg-surface-2/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent glass-badge my-1 break-words [word-break:break-word]">{ent.name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-surface-3 text-text-muted font-bold">
                              {ent.entity_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-text-secondary max-w-md break-words leading-relaxed">{ent.description}</td>
                          <td className="py-3 px-4 text-right font-mono text-accent font-bold">p.{ent.page_start}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
