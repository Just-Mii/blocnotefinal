import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: note, error } = await supabase
    .from("notes")
    .select(
      "id, title, content, type, date, hour, project_id, is_favorite, is_deleted, deleted_at, created_at, updated_at, notes_tags(tags(id, name, color))",
    )
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: versions } = await supabase
    .from("note_versions")
    .select("id, note_id, content, saved_at")
    .eq("note_id", id)
    .order("saved_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    ...note,
    tags: (note.notes_tags ?? []).map((nt: any) => nt.tags).filter(Boolean),
    notes_tags: undefined,
    versions: versions ?? [],
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { title, content, is_favorite, is_deleted, project_id, tags } = body;

  // Fetch current content to detect changes
  const { data: current } = await supabase
    .from("notes")
    .select("content")
    .eq("id", id)
    .single();

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (content !== undefined) update.content = content;
  if (is_favorite !== undefined) update.is_favorite = is_favorite;
  if (is_deleted !== undefined) update.is_deleted = is_deleted;
  if (project_id !== undefined) update.project_id = project_id;

  const { data, error } = await supabase
    .from("notes")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Save version if content changed and is non-empty
  if (
    content !== undefined &&
    current &&
    content !== current.content &&
    content.trim().length > 0
  ) {
    await supabase.from("note_versions").insert({ note_id: id, content });
  }

  // Sync tags if provided (array of tag UUIDs)
  if (Array.isArray(tags)) {
    await supabase.from("notes_tags").delete().eq("note_id", id);
    if (tags.length > 0) {
      await supabase
        .from("notes_tags")
        .insert(tags.map((tagId: string) => ({ note_id: id, tag_id: tagId })));
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Hard delete only if already in trash
  const { data: note } = await supabase
    .from("notes")
    .select("is_deleted")
    .eq("id", id)
    .single();

  if (!note?.is_deleted) {
    return NextResponse.json(
      {
        error:
          "La note doit être dans la corbeille pour être supprimée définitivement.",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
