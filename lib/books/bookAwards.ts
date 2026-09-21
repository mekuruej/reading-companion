export const COMMON_BOOK_AWARDS = [
  { id: "naoki", name: "Naoki Prize · 直木賞", kind: "award" },
  { id: "akutagawa", name: "Akutagawa Prize · 芥川賞", kind: "award" },
  { id: "honya_taisho", name: "Honya Taisho · 本屋大賞", kind: "award" },
  { id: "kadai_tosho", name: "Book Report Competition Selection · 課題図書", kind: "selection" },
  { id: "japan_picture_book", name: "Japan Picture Book Award · 日本絵本賞", kind: "award" },
  { id: "noma_children", name: "Noma Children’s Literature Prize · 野間児童文芸賞", kind: "award" },
] as const;

export type BookAward = {
  id: string;
  name: string;
  kind: "award" | "selection";
  year: string;
  result: "winner" | "shortlisted" | "selected" | "other";
  detail: string;
  source_url: string;
};

export const BOOK_AWARD_RESULTS = {
  winner: "Winner",
  shortlisted: "Shortlisted",
  selected: "Selected book",
  other: "Other recognition",
} as const;

export function bookAwardSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeBookAwards(value: unknown): BookAward[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof item.name !== "string" || !item.name.trim()) return [];
    const preset = COMMON_BOOK_AWARDS.find((award) => award.id === item.id);
    const kind = preset?.kind ?? (item.kind === "selection" ? "selection" : "award");
    const stringValue = (key: string) => typeof item[key] === "string" ? item[key].trim() : "";
    return [{
      id: stringValue("id"),
      name: preset?.name ?? item.name.trim(),
      kind,
      year: stringValue("year"),
      result: kind === "selection" ? "selected" : Object.hasOwn(BOOK_AWARD_RESULTS, item.result) ? item.result : "winner",
      detail: stringValue("detail"),
      source_url: stringValue("source_url"),
    }];
  });
}

export function validateBookAwards(awards: BookAward[]): string | null {
  for (const award of awards) {
    if (!award.name.trim()) return "Enter a name for each award or selection.";
    if (award.year.trim() && !/^\d{4}$/.test(award.year.trim())) return "Enter a four-digit year, or leave the year blank.";
    if (award.source_url.trim() && !bookAwardSourceUrl(award.source_url.trim())) return "Source links must be valid http:// or https:// URLs.";
  }
  return null;
}
