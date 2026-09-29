import { normalizeBookLanguageCode } from "./bookLanguage";
export const EDITION_FORMAT_OPTIONS = [
  {value:"bunko",label:"Bunko"}, {value:"tankobon_hardcover",label:"Tankobon hardcover"},
  {value:"tankobon_softcover",label:"Tankobon softcover"}, {value:"paperback",label:"Paperback"},
  {value:"hardcover",label:"Hardcover"}, {value:"ebook",label:"Kindle / eBook"},
  {value:"audiobook",label:"Audiobook"}, {value:"other",label:"Other"},
] as const;
export type EditionFormat = (typeof EDITION_FORMAT_OPTIONS)[number]["value"];

export function isCanonicalEditionFormat(value: unknown): value is EditionFormat {
  return EDITION_FORMAT_OPTIONS.some(option => option.value === value);
}

export function missingCoreBookFields(book: {title?: unknown; author?: unknown; language_code?: unknown; edition_format?: unknown}) {
  const missing: string[] = [];
  if (typeof book.title !== "string" || !book.title.trim()) missing.push("title");
  if (typeof book.author !== "string" || !book.author.trim()) missing.push("author");
  if (typeof book.language_code !== "string" || !normalizeBookLanguageCode(book.language_code)) missing.push("language");
  if (!isCanonicalEditionFormat(book.edition_format)) missing.push("format");
  return missing;
}
