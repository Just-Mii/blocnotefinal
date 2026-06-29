'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  FileText,
  BookOpen,
  Calendar,
  Loader2,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react'
import { cn, formatDateShortFr } from '@/lib/utils'
import type { SearchResult } from '@/types'

// ── Type icon helper ──────────────────────────────────────────

function ResultTypeIcon({ type }: { type: SearchResult['type'] }) {
  const cfg = {
    note: { Icon: FileText, className: 'text-violet-400' },
    journal: { Icon: BookOpen, className: 'text-blue-400' },
    calendar: { Icon: Calendar, className: 'text-green-400' },
  }[type]
  return <cfg.Icon size={14} className={cfg.className} />
}

// ── SearchModal ───────────────────────────────────────────────

interface SearchModalProps {
  /** Called when user navigates to a result. Defaults to next/navigation router. */
  onNavigate?: (result: SearchResult) => void
}

export default function SearchModal({ onNavigate }: SearchModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Global Ctrl+P / Ctrl+K shortcut ──────────────────────────

  useEffect(() => {
    function handleGlobalKey(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setActiveIndex(0)
    }
  }, [open])

  // ── Debounced search ─────────────────────────────────────────

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&type=all`
      )
      if (res.ok) {
        const json = await res.json()
        setResults((json.data ?? []).slice(0, 10))
        setActiveIndex(0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 200)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, search])

  // ── Keyboard navigation ───────────────────────────────────────

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }

    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      navigateTo(results[activeIndex])
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex])

  // ── Navigation ────────────────────────────────────────────────

  function navigateTo(result: SearchResult) {
    setOpen(false)
    if (onNavigate) {
      onNavigate(result)
      return
    }
    // Default routing
    switch (result.type) {
      case 'note':
      case 'calendar':
        router.push(`/notes?id=${result.id}`)
        break
      case 'journal':
        router.push(result.date ? `/journal?date=${result.date}` : '/journal')
        break
    }
  }

  // ── Render ────────────────────────────────────────────────────

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          {loading ? (
            <Loader2 size={17} className="text-text-muted animate-spin flex-shrink-0" />
          ) : (
            <Search size={17} className="text-text-muted flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher des notes, journal, calendrier…"
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted
                       text-sm focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Results list */}
        {results.length > 0 && (
          <ul ref={listRef} className="max-h-[380px] overflow-y-auto py-1.5">
            {results.map((result, index) => (
              <li key={result.id} data-index={index}>
                <button
                  onClick={() => navigateTo(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                    activeIndex === index ? 'bg-surface-hover' : 'hover:bg-surface-hover/50'
                  )}
                >
                  {/* Type icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    <ResultTypeIcon type={result.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate mb-0.5">
                      {result.title}
                    </p>
                    {result.excerpt && (
                      <p className="text-xs text-text-muted line-clamp-1">{result.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {result.date && (
                        <span className="text-xs text-text-muted">
                          {formatDateShortFr(result.date)}
                        </span>
                      )}
                      {result.tags && result.tags.length > 0 && (
                        <div className="flex gap-1">
                          {result.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: tag.color + '20',
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active indicator */}
                  {activeIndex === index && (
                    <div className="flex-shrink-0 mt-0.5">
                      <ArrowRight size={13} className="text-accent" />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state while typing */}
        {query && !loading && results.length === 0 && (
          <div className="flex items-center justify-center py-10 text-sm text-text-muted">
            Aucun résultat pour "{query}"
          </div>
        )}

        {/* Prompt to type */}
        {!query && (
          <div className="flex items-center justify-center py-8 text-sm text-text-muted">
            Commencez à taper pour rechercher…
          </div>
        )}

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-background/50 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft size={11} />
            Ouvrir
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono bg-surface-hover px-1 rounded">↑↓</span>
            Naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono bg-surface-hover px-1 rounded">Esc</span>
            Fermer
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] font-mono bg-surface-hover px-1 rounded">Ctrl</span>
            <span className="text-[10px]">+</span>
            <span className="text-[10px] font-mono bg-surface-hover px-1 rounded">P</span>
          </span>
        </div>
      </div>
    </div>
  )
}
