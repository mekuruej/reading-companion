import { formatEditionLabel, type EditionDisplayFields } from "@/lib/books/editionDisplay";

export default function BookEditionLine({ book }: { book: EditionDisplayFields | null | undefined }) {
  const label = formatEditionLabel(book);
  if (!label) return null;
  const isbn = book?.isbn13?.trim() || book?.isbn?.trim();
  const detail = [book?.edition_note?.trim(), isbn ? `ISBN: ${isbn}` : null].filter(Boolean).join(" · ");
  return <p className="mt-1 truncate text-xs font-medium text-stone-600" title={detail ? `${label} · ${detail}` : label}>{label}</p>;
}
