export const CATALOG_REVIEW_PAGE_SIZE = 25;
export const CATALOG_REVIEW_COLUMNS = "id,title,author,isbn13,asin,language_code,edition_format,cover_url,publisher,published_date,page_count,kindle_location_count,audiobook_duration_minutes,narrator,created_at";
export function pendingCatalogReview(query: any) {
  return query.eq("reader_created", true).is("catalog_reviewed_at", null);
}
export function missingCatalogEnrichment(book: Record<string, any>): string[] {
  const missing = ["author", "publisher", "cover_url", "published_date"].filter(key => !String(book[key] ?? "").trim())
    .map(key => ({ cover_url: "cover", published_date: "publication date" }[key] ?? key));
  if (book.edition_format === "audiobook") {
    if (!(book.audiobook_duration_minutes > 0)) missing.push("audio duration");
    if (!String(book.narrator ?? "").trim()) missing.push("narrator");
  } else if (book.edition_format === "ebook") {
    if (!(book.page_count > 0) && !(book.kindle_location_count > 0)) missing.push("page or Kindle location count");
  } else if (!(book.page_count > 0)) missing.push("page count");
  return missing;
}
