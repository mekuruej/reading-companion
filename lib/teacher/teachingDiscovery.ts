export type DiscoveryBook = {
  id: string; title: string | null; author: string | null; cover_url: string | null;
  book_type: string | null; isbn13: string | null; language_code: string | null;
};
export type DiscoveryAssessment = {
  teacher_jlpt_difficulty: string | null; teaching_suitability: string | null;
  teacher_use_status: string | null; assessed_at?: string | null;
};
export type DiscoveryEntry = { book: DiscoveryBook; assessments: DiscoveryAssessment[] };
export function hasOverallTeachingAssessment(value: (DiscoveryAssessment & { teacher_use_note?: string | null }) | null | undefined) {
  return !!value && !!(value.assessed_at || value.teacher_jlpt_difficulty || value.teaching_suitability ||
    value.teacher_use_note?.trim() ||
    (value.teacher_use_status && !["want_to_test", "testing", "currently_using"].includes(value.teacher_use_status)));
}
export function buildTeachingDiscovery(rows: (DiscoveryAssessment & { books: DiscoveryBook | DiscoveryBook[] | null })[]) {
  const grouped = new Map<string, DiscoveryEntry>();
  for (const row of rows) {
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    if (!book || !hasOverallTeachingAssessment(row)) continue;
    const entry = grouped.get(book.id) ?? { book, assessments: [] };
    // Explicit projection: never pass private notes, teacher IDs or arbitrary row fields to search.
    entry.assessments.push({
      teacher_jlpt_difficulty: row.teacher_jlpt_difficulty, teaching_suitability: row.teaching_suitability,
      teacher_use_status: row.teacher_use_status,
    });
    grouped.set(book.id, entry);
  }
  return [...grouped.values()].sort((a, b) => (a.book.title ?? "").localeCompare(b.book.title ?? ""));
}
export function needsMyAssessment(
  library: { book_id: string; personal_tracking_status: string | null; books: DiscoveryBook | DiscoveryBook[] | null }[],
  assessments: (DiscoveryAssessment & { book_id: string; teacher_use_note?: string | null })[],
) {
  const completed = new Set(assessments.filter(hasOverallTeachingAssessment).map(row => row.book_id));
  const books = new Map<string, DiscoveryBook>();
  for (const row of library) {
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    if (book && ["ja", "jpn"].includes(book.language_code ?? "") &&
      row.personal_tracking_status !== "not_tracking" && !completed.has(row.book_id)) books.set(book.id, book);
  }
  return [...books.values()].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
}
export function matchesTeachingDiscovery(entry: DiscoveryEntry, filters: { query: string; difficulty: string; suitability: string; status: string; format: string }) {
  if (filters.format !== "all" && entry.book.book_type !== filters.format) return false;
  const text = [entry.book.title, entry.book.author, entry.book.isbn13].join(" ").toLowerCase();
  if (!text.includes(filters.query.trim().toLowerCase())) return false;
  return entry.assessments.some(row =>
    (filters.difficulty === "all" || row.teacher_jlpt_difficulty === filters.difficulty) &&
    (filters.suitability === "all" || row.teaching_suitability === filters.suitability) &&
    (filters.status === "all" || (filters.status === "none" ? !row.teacher_use_status : row.teacher_use_status === filters.status)));
}
