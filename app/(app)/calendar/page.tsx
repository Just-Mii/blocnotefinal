import type { Metadata } from 'next'
import CalendarView from '@/components/calendar/CalendarView'

export const metadata: Metadata = {
  title: 'Calendrier / Journal',
}

export default function CalendarPage() {
  return <CalendarView />
}
