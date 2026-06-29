import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { encodeSecrets, decodeSecrets } from "@/lib/widget-secrets";

// ─── GET /api/widgets ─────────────────────────────────────────────────────────
export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("widgets")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const widgets = (data ?? []).map((w) => ({
    ...w,
    secrets: decodeSecrets((w.secrets as Record<string, string>) ?? {}),
  }));

  return NextResponse.json({ data: widgets });
}

// ─── POST /api/widgets ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, code, secrets, size, position } = body as {
    name?: string;
    code?: string;
    secrets?: Record<string, string>;
    size?: string;
    position?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Determine next sort_order
  const { data: maxRow } = await supabase
    .from("widgets")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("widgets")
    .insert({
      name: name.trim(),
      code: (code as string) ?? "",
      secrets: encodeSecrets((secrets as Record<string, string>) ?? {}),
      size: size ?? "small",
      position: position ?? "sidebar",
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        ...data,
        secrets: decodeSecrets((data.secrets as Record<string, string>) ?? {}),
      },
    },
    { status: 201 },
  );
}
