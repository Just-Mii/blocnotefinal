import { Suspense } from 'react'
import SearchSection from '@/components/search/SearchSection'

export const metadata = { title: 'Recherche — Blocnote' }

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-background animate-pulse" />}>
      <SearchSection />
    </Suspense>
  )
}
