import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'standalone'
  const project_id = searchParams.get('project_id')
  const tag = searchParams.get('tag')
  const sort = searchParams.get('sort') || 'updated_at'
  const search = searchParams.get('search')
  const trash = searchParams.get('trash') === 'true'

  const validSorts = ['updated_at', 'created_at', 'title']
  const sortField = validSorts.includes(sort) ? sort : 'updated_at'
  const ascending = sortField === 'title'

  let query = supabase
    .from('notes')
    .select(
      'id, title, content, type, date, hour, project_id, is_favorite, is_deleted, deleted_at, created_at, updated_at, notes_tags(tags(id, name, color))'
    )
    .eq('type', type)
    .eq('is_deleted', trash)
    .order(sortField, { ascending })

  if (project_id) query = query.eq('project_id', project_id)
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notes = (data ?? []).map((note: any) => ({
    ...note,
    tags: (note.notes_tags ?? []).map((nt: any) => nt.tags).filter(Boolean),
    notes_tags: undefined,
  }))

  const filtered = tag
    ? notes.filter((n: any) => n.tags.some((t: any) => t.id === tag))
    : notes

  return NextResponse.json(filtered)
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, content, type, date, hour, project_id } = body

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: title || 'Sans titre',
      content: content || '',
      type: type || 'standalone',
      date: date ?? null,
      hour: hour ?? null,
      project_id: project_id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, tags: [] }, { status: 201 })
}
