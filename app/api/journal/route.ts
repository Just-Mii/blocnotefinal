import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { DailyJournal } from '@/types'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (date) {
    const { data, error } = await supabase
      .from('daily_journal')
      .select('*')
      .eq('date', date)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ journal: data ?? null })
  }

  if (startDate && endDate) {
    const { data, error } = await supabase
      .from('daily_journal')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return as a keyed map for O(1) lookup
    const journalMap: Record<string, DailyJournal> = {}
    for (const entry of data ?? []) {
      journalMap[entry.date] = entry
    }
    return NextResponse.json({ journals: journalMap })
  }

  return NextResponse.json(
    { error: 'Provide either ?date= or ?startDate=&endDate=' },
    { status: 400 }
  )
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, content, mood } = body

  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('daily_journal')
    .upsert(
      { date, content: content ?? '', mood: mood ?? null },
      { onConflict: 'date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ journal: data })
}
