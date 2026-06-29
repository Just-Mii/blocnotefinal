'use client'

import { useState } from 'react'
import { Star, Trash2, Copy, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note } from '@/types'

interface NoteListProps {
  notes: Note[]
  selectedId?: string
  onSelect: (note: Note) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleFavorite: (id: string, value: boolean) => void
  onRestore?: (id: string) => void
  onHardDelete?: (id: string) => void
  isTrash?: boolean
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function NoteItem({
  note,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onRestore,
  onHardDelete,
  isTrash = false,
}: {
  note: Note
  isSelected: boolean
  onSelect: (note: Note) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleFavorite: (id: string, value: boolean) => void
  onRestore?: (id: string) => void
  onHardDelete?: (id: string) => void
  isTrash?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const excerpt = stripMarkdown(note.content)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(note)}
      className={cn(
        'group relative flex flex-col gap-1 px-3 py-3 cursor-pointer transition-colors border-b border-border/40 last:border-0',
        isSelected
          ? 'bg-accent-subtle border-l-2 border-l-accent'
          : 'hover:bg-surface-hover'
      )}
    >
      {/* Title + favorite/actions */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'text-sm font-medium line-clamp-1 leading-snug flex-1',
            isSelected ? 'text-text-primary' : 'text-text-secondary'
          )}
        >
          {note.title || 'Sans titre'}
        </span>

        {/* Actions shown on hover */}
        {hovered ? (
          <div
            className="flex items-center gap-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {!isTrash && (
              <>
                <button
                  onClick={() => onToggleFavorite(note.id, !note.is_favorite)}
                  title={note.is_favorite ? 'Retirer des favoris' : 'Favori'}
                  className={cn(
                    'p-1 rounded transition-colors',
                    note.is_favorite
                      ? 'text-yellow-400 hover:text-yellow-300'
                      : 'text-text-muted hover:text-yellow-400'
                  )}
                >
                  <Star size={12} fill={note.is_favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => onDuplicate(note.id)}
                  title="Dupliquer"
                  className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => onDelete(note.id)}
                  title="Corbeille"
                  className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}

            {isTrash && (
              <>
                <button
                  onClick={() => onRestore?.(note.id)}
                  title="Restaurer"
                  className="p-1 rounded text-text-muted hover:text-green-400 transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={() => onHardDelete?.(note.id)}
                  title="Supprimer définitivement"
                  className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
                >
                  <AlertTriangle size={12} />
                </button>
              </>
            )}
          </div>
        ) : (
          /* Static indicator: favorite star */
          note.is_favorite && (
            <Star size={11} className="text-yellow-400 shrink-0 mt-0.5" fill="currentColor" />
          )
        )}
      </div>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
          {excerpt}
        </p>
      )}

      {/* Tags + date */}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {(note.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-px rounded-full text-[10px] font-medium shrink-0"
              style={{
                background: `${tag.color}22`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">
          {formatDate(note.updated_at)}
        </span>
      </div>
    </div>
  )
}

export default function NoteList({
  notes,
  selectedId,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onRestore,
  onHardDelete,
  isTrash = false,
}: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
        <p className="text-text-muted text-sm">
          {isTrash ? 'La corbeille est vide.' : 'Aucune note.'}
        </p>
      </div>
    )
  }

  // Favorites at top in normal view
  const sorted = isTrash
    ? notes
    : [...notes.filter((n) => n.is_favorite), ...notes.filter((n) => !n.is_favorite)]

  return (
    <div className="flex flex-col divide-y divide-transparent">
      {sorted.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          isSelected={selectedId === note.id}
          onSelect={onSelect}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onToggleFavorite={onToggleFavorite}
          onRestore={onRestore}
          onHardDelete={onHardDelete}
          isTrash={isTrash}
        />
      ))}
    </div>
  )
}
