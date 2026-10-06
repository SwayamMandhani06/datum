import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentItem, DependencyMapResult, FlowType } from '../types';
import { getDocumentDependencies } from '../api/client';

interface DependencyMapViewProps {
  document: DocumentItem | null;
}

const FLOW_BADGES: Record<FlowType, { label: string; style: string }> = {
  provided: { label: 'Provided (Server / Tx)', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  required: { label: 'Required (Client / Rx)', style: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
  bidirectional: { label: 'Bidirectional Flow', style: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  internal: { label: 'Internal Module', style: 'bg-purple-500/10 text-purple-400 border-purple-500/25' },
};

const NetworkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
    <rect x="16" y="16" width="6" height="6" rx="1.5"/><rect x="2" y="16" width="6" height="6" rx="1.5"/>
    <rect x="9" y="2" width="6" height="6" rx="1.5"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/>
    <line x1="12" y1="12" x2="12" y2="8"/>
  </svg>
);

export const DependencyMapView: React.FC<DependencyMapViewProps> = ({ document }) => {
  const [data, setData] = useState<DependencyMapResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [flowFilter, setFlowFilter] = useState<FlowType | 'all'>('all');

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

    getDocumentDependencies(docId)
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to map dependencies.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [docId, isReady]);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    return data.nodes.filter((node) => {
      const matchFlow = flowFilter === 'all' || node.flow_type === flowFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        node.component.toLowerCase().includes(q) ||
        node.ports.some((p) => p.toLowerCase().includes(q)) ||
        node.interfaces.some((i) => i.toLowerCase().includes(q)) ||
        node.signals.some((s) => s.toLowerCase().includes(q));
      return matchFlow && matchSearch;
    });
  }, [data, flowFilter, searchQuery]);

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-0">
        <div className="max-w-xs">
          <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-text-subtle mb-4 mx-auto font-mono text-lg">
            [ ]
          </div>
          <h3 className="text-base font-bold text-text-primary mb-2 tracking-tight">No specification selected</h3>
          <p className="text-sm text-text-muted leading-relaxed">
            Select an AUTOSAR document from the left rail to view component interfaces and dependency flow maps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-surface-0 flex flex-col h-full overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="p-4 px-6 border-b border-border-theme bg-surface-1/90 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <NetworkIcon />
            <h2 className="text-sm font-bold text-text-primary tracking-tight flex-shrink-0">
              Interface &amp; Dependency Traceability Matrix
            </h2>
            <span
              className="glass-badge text-xs text-text-muted font-mono max-w-[180px] sm:max-w-xs md:max-w-sm truncate"
              title={document.filename}
            >
              {document.filename}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              placeholder="Search component, port, interface…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input text-xs px-3 py-1.5 w-48 sm:w-60 placeholder:text-text-subtle"
            />
            <select
              value={flowFilter}
              onChange={(e) => setFlowFilter(e.target.value as any)}
              className="glass-input text-xs px-3 py-1.5 text-text-primary cursor-pointer"
            >
              <option value="all">All Flow Types</option>
              <option value="provided">Provided (Server)</option>
              <option value="required">Required (Client)</option>
              <option value="bidirectional">Bidirectional</option>
              <option value="internal">Internal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
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
            <div className="skeleton h-56 w-full rounded-2xl" />
          </div>
        )}

        {error && (
          <div className="max-w-5xl mx-auto p-4 rounded-xl border border-danger/30 bg-danger-soft text-danger text-sm fade-in-up font-medium">
            {error}
          </div>
        )}

        {data && !isLoading && (
          <div className="max-w-5xl mx-auto space-y-6 fade-in-up">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="glass-card-interactive p-5 !rounded-2xl min-w-0">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono truncate" title="Components">
                  Components
                </div>
                <div className="text-2xl font-extrabold font-mono text-accent mt-1 tracking-tight truncate">
                  {data.total_components}
                </div>
              </div>
              <div className="glass-card-interactive p-5 !rounded-2xl min-w-0">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono truncate" title="Interfaces">
                  Interfaces
                </div>
                <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 tracking-tight truncate">
                  {data.total_interfaces}
                </div>
              </div>
              <div className="glass-card-interactive p-5 !rounded-2xl min-w-0">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono truncate" title="Connections">
                  Connections
                </div>
                <div className="text-2xl font-extrabold font-mono text-blue-400 mt-1 tracking-tight truncate">
                  {data.total_connections}
                </div>
              </div>
              <div className="glass-card-interactive p-5 !rounded-2xl min-w-0">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono truncate" title="Active Nodes">
                  Active Nodes
                </div>
                <div className="text-2xl font-extrabold font-mono text-purple-400 mt-1 tracking-tight truncate">
                  {filteredNodes.length}
                </div>
              </div>
            </div>

            {/* Traceability Nodes Grid */}
            <div className="space-y-4">
              {filteredNodes.length === 0 ? (
                <div className="p-12 text-center glass-card !rounded-2xl">
                  <p className="text-sm text-text-muted">No components match your search filter.</p>
                </div>
              ) : (
                filteredNodes.map((node, index) => {
                  const flowBadge = FLOW_BADGES[node.flow_type] || FLOW_BADGES.provided;
                  return (
                    <div
                      key={index}
                      className="glass-card-interactive p-5 sm:p-6 !rounded-2xl flex flex-col gap-4 group min-w-0"
                    >
                      {/* Node Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-border-theme">
                        <div className="flex flex-wrap items-center gap-3 min-w-0">
                          <span className="font-mono text-sm font-bold text-text-primary tracking-tight break-words">
                            {node.component}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono border font-semibold flex-shrink-0 ${flowBadge.style}`}
                          >
                            {flowBadge.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-text-subtle">
                          {node.section && <span className="font-medium text-text-muted">{node.section}</span>}
                          {node.page_references.length > 0 && (
                            <span className="glass-badge text-accent font-bold">
                              pp. {node.page_references.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ports, Interfaces, Signals Matrix */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {/* Ports */}
                        <div className="p-3.5 rounded-xl glass-card min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2 truncate" title="Associated Ports">
                            Associated Ports ({node.ports.length})
                          </div>
                          {node.ports.length === 0 ? (
                            <span className="text-xs text-text-subtle italic">No declared ports</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {node.ports.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="text-xs font-mono bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-medium break-words [word-break:break-word]"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Interfaces */}
                        <div className="p-3.5 rounded-xl glass-card min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-2 truncate" title="Linked Interfaces">
                            Linked Interfaces ({node.interfaces.length})
                          </div>
                          {node.interfaces.length === 0 ? (
                            <span className="text-xs text-text-subtle italic">No linked interfaces</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {node.interfaces.map((iface, iIdx) => (
                                <span
                                  key={iIdx}
                                  className="text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-medium break-words [word-break:break-word]"
                                >
                                  {iface}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Signals */}
                        <div className="p-3.5 rounded-xl glass-card min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-2 truncate" title="Carried Signals">
                            Carried Signals ({node.signals.length})
                          </div>
                          {node.signals.length === 0 ? (
                            <span className="text-xs text-text-subtle italic">No explicit signals</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {node.signals.map((sig, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-xs font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md font-medium break-words [word-break:break-word]"
                                >
                                  {sig}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
