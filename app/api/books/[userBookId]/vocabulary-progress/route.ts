import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateStudentToolContext, StudentContextError } from "@/lib/teacher/studentToolContext";
import { effectiveProgressMethod, matchingTotal, parseProgressRange, progressSummary, type ProgressRecord } from "@/lib/books/readingProgress";
import { todayYmdAppTimeZone } from "@/lib/timeZone";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function load(req: Request, userBookId: string, context: { studentId?: string; sourceUserBookId?: string }) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new StudentContextError("Please sign in.", 401);
  const auth = await db.auth.getUser(token);
  if (auth.error || !auth.data.user) throw new StudentContextError("Please sign in.", 401);
  const copy = await db.from("user_books").select("id, user_id, progress_tracking_method, books:book_id(page_count, kindle_location_count, audiobook_duration_minutes, edition_format)").eq("id", userBookId).maybeSingle();
  if (copy.error) throw copy.error;
  if (!copy.data) throw new StudentContextError("Book not found.", 404);
  const self = copy.data.user_id === auth.data.user.id;
  let studentName: string | null = null;
  if (!self || context.studentId !== undefined || context.sourceUserBookId !== undefined) {
    const student = await validateStudentToolContext(db, auth.data.user.id, { studentId: context.studentId ?? copy.data.user_id, userBookId, sourceUserBookId: context.sourceUserBookId });
    studentName = student.studentName;
  }
  const book = (Array.isArray(copy.data.books) ? copy.data.books[0] : copy.data.books) ?? {};
  const method = effectiveProgressMethod(copy.data.progress_tracking_method, book);
  const sessions: ProgressRecord[] = [];
  for (let start = 0; ; start += 500) {
    const result = await db.from("user_book_reading_sessions").select("*").eq("user_book_id", userBookId).order("id").range(start, start + 499);
    if (result.error) throw result.error;
    sessions.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) break;
  }
  return { userBookId, studentName, method, total: matchingTotal(method, book), current: progressSummary(sessions, method, book).position };
}
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof StudentContextError ? error.message : "Could not update reading progress. Please try again." }, { status: error instanceof StudentContextError ? error.status : 500 });
}
export async function GET(req: Request, route: { params: Promise<{ userBookId: string }> }) {
  try {
    const q = new URL(req.url).searchParams;
    return NextResponse.json(await load(req, (await route.params).userBookId, {
      ...(q.has("studentId") ? { studentId: q.get("studentId")! } : {}),
      ...(q.has("sourceUserBookId") ? { sourceUserBookId: q.get("sourceUserBookId")! } : {}),
    }));
  } catch (error) { return failure(error); }
}
export async function POST(req: Request, route: { params: Promise<{ userBookId: string }> }) {
  try {
    const body = await req.json();
    if (body?.confirmed !== true) throw new StudentContextError("Confirm the stopping point before updating progress.", 400);
    const target = await load(req, (await route.params).userBookId, body);
    if (!target.method) throw new StudentContextError("Choose this copy's tracking method in the Book Hub first.", 409);
    if (body.method !== target.method) throw new StudentContextError("The tracking method changed. Reopen the progress question.", 409);
    const parsed = parseProgressRange("", String(body.value ?? ""), target.method, target.total);
    const value = parsed.payload.end_position;
    if (parsed.error || value == null) throw new StudentContextError(parsed.error ?? "Enter a stopping point.", 400);
    if (target.method !== "audiobook_time" && target.current != null && value < target.current) {
      throw new StudentContextError(`Current progress is already farther ahead (${target.current}). It has not been changed.`, 409);
    }
    if (value === target.current) return NextResponse.json({ saved: false, unchanged: true });
    // Same canonical position-only Reading History record used by existing progress controls.
    // No invented reading duration, start point, finish status, or vocabulary write.
    const { error } = await db.from("user_book_reading_sessions").insert({
      user_book_id: target.userBookId, read_on: todayYmdAppTimeZone(), ...parsed.payload,
      minutes_read: null, session_mode: target.method === "audiobook_time" ? "listening" : "curiosity",
    });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) { return failure(error); }
}
