'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Tag as TagIcon, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

interface TagInputProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  className?: string
}

export default function TagInput({ selectedTags, onTagsChange, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Close dropdown on outside click ─────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Debounced search ─────────────────────────────────────────

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      setDropdownOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/tags?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const json = await res.json()
        // Filter out already-selected tags
        const filtered = (json.data ?? []).filter(
          (t: Tag) => !selectedTags.some((s) => s.id === t.id)
        )
        setSuggestions(filtered)
        setDropdownOpen(true)
        setActiveIndex(-1)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedTags])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(inputValue), 200)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [inputValue, fetchSuggestions])

  // ── Tag operations ────────────────────────────────────────────

  function removeTag(tagId: string) {
    onTagsChange(selectedTags.filter((t) => t.id !== tagId))
  }

  async function addTag(tag: Tag) {
    if (selectedTags.some((t) => t.id === tag.id)) return
    onTagsChange([...selectedTags, tag])
    setInputValue('')
    setSuggestions([])
    setDropdownOpen(false)
    inputRef.current?.focus()
  }

  async function createAndAdd(name: string) {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color: getRandomTagColor() }),
      })
      if (res.ok) {
        const json = await res.json()
        await addTag(json.data)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Keyboard handling ─────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && inputValue === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1].id)
      return
    }

    if (e.key === 'Escape') {
      setDropdownOpen(false)
      setActiveIndex(-1)
      return
    }

    if (!dropdownOpen) return

    const total = suggestions.length + (canCreate ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % total)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? total - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        addTag(suggestions[activeIndex])
      } else if (canCreate && (activeIndex === suggestions.length || activeIndex === -1)) {
        createAndAdd(inputValue)
      }
    } else if (e.key === 'Tab') {
      setDropdownOpen(false)
    }
  }

  const normalizedInput = inputValue.trim().toLowerCase()
  const exactMatch = suggestions.some((t) => t.name === normalizedInput)
  const canCreate = normalizedInput.length > 0 && !exactMatch

  // ── Dropdown items ────────────────────────────────────────────

  const dropdownItems: Array<{ type: 'existing'; tag: Tag } | { type: 'create'; name: string }> =
    [
      ...suggestions.map((tag) => ({ type: 'existing' as const, tag })),
      ...(canCreate ? [{ type: 'create' as const, name: inputValue.trim() }] : []),
    ]

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Chips + input container */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 px-2.5 py-2 bg-background border rounded-lg',
          'border-border focus-within:border-accent transition-colors min-h-[38px] cursor-text'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected tag chips */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                       bg-surface-hover border border-border transition-all"
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <span className="text-text-secondary">{tag.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(tag.id)
              }}
              className="text-text-muted hover:text-text-primary transition-colors ml-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setDropdownOpen(true)}
          placeholder={selectedTags.length === 0 ? 'Ajouter des tags…' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-text-primary
                     placeholder-text-muted focus:outline-none py-0.5"
        />

        {loading && (
          <Loader2 size={13} className="text-text-muted animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      {dropdownOpen && dropdownItems.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border
                     rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in"
        >
          <ul className="py-1 max-h-52 overflow-y-auto">
            {dropdownItems.map((item, index) => {
              const isActive = index === activeIndex
              if (item.type === 'existing') {
                const { tag } = item
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addTag(tag)
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                        isActive ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-text-primary flex-1">{tag.name}</span>
                      {tag.note_count !== undefined && (
                        <span className="text-xs text-text-muted">{tag.note_count}</span>
                      )}
                    </button>
                  </li>
                )
              }
              // "create" option
              return (
                <li key="create">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      createAndAdd(item.name)
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                      isActive ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                    )}
                  >
                    <Plus size={13} className="text-accent flex-shrink-0" />
                    <span className="text-text-secondary">
                      Créer{' '}
                      <span className="text-text-primary font-medium">"{item.name}"</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Empty dropdown with icon hint */}
      {dropdownOpen && dropdownItems.length === 0 && !loading && inputValue && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-text-muted">
            <TagIcon size={13} />
            Aucun tag trouvé
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

const TAG_COLORS = [
  '#7c3aed', '#3b82f6', '#22c55e', '#ef4444',
  '#f97316', '#ec4899', '#eab308', '#14b8a6',
  '#6366f1', '#f43f5e', '#06b6d4', '#84cc16',
]

function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}
