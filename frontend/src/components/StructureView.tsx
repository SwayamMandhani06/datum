import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentItem, ExtractedEntity, EntityType } from '../types';
import { extractDocument, getExportUrl } from '../api/client';

interface StructureViewProps {
  document: DocumentItem | null;
}

const TYPE_LABELS: Record<EntityType | 'all', string> = {
  all: 'All',
  component: 'Components',
  port: 'Ports',
  interface: 'Interfaces',
  signal: 'Signals',
  other: 'Other',
};

const TYPE_COLORS: Record<EntityType | 'all', string> = {
  all: 'text-accent bg-accent-soft border-accent-border',
  component: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  port: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  interface: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  signal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  other: 'text-text-muted bg-surface-3 border-border-theme',
};

const ICON_FOR_TYPE: Record<EntityType | 'all', string> = {
  all: '⊞',
  component: '◈',
  port: '⊳',
  interface: '⋈',
  signal: '↯',
  other: '○',
};

const LayersIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? 'spin-slow 1s linear infinite' : undefined }}>
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const SkeletonRow = () => (
  <tr className="border-b border-border-theme">
    <td className="py-3.5 px-5"><div className="h-5 w-36 rounded-lg bg-surface-3 animate-pulse" /></td>
    <td className="py-3.5 px-4"><div className="h-5 w-20 rounded-full bg-surface-3 animate-pulse" /></td>
    <td className="py-3.5 px-4"><div className="h-5 w-64 rounded-lg bg-surface-3 animate-pulse" /></td>
    <td className="py-3.5 px-5 text-right"><div className="h-5 w-24 rounded-lg bg-surface-3 animate-pulse ml-auto" /></td>
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
    if (!docId || !isReady) {
      setEntities([]);
      setGeneratedAt(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    extractDocument(docId, false)
      .then((res) => {
        if (isMounted) {
          setEntities(res.entities);
          setGeneratedAt(res.generated_at);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to extract structured entities.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [docId, isReady]);

  const handleRefresh = async () => {
    if (!docId || !isReady || isLoading || isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await extractDocument(docId, true);
      setEntities(res.entities);
      setGeneratedAt(res.generated_at);
    } catch (err: any) {
      setError(err.message || 'Failed to re-extract structured entities.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredEntities = useMemo(() => {
    return entities.filter((ent) => {
      const matchesType = selectedType === 'all' || ent.entity_type === selectedType;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ent.name.toLowerCase().includes(q) ||
        ent.description.toLowerCase().includes(q) ||
        (ent.section_title && ent.section_title.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [entities, selectedType, searchQuery]);

  const counts = useMemo(() => {
    const c: Record<EntityType | 'all', number> = {
      all: entities.length,
      component: 0, port: 0, interface: 0, signal: 0, other: 0,
    };
    for (const ent of entities) {
      if (ent.entity_type in c) c[ent.entity_type]++;
      else c.other++;
    }
    return c;
  }, [entities]);

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-0 p-8 text-center select-none">
        <div className="max-w-sm">
          <div className="w-16 h-16 rounded-2xl gradient-bg-subtle border border-accent-border flex items-center justify-center mx-auto mb-4 animate-float">
            <LayersIcon />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">No Document Selected</h3>
          <p className="text-sm text-text-muted leading-relaxed">
            Select a specification from the left rail to extract architectural components, ports, interfaces, and signals.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-0 p-8 text-center select-none">
        <div className="max-w-sm">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 animate-pulse-ring">
            <LayersIcon />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">Ingestion In Progress</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            Structure extraction requires full indexing to complete.
          </p>
          <span className="font-mono text-xs text-accent bg-accent-soft border border-accent-border px-3 py-1 rounded-full">
            Status: {document.status}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-0 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-border-theme px-5 flex items-center justify-between flex-shrink-0 bg-surface-1/50">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">Structure Extraction</h2>
          {generatedAt && !isLoading && (
            <span className="font-mono text-xs text-text-muted bg-surface-2 border border-border-theme px-2 py-0.5 rounded-full hidden sm:inline">
              {entities.length} entities
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary glass border border-border-theme hover:border-accent-border disabled:opacity-40 transition-all duration-200"
            title="Re-run extraction"
          >
            <RefreshIcon spinning={isRefreshing} />
            {isRefreshing ? 'Analyzing...' : 'Refresh'}
          </button>

          {entities.length > 0 && (
            <>
              <a
                href={getExportUrl(document.id, 'csv')}
                download={`${document.filename.replace(/\.pdf$/i, '')}_extractions.csv`}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium gradient-bg text-white hover:opacity-90 transition-all duration-200 glow-sm"
              >
                <DownloadIcon />
                CSV
              </a>
              <a
                href={getExportUrl(document.id, 'json')}
                download={`${document.filename.replace(/\.pdf$/i, '')}_extractions.json`}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium glass border border-border-theme hover:border-accent-border text-text-primary transition-all duration-200"
              >
                <DownloadIcon />
                JSON
              </a>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-flag-amber/30 bg-amber-soft px-5 py-2.5 flex items-center justify-between text-sm">
          <span className="text-flag-amber">{error}</span>
          <button onClick={handleRefresh} className="text-xs underline text-flag-amber/80 hover:text-flag-amber">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        /* Loading skeleton */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-border-theme flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-accent-border text-xs text-accent font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Analyzing full document...
            </div>
            <p className="text-sm text-text-muted">Sweeping all chunks for components, ports, interfaces, signals...</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-surface-2/50 border-b border-border-theme">
                <tr className="text-xs text-text-muted font-semibold uppercase tracking-wider">
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
        /* Empty state */
        <div className="flex-1 flex items-center justify-center p-8 text-center select-none">
          <div className="max-w-sm">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base font-semibold text-text-primary mb-2">No Entities Identified</h3>
            <p className="text-sm text-text-muted leading-relaxed mb-4">
              No explicitly designated components, ports, interfaces, or signals were found in this document.
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium gradient-bg text-white hover:opacity-90 transition-all glow-sm"
            >
              <RefreshIcon spinning={false} />
              Re-run Extraction
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter bar */}
          <div className="border-b border-border-theme px-5 py-2.5 bg-surface-1/30 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'component', 'port', 'interface', 'signal', 'other'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 whitespace-nowrap ${
                    selectedType === type
                      ? TYPE_COLORS[type] + ' shadow-glow-sm'
                      : 'text-text-muted border-transparent hover:border-border-theme hover:bg-surface-2'
                  }`}
                >
                  <span className="text-sm">{ICON_FOR_TYPE[type]}</span>
                  {TYPE_LABELS[type]}
                  <span className="font-mono text-[10px] opacity-70">({counts[type]})</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name..."
                className="h-8 pl-3 pr-8 rounded-lg bg-surface-2 border border-border-theme text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-border w-48 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-2/90 border-b border-border-theme z-10 select-none backdrop-blur-sm">
                <tr className="text-xs text-text-muted font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-5 text-right">Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((ent, idx) => {
                  const pageStr = ent.page_start === ent.page_end
                    ? `p. ${ent.page_start}`
                    : `pp. ${ent.page_start}–${ent.page_end}`;
                  const secStr = ent.section_title || 'General';
                  const typeKey = (ent.entity_type in TYPE_COLORS) ? ent.entity_type : 'other';

                  return (
                    <tr
                      key={`${ent.entity_type}-${ent.name}-${idx}`}
                      className="border-b border-border-theme hover:bg-surface-1/50 transition-colors duration-150 group"
                    >
                      <td className="py-3.5 px-5 align-top">
                        <code className="font-mono text-xs font-semibold text-accent bg-accent-soft border border-accent-border px-2 py-1 rounded-md break-all">
                          {ent.name}
                        </code>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${TYPE_COLORS[typeKey as EntityType | 'all']}`}>
                          <span className="text-xs">{ICON_FOR_TYPE[typeKey as EntityType | 'all']}</span>
                          {ent.entity_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top text-sm text-text-secondary leading-relaxed max-w-sm">
                        {ent.description}
                      </td>

                      <td className="py-3.5 px-5 align-top text-right">
                        <div className="text-xs text-text-muted font-mono truncate max-w-[160px] ml-auto" title={secStr}>
                          {secStr}
                        </div>
                        <div className="text-[11px] font-mono text-text-subtle mt-0.5">{pageStr}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredEntities.length === 0 && (
              <div className="p-8 text-center text-sm text-text-muted">
                No entities match the current filter and search criteria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
