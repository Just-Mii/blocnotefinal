import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import JSZip from "jszip";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const date = new Date().toISOString().slice(0, 10);

  // ── notes-json ────────────────────────────────────────────────
  if (type === "notes-json") {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="notes-${date}.json"`,
      },
    });
  }

  // ── notes-zip ─────────────────────────────────────────────────
  if (type === "notes-zip") {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, type, date, hour, created_at, updated_at")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const zip = new JSZip();
    const folder = zip.folder("notes")!;

    for (const note of data ?? []) {
      const safeName = (note.title || "sans-titre")
        .replace(/[^\w\s-]/gi, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      const filename = `${safeName}-${note.id.slice(0, 8)}.md`;

      const frontmatter = [
        "---",
        `id: ${note.id}`,
        `title: "${(note.title || "").replace(/"/g, '\\"')}"`,
        `type: ${note.type}`,
        note.date ? `date: ${note.date}` : null,
        note.hour !== null ? `hour: ${note.hour}` : null,
        `created_at: ${note.created_at}`,
        `updated_at: ${note.updated_at}`,
        "---",
        "",
        `# ${note.title || "Sans titre"}`,
        "",
        note.content || "",
      ]
        .filter((l) => l !== null)
        .join("\n");

      folder.file(filename, frontmatter);
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const uint8 = new Uint8Array(buffer);

    return new Response(uint8, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="notes-${date}.zip"`,
      },
    });
  }

  // ── journal-json ──────────────────────────────────────────────
  if (type === "journal-json") {
    const { data, error } = await supabase
      .from("daily_journal")
      .select("*")
      .order("date", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="journal-${date}.json"`,
      },
    });
  }

  return NextResponse.json(
    {
      error:
        "Type invalide. Valeurs acceptées : notes-json, notes-zip, journal-json",
    },
    { status: 400 },
  );
}
