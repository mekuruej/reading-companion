export function normalizeBookPart(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeIsbn(isbn: string | null | undefined) {
  return (isbn ?? "").replace(/[^0-9X]/gi, "");
}

export function makeBookKey(title: string, author?: string | null) {
  return [normalizeBookPart(title), normalizeBookPart(author)].join("|");
}
