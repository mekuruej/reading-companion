/** Catalog completeness accepts either unit; reading calculations still use only the reader's matching total. */
export function isValidProgressTotal(value: unknown): boolean {
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return false;
  const total = Number(value);
  return Number.isSafeInteger(total) && total > 0;
}

export function hasUsableProgressTotal(book: { page_count?: unknown; kindle_location_count?: unknown }): boolean {
  return isValidProgressTotal(book.page_count) || isValidProgressTotal(book.kindle_location_count);
}
