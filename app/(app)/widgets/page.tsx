import type { Metadata } from 'next'
import { WidgetsSection } from '@/components/widgets/WidgetsSection'

export const metadata: Metadata = {
  title: 'Widgets — Blocnote',
}

export default function WidgetsPage() {
  return <WidgetsSection />
}
