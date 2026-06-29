"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Copy,
  BookOpen,
  Clock,
  Check,
  X,
} from "lucide-react";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn, toLocalDateString } from "@/lib/utils";
import type { Note, DailyJournal } from "@/types";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";

type ViewType = "day" | "week" | "month";

export default function CalendarView() {
  const [view, setView] = useState<ViewType>("day");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Main view data ───────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([]);
  const [journals, setJournals] = useState<Record<string, DailyJournal>>({});
  const [dayJournal, setDayJournal] = useState<DailyJournal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Mini-calendar data (always the current month) ────────────
  const [miniNotes, setMiniNotes] = useState<Note[]>([]);
  const [miniJournals, setMiniJournals] = useState<
    Record<string, DailyJournal>
  >({});

  // ── Quick-action state ───────────────────────────────────────
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTarget, setCopyTarget] = useState("");
  const [copyingTo, setCopyingTo] = useState(false);
  const [copiedJournal, setCopiedJournal] = useState(false);

  // ── Stable date strings (avoids object identity issues in deps) ─
  const dateStr = useMemo(() => toLocalDateString(currentDate), [currentDate]);
  const weekStartStr = useMemo(
    () => toLocalDateString(startOfWeek(currentDate, { weekStartsOn: 1 })),
    [currentDate],
  );
  const weekEndStr = useMemo(
    () => toLocalDateString(endOfWeek(currentDate, { weekStartsOn: 1 })),
    [currentDate],
  );
  const monthStartStr = useMemo(
    () => toLocalDateString(startOfMonth(currentDate)),
    [currentDate],
  );
  const monthEndStr = useMemo(
    () => toLocalDateString(endOfMonth(currentDate)),
    [currentDate],
  );
  // Key that only changes when the month changes (for mini-cal fetch)
  const monthKey = useMemo(
    () => `${currentDate.getFullYear()}-${currentDate.getMonth()}`,
    [currentDate],
  );

  // ── Fetch main view data ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const run = async () => {
      try {
        if (view === "day") {
          const res = await fetch(`/api/calendar/${dateStr}`);
          const data = await res.json();
          if (cancelled) return;
          setNotes(data.notes ?? []);
          setDayJournal(data.journal ?? null);
          setJournals(data.journal ? { [dateStr]: data.journal } : {});
        } else if (view === "week") {
          const [nRes, jRes] = await Promise.all([
            fetch(
              `/api/calendar?startDate=${weekStartStr}&endDate=${weekEndStr}`,
            ),
            fetch(
              `/api/journal?startDate=${weekStartStr}&endDate=${weekEndStr}`,
            ),
          ]);
          const [nData, jData] = await Promise.all([nRes.json(), jRes.json()]);
          if (cancelled) return;
          setNotes(nData.notes ?? []);
          setJournals(jData.journals ?? {});
          setDayJournal(jData.journals?.[dateStr] ?? null);
        } else {
          // month
          const [nRes, jRes] = await Promise.all([
            fetch(
              `/api/calendar?startDate=${monthStartStr}&endDate=${monthEndStr}`,
            ),
            fetch(
              `/api/journal?startDate=${monthStartStr}&endDate=${monthEndStr}`,
            ),
          ]);
          const [nData, jData] = await Promise.all([nRes.json(), jRes.json()]);
          if (cancelled) return;
          setNotes(nData.notes ?? []);
          setJournals(jData.journals ?? {});
          setDayJournal(jData.journals?.[dateStr] ?? null);
        }
      } catch (err) {
        console.error("[CalendarView] fetch error", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view,
    dateStr,
    weekStartStr,
    weekEndStr,
    monthStartStr,
    monthEndStr,
    refreshKey,
  ]);

  // ── Fetch mini-calendar month data (only when month changes) ─
  useEffect(() => {
    if (view === "month") {
      // Month view already fetched the data — reuse it
      setMiniNotes(notes);
      setMiniJournals(journals);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const [nRes, jRes] = await Promise.all([
          fetch(
            `/api/calendar?startDate=${monthStartStr}&endDate=${monthEndStr}`,
          ),
          fetch(
            `/api/journal?startDate=${monthStartStr}&endDate=${monthEndStr}`,
          ),
        ]);
        const [nData, jData] = await Promise.all([nRes.json(), jRes.json()]);
        if (cancelled) return;
        setMiniNotes(nData.notes ?? []);
        setMiniJournals(jData.journals ?? {});
      } catch {
        // non-critical — mini cal can stay empty
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, view]);

  // When month view data loads, also update mini cal
  useEffect(() => {
    if (view === "month") {
      setMiniNotes(notes);
      setMiniJournals(journals);
    }
  }, [view, notes, journals]);

  // ── Refresh callback (passed to child views) ─────────────────
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Navigation ───────────────────────────────────────────────
  const navigate = useCallback(
    (dir: "prev" | "next") => {
      setCurrentDate((prev) => {
        const delta = dir === "prev" ? -1 : 1;
        if (view === "day") return addDays(prev, delta);
        if (view === "week") return addWeeks(prev, delta);
        return addMonths(prev, delta);
      });
    },
    [view],
  );

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleDayClick = useCallback((date: string) => {
    setCurrentDate(parseISO(date));
    setView("day");
  }, []);

  // ── Top-bar title ────────────────────────────────────────────
  const viewTitle = useMemo(() => {
    if (view === "day")
      return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (isSameMonth(ws, we))
        return (
          format(ws, "d") + " – " + format(we, "d MMMM yyyy", { locale: fr })
        );
      return (
        format(ws, "d MMM", { locale: fr }) +
        " – " +
        format(we, "d MMM yyyy", { locale: fr })
      );
    }
    return format(currentDate, "MMMM yyyy", { locale: fr });
  }, [view, currentDate]);

  // ── Sidebar derived data ─────────────────────────────────────
  const todayNotesCount = useMemo(
    () => notes.filter((n) => n.date === dateStr).length,
    [notes, dateStr],
  );

  // Upcoming events (next 7 days that have content)
  const upcomingEvents = useMemo(() => {
    const allJournals = { ...miniJournals, ...journals };
    const allNotes = [...miniNotes, ...notes].reduce<Note[]>((acc, n) => {
      if (!acc.find((x) => x.id === n.id)) acc.push(n);
      return acc;
    }, []);

    const events: {
      date: string;
      notesCount: number;
      journal: DailyJournal | null;
    }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = addDays(new Date(), i);
      const dStr = toLocalDateString(d);
      const cnt = allNotes.filter((n) => n.date === dStr).length;
      const j = allJournals[dStr] ?? null;
      if (cnt > 0 || j)
        events.push({ date: dStr, notesCount: cnt, journal: j });
    }
    return events.slice(0, 5);
  }, [notes, miniNotes, journals, miniJournals]);

  // ── Mini-calendar grid ───────────────────────────────────────
  const miniCalDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    return eachDayOfInterval({
      start: startOfWeek(ms, { weekStartsOn: 1 }),
      end: endOfWeek(me, { weekStartsOn: 1 }),
    });
  }, [currentDate]);

  const miniHasActivity = useMemo(() => {
    const set = new Set<string>();
    const src = view === "month" ? notes : miniNotes;
    for (const n of src) {
      if (n.date) set.add(n.date);
    }
    const jSrc = view === "month" ? journals : miniJournals;
    for (const d of Object.keys(jSrc)) set.add(d);
    return set;
  }, [view, notes, miniNotes, journals, miniJournals]);

  // ── Quick actions ────────────────────────────────────────────
  const handleCopyJournal = useCallback(() => {
    if (!dayJournal?.content) return;
    navigator.clipboard.writeText(dayJournal.content);
    setCopiedJournal(true);
    setTimeout(() => setCopiedJournal(false), 2000);
  }, [dayJournal]);

  const handleCopyToDate = useCallback(async () => {
    if (!copyTarget) return;
    setCopyingTo(true);
    try {
      await fetch(`/api/journal/${dateStr}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate: copyTarget }),
      });
      setShowCopyModal(false);
      setCopyTarget("");
    } catch (err) {
      console.error(err);
    } finally {
      setCopyingTo(false);
    }
  }, [copyTarget, dateStr]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0 bg-background">
        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex items-center gap-0.5 bg-surface rounded-xl p-1">
            {(["day", "week", "month"] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  view === v
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5",
                )}
              >
                {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>

          {/* Arrows */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => navigate("prev")}
              className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("next")}
              className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <h1 className="text-sm font-semibold text-text-primary capitalize tracking-wide">
            {viewTitle}
          </h1>
        </div>

        <button
          onClick={goToToday}
          className="px-4 py-1.5 rounded-xl text-sm text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          Aujourd'hui
        </button>
      </header>

      {/* ── Body: main area + sidebar ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-60">
              <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {view === "day" && (
                <DayView
                  date={dateStr}
                  notes={notes}
                  journal={dayJournal}
                  onRefresh={handleRefresh}
                />
              )}
              {view === "week" && (
                <WeekView
                  weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                  notes={notes}
                  journals={journals}
                  onDayClick={handleDayClick}
                  onRefresh={handleRefresh}
                />
              )}
              {view === "month" && (
                <MonthView
                  currentDate={currentDate}
                  selectedDate={dateStr}
                  notes={notes}
                  journals={journals}
                  onDayClick={handleDayClick}
                />
              )}
            </>
          )}
        </main>

        {/* ── Right sidebar ──────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 border-l border-border overflow-y-auto p-4 flex flex-col gap-4 bg-background">
          {/* Mini calendar */}
          <SidebarCard>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentDate((d) => subMonths(d, 1))}
                className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-text-secondary capitalize">
                {format(currentDate, "MMMM yyyy", { locale: fr })}
              </span>
              <button
                onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div key={i} className="text-center py-0.5">
                  <span className="text-[9px] font-semibold text-text-muted uppercase">
                    {d}
                  </span>
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {miniCalDays.map((day: Date) => {
                const dStr = toLocalDateString(day);
                const inMonth = isSameMonth(day, currentDate);
                const isSelected = dStr === dateStr;
                const dayIsToday = isToday(day);
                const hasActivity = miniHasActivity.has(dStr);

                return (
                  <button
                    key={dStr}
                    onClick={() => handleDayClick(dStr)}
                    className={cn(
                      "flex flex-col items-center py-0.5 rounded-lg transition-colors",
                      !inMonth && "opacity-25",
                      isSelected && "bg-accent/20",
                      !isSelected && "hover:bg-white/[0.05]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] w-5 h-5 flex items-center justify-center rounded-full",
                        dayIsToday &&
                          "bg-accent text-white font-bold text-[10px]",
                        !dayIsToday &&
                          isSelected &&
                          "text-accent-light font-semibold",
                        !dayIsToday && !isSelected && "text-text-secondary",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {hasActivity && (
                      <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </SidebarCard>

          {/* Aperçu du jour */}
          <SidebarCard>
            <SidebarCardHeader icon={<BookOpen className="w-3.5 h-3.5" />}>
              Aperçu du jour
            </SidebarCardHeader>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Journal</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    dayJournal?.content
                      ? "text-emerald-400"
                      : "text-text-muted",
                  )}
                >
                  {dayJournal?.content
                    ? `${dayJournal.content.length} car.`
                    : "Aucune entrée"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Créneaux remplis
                </span>
                <span className="text-xs font-medium text-accent-light">
                  {todayNotesCount} / 24
                </span>
              </div>
              {todayNotesCount > 0 && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${(todayNotesCount / 24) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </SidebarCard>

          {/* Événements à venir */}
          <SidebarCard>
            <SidebarCardHeader icon={<CalendarDays className="w-3.5 h-3.5" />}>
              Événements à venir
            </SidebarCardHeader>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-text-muted italic">
                Aucun événement à venir.
              </p>
            ) : (
              <div className="space-y-1">
                {upcomingEvents.map(({ date: d, notesCount, journal: j }) => (
                  <button
                    key={d}
                    onClick={() => handleDayClick(d)}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-text-secondary capitalize group-hover:text-text-primary transition-colors">
                        {format(parseISO(d), "EEE d MMM", { locale: fr })}
                      </span>
                      <div className="flex gap-1 items-center">
                        {j && (
                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        )}
                        {notesCount > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-text-muted truncate">
                      {j?.content.split("\n").find((l) => l.trim()) ??
                        (notesCount > 0 ? `${notesCount} créneau(x)` : "")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </SidebarCard>

          {/* Actions rapides */}
          <SidebarCard>
            <SidebarCardHeader icon={<Clock className="w-3.5 h-3.5" />}>
              Actions rapides
            </SidebarCardHeader>
            <div className="space-y-1.5">
              <QuickActionButton
                onClick={handleCopyJournal}
                disabled={!dayJournal?.content}
                icon={
                  copiedJournal ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )
                }
              >
                {copiedJournal ? "Copié !" : "Copier le journal"}
              </QuickActionButton>

              <QuickActionButton
                onClick={() => setShowCopyModal(true)}
                disabled={!dayJournal?.content}
                icon={<CalendarDays className="w-3.5 h-3.5" />}
              >
                Copier vers une autre date
              </QuickActionButton>

              <button
                onClick={() => {
                  setView("day");
                  setCurrentDate(new Date());
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-accent/15 hover:bg-accent/25 text-accent-light transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle entrée aujourd'hui
              </button>
            </div>
          </SidebarCard>
        </aside>
      </div>

      {/* ── Copy-to-date modal ────────────────────────────────── */}
      {showCopyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) =>
            e.target === e.currentTarget && setShowCopyModal(false)
          }
        >
          <div className="w-full max-w-sm mx-4 bg-surface rounded-2xl border border-border shadow-2xl animate-slide-in p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Copier vers une autre date
              </h3>
              <button
                onClick={() => setShowCopyModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Journal du{" "}
              <span className="text-text-secondary font-medium">
                {format(currentDate, "d MMMM", { locale: fr })}
              </span>{" "}
              sera copié vers :
            </p>
            <input
              type="date"
              value={copyTarget}
              onChange={(e) => setCopyTarget(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyTarget("");
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-text-secondary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCopyToDate}
                disabled={!copyTarget || copyingTo}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-sm text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copyingTo ? "Copie…" : "Copier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small reusable sidebar sub-components ───────────────────────

function SidebarCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl p-3 border border-border">
      {children}
    </div>
  );
}

function SidebarCardHeader({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-accent-light">{icon}</span>
      <span className="text-xs font-semibold text-text-secondary">
        {children}
      </span>
    </div>
  );
}

function QuickActionButton({
  children,
  onClick,
  disabled,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
        disabled
          ? "bg-white/[0.02] text-text-muted cursor-not-allowed"
          : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary",
      )}
    >
      <span
        className={cn(
          disabled
            ? "text-text-muted"
            : "text-text-muted group-hover:text-text-secondary",
        )}
      >
        {icon}
      </span>
      {children}
    </button>
  );
}
