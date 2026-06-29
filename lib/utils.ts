import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date helpers ──────────────────────────────────────────────

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateFr(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: fr })
  } catch {
    return dateStr
  }
}

export function formatDateShortFr(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE d MMM', { locale: fr })
  } catch {
    return dateStr
  }
}

// ── Timer formatting ──────────────────────────────────────────

export function formatTime(ms: number, showMs = true): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const msVal = ms % 1000

  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  const mmm = String(msVal).padStart(3, '0')

  return showMs ? `${hh}:${mm}:${ss}.${mmm}` : `${hh}:${mm}:${ss}`
}

// ── Markdown excerpt helper ───────────────────────────────────

export function getExcerpt(content: string, query: string, length = 150): string {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return content.slice(0, length)

  const start = Math.max(0, idx - 60)
  const end = Math.min(content.length, idx + 90)
  const excerpt = content.slice(start, end)
  return (start > 0 ? '…' : '') + excerpt + (end < content.length ? '…' : '')
}

// ── Word / char count ─────────────────────────────────────────

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function countChars(text: string): number {
  return text.length
}

// ── Markdown TOC ──────────────────────────────────────────────

export interface TocEntry {
  level: number
  text: string
  id: string
}

export function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split('\n')
  const entries: TocEntry[] = []
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      entries.push({ level, text, id })
    }
  }
  return entries
}

// ── Storage estimate ──────────────────────────────────────────

export function bytesToHuman(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
