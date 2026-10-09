import type { SupabaseClient } from "@supabase/supabase-js";

export type SnapshotWord = { id: string; surface: string | null; meaning: string | null; reading: string | null };
type ReviewEvidence = { user_book_word_id: string | null };
type LibraryEvidence = { study_identity_key: string; last_studied_at: string | null };

function identity(surface: string | null, reading: string | null) {
  // Same word identity as Library Review; do not apply input-answer normalization.
  const kana = (reading ?? "").trim().replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)).toLowerCase();
  return `${(surface ?? "").trim().replace(/\s+/g, " ").toLowerCase()}||${kana}`;
}

export function countReviewedBookWords(words: SnapshotWord[], events: ReviewEvidence[], progress: LibraryEvidence[]) {
  const reviewedIds = new Set(events.map(event => event.user_book_word_id).filter(Boolean));
  const studiedIdentities = new Set(progress.filter(row => row.last_studied_at).map(row => row.study_identity_key));
  const reviewedWords = new Set<string>();
  for (const word of words) {
    const surface = (word.surface ?? "").trim();
    const meaning = (word.meaning ?? "").trim();
    if (!surface && !meaning) continue;
    if (reviewedIds.has(word.id) || (surface && studiedIdentities.has(identity(word.surface, word.reading)))) {
      // Match the existing Saved Words count: unique surface + meaning, not encounter rows.
      reviewedWords.add(`${surface}|||${meaning}`);
    }
  }
  return reviewedWords.size;
}

// Page through evidence so the API row cap cannot silently undercount a long history.
async function allRows<T>(queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await queryPage(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export async function loadReviewedBookWordCount(client: SupabaseClient, userBookId: string, ownerId: string) {
  const words = await allRows<SnapshotWord>((from, to) => client.from("user_book_words")
    .select("id, surface, meaning, reading").eq("user_book_id", userBookId).order("id").range(from, to));
  if (!words.length) return 0;
  const [events, legacyEvents, progress] = await Promise.all([
    allRows<ReviewEvidence>((from, to) => client.from("user_study_events")
      .select("user_book_word_id").eq("user_id", ownerId).eq("user_book_id", userBookId)
      .in("result", ["reviewed", "correct", "incorrect"]).order("id").range(from, to)),
    allRows<ReviewEvidence>((from, to) => client.from("study_logs")
      .select("user_book_word_id").eq("user_id", ownerId).eq("user_book_id", userBookId)
      .in("result", ["revealed", "correct", "wrong"]).order("id").range(from, to)),
    allRows<LibraryEvidence>((from, to) => client.from("user_library_word_progress")
      .select("study_identity_key, last_studied_at").eq("user_id", ownerId)
      .not("last_studied_at", "is", null).order("id").range(from, to)),
  ]);
  return countReviewedBookWords(words, [...events, ...legacyEvents], progress);
}

export function readingTimeLabel(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ""}` : `${rounded} min`;
}
