'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { addDays, format, isToday, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn, toLocalDateString } from '@/lib/utils'
import type { Note, DailyJournal } from '@/types'
import SlotEditor from './SlotEditor'

interface WeekViewProps {
  weekStart: Date
  notes: Note[]
  journals: Record<string, DailyJournal>
  onDayClick: (date: string) => void
  onRefresh: () => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function WeekView({
  weekStart,
  notes,
  journals,
  onDayClick,
  onRefresh,
}: WeekViewProps) {
  const [localNotes, setLocalNotes] = useState<Note[]>(notes)
  const [editingSlot, setEditingSlot] = useState<{
    date: string
    hour: number
  } | null>(null)

  // Keep localNotes in sync with props (after refresh)
  useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  // noteMap[dateStr][hour] = Note
  const noteMap = useMemo(() => {
    const map: Record<string, Record<number, Note>> = {}
    for (const note of localNotes) {
      if (note.date && note.hour !== null) {
        if (!map[note.date]) map[note.date] = {}
        map[note.date][note.hour] = note
      }
    }
    return map
  }, [localNotes])

  const handleSlotSave = useCallback(
    async (hour: number, content: string, noteId?: string) => {
      if (!editingSlot) return
      const res = await fetch('/api/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noteId,
          date: editingSlot.date,
          hour,
          content,
        }),
      })
      const data = await res.json()
      if (data.note) {
        setLocalNotes((prev) => {
          const filtered = prev.filter(
            (n) => !(n.date === editingSlot.date && n.hour === hour)
          )
          return [...filtered, data.note]
        })
        onRefresh()
      }
    },
    [editingSlot, onRefresh]
  )

  const today = new Date()

  return (
    <>
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Day headers */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: '3.5rem repeat(7, 1fr)' }}
        >
          {/* Corner */}
          <div className="h-14 border-r border-border" />
          {weekDays.map((day) => {
            const dateStr = toLocalDateString(day)
            const dayIsToday = isToday(day)
            const hasJournal = !!journals[dateStr]
            return (
              <button
                key={dateStr}
                onClick={() => onDayClick(dateStr)}
                className={cn(
                  'h-14 flex flex-col items-center justify-center gap-0.5',
                  'border-r border-border last:border-r-0',
                  'hover:bg-white/[0.03] transition-colors'
                )}
              >
                <span className="text-[10px] uppercase tracking-wider text-text-muted">
                  {format(day, 'EEE', { locale: fr })}
                </span>
                <span
                  className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    dayIsToday
                      ? 'bg-accent text-white font-semibold'
                      : 'text-text-secondary'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {hasJournal && (
                  <div className="w-1 h-1 rounded-full bg-accent" />
                )}
              </button>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
          {HOURS.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`
            return (
              <div
                key={hour}
                className="grid border-b border-white/[0.03] last:border-b-0"
                style={{ gridTemplateColumns: '3.5rem repeat(7, 1fr)' }}
              >
                {/* Hour label */}
                <div className="py-2 px-2 border-r border-border flex items-start justify-end">
                  <span className="text-[10px] font-mono text-text-muted leading-none">
                    {hourStr}
                  </span>
                </div>

                {/* Day cells */}
                {weekDays.map((day) => {
                  const dateStr = toLocalDateString(day)
                  const note = noteMap[dateStr]?.[hour]
                  const isEditing =
                    editingSlot?.date === dateStr &&
                    editingSlot?.hour === hour
                  const dayIsToday = isSameDay(day, today)
                  const firstLine =
                    note?.content?.split('\n').find((l) => l.trim()) ?? ''

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        'border-r border-white/[0.03] last:border-r-0 min-h-[36px]',
                        dayIsToday && 'bg-accent/[0.03]'
                      )}
                    >
                      <button
                        onClick={() =>
                          setEditingSlot(
                            isEditing ? null : { date: dateStr, hour }
                          )
                        }
                        className={cn(
                          'w-full h-full min-h-[36px] px-1.5 py-1 text-left',
                          'hover:bg-white/[0.04] transition-colors',
                          isEditing && 'bg-accent/10'
                        )}
                      >
                        {note?.content?.trim() ? (
                          <div className="flex items-start gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-[3px] flex-shrink-0" />
                            <span className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                              {firstLine}
                            </span>
                          </div>
                        ) : null}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Slot editor modal */}
      {editingSlot && (
        <SlotEditor
          date={editingSlot.date}
          hour={editingSlot.hour}
          note={noteMap[editingSlot.date]?.[editingSlot.hour] ?? null}
          onSave={handleSlotSave}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </>
  )
}
