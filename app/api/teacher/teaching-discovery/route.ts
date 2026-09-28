import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isExperienceTeacher } from "@/lib/teacher/readingExperiences";
import { buildTeachingDiscovery, needsMyAssessment, type DiscoveryBook, type DiscoveryAssessment } from "@/lib/teacher/teachingDiscovery";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const bookFields = "id, title, author, cover_url, book_type, isbn13, language_code";
const assessmentFields = "teacher_jlpt_difficulty, teaching_suitability, teacher_use_status, assessed_at";
async function collect<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const result = await query(start, start + 499);
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) return rows;
  }
}
export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: auth, error } = await db.auth.getUser(token);
    if (error || !auth.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: actor, error: actorError } = await db.from("profiles").select("role, is_super_teacher").eq("id", auth.user.id).maybeSingle();
    if (actorError) throw actorError;
    if (!isExperienceTeacher(actor)) return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });
    const [shared, ownAssessments, library] = await Promise.all([
      // Deliberately independent of user_books and the requesting teacher.
      // Only structured book-level contributions are shared. No private free text or people.
      collect<DiscoveryAssessment & { books: DiscoveryBook | DiscoveryBook[] | null }>((start, end) =>
        db.from("teacher_books").select(`${assessmentFields}, books:book_id!inner(${bookFields})`)
          .in("books.language_code", ["ja", "jpn"]).order("id").range(start, end)),
      collect<DiscoveryAssessment & { book_id: string; teacher_use_note: string | null }>((start, end) =>
        db.from("teacher_books").select(`book_id, ${assessmentFields}, teacher_use_note`)
          .eq("teacher_id", auth.user!.id).order("id").range(start, end)),
      collect<{ book_id: string; personal_tracking_status: string | null; books: DiscoveryBook | DiscoveryBook[] | null }>((start, end) =>
        db.from("user_books").select(`book_id, personal_tracking_status, books:book_id!inner(${bookFields})`)
          .eq("user_id", auth.user!.id).in("books.language_code", ["ja", "jpn"]).order("id").range(start, end)),
    ]);
    return NextResponse.json({ results: buildTeachingDiscovery(shared), queue: needsMyAssessment(library, ownAssessments) });
  } catch (error) {
    console.error("Teaching discovery failed:", error);
    return NextResponse.json({ error: "Could not load teaching discovery. Please try again." }, { status: 500 });
  }
}
