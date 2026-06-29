'use client'

import { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  FileText,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { cn, formatDateShortFr } from '@/lib/utils'
import { getSupabaseBrowser } from '@/lib/supabase'
import type { Tag as TagType, Note } from '@/types'

// ── Color presets ─────────────────────────────────────────────

const PRESET_COLORS = [
  '#7c3aed', '#3b82f6', '#22c55e', '#ef4444',
  '#f97316', '#ec4899', '#eab308', '#14b8a6',
  '#6366f1', '#f43f5e', '#06b6d4', '#84cc16',
]

type TagWithCount = TagType & { note_count: number }

// ── Tag Modal ─────────────────────────────────────────────────

interface TagModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: TagWithCount | null
  onSave: (data: { name: string; color: string }) => Promise<void>
}

function TagModal({ open, onOpenChange, tag, onSave }: TagModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(tag?.name ?? '')
      setColor(tag?.color ?? '#7c3aed')
    }
  }, [open, tag])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave({ name: name.trim(), color })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                     w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl
                     animate-fade-in p-6 focus:outline-none"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-text-primary">
              {tag ? 'Modifier le tag' : 'Nouveau tag'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-surface-hover">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-background rounded-lg border border-border">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-text-primary font-medium">
                {name || <span className="text-text-muted italic">nom du tag</span>}
              </span>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Nom
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: urgent, design, idée…"
                autoFocus
                className="w-full px-3 py-2 bg-background border border-border rounded-lg
                           text-text-primary placeholder-text-muted
                           focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Couleur
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-6 h-6 rounded-full transition-all hover:scale-110',
                      color === c &&
                        'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 bg-surface-hover border border-border rounded-lg
                             text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                  Annuler
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover
                           disabled:opacity-50 disabled:cursor-not-allowed
                           rounded-lg text-white font-medium transition-colors text-sm"
              >
                {loading ? 'Enregistrement…' : tag ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── TagCard ───────────────────────────────────────────────────

interface TagCardProps {
  tag: TagWithCount
  onEdit: (tag: TagWithCount) => void
  onDelete: (tag: TagWithCount) => void
  onView: (tag: TagWithCount) => void
}

function TagCard({ tag, onEdit, onDelete, onView }: TagCardProps) {
  return (
    <div className="group relative bg-surface border border-border rounded-xl p-4 hover:border-border-strong transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          onClick={() => onView(tag)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <span className="text-sm font-medium text-text-primary truncate hover:text-accent transition-colors">
            {tag.name}
          </span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(tag)}
            title="Modifier"
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted
                       hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(tag)}
            title="Supprimer"
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted
                       hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: tag.color + '18', color: tag.color }}
        >
          <FileText size={9} />
          {tag.note_count} note{tag.note_count !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => onView(tag)}
          className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-0.5"
        >
          Voir <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Notes panel for a selected tag ───────────────────────────

interface TagNotesPanelProps {
  tag: TagWithCount
  onClose: () => void
}

function TagNotesPanel({ tag, onClose }: TagNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const supabase = getSupabaseBrowser()
        // Fetch note IDs for this tag, then fetch those notes
        const { data: rows } = await supabase
          .from('notes_tags')
          .select('note_id')
          .eq('tag_id', tag.id)

        const ids = (rows ?? []).map((r: { note_id: string }) => r.note_id)
        if (ids.length === 0) {
          if (!cancelled) setNotes([])
          return
        }

        const { data } = await supabase
          .from('notes')
          .select('*')
          .in('id', ids)
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })

        if (!cancelled) setNotes(data ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tag.id])

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface border-l border-border shadow-2xl z-40 flex flex-col animate-slide-in">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          <h2 className="text-base font-semibold text-text-primary">{tag.name}</h2>
          <span className="text-xs text-text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">
            {tag.note_count}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-surface-hover"
        >
          <X size={15} />
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-background border border-border rounded-lg animate-pulse" />
          ))
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Tag size={28} className="text-text-muted mb-3" />
            <p className="text-text-muted text-sm">Aucune note avec ce tag</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-background border border-border rounded-lg hover:border-border-strong transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                {note.type === 'calendar' ? (
                  <Calendar size={12} className="text-text-muted flex-shrink-0" />
                ) : (
                  <FileText size={12} className="text-text-muted flex-shrink-0" />
                )}
                <p className="text-sm font-medium text-text-primary truncate">
                  {note.title || 'Sans titre'}
                </p>
              </div>
              {note.content && (
                <p className="text-xs text-text-muted line-clamp-2 pl-5">
                  {note.content
                    .replace(/[#*`>\-_~]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 100)}
                </p>
              )}
              {note.date && (
                <p className="text-xs text-text-muted pl-5 mt-1">{formatDateShortFr(note.date)}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── TagsSection ───────────────────────────────────────────────

export default function TagsSection() {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagWithCount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TagWithCount | null>(null)
  const [viewingTag, setViewingTag] = useState<TagWithCount | null>(null)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const json = await res.json()
        setTags(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // ── CRUD ───────────────────────────────────────────────────

  function handleNew() {
    setEditingTag(null)
    setModalOpen(true)
  }

  function handleEdit(tag: TagWithCount) {
    setEditingTag(tag)
    setModalOpen(true)
  }

  async function handleSave(data: { name: string; color: string }) {
    if (editingTag) {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const json = await res.json()
        setTags((prev) =>
          prev.map((t) =>
            t.id === editingTag.id
              ? { ...json.data, note_count: editingTag.note_count }
              : t
          )
        )
        // Update viewing panel if this tag is open
        if (viewingTag?.id === editingTag.id) {
          setViewingTag((prev) =>
            prev ? { ...json.data, note_count: editingTag.note_count } : null
          )
        }
      }
    } else {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const json = await res.json()
        setTags((prev) => [...prev, json.data])
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/tags/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      if (viewingTag?.id === deleteTarget.id) setViewingTag(null)
    }
    setDeleteTarget(null)
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Tags</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {loading ? '…' : `${tags.length} tag${tags.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover
                     text-white text-sm rounded-lg transition-colors font-medium"
        >
          <Plus size={15} />
          Nouveau tag
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center mb-4">
              <Tag size={28} className="text-text-muted" />
            </div>
            <h2 className="text-text-primary font-semibold mb-1">Aucun tag</h2>
            <p className="text-text-muted text-sm mb-5 max-w-xs">
              Les tags vous permettent d'organiser vos notes par thème.
            </p>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
            >
              Créer le premier tag
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {tags.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                onView={setViewingTag}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tag create/edit modal */}
      <TagModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tag={editingTag}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-text-primary font-semibold mb-1">Supprimer le tag</h3>
                <p className="text-sm text-text-muted">
                  Le tag{' '}
                  <span
                    className="font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: deleteTarget.color + '22', color: deleteTarget.color }}
                  >
                    {deleteTarget.name}
                  </span>{' '}
                  sera retiré de toutes les notes.
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 bg-surface-hover border border-border rounded-lg
                           text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600
                           text-white rounded-lg transition-colors text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes panel for selected tag */}
      {viewingTag && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setViewingTag(null)}
          />
          <TagNotesPanel tag={viewingTag} onClose={() => setViewingTag(null)} />
        </>
      )}
    </div>
  )
}
