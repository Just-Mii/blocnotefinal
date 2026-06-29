import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { tag_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tag_id } = body;
  if (!tag_id) {
    return NextResponse.json({ error: "tag_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notes_tags")
    .insert({ note_id: id, tag_id })
    .select()
    .single();

  if (error) {
    // Unique constraint: association already exists, treat as success
    if (error.code === "23505") {
      return NextResponse.json({ data: { note_id: id, tag_id } });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const tagId = searchParams.get("tag_id");

  if (!tagId) {
    return NextResponse.json(
      { error: "tag_id query param is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("notes_tags")
    .delete()
    .eq("note_id", id)
    .eq("tag_id", tagId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
