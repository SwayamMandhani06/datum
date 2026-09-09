import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentItem, ExtractedEntity, EntityType } from '../types';
import { extractDocument, getExportUrl } from '../api/client';

interface StructureViewProps {
  document: DocumentItem | null;
}

const TYPE_LABELS: Record<EntityType | 'all', string> = {
  all: 'All', component: 'Components', port: 'Ports',
  interface: 'Interfaces', signal: 'Signals', other: 'Other',
};

const TYPE_COLORS: Record<EntityType | 'all', string> = {
  all:       'text-text-primary bg-surface-2 border-border-strong',
  component: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  port:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  interface: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  signal:    'text-violet-400 bg-violet-500/10 border-violet-500/20',
  other:     'text-text-muted bg-surface-3 border-border-theme',
};

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={spinning ? 'spin' : undefined}
  >
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const SkeletonRow = () => (
  <tr className="border-b border-border-theme">
    <td className="py-3 px-5"><div className="skeleton h-4 w-36" /></td>
    <td className="py-3 px-4"><div className="skeleton h-4 w-20" /></td>
    <td className="py-3 px-4"><div className="skeleton h-4 w-64" /></td>
    <td className="py-3 px-5"><div className="skeleton h-4 w-24 ml-auto" /></td>
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
        <div className="text-3xl text-text-subtle mb-4 font-mono">—</div>
        <h3 className="text-base font-semibold text-text-primary mb-2">No document selected</h3>
        <p className="text-sm text-text-muted leading-relaxed">Select a specification to extract its architectural components, ports, interfaces, and signals.</p>
      </div>
    </div>
  );

  if (!isReady) return (
    <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-0">
      <div className="max-w-xs">
        <div className="flex justify-center mb-4">
          <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full spin" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-2">Ingestion in progress</h3>
        <p className="text-sm text-text-muted leading-relaxed">
          Structure extraction requires full indexing. Status: <code className="font-mono text-accent">{document.status}</code>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-0 overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 border-b border-border-theme px-4 flex items-center justify-between flex-shrink-0 bg-surface-1">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Structure</h2>
          {generatedAt && !isLoading && (
            <span className="font-mono text-xs text-text-muted">{entities.length} entities</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="h-8 px-3 flex items-center gap-1.5 text-xs text-text-muted border border-border-theme rounded bg-surface-2 hover:border-border-strong hover:text-text-primary disabled:opacity-40 transition-colors duration-150"
          >
            <RefreshIcon spinning={isRefreshing} />
            {isRefreshing ? 'Analyzing…' : 'Refresh'}
          </button>

          {entities.length > 0 && (<>
            <a
              href={getExportUrl(document.id, 'csv')}
              download={`${document.filename.replace(/\.pdf$/i, '')}_entities.csv`}
              className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent-dim transition-colors duration-150"
            >
              <DownloadIcon /> CSV
            </a>
            <a
              href={getExportUrl(document.id, 'json')}
              download={`${document.filename.replace(/\.pdf$/i, '')}_entities.json`}
              className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium rounded border border-border-theme bg-surface-2 text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150"
            >
              <DownloadIcon /> JSON
            </a>
          </>)}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-warn-soft/40 bg-warn-soft px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-flag-amber">{error}</span>
          <button onClick={handleRefresh} className="underline text-flag-amber/80 hover:text-flag-amber">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-border-theme bg-surface-1 flex items-center gap-2 text-xs text-text-muted">
            <span className="w-3 h-3 border border-accent border-t-transparent rounded-full spin" />
            Sweeping all chunks for components, ports, interfaces, signals…
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-surface-1 border-b border-border-theme">
                <tr className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-5 text-left">Name</th>
                  <th className="py-2.5 px-4 text-left">Type</th>
                  <th className="py-2.5 px-4 text-left">Description</th>
                  <th className="py-2.5 px-5 text-right">Location</th>
                </tr>
              </thead>
              <tbody>{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        </div>
      ) : entities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-xs">
            <div className="text-3xl text-text-subtle mb-4">—</div>
            <h3 className="text-base font-semibold text-text-primary mb-2">No entities found</h3>
            <p className="text-sm text-text-muted leading-relaxed mb-4">No components, ports, interfaces, or signals were identified in this document.</p>
            <button onClick={handleRefresh} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded bg-accent text-white hover:bg-accent-dim transition-colors duration-150">
              <RefreshIcon spinning={false} /> Re-run extraction
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter bar */}
          <div className="border-b border-border-theme px-4 py-2 bg-surface-1 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(['all', 'component', 'port', 'interface', 'signal', 'other'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
                    selectedType === type
                      ? TYPE_COLORS[type]
                      : 'text-text-muted border-transparent hover:bg-surface-2 hover:text-text-secondary'
                  }`}
                >
                  {TYPE_LABELS[type]}
                  <span className="font-mono opacity-60">({counts[type]})</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name…"
                className="h-7 pl-3 pr-7 text-xs rounded bg-surface-2 border border-border-theme text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-border-strong w-44 transition-colors duration-150"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-secondary text-xs">✕</button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-1 border-b border-border-theme z-10">
                <tr className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-5">Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-5 text-right">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {filtered.map((ent, idx) => {
                  const pageStr = ent.page_start === ent.page_end ? `p. ${ent.page_start}` : `pp. ${ent.page_start}–${ent.page_end}`;
                  const secStr = ent.section_title || 'General';
                  const typeKey = (ent.entity_type in TYPE_COLORS) ? ent.entity_type : 'other';
                  return (
                    <tr key={`${ent.entity_type}-${ent.name}-${idx}`} className="hover:bg-surface-1 transition-colors duration-100">
                      <td className="py-3 px-5 align-top">
                        <code className="font-mono text-xs font-medium text-accent bg-accent-soft border border-accent-border px-2 py-0.5 rounded-sm break-all">
                          {ent.name}
                        </code>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-sm border ${TYPE_COLORS[typeKey as EntityType | 'all']}`}>
                          {ent.entity_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-sm text-text-secondary leading-relaxed max-w-sm">{ent.description}</td>
                      <td className="py-3 px-5 align-top text-right font-mono">
                        <div className="text-xs text-text-muted truncate max-w-[160px] ml-auto" title={secStr}>{secStr}</div>
                        <div className="text-xs text-text-subtle mt-0.5">{pageStr}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-text-muted">No entities match the current filter.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
