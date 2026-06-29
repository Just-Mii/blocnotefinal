import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let query = supabase
    .from('notes')
    .select('*')
    .eq('type', 'calendar')
    .eq('is_deleted', false)
    .order('hour', { ascending: true })

  if (date) {
    query = query.eq('date', date)
  } else if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate)
  } else {
    return NextResponse.json(
      { error: 'Provide either ?date= or ?startDate=&endDate=' },
      { status: 400 }
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, hour, content, title } = body

  if (!date || hour === undefined) {
    return NextResponse.json({ error: 'date and hour are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: title ?? '',
      content: content ?? '',
      type: 'calendar',
      date,
      hour,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, date, hour, content, title } = body

  // Update by explicit ID
  if (id) {
    const { data, error } = await supabase
      .from('notes')
      .update({ content: content ?? '', title: title ?? '' })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ note: data })
  }

  // Upsert by date + hour
  if (!date || hour === undefined) {
    return NextResponse.json({ error: 'id or (date + hour) required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('notes')
    .select('id')
    .eq('type', 'calendar')
    .eq('date', date)
    .eq('hour', hour)
    .eq('is_deleted', false)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('notes')
      .update({ content: content ?? '', title: title ?? '' })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ note: data })
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: title ?? '',
      content: content ?? '',
      type: 'calendar',
      date,
      hour,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data }, { status: 201 })
}
