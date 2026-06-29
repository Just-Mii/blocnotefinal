import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { encodeSecrets, decodeSecrets } from "@/lib/widget-secrets";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/widgets/[id] ────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("widgets")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...data,
      secrets: decodeSecrets((data.secrets as Record<string, string>) ?? {}),
    },
  });
}

// ─── PUT /api/widgets/[id] ────────────────────────────────────────────────────
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    code,
    secrets,
    storage,
    size,
    position,
    is_active,
    sort_order,
  } = body as {
    name?: string;
    code?: string;
    secrets?: Record<string, string>;
    storage?: Record<string, unknown>;
    size?: "small" | "medium" | "large";
    position?: "sidebar" | "float" | "page";
    is_active?: boolean;
    sort_order?: number;
  };

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name.trim();
  if (code !== undefined) patch.code = code;
  if (secrets !== undefined) patch.secrets = encodeSecrets(secrets);
  if (storage !== undefined) patch.storage = storage;
  if (size !== undefined) patch.size = size;
  if (position !== undefined) patch.position = position;
  if (is_active !== undefined) patch.is_active = is_active;
  if (sort_order !== undefined) patch.sort_order = sort_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("widgets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Widget not found" },
      { status: error ? 500 : 404 },
    );
  }

  return NextResponse.json({
    data: {
      ...data,
      secrets: decodeSecrets((data.secrets as Record<string, string>) ?? {}),
    },
  });
}

// ─── DELETE /api/widgets/[id] ─────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase.from("widgets").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
