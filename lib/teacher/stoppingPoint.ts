import { effectiveProgressMethod, matchingTotal, parseProgressPosition, progressLabels, type ProgressTotals } from "@/lib/books/readingProgress";
import { suggestCapturePosition } from "@/lib/books/vocabularyProgress";
import { wordPosition } from "@/lib/vocabulary/wordPosition";
export type StoppingUnit = "page" | "kindle_location" | "percent";
export type StoppingRow = { stopping_value?: number | null; stopping_unit?: string | null; stopping_page_number?: number | null; stopping_text?: string | null };
export function stoppingUnit(value: unknown): StoppingUnit | null {
  return value === "page" || value === "kindle_location" || value === "percent" ? value : null;
}
export function targetStoppingUnit(method: unknown, book: ProgressTotals = {}) {
  return stoppingUnit(effectiveProgressMethod(method, book));
}
export function readStoppingPoint(row: StoppingRow) {
  const typed = stoppingUnit(row.stopping_unit);
  return typed && row.stopping_value != null ? { unit: typed, value: row.stopping_value } :
    row.stopping_page_number != null ? { unit: "page" as const, value: row.stopping_page_number } : { unit: null, value: null };
}
export function stoppingPointLabel(point: { unit: StoppingUnit | null; value: number | null }) {
  if (!point.unit || point.value == null) return "";
  return point.unit === "percent" ? `${point.value}%` : `${progressLabels(point.unit).unit} ${point.value}`;
}
export function parseStoppingPoint(raw: unknown, method: unknown, book: ProgressTotals = {}) {
  const unit = targetStoppingUnit(method, book);
  if (!String(raw ?? "").trim()) return { unit, value: null, error: null };
  if (!unit) return { unit, value: null, error: "Choose Page, Kindle Location, or Percentage tracking for this student copy first, or save a note only." };
  return { unit, ...parseProgressPosition(String(raw), unit, matchingTotal(unit, book)) };
}
// Caller supplies only words restored for this exact current session, never the library.
export function suggestLessonStoppingPoint(words: Parameters<typeof wordPosition>[0][], unit: StoppingUnit | null, book: ProgressTotals = {}) {
  const positions = words.map(word => wordPosition(word)).filter(position =>
    position.unit === unit && !parseStoppingPoint(position.value, unit, book).error);
  return suggestCapturePosition(positions, unit);
}
