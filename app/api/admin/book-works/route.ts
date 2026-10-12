import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canMaintainCatalog } from "@/lib/books/catalogMaintenance";
import { loadBookWork, WORK_EDITION_COLUMNS } from "@/lib/books/bookWorks";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function authorize(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Please sign in.", status: 401 };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { error: "Please sign in.", status: 401 };
  const profile = await db.from("profiles").select("role,is_super_teacher").eq("id", data.user.id).maybeSingle();
  if (profile.error) return { error: "Could not verify catalog access.", status: 500 };
  if (!canMaintainCatalog(profile.data)) return { error: "Catalog maintenance access required.", status: 403 };
  return { user: data.user };
}
function failure(error: unknown) {
  const code = (error as { code?: string })?.code;
  const migrationMissing = ["42P01", "42703", "PGRST202", "PGRST204", "PGRST205"].includes(code ?? "");
  const status = code === "40001" ? 409 : code === "P0002" ? 404 : code === "42501" ? 403 : ["22023", "23514", "23503"].includes(code ?? "") ? 400 : 500;
  return NextResponse.json({ error: migrationMissing ? "Work linkage is not available until its database migration is applied." : code === "40001" ? "This edition’s work link changed. Reload before confirming again." : status === 400 ? "Check the work and edition details, then try again." : "Could not complete the work-link request." }, { status: migrationMissing ? 503 : status });
}
export async function GET(request: Request) {
  try {
    const auth = await authorize(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const params = new URL(request.url).searchParams;
    const bookId = params.get("bookId");
    if (bookId !== null) {
      if (!uuid.test(bookId)) return NextResponse.json({ error: "Invalid edition." }, { status: 400 });
      const result = await loadBookWork(db, bookId);
      return NextResponse.json(result ?? { error: "Edition not found." }, { status: result ? 200 : 404, headers: { "Cache-Control": "no-store" } });
    }
    const kind = params.get("kind");
    if (kind !== "works" && kind !== "editions") return NextResponse.json({ error: "Choose a search type." }, { status: 400 });
    const q = (params.get("q") ?? "").trim().slice(0, 120);
    if (!q) return NextResponse.json({ items: [], more: false });
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const quoted = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const fields = kind === "works" ? ["title", "author"] : ["title", "author", "isbn13", "asin"];
    const { data, error } = await db.from(kind === "works" ? "book_works" : "books")
      .select(kind === "works" ? "id,title,author" : `${WORK_EDITION_COLUMNS},work:book_works(id,title,author)`)
      .or(fields.map(field => `${field}.ilike.${quoted}`).join(",")).order("title").order("id").limit(26);
    if (error) throw error;
    return NextResponse.json({ items: (data ?? []).slice(0, 25), more: (data?.length ?? 0) > 25 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const auth = await authorize(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.bookId !== "string" || !uuid.test(body.bookId) || body.confirmed !== true ||
        !(body.expectedWorkId === null || (typeof body.expectedWorkId === "string" && uuid.test(body.expectedWorkId))) ||
        !["create", "link", "unlink"].includes(body.action) ||
        (body.action === "link" ? typeof body.workId !== "string" || !uuid.test(body.workId) : body.workId != null) ||
        (body.action === "create" && (body.expectedWorkId !== null || typeof body.title !== "string" || !body.title.trim() || body.title.length > 500 || (body.author != null && (typeof body.author !== "string" || body.author.length > 500))))) {
      return NextResponse.json({ error: "Choose an edition and explicitly confirm the work-link change." }, { status: 400 });
    }
    const { data, error } = await db.rpc("maintain_book_work", {
      p_actor_id: auth.user.id, p_book_id: body.bookId, p_expected_work_id: body.expectedWorkId,
      p_action: body.action, p_confirmed: true, p_work_id: body.action === "link" ? body.workId : null,
      p_title: body.action === "create" ? body.title.trim() : null,
      p_author: body.action === "create" ? body.author?.trim() || null : null,
    });
    if (error) throw error;
    return NextResponse.json({ workId: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
