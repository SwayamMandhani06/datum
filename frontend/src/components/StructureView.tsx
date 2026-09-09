import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentItem, ExtractedEntity, EntityType } from '../types';
import { extractDocument, getExportUrl } from '../api/client';

interface StructureViewProps {
  document: DocumentItem | null;
}

const TYPE_LABELS: Record<EntityType | 'all', string> = {
  all: 'All Entities',
  component: 'Components',
  port: 'Ports',
  interface: 'Interfaces',
  signal: 'Signals',
  other: 'Other',
};

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

  // Load extraction when active document changes
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
        if (isMounted) {
          setError(err.message || 'Failed to extract structured entities.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
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

  // Filter entities by type and search query
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

  // Counts by type
  const counts = useMemo(() => {
    const c: Record<EntityType | 'all', number> = {
      all: entities.length,
      component: 0,
      port: 0,
      interface: 0,
      signal: 0,
      other: 0,
    };
    for (const ent of entities) {
      if (ent.entity_type in c) {
        c[ent.entity_type]++;
      } else {
        c.other++;
      }
    }
    return c;
  }, [entities]);

  // If no document is selected
  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1 p-8 text-center select-none">
        <div className="max-w-md">
          <div className="text-scale-17 font-medium text-text-primary mb-2">
            No Document Selected
          </div>
          <p className="text-scale-13 text-text-muted">
            Select a specification from the left rail to view its extracted architectural components, ports, interfaces, and signals.
          </p>
        </div>
      </div>
    );
  }

  // If document is not in ready status
  if (!isReady) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1 p-8 text-center select-none">
        <div className="max-w-md">
          <div className="text-scale-17 font-medium text-text-primary mb-2">
            Document Ingestion In Progress
          </div>
          <p className="text-scale-13 text-text-muted">
            Structured entity extraction requires full layout parsing and section-aware chunking to complete. Current status: <span className="font-mono text-text-primary">{document.status}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-1 overflow-hidden">
      {/* Top Toolbar Strip */}
      <div className="h-14 border-b border-border-theme px-6 flex items-center justify-between flex-shrink-0 bg-surface-0">
        <div className="flex items-center space-x-4 min-w-0">
          <h2 className="text-scale-15 font-semibold text-text-primary tracking-tight">
            Structure Specification
          </h2>
          {generatedAt && !isLoading && (
            <span className="text-scale-13 text-text-muted border-l border-border-theme pl-4 font-mono hidden sm:inline">
              {entities.length} entities indexed
            </span>
          )}
        </div>

        {/* Action Controls: Refresh & Exports */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="text-scale-13 py-1.5 px-3 bg-surface-2 border border-border-theme text-text-primary hover:bg-surface-1 disabled:opacity-50 transition-colors flex items-center space-x-1.5"
            title="Re-run extraction across all document chunks"
          >
            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>↻</span>
            <span>{isRefreshing ? 'Analyzing...' : 'Refresh'}</span>
          </button>

          {entities.length > 0 && (
            <div className="flex items-center space-x-1">
              <a
                href={getExportUrl(document.id, 'csv')}
                download={`${document.filename.replace(/\.pdf$/i, '')}_extractions.csv`}
                className="text-scale-13 py-1.5 px-3 bg-surface-2 border border-border-theme text-text-primary hover:bg-surface-1 transition-colors flex items-center space-x-1 font-mono"
              >
                <span>Export CSV</span>
              </a>
              <a
                href={getExportUrl(document.id, 'json')}
                download={`${document.filename.replace(/\.pdf$/i, '')}_extractions.json`}
                className="text-scale-13 py-1.5 px-3 bg-surface-2 border border-border-theme text-text-primary hover:bg-surface-1 transition-colors flex items-center space-x-1 font-mono"
              >
                <span>Export JSON</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="bg-flag-amber/10 border-b border-flag-amber/30 px-6 py-2.5 text-scale-13 text-text-primary flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={handleRefresh}
            className="underline font-medium hover:text-text-primary text-text-muted ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State: Analyzing Full Document */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center select-none bg-surface-1">
          <div className="max-w-md space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-surface-2 border border-border-theme text-text-primary text-scale-13 font-mono">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Analyzing full document...</span>
            </div>
            <div className="text-scale-17 font-medium text-text-primary">
              Extracting Architecture Entities
            </div>
            <p className="text-scale-13 text-text-muted leading-relaxed">
              Performing a full-document sweep across all indexed chunks to identify components, ports, interfaces, and signals strictly grounded in the specification text.
            </p>
          </div>
        </div>
      ) : entities.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center p-8 text-center select-none bg-surface-1">
          <div className="max-w-md space-y-3">
            <div className="text-scale-17 font-medium text-text-primary">
              No Entities Identified
            </div>
            <p className="text-scale-13 text-text-muted">
              No explicitly designated components, ports, interfaces, or signals were found in this document.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-scale-13 py-1.5 px-4 bg-surface-2 border border-border-theme text-text-primary hover:bg-surface-0 transition-colors"
            >
              Re-run Extraction
            </button>
          </div>
        </div>
      ) : (
        /* Filter and Table Content */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-toolbar: Category Filters & Search */}
          <div className="border-b border-border-theme px-6 py-2.5 bg-surface-0 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {(['all', 'component', 'port', 'interface', 'signal', 'other'] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`text-scale-13 py-1 px-2.5 border transition-colors flex items-center space-x-1.5 ${
                      selectedType === type
                        ? 'bg-surface-2 border-border-theme text-text-primary font-medium'
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <span>{TYPE_LABELS[type]}</span>
                    <span className="text-[11px] font-mono opacity-60">
                      ({counts[type]})
                    </span>
                  </button>
                )
              )}
            </div>

            {/* Quick Search Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name or keyword..."
                className="text-scale-13 py-1 px-3 bg-surface-1 border border-border-theme text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent w-56 font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-scale-13"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Structured Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-2 border-b border-border-theme z-10 select-none">
                <tr className="text-scale-13 text-text-muted font-medium">
                  <th className="py-2.5 px-6 w-1/4">Name</th>
                  <th className="py-2.5 px-4 w-32">Type</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-6 w-48 text-right">Section & Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme">
                {filteredEntities.map((ent, idx) => {
                  const pageStr =
                    ent.page_start === ent.page_end
                      ? `p. ${ent.page_start}`
                      : `pp. ${ent.page_start}–${ent.page_end}`;
                  const secStr = ent.section_title || 'General';

                  return (
                    <tr
                      key={`${ent.entity_type}-${ent.name}-${idx}`}
                      className="hover:bg-surface-0/60 transition-colors"
                    >
                      {/* Name in IBM Plex Mono */}
                      <td className="py-3 px-6 align-top">
                        <span className="font-mono text-scale-13 text-text-primary font-medium bg-surface-2 px-2 py-0.5 border border-border-theme inline-block break-all">
                          {ent.name}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 align-top">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider bg-surface-2 text-text-muted border border-border-theme">
                          {ent.entity_type}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 align-top text-scale-13 text-text-primary leading-relaxed">
                        {ent.description}
                      </td>

                      {/* Section and Page */}
                      <td className="py-3 px-6 align-top text-right text-scale-13 text-text-muted font-mono whitespace-nowrap">
                        <div title={secStr} className="truncate max-w-[180px] ml-auto">
                          {secStr}
                        </div>
                        <div className="text-[11px] opacity-75">{pageStr}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredEntities.length === 0 && (
              <div className="p-8 text-center text-scale-13 text-text-muted">
                No entities match the active type and search criteria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
