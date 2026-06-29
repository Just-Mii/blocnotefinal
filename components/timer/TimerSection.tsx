'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import {
  Play, Pause, RotateCcw, Flag, Link2,
  CheckCircle2, Timer, AlarmClock, Clock,
} from 'lucide-react'
import { useTimer } from '@/hooks/useTimer'
import { TimerDisplay } from './TimerDisplay'
import { formatTime, cn } from '@/lib/utils'
import type { Note } from '@/types'

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function parseMs(ms: number) {
  return {
    h: Math.floor(ms / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1_000),
  }
}

/* ─────────────────────────────────────────────────────────────
   Control Button
───────────────────────────────────────────────────────────── */

interface CtrlBtnProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost' | 'danger'
  children: React.ReactNode
  title?: string
}

function CtrlBtn({ onClick, disabled, variant = 'ghost', children, title }: CtrlBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' &&
          'px-10 py-4 text-base bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 active:scale-95',
        variant === 'ghost' &&
          'px-5 py-4 text-sm bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-border active:scale-95',
        variant === 'danger' &&
          'px-5 py-4 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 active:scale-95',
      )}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Lap Row
───────────────────────────────────────────────────────────── */

function LapRow({
  index, time, delta, isBest, isWorst,
}: {
  index: number; time: number; delta: number; isBest: boolean; isWorst: boolean
}) {
  return (
    <tr
      className={cn(
        'border-t border-border text-sm transition-colors',
        isBest && 'bg-green-500/5',
        isWorst && 'bg-red-500/5',
      )}
    >
      <td className="py-2 pl-4 font-mono text-text-muted">{String(index).padStart(2, '0')}</td>
      <td className="py-2 px-4 font-mono tabular-nums text-text-secondary">
        {formatTime(time, true)}
      </td>
      <td className="py-2 pr-4 font-mono tabular-nums text-right">
        <span
          className={cn(
            isBest && 'text-green-400 font-semibold',
            isWorst && 'text-red-400 font-semibold',
            !isBest && !isWorst && 'text-text-secondary',
          )}
        >
          {isBest && '▲ '}
          {isWorst && '▼ '}
          {formatTime(delta, true)}
        </span>
      </td>
    </tr>
  )
}

/* ─────────────────────────────────────────────────────────────
   TimerSection
───────────────────────────────────────────────────────────── */

