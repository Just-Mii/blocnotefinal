'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  X,
  FileText,
  BookOpen,
  Calendar,
  Tag,
  Filter,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import { cn, formatDateShortFr } from '@/lib/utils'
import type { SearchResult, Tag as TagType } from '@/types'

// ── Types & constants ─────────────────────────────────────────

type FilterType = 'all' | 'note' | 'journal' | 'calendar'

const TYPE_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tout', icon: <Search size={13} /> },
  { value: 'note', label: 'Notes', icon: <FileText size={13} /> },
  { value: 'journal', label: 'Journal', icon: <BookOpen size={13} /> },
  { value: 'calendar', label: 'Calendrier', icon: <Calendar size={13} /> },
]

// ── Excerpt with highlighted query ────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-accent/25 text-accent-light rounded px-0.5 not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ── Result type badge ─────────────────────────────────────────

function TypeBadge({ type }: { type: SearchResult['type'] }) {
  const config = {
    note: { label: 'Note', className: 'bg-violet-500/15 text-violet-400', Icon: FileText },
    journal: { label: 'Journal', className: 'bg-blue-500/15 text-blue-400', Icon: BookOpen },
    calendar: {
      label: 'Calendrier',
      className: 'bg-green-500/15 text-green-400',
      Icon: Calendar,
    },
  }[type]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
        config.className
      )}
    >
      <config.Icon size={10} />
      {config.label}
    </span>
  )
}

// ── Result card ───────────────────────────────────────────────

interface ResultCardProps {
  result: SearchResult
  query: string
}

function ResultCard({ result, query }: ResultCardProps) {
  return (
    <div className="group flex gap-4 px-5 py-4 bg-surface border border-border rounded-xl hover:border-border-strong transition-all cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <TypeBadge type={result.type} />
          <h3 className="text-sm font-semibold text-text-primary truncate">
            <HighlightText text={result.title} query={query} />
          </h3>
        </div>

        {result.excerpt && (
          <p className="text-sm text-text-muted line-clamp-2 mb-2">
            <HighlightText text={result.excerpt} query={query} />
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {result.date && (
            <span className="text-xs text-text-muted">
              {formatDateShortFr(result.date)}
            </span>
          )}
          {result.tags && result.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              {result.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SearchSection ─────────────────────────────────────────────

export default function SearchSection() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState<FilterType>('all')
  const [tagFilter, setTagFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [availableTags, setAvailableTags] = useState<TagType[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load tags for filter dropdown
  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((j) => setAvailableTags(j.data ?? []))
      .catch(() => {})
  }, [])

  // Debounced search
  const doSearch = useCallback(async (q: string, t: FilterType, tag: string, from: string, to: string) => {
    if (!q.trim() && !tag) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      params.set('type', t)
      if (tag) params.set('tag', tag)
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(`/api/search?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setResults(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => doSearch(query, type, tagFilter, fromDate, toDate),
      300
    )
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, type, tagFilter, fromDate, toDate, doSearch])

  // Esc to clear
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && query) {
        setQuery('')
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [query])

  function clearAll() {
    setQuery('')
    setType('all')
    setTagFilter('')
    setFromDate('')
    setToDate('')
    setResults([])
    setSearched(false)
    inputRef.current?.focus()
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Search bar */}
      <div className="px-6 py-6 border-b border-border flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center">
            {loading ? (
              <Loader2
                size={18}
                className="absolute left-4 text-text-muted animate-spin pointer-events-none"
              />
            ) : (
              <Search
                size={18}
                className="absolute left-4 text-text-muted pointer-events-none"
              />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans toutes vos notes…"
              className="w-full pl-11 pr-12 py-3 bg-surface border border-border rounded-xl
                         text-text-primary placeholder-text-muted text-base
                         focus:outline-none focus:border-accent transition-colors"
            />
            <div className="absolute right-3 flex items-center gap-1">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                >
                  <X size={15} />
                </button>
              )}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  showFilters
                    ? 'bg-accent/20 text-accent-light'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                )}
                title="Filtres"
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-surface border border-border rounded-xl space-y-3 animate-fade-in">
              {/* Type filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-muted w-14 flex-shrink-0">Type</span>
                <div className="flex gap-1 flex-wrap">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setType(opt.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                        type === opt.value
                          ? 'bg-accent text-white'
                          : 'bg-surface-hover text-text-secondary hover:text-text-primary border border-border'
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag filter */}
              {availableTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-14 flex-shrink-0 flex items-center gap-1">
                    <Tag size={11} />
                    Tag
                  </span>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded-lg
                               text-sm text-text-secondary focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="">Tous les tags</option>
                    {availableTags.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date range */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-14 flex-shrink-0 flex items-center gap-1">
                  <Filter size={11} />
                  Période
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded-lg
                               text-sm text-text-secondary focus:outline-none focus:border-accent transition-colors"
                  />
                  <span className="text-text-muted text-xs">→</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded-lg
                               text-sm text-text-secondary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {(tagFilter || fromDate || toDate || type !== 'all') && (
                <button
                  onClick={clearAll}
                  className="text-xs text-accent hover:text-accent-light transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-3xl mx-auto">
          {!searched && !query && (
            // Empty state with hints
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center mb-4">
                <Search size={28} className="text-text-muted" />
              </div>
              <h2 className="text-text-primary font-semibold mb-2">
                Recherchez dans toutes vos notes
              </h2>
              <p className="text-text-muted text-sm max-w-sm">
                Tapez quelques mots pour trouver rapidement n'importe quelle note, entrée de
                journal ou note de calendrier.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['titre', 'contenu', 'tag', 'date'].map((hint) => (
                  <span
                    key={hint}
                    className="text-xs px-2.5 py-1 bg-surface border border-border rounded-full text-text-muted"
                  >
                    Cherche dans les {hint}s
                  </span>
                ))}
              </div>
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={32} className="text-text-muted mb-3 opacity-50" />
              <p className="text-text-secondary font-medium mb-1">Aucun résultat</p>
              <p className="text-text-muted text-sm">
                Essayez d'autres mots-clés ou modifiez les filtres.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted mb-3">
                {results.length} résultat{results.length !== 1 ? 's' : ''}
                {query && (
                  <>
                    {' '}pour{' '}
                    <span className="text-text-secondary font-medium">"{query}"</span>
                  </>
                )}
              </p>
              {results.map((result) => (
                <ResultCard key={result.id} result={result} query={query} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
