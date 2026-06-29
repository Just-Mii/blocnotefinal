'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as Switch from '@radix-ui/react-switch'
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Puzzle,
  LayoutGrid,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Widget } from '@/types'
import { WidgetEditor } from './WidgetEditor'
import { WidgetRenderer } from './WidgetRenderer'

// ─── Size badge ───────────────────────────────────────────────────────────────

const SIZE_LABELS: Record<Widget['size'], string> = {
  small: 'Petit',
  medium: 'Moyen',
  large: 'Grand',
}

const POSITION_LABELS: Record<Widget['position'], string> = {
  sidebar: 'Barre',
  float: 'Flottant',
  page: 'Page',
}

const PREVIEW_HEIGHT: Record<Widget['size'], number> = {
  small: 80,
  medium: 140,
  large: 200,
}

// ─── Notification toast ───────────────────────────────────────────────────────

interface Toast {
  id: number
  message: string
  type: string
}

// ─── SortableWidgetCard ───────────────────────────────────────────────────────

interface CardProps {
  widget: Widget
  onToggle: (widget: Widget) => void
  onEdit: (widget: Widget) => void
  onDelete: (id: string) => void
  onNotify: (msg: string, type: string) => void
}

function SortableWidgetCard({
  widget,
  onToggle,
  onEdit,
  onDelete,
  onNotify,
}: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const [confirmDelete, setConfirmDelete] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col rounded-xl border border-border bg-surface shadow-md overflow-hidden',
        'transition-shadow duration-150',
        isDragging && 'opacity-40 shadow-xl ring-2 ring-accent/40',
        !widget.is_active && 'opacity-60',
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-surface-elevated">
        {/* Drag handle */}
        <button
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary p-0.5 rounded"
          aria-label="Déplacer"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>

        {/* Name */}
        <span
          className="flex-1 text-sm font-medium text-text-primary truncate"
          title={widget.name}
        >
          {widget.name}
        </span>

        {/* Badges */}
        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide font-medium text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
          {SIZE_LABELS[widget.size]}
        </span>
        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide font-medium text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
          {POSITION_LABELS[widget.position]}
        </span>

        {/* Active toggle */}
        <Switch.Root
          checked={widget.is_active}
          onCheckedChange={() => onToggle(widget)}
          className={cn(
            'relative inline-flex h-4 w-7 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors focus:outline-none',
            widget.is_active ? 'bg-accent' : 'bg-surface-hover',
          )}
          aria-label={widget.is_active ? 'Désactiver' : 'Activer'}
        >
          <Switch.Thumb
            className={cn(
              'block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-100',
              widget.is_active ? 'translate-x-3' : 'translate-x-0',
            )}
          />
        </Switch.Root>
      </div>

      {/* Live preview */}
      <div
        className="relative overflow-hidden bg-[#1e1e2e]"
        style={{ height: PREVIEW_HEIGHT[widget.size] }}
      >
        {widget.is_active ? (
          <WidgetRenderer widget={widget} onNotify={onNotify} className="w-full h-full" />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-xs gap-2">
            <Puzzle size={16} />
            Widget désactivé
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-t border-border bg-surface-elevated">
        {/* Edit */}
        <button
          onClick={() => onEdit(widget)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <Pencil size={12} />
          Modifier
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(widget.id); setConfirmDelete(false) }}
              className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={12} />
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

// ─── WidgetsSection ───────────────────────────────────────────────────────────

export function WidgetsSection() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingWidget, setEditingWidget] = useState<Widget | null | 'new'>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  let toastId = 0

  /* ── Fetch widgets on mount ─────────────────────────────── */
  useEffect(() => {
    fetch('/api/widgets')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(({ data }) => {
        setWidgets(Array.isArray(data) ? data : [])
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false))
  }, [])

  /* ── Toast helpers ──────────────────────────────────────── */
  const pushToast = useCallback((message: string, type: string) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    )
  }, [])

  /* ── DnD ────────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIdx = widgets.findIndex((w) => w.id === active.id)
      const newIdx = widgets.findIndex((w) => w.id === over.id)
      const reordered = arrayMove(widgets, oldIdx, newIdx)
      setWidgets(reordered)

      // Persist new sort_order for all affected widgets
      await Promise.all(
        reordered.map((w, idx) =>
          fetch(`/api/widgets/${w.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: idx }),
          }),
        ),
      )
    },
    [widgets],
  )

  /* ── CRUD handlers ──────────────────────────────────────── */
  const handleToggle = useCallback(async (widget: Widget) => {
    const updated: Widget = { ...widget, is_active: !widget.is_active }
    setWidgets((prev) => prev.map((w) => (w.id === widget.id ? updated : w)))

    const res = await fetch(`/api/widgets/${widget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: updated.is_active }),
    })
    if (!res.ok) {
      // Roll back
      setWidgets((prev) => prev.map((w) => (w.id === widget.id ? widget : w)))
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
    const res = await fetch(`/api/widgets/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      // Reload on failure
      const r = await fetch('/api/widgets')
      const { data } = await r.json()
      if (data) setWidgets(data)
    }
  }, [])

  const handleSaved = useCallback((saved: Widget) => {
    setWidgets((prev) => {
      const exists = prev.some((w) => w.id === saved.id)
      return exists
        ? prev.map((w) => (w.id === saved.id ? saved : w))
        : [...prev, saved]
    })
    setEditingWidget(null)
  }, [])

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
              <LayoutGrid size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-none">Widgets</h1>
              <p className="text-xs text-text-muted mt-0.5">
                {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditingWidget('new')}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
          >
            <Plus size={16} />
            Nouveau widget
          </button>
        </div>

        {/* Error state */}
        {fetchError && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            <AlertCircle size={16} />
            Erreur de chargement : {fetchError}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-surface border border-border animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && widgets.length === 0 && !fetchError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center">
              <Puzzle size={28} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-primary font-semibold">Aucun widget</p>
              <p className="text-text-muted text-sm mt-1">
                Créez votre premier widget en cliquant sur le bouton ci-dessus.
              </p>
            </div>
          </div>
        )}

        {/* Widget grid */}
        {!loading && widgets.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((w) => w.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {widgets.map((widget) => (
                  <SortableWidgetCard
                    key={widget.id}
                    widget={widget}
                    onToggle={handleToggle}
                    onEdit={(w) => setEditingWidget(w)}
                    onDelete={handleDelete}
                    onNotify={pushToast}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Widget editor modal */}
      {editingWidget !== null && (
        <WidgetEditor
          widget={editingWidget === 'new' ? null : editingWidget}
          onClose={() => setEditingWidget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in',
              'pointer-events-auto border',
              toast.type === 'error'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : toast.type === 'success'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-surface text-text-primary border-border',
            )}
          >
            {toast.type === 'success' && <CheckCircle2 size={14} />}
            {toast.type === 'error' && <AlertCircle size={14} />}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
