import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const STORAGE_LIMIT_BYTES = 100 * 1024; // 100 KB

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/widgets/[id]/storage ───────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("widgets")
    .select("storage")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  return NextResponse.json({ data: data.storage ?? {} });
}

// ─── PUT /api/widgets/[id]/storage ───────────────────────────────────────────
// Body: { key: string, val: unknown }
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { key?: string; val?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, val } = body;
  if (typeof key !== "string" || key.trim() === "") {
    return NextResponse.json(
      { error: "key must be a non-empty string" },
      { status: 400 },
    );
  }

  // Fetch current storage
  const { data: widgetRow, error: fetchError } = await supabase
    .from("widgets")
    .select("storage")
    .eq("id", id)
    .single();

  if (fetchError || !widgetRow) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  const currentStorage = (widgetRow.storage as Record<string, unknown>) ?? {};
  const newStorage = { ...currentStorage, [key.trim()]: val };

  // Enforce 100 KB storage limit
  const serialized = JSON.stringify(newStorage);
  if (Buffer.byteLength(serialized, "utf8") > STORAGE_LIMIT_BYTES) {
    return NextResponse.json(
      { error: "Storage limit exceeded (100 KB)" },
      { status: 413 },
    );
  }

  const { error: updateError } = await supabase
    .from("widgets")
    .update({ storage: newStorage })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: newStorage });
}
