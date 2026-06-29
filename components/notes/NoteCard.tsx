'use client'

import { useState } from 'react'
import { Star, Trash2, Copy, RotateCcw, AlertTriangle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note } from '@/types'

interface NoteCardProps {
  note: Note
  isSelected: boolean
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

export default function NoteCard({
  note,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onRestore,
  onHardDelete,
  isTrash = false,
}: NoteCardProps) {
  const [hovered, setHovered] = useState(false)
  const excerpt = stripMarkdown(note.content)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(note)}
      className={cn(
        'relative flex flex-col gap-2 p-4 rounded-xl border cursor-pointer transition-all duration-150',
        isSelected
          ? 'bg-accent-subtle border-accent/50 ring-1 ring-accent/30'
          : 'bg-surface border-border hover:border-border-strong hover:bg-surface-elevated'
      )}
    >
      {/* Favorite indicator */}
      {note.is_favorite && !hovered && (
        <Star
          size={13}
          className="absolute top-3 right-3 text-yellow-400"
          fill="currentColor"
        />
      )}

      {/* Hover actions overlay */}
      {hovered && (
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-surface/90 backdrop-blur-sm border border-border rounded-lg px-1 py-0.5 animate-fade-in"
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
                <Star size={13} fill={note.is_favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => onDuplicate(note.id)}
                title="Dupliquer"
                className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => onDelete(note.id)}
                title="Corbeille"
                className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
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
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => onHardDelete?.(note.id)}
                title="Supprimer définitivement"
                className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
              >
                <AlertTriangle size={13} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Icon + title */}
      <div className="flex items-start gap-2 pr-6">
        <FileText size={14} className="text-text-muted mt-0.5 shrink-0" />
        <h3
          className={cn(
            'text-sm font-semibold line-clamp-2 leading-snug',
            isSelected ? 'text-text-primary' : 'text-text-secondary'
          )}
        >
          {note.title || 'Sans titre'}
        </h3>
      </div>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-xs text-text-muted line-clamp-4 leading-relaxed">
          {excerpt}
        </p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Tags */}
      {(note.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(note.tags ?? []).slice(0, 4).map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-px rounded-full text-[10px] font-medium"
              style={{
                background: `${tag.color}22`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
          {(note.tags ?? []).length > 4 && (
            <span className="text-[10px] text-text-muted">
              +{(note.tags ?? []).length - 4}
            </span>
          )}
        </div>
      )}

      {/* Date */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted">
          {formatDate(note.updated_at)}
        </span>
        {note.is_deleted && (
          <span className="text-[10px] text-red-400/70">Corbeille</span>
        )}
      </div>
    </div>
  )
}
