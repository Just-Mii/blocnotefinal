'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTimerStore } from '@/store/timer'
import { cn } from '@/lib/utils'

interface TimerDisplayProps {
  className?: string
}

/**
 * Large timer display component with its own RAF update loop.
 * Reads directly from the Zustand timer store and renders
 * HH:MM:SS.mmm, automatically switching to countdown-remaining
 * when mode === 'countdown'.
 */
export function TimerDisplay({ className }: TimerDisplayProps) {
  const { isRunning, startedAt, elapsed, mode, countdownTarget } = useTimerStore()
  const [displayTime, setDisplayTime] = useState(0)

  const getCurrentTime = useCallback((): number => {
    if (!isRunning || startedAt === null) return elapsed
    return elapsed + (performance.now() - startedAt)
  }, [isRunning, startedAt, elapsed])

  useEffect(() => {
    const toDisplay = (raw: number) =>
      mode === 'countdown' ? Math.max(0, countdownTarget - raw) : raw

    if (!isRunning) {
      setDisplayTime(toDisplay(getCurrentTime()))
      return
    }

    let raf: number
    const update = () => {
      setDisplayTime(toDisplay(getCurrentTime()))
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [isRunning, getCurrentTime, mode, countdownTarget])

  const ms = Math.max(0, displayTime)
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const msVal = Math.floor(ms % 1000)

  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  const mmm = String(msVal).padStart(3, '0')

  return (
    <div
      className={cn(
        'font-mono tabular-nums select-none text-center leading-none',
        className,
      )}
    >
      <span className="text-7xl font-bold tracking-tight text-text-primary">
        {hh}
        <span className="text-text-muted/60 mx-0.5">:</span>
        {mm}
        <span className="text-text-muted/60 mx-0.5">:</span>
        {ss}
      </span>
      <span className="text-4xl font-semibold text-text-secondary">.{mmm}</span>
    </div>
  )
}
