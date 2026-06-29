import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: Record<string, any>) {
  return {
    theme: row.theme as string,
    editorFont: row.editor_font as string,
    fontSize: row.font_size as number,
    maxEditorWidth: row.max_editor_width as number,
    showMilliseconds: row.show_milliseconds as boolean,
    alertSound: row.alert_sound as string,
    showTimerInSidebar: row.show_timer_sidebar as boolean,
    sessionTimeout: row.session_timeout as number,
  }
}

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapRow(data))
}

export async function PUT(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.theme !== undefined) updates.theme = body.theme
  if (body.editor_font !== undefined) updates.editor_font = body.editor_font
  if (body.font_size !== undefined) updates.font_size = body.font_size
  if (body.max_editor_width !== undefined) updates.max_editor_width = body.max_editor_width
  if (body.show_milliseconds !== undefined) updates.show_milliseconds = body.show_milliseconds
  if (body.alert_sound !== undefined) updates.alert_sound = body.alert_sound
  if (body.show_timer_sidebar !== undefined) updates.show_timer_sidebar = body.show_timer_sidebar
  if (body.session_timeout !== undefined) updates.session_timeout = body.session_timeout

  if (Object.keys(updates).length === 0) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(mapRow(data))
  }

  const { data, error } = await supabase
    .from('app_settings')
    .update(updates)
    .eq('id', 1)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapRow(data))
}
