export const BOOK_TYPE_OPTIONS = [
  { value: "picture_book", label: "Picture Book" },
  { value: "early_reader", label: "Early Reader" },
  { value: "chapter_book", label: "Chapter Book" },
  { value: "middle_grade", label: "Middle Grade" },
  { value: "ya", label: "YA" },
  { value: "novel", label: "Novel" },
  { value: "light_novel", label: "Light Novel" },
  { value: "short_story", label: "Short Story" },
  { value: "manga", label: "Manga" },
  { value: "nonfiction", label: "Nonfiction" },
  { value: "essay", label: "Essay" },
  { value: "memoir", label: "Memoir" },
  { value: "textbook", label: "Textbook" },
  { value: "other", label: "Other" },
] as const;

export type BookTypeValue = (typeof BOOK_TYPE_OPTIONS)[number]["value"];

export function bookTypeLabel(value: string | null | undefined, fallback = "—") {
  return BOOK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? fallback;
}

export function bookTypeTitleLabel(value: string | null | undefined, fallback = "Book") {
  if (!value) return fallback;
  return bookTypeLabel(
    value,
    value
      .split(/[_-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
