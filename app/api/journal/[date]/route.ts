import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;

  const { data, error } = await supabase
    .from("daily_journal")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ journal: data ?? null });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const body = await request.json();
  const { content, mood } = body;

  const { data, error } = await supabase
    .from("daily_journal")
    .upsert(
      { date, content: content ?? "", mood: mood ?? null },
      { onConflict: "date" },
    )
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ journal: data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  // Copy this date's journal to another date
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const body = await request.json();
  const { targetDate } = body;
  if (!targetDate) {
    return NextResponse.json(
      { error: "targetDate is required" },
      { status: 400 },
    );
  }

  const { data: source, error: sourceError } = await supabase
    .from("daily_journal")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (sourceError)
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  if (!source)
    return NextResponse.json(
      { error: "Source journal not found" },
      { status: 404 },
    );

  const { data, error } = await supabase
    .from("daily_journal")
    .upsert(
      { date: targetDate, content: source.content, mood: source.mood },
      { onConflict: "date" },
    )
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ journal: data });
}
