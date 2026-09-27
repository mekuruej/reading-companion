/** Catalog completeness recognizes each progress total; calculations use only the matching unit. */
export function isValidProgressTotal(value: unknown): boolean {
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return false;
  const total = Number(value);
  return Number.isSafeInteger(total) && total > 0;
}

export function hasUsableProgressTotal(book: { page_count?: unknown; kindle_location_count?: unknown; audiobook_duration_minutes?: unknown; edition_format?: unknown }): boolean {
  if (book.edition_format === "audiobook") return isValidProgressTotal(book.audiobook_duration_minutes);
  return isValidProgressTotal(book.audiobook_duration_minutes) || isValidProgressTotal(book.page_count) || isValidProgressTotal(book.kindle_location_count);
}
