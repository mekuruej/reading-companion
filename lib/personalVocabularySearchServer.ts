import { personalVocabularyEntryKey, type PersonalVocabularyMatch } from "./personalVocabularySearch";
import { wordPosition, type WordPositionRecord } from "./vocabulary/wordPosition";

const PERSONAL_SEARCH_FIELDS = ["surface", "reading", "alternative_surface"] as const;
const PERSONAL_SEARCH_RESULT_LIMIT = 20;
export const OCCURRENCE_PAGE_SIZE = 500;
export const MAX_OCCURRENCE_PAGES = 20;
const CONTENT_FIELDS = "id, surface, reading, meaning, alternative_surface, created_at";

type SearchRow = WordPositionRecord & {
  id: string;
  surface?: string | null;
  reading?: string | null;
  meaning?: string | null;
  alternative_surface?: string | null;
  created_at?: string | null;
  chapter_number?: number | null;
  chapter_name?: string | null;
};
type QueryResult = { data: SearchRow[] | null; error: unknown; count?: number | null };
type SearchQuery = PromiseLike<QueryResult> & {
  eq(column: string, value: string): SearchQuery;
  ilike(column: string, pattern: string): SearchQuery;
  order(column: string, options: { ascending: boolean; nullsFirst?: boolean }): SearchQuery;
  limit(count: number): SearchQuery;
  range(from: number, to: number): SearchQuery;
};
type SearchClient = { from(table: string): { select(columns: string, options?: {count: "exact"}): SearchQuery } };
const toEntry = (row: SearchRow): PersonalVocabularyMatch => ({
  surface: row.surface ?? "", reading: row.reading ?? "", meaning: row.meaning ?? "",
  alternativeSurface: row.alternative_surface ?? "",
});
const rowKey = (row: SearchRow) => personalVocabularyEntryKey(toEntry(row));
function ilikePattern(query: string) { return `%${query.replace(/[\\%_]/g, "\\$&")}%`; }

/** Only vocabulary-record locations are used; no book-progress or page-order inference. */
export function previousSavedLocation(row: SearchRow): string | null {
  const position = wordPosition(row);
  const value = position.value;
  let location: string | null = null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    if (position.unit === "page" && Number.isSafeInteger(value)) location = `on page ${value}`;
    if (position.unit === "kindle_location" && Number.isSafeInteger(value)) location = `at Kindle location ${value}`;
    if (position.unit === "percent" && value <= 100) location = `at ${value}%`;
  }
  const chapterName = row.chapter_name?.trim() ?? "";
  const chapter = row.chapter_number != null && Number.isFinite(row.chapter_number)
    ? `Chapter ${row.chapter_number}${chapterName ? `: ${chapterName}` : ""}`
    : chapterName;
  if (location) return `Previously saved ${location}${chapter ? ` (${chapter})` : ""}`;
  return chapter ? `Previously saved in ${chapter}` : null;
}

/**
 * Recent suggestions alone cannot establish oldest history. Walk finalized rows in
 * chronological order, stopping as soon as every requested content identity is found.
 * The explicit budget fails closed instead of substituting a recent occurrence.
 */
async function oldestLocations(client: SearchClient, ownerId: string, userBookId: string, keys: Set<string>) {
  const found = new Map<string, string | null>();
  const seenIds = new Set<string>();
  let expectedCount: number | null = null;
  for (let page = 0; page < MAX_OCCURRENCE_PAGES; page += 1) {
    const from = page * OCCURRENCE_PAGE_SIZE;
    const result = await client.from("finalized_user_book_words")
      .select(`${CONTENT_FIELDS}, position_unit, position_value, page_number, percent_location, chapter_number, chapter_name, user_books!inner(user_id)`, {count: "exact"})
      .eq("user_book_id", userBookId).eq("user_books.user_id", ownerId)
      .order("created_at", {ascending: true, nullsFirst: false}).order("id", {ascending: true})
      .range(from, from + OCCURRENCE_PAGE_SIZE - 1);
    if (result.error) throw result.error;
    if (!Number.isSafeInteger(result.count) || result.count == null || result.count < 0) throw new Error("Could not verify saved occurrence history.");
    if (expectedCount !== null && expectedCount !== result.count) throw new Error("Saved vocabulary changed while loading history. Try again.");
    expectedCount = result.count;
    const rows = result.data ?? [];
    if (rows.length !== Math.min(OCCURRENCE_PAGE_SIZE, Math.max(0, expectedCount - from))) throw new Error("Incomplete saved occurrence history.");
    for (const row of rows) {
      if (!row.id || seenIds.has(row.id)) throw new Error("Could not verify saved occurrence ordering.");
      seenIds.add(row.id);
      const key = rowKey(row);
      if (keys.has(key) && !found.has(key)) {
        if (!row.created_at || !Number.isFinite(Date.parse(row.created_at))) throw new Error("Saved occurrence has no reliable timestamp.");
        found.set(key, previousSavedLocation(row));
      }
    }
    if (found.size === keys.size) return found;
    if (from + rows.length >= expectedCount) break;
  }
  throw new Error("Could not establish the oldest saved occurrence within the history limit. Try a more specific search.");
}

/** Every query is restricted to the authenticated owner's selected book, including hidden rows. */
export async function searchOwnedFinalizedVocabulary(client: unknown, ownerId: string, userBookId: string, query: string, includePreviousLocation = false) {
  const db = client as SearchClient;
  const pattern = ilikePattern(query.trim());
  const results = await Promise.all(PERSONAL_SEARCH_FIELDS.map(async field => {
    const {data, error} = await db.from("finalized_user_book_words")
      .select(`${CONTENT_FIELDS}, user_books!inner(user_id)`)
      .eq("user_book_id", userBookId).eq("user_books.user_id", ownerId).ilike(field, pattern)
      .order("created_at", {ascending: false}).order("id", {ascending: true}).limit(PERSONAL_SEARCH_RESULT_LIMIT);
    if (error) throw error;
    return data ?? [];
  }));
  const unique = new Map<string, SearchRow>();
  for (const row of results.flat().sort((a,b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || a.id.localeCompare(b.id))) {
    const key = rowKey(row); if (!unique.has(key)) unique.set(key, row);
  }
  const rows = [...unique.values()].slice(0, PERSONAL_SEARCH_RESULT_LIMIT);
  const locations = includePreviousLocation && rows.length
    ? await oldestLocations(db, ownerId, userBookId, new Set(rows.map(rowKey))) : null;
  return rows.map(row => ({...toEntry(row), ...(locations ? {previousLocation: locations.get(rowKey(row)) ?? null} : {})}));
}
