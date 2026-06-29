import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  let query = supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: tags, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get all notes_tags associations and build a count map
  const { data: noteTags } = await supabase.from("notes_tags").select("tag_id");

  const countMap = new Map<string, number>();
  noteTags?.forEach(({ tag_id }) => {
    countMap.set(tag_id, (countMap.get(tag_id) ?? 0) + 1);
  });

  const data = (tags ?? []).map((t) => ({
    ...t,
    note_count: countMap.get(t.id) ?? 0,
  }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, color } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const normalizedName = name.trim().toLowerCase();

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: normalizedName, color: color ?? "#7c3aed" })
    .select()
    .single();

  if (error) {
    // Unique constraint violation — return existing tag
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("tags")
        .select("*")
        .eq("name", normalizedName)
        .single();
      return NextResponse.json(
        { data: { ...existing, note_count: 0 } },
        { status: 200 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: { ...data, note_count: 0 } },
    { status: 201 },
  );
}
