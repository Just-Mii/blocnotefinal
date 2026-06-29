import type { Metadata } from 'next'
import { TimerSection } from '@/components/timer/TimerSection'

export const metadata: Metadata = {
  title: 'Chronomètre — Blocnote',
}

export default function TimerPage() {
  return <TimerSection />
}
