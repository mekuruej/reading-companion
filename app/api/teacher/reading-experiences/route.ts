import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isExperienceTeacher, isUuid, validateAssessment, validateExperience, type BookAssessment } from "@/lib/teacher/readingExperiences";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const assessmentFields = "assessed_at, teacher_jlpt_difficulty, teaching_suitability, teacher_use_status, teacher_use_note";
const experienceFields = "id, teacher_id, book_id, person_id, experienced_on, context, notes, reader_level, level_fit, created_at, person:profiles!person_id(id, display_name, username)";
const PAGE_SIZE = 30;
class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }
async function actor(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new RequestError("Please sign in.", 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new RequestError("Please sign in.", 401);
  const { data: profile, error: profileError } = await db.from("profiles").select("role, is_super_teacher").eq("id", data.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!isExperienceTeacher(profile)) throw new RequestError("Teacher access is required.", 403);
  return data.user.id;
}
function failure(error: unknown) {
  if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Reading Experiences failed:", error);
  return NextResponse.json({ error: "Could not load or save Reading Experiences. Please try again." }, { status: 500 });
}
async function requireBook(bookId: unknown) {
  if (!isUuid(bookId)) throw new RequestError("Choose a valid book.", 400);
  const { data, error } = await db.from("books").select("id, title").eq("id", bookId).maybeSingle();
  if (error) throw error;
  if (!data) throw new RequestError("Book not found.", 404);
  return data;
}
export async function GET(request: Request) {
  try {
    const teacherId = await actor(request);
    const params = new URL(request.url).searchParams;
    const book = await requireBook(params.get("bookId"));
    if (params.has("username") || params.has("personId")) {
      const personId = params.get("personId");
      let query = db.from("profiles").select("id, display_name, username");
      if (personId) {
        if (!isUuid(personId)) throw new RequestError("Choose a valid person.", 400);
        // UUID shortcuts are for already connected students or this teacher's saved experiences.
        // Other users are resolved by exact username without disclosing a user directory.
        const [link, experience] = await Promise.all([
          db.from("teacher_students").select("student_id").eq("teacher_id", teacherId).eq("student_id", personId).limit(1),
          db.from("book_reading_experiences").select("id").eq("teacher_id", teacherId).eq("person_id", personId).limit(1),
        ]);
        if (link.error) throw link.error;
        // The shortcut still works while the additive experience migration is pending.
        if (!link.data?.length && experience.error) throw experience.error;
        if (!link.data?.length && !experience.data?.length) throw new RequestError("Find this person by their MEKURU username.", 403);
        query = query.eq("id", personId);
      } else {
        const username = (params.get("username") ?? "").trim().replace(/^@/, "");
        if (!username || username.length > 120) throw new RequestError("Enter a MEKURU username.", 400);
        query = query.eq("username", username);
      }
      const { data: person, error } = await query.maybeSingle();
      if (error) throw error;
      if (!person) throw new RequestError("No user found. Check the exact MEKURU username.", 404);
      return NextResponse.json({ person });
    }
    const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0));
    if (!Number.isSafeInteger(offset)) throw new RequestError("Invalid history offset.", 400);
    const [assessment, experiences, copy] = await Promise.all([
      db.from("teacher_books").select(assessmentFields).eq("teacher_id", teacherId).eq("book_id", book.id).maybeSingle(),
      db.from("book_reading_experiences").select(experienceFields).eq("teacher_id", teacherId).eq("book_id", book.id)
        .order("experienced_on", { ascending: false }).order("created_at", { ascending: false }).order("id").range(offset, offset + PAGE_SIZE),
      db.from("user_books").select("id").eq("user_id", teacherId).eq("book_id", book.id).order("created_at").limit(1).maybeSingle(),
    ]);
    if (assessment.error) throw assessment.error;
    if (copy.error) throw copy.error;
    if (experiences.error) console.error("Reading experience history failed:", experiences.error);
    // Assessment remains usable if the new migration hasn't been applied yet.
    return NextResponse.json({
      book, teacherId, userBookId: copy.data?.id ?? null, assessment: assessment.data,
      experiences: experiences.error ? [] : experiences.data?.slice(0, PAGE_SIZE) ?? [],
      experienceError: experiences.error ? "Could not load your reading experiences. Please try again." : null,
      hasMore: !experiences.error && (experiences.data?.length ?? 0) > PAGE_SIZE,
    });
  } catch (error) { return failure(error); }
}

async function save(request: Request, editing: boolean) {
  try {
    const teacherId = await actor(request);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError("Invalid request.", 400);
    const book = await requireBook(body.bookId);
    if (body.kind === "assessment" && !editing) {
      const assessment: BookAssessment = {
        teacher_jlpt_difficulty: body.assessment?.teacher_jlpt_difficulty ?? null,
        teaching_suitability: body.assessment?.teaching_suitability ?? null,
        teacher_use_status: body.assessment?.teacher_use_status ?? null,
        teacher_use_note: body.assessment?.teacher_use_note ?? null,
      };
      const invalid = validateAssessment(assessment);
      if (invalid) throw new RequestError(invalid, 400);
      // Compatibility adapter: update only assessment fields, preserving prep links/workflow status.
      const { data, error } = await db.from("teacher_books").upsert({
        teacher_id: teacherId, book_id: book.id, ...assessment, assessed_at: new Date().toISOString(),
        teacher_use_note: assessment.teacher_use_note?.trim() || null,
      }, { onConflict: "teacher_id,book_id" }).select(assessmentFields).single();
      if (error) throw error;
      return NextResponse.json({ assessment: data });
    }
    if (body.kind !== "experience") throw new RequestError("Unknown action.", 400);
    const invalid = validateExperience(body);
    if (invalid) throw new RequestError(invalid, 400);
    const { data: person, error: personError } = await db.from("profiles").select("id").eq("id", body.person_id).maybeSingle();
    if (personError) throw personError;
    if (!person) throw new RequestError("This person is no longer available.", 400);
    // No teacher_students requirement: selecting a person grants no student/workspace access.
    const payload = { person_id: body.person_id, experienced_on: body.experienced_on, context: body.context || null, reader_level: body.reader_level ?? null, level_fit: body.level_fit ?? null, notes: body.notes.trim(), updated_at: new Date().toISOString() };
    if (editing && !isUuid(body.id)) throw new RequestError("Choose a valid experience.", 400);
    const query = editing
      ? db.from("book_reading_experiences").update(payload).eq("id", body.id).eq("teacher_id", teacherId).eq("book_id", book.id)
      : db.from("book_reading_experiences").insert({ ...payload, teacher_id: teacherId, book_id: book.id });
    const { data, error } = await query.select(experienceFields).maybeSingle();
    if (error) throw error;
    if (!data) throw new RequestError("Experience not found.", 404);
    return NextResponse.json({ experience: data });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    return failure(error);
  }
}
export async function POST(request: Request) { return save(request, false); }
export async function PATCH(request: Request) { return save(request, true); }
