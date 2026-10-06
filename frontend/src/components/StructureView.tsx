import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentItem, ExtractedEntity, EntityType } from '../types';
import { extractDocument, getExportUrl } from '../api/client';

interface StructureViewProps {
  document: DocumentItem | null;
}

const TYPE_LABELS: Record<EntityType | 'all', string> = {
  all: 'All Entities', component: 'Components', port: 'Ports',
  interface: 'Interfaces', signal: 'Signals', other: 'Other',
};

const TYPE_COLORS: Record<EntityType | 'all', string> = {
  all:       'text-text-primary bg-surface-2 border-border-strong',
  component: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  port:      'text-blue-400 bg-blue-500/10 border-blue-500/25',
  interface: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  signal:    'text-violet-400 bg-violet-500/10 border-violet-500/25',
  other:     'text-text-muted bg-surface-3 border-border-theme',
};

const RefreshIcon = ({ spinning }: { spinning: boolean }) => {
  const iconClass = spinning ? 'spin' : 'transition-transform duration-200 group-hover:rotate-180';
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      className={iconClass}
    >
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
};

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-y-0.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const SkeletonRow = () => (
  <tr className="border-b border-border-theme">
    <td className="py-3.5 px-5"><div className="skeleton h-4 w-36 rounded-md" /></td>
    <td className="py-3.5 px-4"><div className="skeleton h-4 w-20 rounded-md" /></td>
    <td className="py-3.5 px-4"><div className="skeleton h-4 w-64 rounded-md" /></td>
    <td className="py-3.5 px-5"><div className="skeleton h-4 w-24 ml-auto rounded-md" /></td>
  </tr>
);

