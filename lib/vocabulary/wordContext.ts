export type WordContext = {
  book_form?: string | null;
  book_form_description?: string | null;
  follow_along_support_note?: string | null;
};
export const BOOK_FORM_DESCRIPTIONS = ["Past", "て-form", "Negative", "Passive", "Causative", "Other"] as const;
export function wordContextPayload(input: object): WordContext {
  const value = input as WordContext;
  const clean = (entry: unknown) => typeof entry === "string" ? entry.trim() || null : null;
  return {
    book_form: clean(value.book_form),
    book_form_description: clean(value.book_form_description),
    follow_along_support_note: clean(value.follow_along_support_note),
  };
}
export function followAlongSurface(word: WordContext & { surface?: string | null }) {
  return word.book_form?.trim() || word.surface || "";
}
