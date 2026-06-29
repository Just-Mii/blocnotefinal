"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn, toLocalDateString } from "@/lib/utils";
import type { Note, DailyJournal } from "@/types";

interface MonthViewProps {
  currentDate: Date;
  selectedDate: string;
  notes: Note[];
  journals: Record<string, DailyJournal>;
  onDayClick: (date: string) => void;
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function MonthView({
  currentDate,
  selectedDate,
  notes,
  journals,
  onDayClick,
}: MonthViewProps) {
  // Build the full calendar grid (Mon → Sun, padded to fill rows)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  // Index notes by date
  const notesByDate = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const note of notes) {
      if (note.date) {
        if (!map[note.date]) map[note.date] = [];
        map[note.date].push(note);
      }
    }
    return map;
  }, [notes]);

  const totalRows = calendarDays.length / 7;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-3 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {name}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day: Date, idx: number) => {
          const dateStr = toLocalDateString(day);
          const inMonth = isSameMonth(day, currentDate);
          const isSelected = dateStr === selectedDate;
          const dayIsToday = isToday(day);
          const dayNotes = notesByDate[dateStr] ?? [];
          const hasNotes = dayNotes.length > 0;
          const dayJournal = journals[dateStr];
          // First non-empty line of the journal for preview
          const journalPreview =
            dayJournal?.content.split("\n").find((l: string) => l.trim()) ?? "";

          const isLastRow = idx >= calendarDays.length - 7;
          const isLastCol = (idx + 1) % 7 === 0;

          // Approximate row height based on total rows
          const cellMinH = totalRows <= 5 ? "min-h-[110px]" : "min-h-[90px]";

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={cn(
                "relative p-2.5 text-left transition-colors",
                "border-b border-r border-border/60",
                cellMinH,
                isLastRow && "border-b-0",
                isLastCol && "border-r-0",
                !inMonth && "opacity-35",
                isSelected && !dayIsToday && "bg-accent/10",
                !isSelected && "hover:bg-white/[0.025]",
              )}
            >
              {/* Date number + indicators row */}
              <div className="flex items-start justify-between mb-1.5">
                <span
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                    dayIsToday && "bg-accent text-white font-semibold",
                    !dayIsToday && isSelected && "text-accent-light",
                    !dayIsToday && !isSelected && "text-text-secondary",
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Dot indicators */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {dayJournal && (
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-accent"
                      title="Journal"
                    />
                  )}
                  {hasNotes && (
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-blue-400"
                      title="Créneaux"
                    />
                  )}
                </div>
              </div>

              {/* Journal first-line preview */}
              {journalPreview && (
                <p className="text-[10px] text-text-muted leading-tight line-clamp-2">
                  {journalPreview}
                </p>
              )}

              {/* Slot count badge (bottom-right) */}
              {hasNotes && (
                <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-accent/60">
                  +{dayNotes.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
