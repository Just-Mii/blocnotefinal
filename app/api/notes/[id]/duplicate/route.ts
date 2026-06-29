import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: original, error: fetchError } = await supabase
    .from("notes")
    .select("*, notes_tags(tag_id)")
    .eq("id", id)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Note introuvable." }, { status: 404 });
  }

  const { data: copy, error: insertError } = await supabase
    .from("notes")
    .insert({
      title: `Copie de ${original.title}`,
      content: original.content,
      type: original.type,
      date: null,
      hour: null,
      project_id: original.project_id,
      is_favorite: false,
      is_deleted: false,
    })
    .select()
    .single();

  if (insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Duplicate tag associations
  const tagIds: string[] = (original.notes_tags ?? []).map(
    (nt: any) => nt.tag_id,
  );
  if (tagIds.length > 0) {
    await supabase
      .from("notes_tags")
      .insert(tagIds.map((tag_id) => ({ note_id: copy.id, tag_id })));
  }

  return NextResponse.json({ ...copy, tags: [] }, { status: 201 });
}
