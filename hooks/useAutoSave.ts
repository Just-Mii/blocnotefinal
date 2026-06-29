'use client'

import { useEffect, useRef, useState } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutoSave(
  value: string,
  onSave: (value: string) => Promise<void>,
  delay = 1000
): { saveStatus: SaveStatus } {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedValueRef = useRef<string>(value)
  const onSaveRef = useRef(onSave)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep onSave ref fresh without retriggering the effect
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    // No change from last saved — skip
    if (value === savedValueRef.current) return

    // Cancel any pending debounce
    if (timerRef.current) clearTimeout(timerRef.current)
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await onSaveRef.current(value)
        savedValueRef.current = value
        setSaveStatus('saved')
        resetTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delay])

  return { saveStatus }
}
