'use client'

import { useState, useEffect } from 'react'
import { useTimerStore } from '@/store/timer'

/**
 * Wraps the Zustand timer store and adds a RAF-based `displayTime`.
 * `displayTime` is countdown-aware: in countdown mode it returns
 * `max(0, countdownTarget - elapsed)`, otherwise raw elapsed ms.
 */
export function useTimer() {
  const store = useTimerStore()
  const [displayTime, setDisplayTime] = useState(0)

  useEffect(() => {
    const { isRunning, elapsed, startedAt, mode, countdownTarget } = store

    const compute = (): number => {
      const now = performance.now()
      const current = elapsed + (startedAt ? now - startedAt : 0)
      if (mode === 'countdown') {
        return Math.max(0, countdownTarget - current)
      }
      return current
    }

    if (!isRunning) {
      setDisplayTime(compute())
      return
    }

    let raf: number
    const update = () => {
      setDisplayTime(compute())
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isRunning, store.elapsed, store.startedAt, store.mode, store.countdownTarget])

  return { ...store, displayTime }
}
