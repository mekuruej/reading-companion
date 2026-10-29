import { COMMON_BOOK_LANGUAGE_OPTIONS, normalizeBookLanguageCode } from "./bookLanguage";
import { normalizeIsbn13 } from "./isbn";

export const READER_FORMAT_OPTIONS = [
  { value: "paperback", label: "Paperback / Softcover" },
  { value: "hardcover", label: "Hardcover" },
  { value: "ebook", label: "Ebook" },
  { value: "audiobook", label: "Audiobook" },
  { value: "other", label: "Other / Not sure" },
];
export const READER_LANGUAGE_OPTIONS = COMMON_BOOK_LANGUAGE_OPTIONS;
export function readerLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = normalizeBookLanguageCode(value);
  return READER_LANGUAGE_OPTIONS.some(option => option.code === code) ? code : null;
}
export function readerFormat(value: unknown): string | null {
  return READER_FORMAT_OPTIONS.some(option => option.value === value) ? String(value) : null;
}
export function readerIsbn(value: string): string | null {
  const clean = value.replace(/[\s-]/g, "").toUpperCase();
  const isbn13 = /^\d{13}$/.test(clean) ? normalizeIsbn13(clean) : null;
  if (isbn13) return isbn13;
  if (!/^\d{9}[\dX]$/.test(clean)) return null;
  const sum = [...clean].reduce((total, digit, i) => total + (digit === "X" ? 10 : Number(digit)) * (10 - i), 0);
  if (sum % 11 !== 0) return null;
  const prefix = `978${clean.slice(0, 9)}`;
  const check = (10 - [...prefix].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0) % 10) % 10;
  return prefix + check;
}
export type ReaderSearch =
  | { kind: "title"; title: string }
  | { kind: "isbn"; isbn13: string }
  | { kind: "asin"; asin: string }
  | { kind: "invalid"; message: string };
export function parseReaderSearch(value: string): ReaderSearch {
  const text = value.trim();
  if (!text) return { kind: "invalid", message: "Enter a title, ISBN, or supported book URL." };
  if (/^(?:https?:\/\/|www\.)/i.test(text)) {
    let url: URL;
    try { url = new URL(text.startsWith("www.") ? `https://${text}` : text); }
    catch { return { kind: "invalid", message: "Check the URL, or add the book using its title below." }; }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return { kind: "invalid", message: "Use a public book URL without sign-in details." };
    const host = url.hostname.toLowerCase().replace(/^(?:www\.|smile\.)/, "");
    if (["amazon.co.jp", "amazon.com", "amazon.co.uk", "amazon.ca", "amazon.de", "amazon.fr", "amazon.com.au"].includes(host)) {
      const id = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase();
      if (id) { const isbn13 = readerIsbn(id); return isbn13 ? { kind: "isbn", isbn13 } : { kind: "asin", asin: id }; }
    }
    if (host === "openlibrary.org") {
      const isbn13 = readerIsbn(url.pathname.match(/^\/isbn\/([\dXx-]+)(?:\/|$)/)?.[1] ?? "");
      if (isbn13) return { kind: "isbn", isbn13 };
    }
    if (["books.google.com", "books.google.co.jp"].includes(host)) {
      const isbn13 = readerIsbn((url.searchParams.get("vid") ?? "").replace(/^ISBN:?/i, ""));
      if (isbn13) return { kind: "isbn", isbn13 };
    }
    return { kind: "invalid", message: "This link cannot be identified yet. Search by title or ISBN, or add the book below." };
  }
  const isbn13 = readerIsbn(text.replace(/^ISBN(?:-1[03])?:?\s*/i, ""));
  if (isbn13) return { kind: "isbn", isbn13 };
  // Reject non-book protocols, but keep ordinary titles containing a colon searchable.
  if (/^(?:[a-z][a-z\d+.-]*:\/\/|(?:javascript|data|file|vbscript):)/i.test(text)) return { kind: "invalid", message: "Use a title, ISBN, or supported http(s) book URL." };
  if (/^(?:ISBN(?:-1[03])?:?\s*)?[\dXx\s-]{10,}$/i.test(text)) return { kind: "invalid", message: "Check the ISBN digits, or search by title." };
  if (/^B[0-9A-Z]{9}$/i.test(text)) return { kind: "asin", asin: text.toUpperCase() };
  return { kind: "title", title: text };
}

export function isSimpleReaderAddBook(input: { role: string | null; isSuperTeacher: boolean; destination: string; context: string; targetUserId: string; ownerId: string }) {
  return !["teacher", "admin", "super_teacher"].includes(input.role ?? "") && !input.isSuperTeacher &&
    !input.context && (!input.destination || input.destination === "my-library") &&
    (!input.targetUserId || input.targetUserId === input.ownerId);
}
