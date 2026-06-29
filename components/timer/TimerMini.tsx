'use client'

import { useTimer } from '@/hooks/useTimer'
import { formatTime } from '@/lib/utils'

/**
 * Compact timer indicator for the sidebar.
 * Renders only when the timer is running; shows a blinking red dot
 * and the current time in HH:MM:SS format.
 */
export function TimerMini() {
  const { isRunning, displayTime } = useTimer()

  if (!isRunning) return null

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-red-500/10 border border-red-500/20">
      <span
        className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 animate-blink"
        aria-hidden="true"
      />
      <span className="font-mono tabular-nums text-xs font-semibold text-red-400 tracking-wide">
        {formatTime(displayTime, false)}
      </span>
    </div>
  )
}
