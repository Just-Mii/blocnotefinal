import { create } from 'zustand'
import type { Lap } from '@/types'

interface TimerStore {
  mode: 'stopwatch' | 'countdown'
  isRunning: boolean
  startedAt: number | null  // performance.now() snapshot
  elapsed: number           // ms accumulated before last start
  countdownTarget: number   // ms for countdown
  laps: Lap[]
  linkedNoteId: string | null
  // Actions
  start: () => void
  pause: () => void
  reset: () => void
  addLap: () => void
  setMode: (mode: 'stopwatch' | 'countdown') => void
  setCountdownTarget: (ms: number) => void
  linkNote: (id: string | null) => void
  getCurrentTime: () => number  // returns current elapsed ms
}

export const useTimerStore = create<TimerStore>()((set, get) => ({
  mode: 'stopwatch',
  isRunning: false,
  startedAt: null,
  elapsed: 0,
  countdownTarget: 25 * 60 * 1000, // 25 minutes default
  laps: [],
  linkedNoteId: null,

  start: () => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    set({ isRunning: true, startedAt: now })
  },

  pause: () => {
    const state = get()
    if (!state.isRunning || state.startedAt === null) return
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const newElapsed = state.elapsed + (now - state.startedAt)
    set({ isRunning: false, startedAt: null, elapsed: newElapsed })
  },

  reset: () => {
    set({ isRunning: false, startedAt: null, elapsed: 0, laps: [] })
  },

  addLap: () => {
    const state = get()
    const currentTime = state.getCurrentTime()
    const lastLapTime = state.laps.length > 0
      ? state.laps[state.laps.length - 1].time
      : 0
    const newLap: Lap = {
      index: state.laps.length + 1,
      time: currentTime,
      delta: currentTime - lastLapTime,
    }
    set({ laps: [...state.laps, newLap] })
  },

  setMode: (mode) => {
    set({ mode, isRunning: false, startedAt: null, elapsed: 0, laps: [] })
  },

  setCountdownTarget: (ms) => {
    set({ countdownTarget: ms })
  },

  linkNote: (id) => {
    set({ linkedNoteId: id })
  },

  getCurrentTime: () => {
    const state = get()
    if (!state.isRunning || state.startedAt === null) {
      return state.elapsed
    }
    if (typeof performance === 'undefined') return state.elapsed
    return state.elapsed + (performance.now() - state.startedAt)
  },
}))