export const StructureView: React.FC<StructureViewProps> = ({ document }) => {
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EntityType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const docId = document?.id;
  const isReady = document?.status === 'ready';

  useEffect(() => {
    if (!docId || !isReady) { setEntities([]); setGeneratedAt(null); setError(null); return; }
    let mounted = true;
    setIsLoading(true); setError(null);
    extractDocument(docId, false)
      .then((res) => { if (mounted) { setEntities(res.entities); setGeneratedAt(res.generated_at); } })
      .catch((err) => { if (mounted) setError(err.message || 'Extraction failed.'); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [docId, isReady]);

  const handleRefresh = async () => {
    if (!docId || !isReady || isLoading || isRefreshing) return;
    setIsRefreshing(true); setError(null);
    try { const r = await extractDocument(docId, true); setEntities(r.entities); setGeneratedAt(r.generated_at); }
    catch (e: any) { setError(e.message || 'Re-extraction failed.'); }
    finally { setIsRefreshing(false); }
  };

  const filtered = useMemo(() => entities.filter((e) => {
    const matchType = selectedType === 'all' || e.entity_type === selectedType;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
      || (e.section_title && e.section_title.toLowerCase().includes(q));
    return matchType && matchSearch;
  }), [entities, selectedType, searchQuery]);

  const counts = useMemo(() => {
    const c: Record<EntityType | 'all', number> = { all: entities.length, component: 0, port: 0, interface: 0, signal: 0, other: 0 };
    for (const e of entities) { if (e.entity_type in c) c[e.entity_type]++; else c.other++; }
    return c;
  }, [entities]);

  if (!document) return (
    <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-0">
      <div className="max-w-xs">
        <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-text-subtle mb-4 mx-auto font-mono text-lg">
          [ ]
        </div>
        <h3 className="text-base font-bold text-text-primary mb-2 tracking-tight">No document selected</h3>
        <p className="text-sm text-text-muted leading-relaxed">
          Select a specification to extract its architectural components, ports, interfaces, and signals.
        </p>
      </div>
    </div>
  );

  if (!isReady) return (
    <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-0">
      <div className="max-w-xs">
        <div className="flex justify-center mb-4">
          <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full spin" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-2 tracking-tight">Ingestion in progress</h3>
        <p className="text-sm text-text-muted leading-relaxed">
          Structure extraction requires full vector indexing. Status: <code className="font-mono text-accent glass-badge px-2 py-0.5">{document.status}</code>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-0 overflow-hidden">
      {/* Toolbar */}
      <div className="h-13 border-b border-border-theme px-5 flex items-center justify-between flex-shrink-0 bg-surface-1/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-text-primary tracking-tight">Architecture Inventory</h2>
          {generatedAt && !isLoading && (
            <span className="glass-badge font-mono text-xs text-text-muted">{entities.length} entities indexed</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="btn-secondary h-8 px-3 text-xs gap-1.5 group"
          >
            <RefreshIcon spinning={isRefreshing} />
            <span>{isRefreshing ? 'Analyzing…' : 'Re-extract'}</span>
          </button>

          {entities.length > 0 && (<>
            <a
              href={getExportUrl(document.id, 'csv')}
              download={`${document.filename.replace(/\.pdf$/i, '')}_entities.csv`}
              className="btn-primary btn-shimmer h-8 px-3 text-xs gap-1.5 group !rounded-lg"
            >
              <DownloadIcon />
              <span>Export CSV</span>
            </a>
            <a
              href={getExportUrl(document.id, 'json')}
              download={`${document.filename.replace(/\.pdf$/i, '')}_entities.json`}
              className="btn-secondary h-8 px-3 text-xs gap-1.5 group"
            >
              <DownloadIcon />
              <span>JSON</span>
            </a>
          </>)}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-warn/30 bg-warn-soft px-5 py-2.5 flex items-center justify-between text-xs fade-in-up">
          <span className="text-warn font-medium">{error}</span>
          <button onClick={handleRefresh} className="btn-secondary h-7 px-2.5 text-xs">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-border-theme bg-surface-1/80 flex items-center gap-2.5 text-xs text-text-muted">
            <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full spin" />
            <span>Sweeping all chunks for architectural components, ports, interfaces, and signals…</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-surface-1 border-b border-border-theme">
                <tr className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-5 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Type</th>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-5 text-right">Location</th>
                </tr>
              </thead>
              <tbody>{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        </div>
      ) : entities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-xs fade-in-up">
            <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-text-subtle mb-4 mx-auto font-mono text-lg">
              —
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2 tracking-tight">No entities found</h3>
            <p className="text-sm text-text-muted leading-relaxed mb-4">No components, ports, interfaces, or signals were identified in this document.</p>
            <button onClick={handleRefresh} className="btn-primary btn-shimmer px-4 py-2 text-xs">
              <RefreshIcon spinning={false} />
              <span>Re-run extraction</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter bar */}
          <div className="border-b border-border-theme px-5 py-2.5 bg-surface-1/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
              {(['all', 'component', 'port', 'interface', 'signal', 'other'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`tab-pill !py-1 !px-2.5 !text-xs ${
                    selectedType === type ? 'active !border-accent-border' : ''
                  }`}
                >
                  <span>{TYPE_LABELS[type]}</span>
                  <span className="font-mono text-[10px] opacity-75">({counts[type]})</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entities…"
                className="glass-input h-8 pl-3 pr-8 text-xs w-48 placeholder:text-text-subtle"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-primary text-xs">✕</button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead className="sticky top-0 bg-surface-1/95 backdrop-blur-md border-b border-border-theme z-10">
                <tr className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-5 text-right">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {filtered.map((ent, idx) => {
                  const pageStr = ent.page_start === ent.page_end ? `p. ${ent.page_start}` : `pp. ${ent.page_start}–${ent.page_end}`;
                  const secStr = ent.section_title || 'General';
                  const typeKey = (ent.entity_type in TYPE_COLORS) ? ent.entity_type : 'other';
                  return (
                    <tr key={`${ent.entity_type}-${ent.name}-${idx}`} className="hover:bg-surface-1/60 transition-colors duration-150 group">
                      <td className="py-3.5 px-5 align-top">
                        <code
                          className="font-mono text-xs font-semibold text-accent glass-badge px-2 py-0.5 break-words [word-break:break-word]"
                          title={ent.name}
                        >
                          {ent.name}
                        </code>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${TYPE_COLORS[typeKey as EntityType | 'all']}`}>
                          {ent.entity_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-top text-sm text-text-secondary leading-relaxed max-w-sm">{ent.description}</td>
                      <td className="py-3.5 px-5 align-top text-right font-mono">
                        <div className="text-xs text-text-muted truncate max-w-[180px] ml-auto font-medium" title={secStr}>{secStr}</div>
                        <div className="text-xs text-accent mt-0.5 font-bold">{pageStr}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-sm text-text-muted">No entities match the current search filter.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
