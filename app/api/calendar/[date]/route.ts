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

  const [notesResult, journalResult] = await Promise.all([
    supabase
      .from("notes")
      .select("*")
      .eq("type", "calendar")
      .eq("date", date)
      .eq("is_deleted", false)
      .order("hour", { ascending: true }),
    supabase.from("daily_journal").select("*").eq("date", date).maybeSingle(),
  ]);

  if (notesResult.error) {
    return NextResponse.json(
      { error: notesResult.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    notes: notesResult.data ?? [],
    journal: journalResult.data ?? null,
  });
}
