import { EDITION_FORMAT_OPTIONS } from "./bookMetadata";

export type EditionDisplayFields = {
  edition_format?: string | null;
  edition_note?: string | null;
  page_count?: number | null;
  isbn13?: string | null;
  isbn?: string | null;
};

// Display stored catalog facts only. Never derive an edition from a title, ISBN,
// reading preference, progress method, or another person's copy.
export function formatEditionLabel(book: EditionDisplayFields | null | undefined): string | null {
  if (!book) return null;
  const format = EDITION_FORMAT_OPTIONS.find(option => option.value === book.edition_format)?.label;
  const pages = book.edition_format !== "audiobook" && typeof book.page_count === "number" &&
    Number.isInteger(book.page_count) && book.page_count > 0 ? `${book.page_count} pages` : null;
  return [format, pages].filter(Boolean).join(" · ") || null;
}
