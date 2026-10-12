import type { SupabaseClient } from "@supabase/supabase-js";
import type { EditionDisplayFields } from "@/lib/books/editionDisplay";
import { StudentContextError, validateStudentToolContext } from "./studentToolContext";

export type TeachingEdition = EditionDisplayFields & { id: string; work_id: string | null; title: string | null; author: string | null; cover_url: string | null };
const editionFields = "id,title,author,cover_url,edition_format,edition_note,page_count,isbn13,isbn";
export async function loadTeachingEdition(db: SupabaseClient, bookId: string): Promise<TeachingEdition> {
  let result = await db.from("books").select(`${editionFields},work_id`).eq("id", bookId).maybeSingle();
  // Existing exact-edition lessons remain usable before Phase 1 is deployed.
  if (["42703", "PGRST204"].includes(result.error?.code ?? "")) {
    result = await db.from("books").select(editionFields).eq("id", bookId).maybeSingle() as typeof result;
  }
  if (result.error) throw result.error;
  if (!result.data) throw new StudentContextError("This edition could not be found.", 404);
  return { ...result.data, work_id: result.data.work_id ?? null };
}
export function compatibleTeachingEditions(source: { id: string; work_id?: string | null }, target: { id: string; work_id?: string | null }) {
  return source.id === target.id || Boolean(source.work_id && target.work_id && source.work_id === target.work_id);
}
export async function relatedTeachingBookIds(db: SupabaseClient, bookId: string) {
  const edition = await loadTeachingEdition(db, bookId);
  if (!edition.work_id) return [bookId];
  const ids: string[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await db.from("books").select("id").eq("work_id", edition.work_id).order("id").range(offset, offset + 199);
    if (error) throw error;
    ids.push(...(data ?? []).map(row => row.id));
    if (!data || data.length < 200) break;
  }
  return [...new Set([bookId, ...ids])];
}
export async function validateTeachingSourceContext(db: SupabaseClient, actorId: string, context: {
  studentId: string; userBookId: string; sourceUserBookId?: string;
}) {
  const target = await validateStudentToolContext(db, actorId, { studentId: context.studentId, userBookId: context.userBookId });
  if (!context.sourceUserBookId) return target;
  const { data: source, error } = await db.from("user_books").select("id,user_id,book_id").eq("id", context.sourceUserBookId).maybeSingle();
  if (error) throw error;
  if (!source || source.user_id !== actorId) throw new StudentContextError("The teaching source must be your own exact copy.");
  // Same-edition path needs no work lookup or new schema.
  if (source.book_id !== target.bookId) {
    const [sourceEdition, targetEdition] = await Promise.all([loadTeachingEdition(db, source.book_id), loadTeachingEdition(db, target.bookId)]);
    if (!compatibleTeachingEditions(sourceEdition, targetEdition)) throw new StudentContextError("Different editions need the same explicit work link before they can be used together.");
  }
  return target;
}
export async function discoverTeachingSources(db: SupabaseClient, actorId: string, studentId: string, targetUserBookId: string) {
  const target = await validateStudentToolContext(db, actorId, { studentId, userBookId: targetUserBookId });
  const targetEdition = await loadTeachingEdition(db, target.bookId);
  const ids = await relatedTeachingBookIds(db, target.bookId);
  const sources: { sourceUserBookId: string; edition: TeachingEdition }[] = [];
  for (let start = 0; start < ids.length; start += 200) {
    for (let offset = 0; ; offset += 200) {
      const { data, error } = await db.from("user_books").select("id,book_id").eq("user_id", actorId)
        .in("book_id", ids.slice(start, start + 200)).order("id").range(offset, offset + 199);
      if (error) throw error;
      for (const copy of data ?? []) sources.push({ sourceUserBookId: copy.id, edition: await loadTeachingEdition(db, copy.book_id) });
      if (!data || data.length < 200) break;
    }
  }
  return { target, targetEdition, sources };
}
