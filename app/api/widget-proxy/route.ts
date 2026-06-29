import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { decodeSecrets } from "@/lib/widget-secrets";

const PROXY_TIMEOUT_MS = 10_000;

/**
 * POST /api/widget-proxy
 *
 * Body: { widgetId: string, url: string, options?: RequestInit }
 *
 * Fetches the widget's secrets from the DB, replaces `SECRET:KEY_NAME`
 * placeholders in the URL and request options with their real values,
 * then proxies the HTTP request server-side to avoid CORS and keep
 * secrets out of the browser.
 */
export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { widgetId?: string; url?: string; options?: RequestInit };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { widgetId, url, options } = body;

  if (!widgetId || !url) {
    return NextResponse.json(
      { error: "widgetId and url are required" },
      { status: 400 },
    );
  }

  // Validate URL shape early
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Load widget secrets from DB
  const { data: widget, error: dbError } = await supabase
    .from("widgets")
    .select("secrets")
    .eq("id", widgetId)
    .single();

  if (dbError || !widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  const secrets = decodeSecrets(
    (widget.secrets as Record<string, string>) ?? {},
  );

  // Replace SECRET:KEY_NAME placeholders in URL and serialised options
  let resolvedUrl = url;
  let resolvedOptStr = JSON.stringify(options ?? {});

  for (const [key, value] of Object.entries(secrets)) {
    const placeholder = `SECRET:${key}`;
    resolvedUrl = resolvedUrl.split(placeholder).join(value);
    resolvedOptStr = resolvedOptStr.split(placeholder).join(value);
  }

  const fetchOptions = JSON.parse(resolvedOptStr) as RequestInit;

  // Remove headers that would break the proxy
  const headers = new Headers(
    (fetchOptions.headers as HeadersInit | undefined) ?? {},
  );
  headers.delete("host");

  // Execute the proxied request with a timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(resolvedUrl, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = upstream.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const json = await upstream.json();
      return NextResponse.json(json, { status: upstream.status });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType || "text/plain" },
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Upstream request timed out" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: `Fetch failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
