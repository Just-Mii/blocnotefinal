'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Save, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note } from '@/types'

interface SlotEditorProps {
  date: string
  hour: number
  note: Note | null
  onSave: (hour: number, content: string, noteId?: string) => Promise<void>
  onClose: () => void
  /** Render as an inline panel beneath the slot row instead of a full modal */
  inline?: boolean
}

export default function SlotEditor({
  date,
  hour,
  note,
  onSave,
  onClose,
  inline = false,
}: SlotEditorProps) {
  const [content, setContent] = useState(note?.content ?? '')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  // Track the note ID so subsequent auto-saves after creation use the ID
  const noteIdRef = useRef<string | undefined>(note?.id)
  const saveTimeout = useRef<NodeJS.Timeout>()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hourStr = `${String(hour).padStart(2, '0')}:00`

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Keep noteIdRef in sync if parent passes a new note (after first creation)
  useEffect(() => {
    if (note?.id && !noteIdRef.current) {
      noteIdRef.current = note.id
    }
  }, [note?.id])

  const triggerSave = useCallback(
    async (value: string) => {
      setSaveStatus('saving')
      try {
        await onSave(hour, value, noteIdRef.current)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('idle')
      }
    },
    [hour, onSave]
  )

  const handleChange = useCallback(
    (value: string) => {
      setContent(value)
      setSaveStatus('saving')
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => triggerSave(value), 1000)
    },
    [triggerSave]
  )

  const handleManualSave = useCallback(() => {
    clearTimeout(saveTimeout.current)
    triggerSave(content)
  }, [content, triggerSave])

  useEffect(() => () => clearTimeout(saveTimeout.current), [])

  const saveIndicator = (
    <span
      className={cn(
        'text-xs transition-opacity',
        saveStatus === 'saving' && 'text-amber-400',
        saveStatus === 'saved' && 'text-emerald-400',
        saveStatus === 'idle' && 'opacity-0 select-none'
      )}
    >
      {saveStatus === 'saving' ? 'Sauvegarde...' : saveStatus === 'saved' ? '✓ Sauvegardé' : '·'}
    </span>
  )

  const editorBody = (
    <div className="flex flex-col gap-3">
      {/* Toolbar row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-violet-400 tracking-wide">
          {hourStr}
        </span>
        <div className="flex items-center gap-2">
          {saveIndicator}
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
          >
            <Save className="w-3 h-3" />
            Sauvegarder
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`Notes pour ${hourStr}…`}
        className={cn(
          'w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-3 py-2.5',
          'text-sm text-text-primary placeholder-text-muted font-mono leading-relaxed',
          'resize-none focus:outline-none focus:border-violet-500/50 transition-colors',
          inline ? 'min-h-[120px]' : 'min-h-[220px]'
        )}
      />
    </div>
  )

  // ── Inline variant ──────────────────────────────────────────
  if (inline) {
    return (
      <div className="mx-0 mt-1 mb-2 px-3 py-3 bg-[#12121e] rounded-xl border border-violet-500/20 animate-fade-in">
        {editorBody}
      </div>
    )
  }

  // ── Modal variant ───────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl mx-4 bg-surface rounded-2xl border border-border shadow-2xl animate-slide-in">
        <div className="p-6">
          <p className="text-xs text-text-muted mb-4">
            {date} · créneau {hourStr}
          </p>
          {editorBody}
        </div>
      </div>
    </div>
  )
}