export function TimerSection() {
  const {
    isRunning, mode, laps, linkedNoteId, elapsed, countdownTarget,
    start, pause, reset, addLap, setMode, setCountdownTarget, linkNote,
    displayTime,
  } = useTimer()

  /* countdown inputs ---------------------------------------- */
  const { h: initH, m: initM, s: initS } = parseMs(countdownTarget)
  const [countH, setCountH] = useState(initH)
  const [countM, setCountM] = useState(initM)
  const [countS, setCountS] = useState(initS)

  // Sync inputs when mode or target changes from outside
  useEffect(() => {
    const { h, m, s } = parseMs(countdownTarget)
    setCountH(h); setCountM(m); setCountS(s)
  }, [countdownTarget])

  const applyCountdown = useCallback((h: number, m: number, s: number) => {
    setCountdownTarget((h * 3600 + m * 60 + s) * 1_000)
  }, [setCountdownTarget])

  const handleCountdownField = (
    field: 'h' | 'm' | 's',
    raw: string,
  ) => {
    const v = Math.max(0, Math.min(field === 'h' ? 99 : 59, parseInt(raw) || 0))
    const nh = field === 'h' ? v : countH
    const nm = field === 'm' ? v : countM
    const ns = field === 's' ? v : countS
    if (field === 'h') setCountH(v)
    else if (field === 'm') setCountM(v)
    else setCountS(v)
    applyCountdown(nh, nm, ns)
  }

  /* note linking ------------------------------------------- */
  const [notes, setNotes] = useState<Pick<Note, 'id' | 'title'>[]>([])
  const [notesLoading, setNotesLoading] = useState(false)

  useEffect(() => {
    setNotesLoading(true)
    fetch('/api/notes?limit=100&sort=updated_at')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ data }) => { if (Array.isArray(data)) setNotes(data) })
      .catch(() => {})
      .finally(() => setNotesLoading(false))
  }, [])

  /* note saving -------------------------------------------- */
  const [noteSaved, setNoteSaved] = useState(false)
  const [noteSaveError, setNoteSaveError] = useState<string | null>(null)
  const [lastStoppedElapsed, setLastStoppedElapsed] = useState(0)

  // Detect pause → record elapsed
  const prevRunning = useRef(isRunning)
  useEffect(() => {
    if (prevRunning.current && !isRunning) {
      setLastStoppedElapsed(elapsed)
      setNoteSaved(false)
      setNoteSaveError(null)
    }
    prevRunning.current = isRunning
  }, [isRunning, elapsed])

  const handleSaveToNote = async () => {
    if (!linkedNoteId) return
    const timeLabel = formatTime(lastStoppedElapsed, true)
    const snippet = `[chrono] ${timeLabel}`
    setNoteSaveError(null)
    try {
      const noteRes = await fetch(`/api/notes/${linkedNoteId}`)
      if (!noteRes.ok) throw new Error('Note introuvable')
      const { data: note } = await noteRes.json()
      const updateRes = await fetch(`/api/notes/${linkedNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: (note.content || '') + '\n' + snippet }),
      })
      if (!updateRes.ok) throw new Error('Échec de la mise à jour')
      setNoteSaved(true)
    } catch (err) {
      setNoteSaveError(err instanceof Error ? err.message : String(err))
    }
  }

  /* countdown finish --------------------------------------- */
  const [countdownDone, setCountdownDone] = useState(false)
  useEffect(() => {
    if (mode === 'countdown' && isRunning && displayTime <= 0) {
      pause()
      setCountdownDone(true)
    }
  }, [displayTime, mode, isRunning, pause])

  /* reset clears done state -------------------------------- */
  const handleReset = () => {
    reset()
    setCountdownDone(false)
    setNoteSaved(false)
    setNoteSaveError(null)
    setLastStoppedElapsed(0)
  }

  /* lap statistics ----------------------------------------- */
  const bestLapIdx =
    laps.length > 1
      ? laps.reduce((b, l, i) => (l.delta < laps[b].delta ? i : b), 0)
      : -1
  const worstLapIdx =
    laps.length > 1
      ? laps.reduce((w, l, i) => (l.delta > laps[w].delta ? i : w), 0)
      : -1

  /* progress (countdown only) ------------------------------ */
  const progress =
    mode === 'countdown' && countdownTarget > 0
      ? Math.max(0, Math.min(1, displayTime / countdownTarget))
      : 0

  const canStart = mode === 'countdown' ? countdownTarget > 0 && !countdownDone : true

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Page header ───────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Clock size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-none">Chronomètre</h1>
            <p className="text-xs text-text-muted mt-0.5">Mesurez et enregistrez le temps</p>
          </div>
        </div>

        {/* ── Mode tabs ─────────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 bg-surface rounded-xl w-fit border border-border"
          role="tablist"
          aria-label="Mode du chronomètre"
        >
          {(
            [
              { value: 'stopwatch', label: 'Chronomètre', Icon: Timer },
              { value: 'countdown', label: 'Compte à rebours', Icon: AlarmClock },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => { setMode(value); setCountdownDone(false) }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                mode === value
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Timer card ────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border shadow-xl overflow-hidden">

          {/* Countdown inputs */}
          {mode === 'countdown' && !isRunning && elapsed === 0 && !countdownDone && (
            <div className="px-6 pt-6 pb-2 flex items-end justify-center gap-2">
              {(
                [
                  { field: 'h' as const, label: 'Heures', val: countH, max: 99 },
                  { field: 'm' as const, label: 'Minutes', val: countM, max: 59 },
                  { field: 's' as const, label: 'Secondes', val: countS, max: 59 },
                ]
              ).map(({ field, label, val, max }, i) => (
                <Fragment key={field}>
                  {i > 0 && (
                    <span className="text-3xl font-bold text-text-muted mb-5 select-none">:</span>
                  )}
                  <div className="flex flex-col items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={max}
                      value={val}
                      onChange={e => handleCountdownField(field, e.target.value)}
                      className={cn(
                        'w-20 text-center text-3xl font-mono font-bold',
                        'bg-surface-elevated border border-border rounded-xl p-2.5',
                        'text-text-primary focus:outline-none focus:border-accent',
                        'transition-colors [appearance:textfield]',
                        '[&::-webkit-inner-spin-button]:appearance-none',
                        '[&::-webkit-outer-spin-button]:appearance-none',
                      )}
                    />
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">
                      {label}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
          )}

          {/* Big time display */}
          <div className="px-6 py-8">
            <TimerDisplay />
          </div>

          {/* Countdown progress bar */}
          {mode === 'countdown' && countdownTarget > 0 && (
            <div className="h-1 bg-surface-elevated mx-6 mb-6 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-100',
                  countdownDone ? 'bg-red-500' : 'bg-accent',
                )}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}

          {/* Countdown finished banner */}
          {countdownDone && (
            <div className="mx-6 mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center animate-fade-in">
              <span className="text-amber-400 font-semibold text-sm">⏰ Temps écoulé !</span>
            </div>
          )}
        </div>

        {/* ── Control buttons ───────────────────────────────── */}
        <div className="flex items-center justify-center gap-3">
          {/* Start / Pause */}
          <CtrlBtn
            onClick={isRunning ? pause : start}
            variant="primary"
            disabled={!canStart}
            title={isRunning ? 'Pause' : 'Démarrer'}
          >
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            {isRunning ? 'Pause' : 'Démarrer'}
          </CtrlBtn>

          {/* Reset */}
          <CtrlBtn onClick={handleReset} title="Réinitialiser">
            <RotateCcw size={16} />
            Réinitialiser
          </CtrlBtn>

          {/* Lap (stopwatch only) */}
          {mode === 'stopwatch' && (
            <CtrlBtn
              onClick={addLap}
              disabled={!isRunning && elapsed === 0}
              title="Enregistrer un tour"
            >
              <Flag size={16} />
              Tour
            </CtrlBtn>
          )}
        </div>

        {/* ── Note linking ──────────────────────────────────── */}
        <div className="bg-surface rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link2 size={15} className="text-text-muted" />
              <span className="text-sm text-text-secondary font-medium">Lier à une note</span>
            </div>

            <select
              value={linkedNoteId ?? ''}
              onChange={e => linkNote(e.target.value || null)}
              disabled={notesLoading}
              className={cn(
                'flex-1 min-w-0 bg-surface-elevated border border-border rounded-lg px-3 py-1.5',
                'text-sm text-text-primary focus:outline-none focus:border-accent',
                'disabled:opacity-50 cursor-pointer',
              )}
            >
              <option value="">
                {notesLoading ? 'Chargement…' : 'Aucune note'}
              </option>
              {notes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.title || 'Sans titre'}
                </option>
              ))}
            </select>

            {/* Save to note */}
            {linkedNoteId && !isRunning && lastStoppedElapsed > 0 && (
              <button
                onClick={handleSaveToNote}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  noteSaved
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                    : 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20',
                )}
                disabled={noteSaved}
              >
                {noteSaved ? <CheckCircle2 size={13} /> : <Flag size={13} />}
                {noteSaved
                  ? 'Enregistré'
                  : `Ajouter ${formatTime(lastStoppedElapsed, true)}`}
              </button>
            )}
          </div>

          {noteSaveError && (
            <p className="text-xs text-red-400">{noteSaveError}</p>
          )}
        </div>

        {/* ── Laps table ────────────────────────────────────── */}
        {laps.length > 0 && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                Tours ({laps.length})
              </span>
              <span className="text-xs text-text-muted">
                Meilleur ▲&nbsp;&nbsp;Pire ▼
              </span>
            </div>
            <div className="overflow-y-auto max-h-72">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-text-muted uppercase tracking-wider">
                    <th className="py-2 pl-4 text-left font-medium">#</th>
                    <th className="py-2 px-4 text-left font-medium">Temps absolu</th>
                    <th className="py-2 pr-4 text-right font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {[...laps].reverse().map((lap) => (
                    <LapRow
                      key={lap.index}
                      index={lap.index}
                      time={lap.time}
                      delta={lap.delta}
                      isBest={laps.indexOf(lap) === bestLapIdx}
                      isWorst={laps.indexOf(lap) === worstLapIdx}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
