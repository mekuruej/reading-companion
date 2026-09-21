import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";

export type WordPositionRecord = {
  position_unit?: ProgressTrackingMethod | null;
  position_value?: number | null;
  page_number?: number | null;
  percent_location?: number | null;
};
export function wordPosition(row: WordPositionRecord) {
  if (row.position_unit) return { unit: row.position_unit, value: row.position_value ?? null };
  if (row.page_number != null) return { unit: "page" as const, value: row.page_number };
  if (row.percent_location != null) return { unit: "percent" as const, value: row.percent_location };
  return { unit: "page" as const, value: null };
}
export function positionLabel(unit: ProgressTrackingMethod) {
  return unit === "kindle_location" ? "Location" : unit === "percent" ? "Percent" : "Page";
}
export function wordPositionText(row: WordPositionRecord) {
  const { unit, value } = wordPosition(row);
  return value == null ? "" : `${positionLabel(unit)} ${value}${unit === "percent" ? "%" : ""}`;
}
export function wordPositionInput(row: WordPositionRecord) {
  const { value } = wordPosition(row);
  return value == null ? "" : String(value);
}
export function parseWordPosition(value: unknown, unit: ProgressTrackingMethod) {
  const text = String(value ?? "").trim();
  if (!text) return { value: null, error: null };
  const number = Number(text);
  const valid = /^\d+(?:\.\d+)?$/.test(text) && Number.isFinite(number) && number >= 0 &&
    (unit === "percent" ? number <= 100 : Number.isSafeInteger(number));
  return valid ? { value: number, error: null } : {
    value: null,
    error: unit === "percent" ? "Percent must be a number from 0–100." : `${positionLabel(unit)} must be a nonnegative whole number.`,
  };
}
export function wordPositionPayload(value: number | null, unit: ProgressTrackingMethod) {
  return { position_value: value, position_unit: unit,
    page_number: unit === "page" ? value : null,
    percent_location: unit === "percent" ? value : null };
}

// Unversioned drafts cannot safely be reused after a tracking-method change.
export function stickyWordPosition(value: unknown, savedUnit: unknown, currentUnit: ProgressTrackingMethod) {
  return savedUnit === currentUnit && typeof value === "string" ? value : "";
}
