import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch note counts for all projects in a single query
  const { data: noteRows } = await supabase
    .from("notes")
    .select("project_id")
    .eq("is_deleted", false)
    .not("project_id", "is", null);

  const countMap = new Map<string, number>();
  noteRows?.forEach((n) => {
    if (n.project_id) {
      countMap.set(n.project_id, (countMap.get(n.project_id) ?? 0) + 1);
    }
  });

  const data = (projects ?? []).map((p) => ({
    ...p,
    note_count: countMap.get(p.id) ?? 0,
  }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; color?: string; icon?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, color, icon } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: name.trim(),
      color: color ?? "#7c3aed",
      icon: icon ?? "folder",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: { ...data, note_count: 0 } },
    { status: 201 },
  );
}
