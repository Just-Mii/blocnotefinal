'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Edit3,
  Eye,
  Columns2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note, DailyJournal } from '@/types'
import SlotEditor from './SlotEditor'

interface DayViewProps {
  date: string
  notes: Note[]
  journal: DailyJournal | null
  onRefresh: () => void
}

type EditorMode = 'edit' | 'preview' | 'split'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function DayView({ date, notes, journal, onRefresh }: DayViewProps) {
  // ── Journal state ────────────────────────────────────────────
  const [journalContent, setJournalContent] = useState(journal?.content ?? '')
  const [journalStatus, setJournalStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  const [journalMode, setJournalMode] = useState<EditorMode>('edit')
  const [journalCollapsed, setJournalCollapsed] = useState(false)
  const [journalExpanded, setJournalExpanded] = useState(false)
  const [journalCopied, setJournalCopied] = useState(false)
  const journalTimeout = useRef<NodeJS.Timeout>()

  // ── Slot state ───────────────────────────────────────────────
  const [localNotes, setLocalNotes] = useState<Record<number, Note>>({})
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null)

  // ── Sync journal when date or journal id changes ─────────────
  useEffect(() => {
    setJournalContent(journal?.content ?? '')
    setJournalStatus('idle')
  }, [date, journal?.id])

  // ── Build notes map ──────────────────────────────────────────
  useEffect(() => {
    const map: Record<number, Note> = {}
    for (const note of notes) {
      if (note.hour !== null) map[note.hour] = note
    }
    setLocalNotes(map)
  }, [notes])

  useEffect(() => () => clearTimeout(journalTimeout.current), [])

  // ── Journal auto-save ────────────────────────────────────────
  const handleJournalChange = useCallback(
    (value: string) => {
      setJournalContent(value)
      setJournalStatus('saving')
      clearTimeout(journalTimeout.current)
      journalTimeout.current = setTimeout(async () => {
        try {
          await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, content: value }),
          })
          setJournalStatus('saved')
          // on ne refresh pas pendant l'édition pour ne pas couper la frappe
        } catch {
          setJournalStatus('idle')
        }
      }, 1000)
    },
    [date, onRefresh]
  )

  const handleCopyJournal = useCallback(() => {
    if (!journalContent) return
    navigator.clipboard.writeText(journalContent)
    setJournalCopied(true)
    setTimeout(() => setJournalCopied(false), 2000)
  }, [journalContent])

  // ── Slot save ────────────────────────────────────────────────
  const handleSlotSave = useCallback(
    async (hour: number, content: string, noteId?: string) => {
      const res = await fetch('/api/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, date, hour, content }),
      })
      const data = await res.json()
      if (data.note) {
        // on met à jour le state local sans refresh pour éviter de fermer l'éditeur
        setLocalNotes((prev) => ({ ...prev, [hour]: data.note }))
      }
    },
    [date]
  )

  const handleCopySlot = useCallback(
    (hour: number) => {
      const note = localNotes[hour]
      if (!note?.content) return
      navigator.clipboard.writeText(note.content)
      setCopiedSlot(hour)
      setTimeout(() => setCopiedSlot(null), 2000)
    },
    [localNotes]
  )

  const slotsFilledCount = Object.keys(localNotes).length

  return (
    <div className="flex flex-col gap-4">
      {/* ── Journal du Jour ──────────────────────────────────── */}
      <section className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setJournalCollapsed((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-accent-light transition-colors"
            >
              {journalCollapsed ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              )}
              Journal du Jour
            </button>

            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                journal || journalContent
                  ? 'bg-accent/10 text-accent-light'
                  : 'bg-white/5 text-text-muted'
              )}
            >
              {journalContent ? `${journalContent.length} car.` : 'Vide'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Save status */}
            <span
              className={cn(
                'text-xs mr-1.5 transition-opacity',
                journalStatus === 'saving' && 'text-amber-400',
                journalStatus === 'saved' && 'text-emerald-400',
                journalStatus === 'idle' && 'opacity-0 select-none pointer-events-none'
              )}
            >
              {journalStatus === 'saving' ? 'Sauvegarde…' : '✓ Sauvegardé'}
            </span>

            {/* Mode toggles */}
            {(
              [
                { mode: 'edit' as EditorMode, Icon: Edit3, label: 'Éditer' },
                { mode: 'preview' as EditorMode, Icon: Eye, label: 'Aperçu' },
                { mode: 'split' as EditorMode, Icon: Columns2, label: 'Divisé' },
              ] as const
            ).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => setJournalMode(mode)}
                title={label}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  journalMode === mode
                    ? 'bg-accent/20 text-accent-light'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={() => setJournalExpanded((v) => !v)}
              title={journalExpanded ? 'Réduire' : 'Agrandir'}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              {journalExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={handleCopyJournal}
              title="Copier le journal"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              {journalCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Editor area */}
        {!journalCollapsed && (
          <div
            className={cn(
              journalMode === 'split' &&
                'grid grid-cols-2 divide-x divide-border'
            )}
          >
            {/* Edit pane */}
            {(journalMode === 'edit' || journalMode === 'split') && (
              <div className="p-4">
                <textarea
                  value={journalContent}
                  onChange={(e) => handleJournalChange(e.target.value)}
                  placeholder="Commencer à écrire dans votre journal…"
                  className={cn(
                    'w-full bg-transparent text-sm text-text-primary placeholder-text-muted',
                    'font-mono leading-relaxed resize-none focus:outline-none',
                    journalExpanded ? 'min-h-[420px]' : 'min-h-[220px]'
                  )}
                />
              </div>
            )}

            {/* Preview pane */}
            {(journalMode === 'preview' || journalMode === 'split') && (
              <div
                className={cn(
                  'p-4 overflow-y-auto',
                  journalExpanded ? 'min-h-[420px]' : 'min-h-[220px]'
                )}
              >
                {journalContent ? (
                  <MarkdownPreview content={journalContent} />
                ) : (
                  <p className="text-sm text-text-muted italic">
                    Aucun contenu à afficher.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Créneaux horaires ─────────────────────────────────── */}
      <section className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-light" />
            <span className="text-sm font-semibold text-text-primary">
              Créneaux horaires
            </span>
            <span className="text-xs text-text-muted">
              {slotsFilledCount} / 24 remplis
            </span>
          </div>
          {slotsFilledCount > 0 && (
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${(slotsFilledCount / 24) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="divide-y divide-white/[0.03]">
          {HOURS.map((hour) => {
            const note = localNotes[hour]
            const hasContent = !!note?.content?.trim()
            const isEditing = editingSlot === hour
            const hourStr = `${String(hour).padStart(2, '0')}:00`
            const firstLine = note?.content?.split('\n').find((l) => l.trim()) ?? ''

            return (
              <div key={hour} className="group">
                <div
                  className={cn(
                    'flex items-center gap-0 px-4 py-2.5 transition-colors',
                    !isEditing && 'hover:bg-white/[0.02]',
                    isEditing && 'bg-white/[0.025]'
                  )}
                >
                  {/* Time */}
                  <span className="w-14 flex-shrink-0 text-xs font-mono text-text-muted select-none">
                    {hourStr}
                  </span>

                  {/* Dot */}
                  <div className="w-4 flex-shrink-0 flex justify-center">
                    {hasContent && (
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </div>

                  {/* Preview — clicking opens inline editor */}
                  <button
                    onClick={() =>
                      setEditingSlot((prev) => (prev === hour ? null : hour))
                    }
                    className="flex-1 text-left min-w-0 pr-2"
                  >
                    <span
                      className={cn(
                        'text-sm block truncate',
                        hasContent ? 'text-text-secondary' : 'text-text-muted'
                      )}
                    >
                      {hasContent ? firstLine : '—'}
                    </span>
                  </button>

                  {/* Actions */}
                  <div
                    className={cn(
                      'flex items-center gap-0.5 flex-shrink-0',
                      'opacity-0 group-hover:opacity-100 transition-opacity'
                    )}
                  >
                    <button
                      onClick={() => handleCopySlot(hour)}
                      title="Copier"
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                      {copiedSlot === hour ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setEditingSlot((prev) => (prev === hour ? null : hour))
                      }
                      title="Éditer"
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline slot editor */}
                {isEditing && (
                  <div className="px-4 pb-2">
                    <SlotEditor
                      date={date}
                      hour={hour}
                      note={note ?? null}
                      onSave={handleSlotSave}
                      onClose={() => setEditingSlot(null)}
                      inline
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── Inline markdown renderer (no @tailwindcss/typography needed) ──
function MarkdownPreview({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-text-primary mb-3 mt-1">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold text-text-primary mb-2 mt-4">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-medium text-text-primary mb-2 mt-3">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-text-secondary leading-relaxed mb-3">{children}</p>
        ),
        code({ children, className }) {
          const isBlock = !!className
          return isBlock ? (
            <pre className="bg-black/40 rounded-xl p-3 mb-3 overflow-x-auto">
              <code className="text-xs text-violet-300 font-mono">{children}</code>
            </pre>
          ) : (
            <code className="bg-black/40 rounded px-1.5 py-0.5 text-xs text-violet-300 font-mono">
              {children}
            </code>
          )
        },
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 text-text-secondary space-y-1 text-sm">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 text-text-secondary space-y-1 text-sm">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-text-secondary">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent pl-3 text-text-muted italic mb-3 text-sm">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-text-primary">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-text-secondary">{children}</em>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-light hover:underline"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="border-border my-4" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border px-3 py-1.5 text-left text-xs font-semibold text-text-primary bg-white/5">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-3 py-1.5 text-xs text-text-secondary">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
