import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isCanonicalEditionFormat } from "@/lib/books/bookMetadata";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function requireCatalogAdmin(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Please sign in.", status: 401 };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { error: "Please sign in again.", status: 401 };
  const profile = await db.from("profiles").select("role,is_super_teacher").eq("id", data.user.id).maybeSingle();
  if (profile.error) return { error: "Could not verify catalog access.", status: 500 };
  if (!["admin", "super_teacher"].includes(profile.data?.role ?? "") &&
      profile.data?.is_super_teacher !== true && profile.data?.is_super_teacher !== "true") {
    return { error: "Admin or Super-Teacher access is required.", status: 403 };
  }
  return { user: data.user };
}

export async function GET(request: Request) {
  const auth = await requireCatalogAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const items = [];
    let total = 0, valid = 0, missing = 0, legacy = 0;
    // Explicit paging avoids Supabase's default row limit hiding backlog items.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("books")
        .select("id,title,author,language_code,edition_format,edition_note,isbn13,asin,publisher,published_date,page_count,kindle_location_count,audiobook_duration_minutes,updated_at")
        .order("id").range(offset, offset + 499);
      if (error) throw error;
      for (const book of data ?? []) {
        total++;
        if (isCanonicalEditionFormat(book.edition_format)) { valid++; continue; }
        if (book.edition_format == null || !book.edition_format.trim()) missing++;
        else legacy++;
        items.push(book);
      }
      if (!data || data.length < 500) break;
    }
    items.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    return NextResponse.json({ items, counts: { total, valid, missing, legacy } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Format backlog load failed:", error);
    return NextResponse.json({ error: "Could not load the format backlog." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCatalogAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => null);
  const changes = body?.changes;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!Array.isArray(changes) || changes.length < 1 || changes.length > 100 ||
      changes.some(c => !c || typeof c.id !== "string" || !uuid.test(c.id) ||
        !isCanonicalEditionFormat(c.format) ||
        (c.previousFormat !== null && typeof c.previousFormat !== "string") ||
        isCanonicalEditionFormat(c.previousFormat) ||
        typeof c.updatedAt !== "string" || !c.updatedAt.trim()) ||
      new Set(changes.map(c => c.id)).size !== changes.length) {
    return NextResponse.json({ error: "Select up to 100 unresolved editions and choose a valid format for each." }, { status: 400 });
  }

  const saved: string[] = [];
  const failed: { id: string; message: string }[] = [];
  // Independent, explicit results: a failed row never hides successful saves.
  for (const change of changes) {
    try {
      let query = db.from("books").update({ edition_format: change.format })
        .eq("id", change.id).eq("updated_at", change.updatedAt);
      query = change.previousFormat === null
        ? query.is("edition_format", null)
        : query.eq("edition_format", change.previousFormat);
      const { data, error } = await query.select("id").maybeSingle();
      if (error) {
        console.error("Format correction failed:", { id: change.id, code: error.code, message: error.message });
        failed.push({ id: change.id, message: "Could not save this format. Your selection is kept; try again." });
      } else if (!data) {
        failed.push({ id: change.id, message: "This edition changed or was already corrected. Reload the queue before editing it." });
      } else saved.push(data.id);
    } catch {
      failed.push({ id: change.id, message: "Could not confirm this save. Reload the queue to check its current format." });
    }
  }
  return NextResponse.json({ saved, failed });
}
