'use client'

import { useMemo } from 'react'
import { extractToc } from '@/lib/utils'
import { List, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TableOfContentsProps {
  content: string
  onHeadingClick?: (id: string) => void
  className?: string
}

export default function TableOfContents({
  content,
  onHeadingClick,
  className,
}: TableOfContentsProps) {
  const toc = useMemo(() => extractToc(content), [content])

  const handleClick = (id: string) => {
    // Try to scroll an element with that id in the preview
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    onHeadingClick?.(id)
  }

  if (toc.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-4', className)}>
        <List size={24} className="text-text-muted mb-2" />
        <p className="text-text-muted text-xs text-center">
          Ajoutez des titres (# ## ###) pour générer une table des matières.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col overflow-y-auto', className)}>
      <div className="px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Table des matières
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {toc.map((entry, index) => (
          <button
            key={`${entry.id}-${index}`}
            onClick={() => handleClick(entry.id)}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm rounded transition-colors hover:bg-surface-hover hover:text-text-primary group flex items-start gap-1',
              entry.level === 1 && 'text-text-secondary font-medium',
              entry.level === 2 && 'pl-5 text-text-muted',
              entry.level === 3 && 'pl-8 text-text-muted text-xs'
            )}
          >
            <ChevronRight
              size={12}
              className="mt-0.5 text-text-muted opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
            />
            <span className="line-clamp-2">{entry.text}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
