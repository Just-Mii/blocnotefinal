import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [notesRes, journalRes, versionsRes, widgetsRes] = await Promise.all([
    supabase
      .from('notes')
      .select('content, title')
      .eq('is_deleted', false),
    supabase
      .from('daily_journal')
      .select('content'),
    supabase
      .from('note_versions')
      .select('content'),
    supabase
      .from('widgets')
      .select('code, name'),
  ])

  if (notesRes.error)
    return NextResponse.json({ error: notesRes.error.message }, { status: 500 })
  if (journalRes.error)
    return NextResponse.json({ error: journalRes.error.message }, { status: 500 })
  if (versionsRes.error)
    return NextResponse.json({ error: versionsRes.error.message }, { status: 500 })
  if (widgetsRes.error)
    return NextResponse.json({ error: widgetsRes.error.message }, { status: 500 })

  const noteCount = notesRes.data?.length ?? 0
  const journalCount = journalRes.data?.length ?? 0
  const versionCount = versionsRes.data?.length ?? 0
  const widgetCount = widgetsRes.data?.length ?? 0

  let totalChars = 0

  for (const n of notesRes.data ?? []) {
    totalChars += (n.content?.length ?? 0) + (n.title?.length ?? 0)
  }
  for (const j of journalRes.data ?? []) {
    totalChars += j.content?.length ?? 0
  }
  for (const v of versionsRes.data ?? []) {
    totalChars += v.content?.length ?? 0
  }
  for (const w of widgetsRes.data ?? []) {
    totalChars += (w.code?.length ?? 0) + (w.name?.length ?? 0)
  }

  const estimatedBytes = Math.round(totalChars * 1.1)

  return NextResponse.json({
    noteCount,
    journalCount,
    versionCount,
    estimatedBytes,
    widgetCount,
  })
}
