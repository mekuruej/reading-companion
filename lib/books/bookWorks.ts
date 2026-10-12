import type { SupabaseClient } from "@supabase/supabase-js";

export type BookWork = { id: string; title: string; author: string | null };
export type WorkEdition = {
  id: string; title: string | null; author: string | null; work_id: string | null;
  edition_format: string | null; edition_note: string | null;
  isbn13: string | null; asin: string | null; language_code: string | null;
};
export type BookWorkContext = { edition: WorkEdition; work: BookWork | null; editions: WorkEdition[] };
export const WORK_EDITION_COLUMNS = "id,title,author,work_id,edition_format,edition_note,isbn13,asin,language_code";

// Read-only: never creates works, copies, or teaching relationships.
// Unlinked editions return work:null and editions:[], not inferred matches.
export async function loadBookWork(db: SupabaseClient, bookId: string): Promise<BookWorkContext | null> {
  const { data: edition, error } = await db.from("books").select(WORK_EDITION_COLUMNS).eq("id", bookId).maybeSingle();
  if (error) throw error;
  if (!edition) return null;
  if (!edition.work_id) return { edition, work: null, editions: [] };
  const { data: work, error: workError } = await db.from("book_works").select("id,title,author").eq("id", edition.work_id).single();
  if (workError) throw workError;
  const editions: WorkEdition[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error: editionsError } = await db.from("books").select(WORK_EDITION_COLUMNS)
      .eq("work_id", edition.work_id).order("id").range(offset, offset + 199);
    if (editionsError) throw editionsError;
    editions.push(...(data ?? []));
    if (!data || data.length < 200) break;
  }
  return { edition, work, editions };
}
