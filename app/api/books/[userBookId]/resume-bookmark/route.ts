import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { effectiveProgressMethod, matchingTotal } from "@/lib/books/readingProgress";
import { resolveResumeBookmark } from "@/lib/books/resumeBookmark.mjs";

const bookmarkColumns = "kind, page, phrase";
type ResumeBookmarkKind = "page" | "top" | "end" | "phrase";

function bookmarkResponse(body: unknown, options?: { status?: number }) {
  return NextResponse.json(body, { ...options, headers: { "Cache-Control": "private, no-store" } });
}

function missingBookmarkSchema(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

async function getOwner(req: Request, userBookId: string) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { response: bookmarkResponse({ error: "Sign in to view this bookmark." }, { status: 401 }) };

  // A per-request user client: database RLS applies even if an API ownership check
  // regresses. Never use the service-role key for private bookmark access.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await db.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return { response: bookmarkResponse({ error: "Your session is invalid." }, { status: 401 }) };

  const { data: book, error } = await db.from("user_books")
    .select("id, user_id, progress_tracking_method, books(page_count, edition_format)")
    .eq("id", userBookId).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!book || book.user_id !== user.id) {
    return { response: bookmarkResponse({ error: "This book could not be found." }, { status: 404 }) };
  }
  const bookDetails = Array.isArray(book.books) ? book.books[0] : book.books;
  return { db, user, book, bookDetails };
}

function responseForError(error: unknown, fallback: string) {
  // Permission errors and schema drift are failures, not "not installed".
  console.error(fallback, { code: (error as { code?: string })?.code });
  return bookmarkResponse({ error: fallback }, { status: 500 });
}

export async function GET(req: Request, context: { params: Promise<{ userBookId: string }> }) {
  try {
    const { userBookId } = await context.params;
    const owner = await getOwner(req, userBookId);
    if ("response" in owner) return owner.response;
    const { data, error } = await owner.db.from("user_book_resume_bookmarks")
      .select(bookmarkColumns).eq("user_book_id", userBookId).eq("user_id", owner.user.id).maybeSingle();
    if (error) {
      if (missingBookmarkSchema(error)) return bookmarkResponse({ available: false, bookmark: null });
      throw error;
    }
    const method = effectiveProgressMethod(owner.book.progress_tracking_method, owner.bookDetails ?? {});
    return bookmarkResponse({
      available: true, eligible: method === "page",
      pageCount: matchingTotal("page", owner.bookDetails ?? {}),
      bookmark: data ? { kind: data.kind, page: data.page, phrase: data.phrase } : null,
    });
  } catch (error) { return responseForError(error, "Could not load the resume bookmark."); }
}

export async function PUT(req: Request, context: { params: Promise<{ userBookId: string }> }) {
  try {
    const { userBookId } = await context.params;
    const owner = await getOwner(req, userBookId);
    if ("response" in owner) return owner.response;
    if (effectiveProgressMethod(owner.book.progress_tracking_method, owner.bookDetails ?? {}) !== "page") {
      return bookmarkResponse({ error: "Resume bookmarks are available only for page-tracked books." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind as ResumeBookmarkKind;
    if (kind !== "page" && kind !== "top" && kind !== "end" && kind !== "phrase") {
      return bookmarkResponse({ error: "Choose a valid resume position." }, { status: 400 });
    }
    const bookmark = resolveResumeBookmark(kind, body?.endingPage, matchingTotal("page", owner.bookDetails ?? {}), body?.phrase);
    if (!bookmark) return bookmarkResponse({ error: "Enter a valid ending page and, for a phrase bookmark, a short phrase." }, { status: 400 });

    // The reader ID is server-derived, never accepted from the request body.
    const { data, error } = await owner.db.from("user_book_resume_bookmarks")
      .upsert({ user_id: owner.user.id, user_book_id: userBookId, ...bookmark }, { onConflict: "user_id,user_book_id" })
      .select(bookmarkColumns).maybeSingle();
    if (error) {
      if (missingBookmarkSchema(error)) return bookmarkResponse({ available: false, error: "Resume bookmarks are not installed for this database." }, { status: 409 });
      throw error;
    }
    if (!data) return bookmarkResponse({ error: "Could not save the resume bookmark." }, { status: 409 });
    return bookmarkResponse({ available: true, bookmark: { kind: data.kind, page: data.page, phrase: data.phrase }, pageCount: matchingTotal("page", owner.bookDetails ?? {}) });
  } catch (error) { return responseForError(error, "Could not save the resume bookmark."); }
}
