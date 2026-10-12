import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StudentContextError, validateStudentToolContext } from "@/lib/teacher/studentToolContext";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// Only vocabulary fields used by Save Words. Identity always comes from validated context.
const fields = new Set("hidden seen_on skipped_on flagged_for_review flagged_by_user_id flagged_at vocabulary_cache_id surface alternative_surface base_form encountered_surface lookup_surface target_language_code support_language_code item_type reading meaning other_definition meaning_choices meaning_choice_index jlpt is_common position_unit position_value percent_location page_number page_order chapter_number chapter_name hide_kanji_in_reading_support excluded_from_flashcards book_form book_form_description follow_along_support_note".split(" "));
async function write(req: Request) {
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const auth = await db.auth.getUser(token);
    if (auth.error || !auth.data.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const body = await req.json();
    if (!body.context?.sourceUserBookId) throw new StudentContextError("Source book is required.", 400);
    const target = await validateStudentToolContext(db, auth.data.user.id, body.context);
    if (body.payload?.user_book_id && body.payload.user_book_id !== target.studentUserBookId) throw new StudentContextError("Vocabulary target mismatch.");
    const payload = Object.fromEntries(Object.entries(body.payload ?? {}).filter(([key]) => fields.has(key)));
    if ("flagged_by_user_id" in payload) payload.flagged_by_user_id = auth.data.user.id;
    const query = req.method === "DELETE" ? db.from("user_book_words").delete().eq("id", body.id).eq("user_book_id", target.studentUserBookId)
      : body.id ? db.from("user_book_words").update(payload).eq("id", body.id).eq("user_book_id", target.studentUserBookId)
      : db.from("user_book_words").insert({ ...payload, user_book_id: target.studentUserBookId });
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vocabulary write failed." },
      { status: error instanceof StudentContextError ? error.status : 400 });
  }
}
export const POST = write;
export const DELETE = write;
