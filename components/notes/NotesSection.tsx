'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  SortAsc,
  LayoutList,
  LayoutGrid,
  Tag as TagIcon,
  X,
  Trash2,
  ChevronDown,
  FileText,
  StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note, Tag } from '@/types'
import NoteList from './NoteList'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'

// ─── Types ───────────────────────────────────────────────────────────────────

type SortOption = 'updated_at' | 'created_at' | 'title'
type ViewMode = 'list' | 'grid'
type Tab = 'notes' | 'trash'

const SORT_LABELS: Record<SortOption, string> = {
  updated_at: 'Modifié',
  created_at: 'Créé',
  title: 'Titre',
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyEditor() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-border">
        <StickyNote size={28} className="text-text-muted" />
      </div>
      <div>
        <p className="text-text-secondary font-medium mb-1">Sélectionnez une note</p>
        <p className="text-text-muted text-sm">
          Choisissez une note dans la liste ou créez-en une nouvelle.
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotesSection() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('updated_at')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [creating, setCreating] = useState(false)

  // ── Fetch notes ───────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'standalone',
        sort,
        trash: activeTab === 'trash' ? 'true' : 'false',
      })
      if (search) params.set('search', search)
      if (filterTag) params.set('tag', filterTag)

      const res = await fetch(`/api/notes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setNotes(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [sort, activeTab, search, filterTag])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // ── Fetch tags for filter panel ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAllTags(d))
      .catch(console.error)
  }, [])

  // ── Create note ───────────────────────────────────────────────────────────
  const handleCreateNote = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Sans titre', content: '', type: 'standalone' }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes((prev) => [note, ...prev])
        setSelectedNote(note)
        if (activeTab !== 'notes') setActiveTab('notes')
      }
    } finally {
      setCreating(false)
    }
  }

  // ── Delete (soft) ─────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedNote?.id === id) setSelectedNote(null)
  }

  // ── Restore from trash ────────────────────────────────────────────────────
  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_deleted: false }),
    })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (selectedNote?.id === id) setSelectedNote(null)
    }
  }

  // ── Hard delete ───────────────────────────────────────────────────────────
  const handleHardDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement cette note ? Cette action est irréversible.')) return
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (selectedNote?.id === id) setSelectedNote(null)
    }
  }

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/notes/${id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const copy = await res.json()
      setNotes((prev) => [copy, ...prev])
      setSelectedNote(copy)
    }
  }

  // ── Toggle favorite ───────────────────────────────────────────────────────
  const handleToggleFavorite = async (id: string, value: boolean) => {
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: value }),
    })
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_favorite: value } : n))
    )
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => prev ? { ...prev, is_favorite: value } : null)
    }
  }

  // ── Note update (from editor) ─────────────────────────────────────────────
  const handleNoteUpdate = useCallback(
    (updated: Partial<Note> & { id: string }) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
      )
      setSelectedNote((prev) =>
        prev?.id === updated.id ? { ...prev, ...updated } : prev
      )
    },
    []
  )

  // ── Duplicate callback from editor ────────────────────────────────────────
  const handleEditorDuplicate = (copy: Note) => {
    setNotes((prev) => [copy, ...prev])
    setSelectedNote(copy)
  }

  // ── Note counts ───────────────────────────────────────────────────────────
  const noteCount = notes.length

  // ── Filtered tag label ────────────────────────────────────────────────────
  const filterTagLabel = useMemo(
    () => allTags.find((t) => t.id === filterTag)?.name,
    [allTags, filterTag]
  )

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-72 flex flex-col border-r border-border bg-surface shrink-0">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <FileText size={16} className="text-accent" />
              Notes
            </h1>
            <button
              onClick={handleCreateNote}
              disabled={creating}
              title="Nouvelle note"
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                'bg-accent hover:bg-accent-hover text-white disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              <Plus size={13} />
              Nouvelle
            </button>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-background p-0.5 gap-0.5">
            {(['notes', 'trash'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedNote(null) }}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5',
                  activeTab === tab
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {tab === 'trash' && <Trash2 size={11} />}
                {tab === 'notes' ? 'Notes' : 'Corbeille'}
                {tab === activeTab && (
                  <span className="text-[10px] bg-accent-subtle text-accent px-1 rounded-full">
                    {noteCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-background border border-border rounded-lg outline-none text-text-primary placeholder:text-text-muted focus:border-accent/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <SortAsc size={12} />
              {SORT_LABELS[sort]}
              <ChevronDown size={10} />
            </button>
            {showSortMenu && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-surface border border-border rounded-lg shadow-xl z-30 py-1 animate-fade-in">
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setShowSortMenu(false) }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors',
                      sort === key ? 'text-accent font-medium' : 'text-text-secondary'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag filter + view toggle */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowTagFilter((v) => !v)}
              title="Filtrer par tag"
              className={cn(
                'p-1.5 rounded transition-colors',
                filterTag || showTagFilter
                  ? 'text-accent bg-accent-subtle'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              <TagIcon size={13} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'list'
                  ? 'text-accent bg-accent-subtle'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              <LayoutList size={13} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'grid'
                  ? 'text-accent bg-accent-subtle'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              <LayoutGrid size={13} />
            </button>
          </div>
        </div>

        {/* Tag filter panel */}
        {showTagFilter && (
          <div className="px-3 py-2 border-b border-border shrink-0 animate-fade-in">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterTag(null)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs transition-colors',
                  !filterTag
                    ? 'bg-accent text-white'
                    : 'bg-surface-hover text-text-muted hover:text-text-primary'
                )}
              >
                Tous
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs transition-colors font-medium'
                  )}
                  style={
                    filterTag === tag.id
                      ? { background: tag.color, color: '#fff' }
                      : { background: `${tag.color}22`, color: tag.color }
                  }
                >
                  {tag.name}
                </button>
              ))}
              {allTags.length === 0 && (
                <span className="text-xs text-text-muted">Aucun tag créé.</span>
              )}
            </div>
          </div>
        )}

        {/* Active tag filter badge */}
        {filterTag && filterTagLabel && (
          <div className="px-3 py-1.5 border-b border-border shrink-0">
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <span>Tag :</span>
              <span className="text-accent-light font-medium">{filterTagLabel}</span>
              <button
                onClick={() => setFilterTag(null)}
                className="ml-auto text-text-muted hover:text-text-primary"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === 'list' ? (
            <NoteList
              notes={notes}
              selectedId={selectedNote?.id}
              onSelect={setSelectedNote}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggleFavorite={handleToggleFavorite}
              onRestore={handleRestore}
              onHardDelete={handleHardDelete}
              isTrash={activeTab === 'trash'}
            />
          ) : (
            <div className="p-2 grid grid-cols-1 gap-2">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-text-muted text-sm">
                    {activeTab === 'trash' ? 'La corbeille est vide.' : 'Aucune note.'}
                  </p>
                </div>
              ) : (
                // Favorites first in grid view
                [...notes.filter((n) => n.is_favorite), ...notes.filter((n) => !n.is_favorite)].map(
                  (note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedNote?.id === note.id}
                      onSelect={setSelectedNote}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onToggleFavorite={handleToggleFavorite}
                      onRestore={handleRestore}
                      onHardDelete={handleHardDelete}
                      isTrash={activeTab === 'trash'}
                    />
                  )
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: editor ── */}
      <div className="flex-1 overflow-hidden">
        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            onNoteUpdate={handleNoteUpdate}
            onDelete={handleDelete}
            onDuplicate={handleEditorDuplicate}
            onClose={() => setSelectedNote(null)}
          />
        ) : (
          <EmptyEditor />
        )}
      </div>
    </div>
  )
}
