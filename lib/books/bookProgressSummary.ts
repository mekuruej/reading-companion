import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAudioTime, formatProgressPosition, progressSummary, type ProgressRecord, type ProgressTotals, type ProgressTrackingMethod } from "./readingProgress";

export type SummaryWord = { surface: string | null; meaning: string | null; page_number: number | null; chapter_number: number | null; chapter_name: string | null; created_at: string | null };
export type BookProgressSummaryData = {
  sessions: (ProgressRecord & { ending_phrase?: string | null })[];
  words: SummaryWord[];
  currentLocation: string | null;
  formatType?: string | null;
};
async function collect<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const result = await query(start, start + 499);
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) return rows;
  }
}
export async function loadBookProgressSummary(client: SupabaseClient, userBookId: string): Promise<BookProgressSummaryData> {
  const [sessions, words, copy] = await Promise.all([
    collect<BookProgressSummaryData["sessions"][number]>((start, end) => client.from("user_book_reading_sessions")
      .select("*").eq("user_book_id", userBookId).order("read_on", { ascending: false }).order("created_at", { ascending: false }).order("id").range(start, end)),
    collect<SummaryWord>((start, end) => client.from("user_book_words")
      .select("surface, meaning, page_number, chapter_number, chapter_name, created_at").eq("user_book_id", userBookId)
      .order("created_at", { ascending: false }).order("id").range(start, end)),
    client.from("user_books").select("current_location, format_type").eq("id", userBookId).single(),
  ]);
  if (copy.error) throw copy.error;
  return { sessions, words, currentLocation: copy.data.current_location, formatType: copy.data.format_type };
}
export function summarizeBookProgress(data: BookProgressSummaryData, method: ProgressTrackingMethod | null, totals: ProgressTotals, showVocabulary = true, listening = false) {
  const progress = progressSummary(data.sessions, method, totals);
  const sessions = data.sessions.filter(session => !session.is_filler);
  const minutes = Math.round(sessions.reduce((sum, session) => sum + Math.max(0, session.minutes_read ?? 0), 0));
  const time = minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes}m`;
  const dated = [...sessions].filter(session => session.read_on).sort((a, b) => String(b.read_on).localeCompare(String(a.read_on)) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  const last = dated[0];
  const words = data.words.filter(word => word.surface?.trim() || word.meaning?.trim());
  const count = new Set(words.map(word => `${word.surface?.trim() ?? ""}|||${word.meaning?.trim() ?? ""}`)).size;
  const newest = [...words].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0];
  const chapter = [...words].filter(word => word.chapter_number != null || word.chapter_name?.trim()).sort((a, b) =>
    (b.chapter_number ?? -Infinity) - (a.chapter_number ?? -Infinity) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0];
  const position = progress.position ?? (method === "page" && showVocabulary ? newest?.page_number ?? null : null);
  let positionLabel = position != null ? formatProgressPosition(position, method) : "";
  if (method === "audiobook_time") {
    positionLabel = position != null
      ? `${formatAudioTime(position)}${progress.total ? ` / ${formatAudioTime(progress.total)}` : ""}${progress.percent != null ? ` (${Math.round(progress.percent)}%)` : ""}`
      : data.currentLocation?.trim() || "";
  } else if ((listening || data.formatType === "audiobook" || totals.edition_format === "audiobook") && data.currentLocation?.trim()) {
    positionLabel = data.currentLocation.trim();
  }
  return {
    progressSummaryLabel: [
      time, showVocabulary ? `${count} saved word${count === 1 ? "" : "s"}` : null,
      last ? `Last ${last.session_mode === "listening" ? "listened" : "read"} ${last.read_on}` : null,
    ].filter(Boolean).join(" · "),
    lastSavedWordLabel: showVocabulary ? newest?.surface?.trim() || newest?.meaning?.trim() || "" : "",
    lastChapterLabel: showVocabulary ? chapter?.chapter_name?.trim() || (chapter?.chapter_number != null ? `Chapter ${chapter.chapter_number}` : "") : "",
    lastPageLabel: positionLabel,
    lastReadPhrase: dated.find(session => session.session_mode !== "listening" && session.ending_phrase?.trim())?.ending_phrase ?? undefined,
  };
}
