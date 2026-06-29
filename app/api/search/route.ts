import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getExcerpt } from '@/lib/utils'
import type { SearchResult, Tag } from '@/types'

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type') ?? 'all'
  const tagId = searchParams.get('tag') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  if (!q && !tagId) {
    return NextResponse.json({ data: [] })
  }

  const results: SearchResult[] = []

  // ── Notes & Calendar notes ───────────────────────────────────
  if (type === 'all' || type === 'note' || type === 'calendar') {
    let noteQuery = supabase
      .from('notes')
      .select('*, tags:notes_tags(tag:tags(*))')
      .eq('is_deleted', false)
      .limit(20)

    if (q) {
      noteQuery = noteQuery.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    }

    if (from) noteQuery = noteQuery.gte('date', from)
    if (to) noteQuery = noteQuery.lte('date', to)
    if (type === 'note') noteQuery = noteQuery.eq('type', 'standalone')
    if (type === 'calendar') noteQuery = noteQuery.eq('type', 'calendar')

    const { data: notes } = await noteQuery

    if (notes) {
      for (const note of notes) {
        const tags: Tag[] = (note.tags ?? [])
          .map((t: { tag: Tag | null }) => t.tag)
          .filter((t: Tag | null): t is Tag => t !== null)

        // Filter by tag when requested
        if (tagId && !tags.some((t) => t.id === tagId)) continue

        results.push({
          id: note.id,
          type: note.type === 'calendar' ? 'calendar' : 'note',
          title: note.title || 'Sans titre',
          excerpt: getExcerpt(note.content, q),
          date: note.date ?? note.created_at,
          tags,
        })
      }
    }
  }

  // ── Journal entries ──────────────────────────────────────────
  if ((type === 'all' || type === 'journal') && q && !tagId) {
    let journalQuery = supabase
      .from('daily_journal')
      .select('*')
      .ilike('content', `%${q}%`)
      .limit(10)

    if (from) journalQuery = journalQuery.gte('date', from)
    if (to) journalQuery = journalQuery.lte('date', to)

    const { data: journals } = await journalQuery

    if (journals) {
      for (const j of journals) {
        results.push({
          id: j.id,
          type: 'journal',
          title: `Journal — ${j.date}`,
          excerpt: getExcerpt(j.content, q),
          date: j.date,
          tags: [],
        })
      }
    }
  }

  // Sort: title matches first, then by date descending
  results.sort((a, b) => {
    const qLower = q.toLowerCase()
    const aHit = a.title.toLowerCase().includes(qLower) ? 1 : 0
    const bHit = b.title.toLowerCase().includes(qLower) ? 1 : 0
    if (bHit !== aHit) return bHit - aHit
    return (b.date ?? '') > (a.date ?? '') ? 1 : -1
  })

  return NextResponse.json({ data: results.slice(0, 20) })
}
