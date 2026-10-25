import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";
import { parseWordPosition, wordPosition, type WordPositionRecord } from "@/lib/vocabulary/wordPosition";

export type CuriosityCaptureContext = {
  page: string;
  positionUnit: ProgressTrackingMethod;
  chapterNumber: string;
  chapterName: string;
};

/** A capture context is one record, never a mixture of independently filled fields. */
export function rememberedCaptureContext(value: unknown, unit: ProgressTrackingMethod): CuriosityCaptureContext | null {
  if (!value || typeof value !== "object" || unit === "audiobook_time") return null;
  const row = value as Partial<CuriosityCaptureContext>;
  if (row.positionUnit !== unit) return null;
  const page = typeof row.page === "string" ? row.page.trim() : "";
  const parsed = parseWordPosition(page, unit);
  if (parsed.error) return null;
  const chapterNumber = typeof row.chapterNumber === "string" && /^\d+$/.test(row.chapterNumber.trim())
    ? row.chapterNumber.trim() : "";
  const chapterName = typeof row.chapterName === "string" ? row.chapterName.trim() : "";
  if (!page && !chapterNumber && !chapterName) return null;
  return { page, positionUnit: unit, chapterNumber, chapterName };
}

/** Only the latest finalized capture is considered; an unknown/stale unit stays unknown. */
export function vocabularyCaptureContext(row: (WordPositionRecord & { chapter_number?: number | null; chapter_name?: string | null }) | null, unit: ProgressTrackingMethod) {
  if (!row) return null;
  const position = wordPosition(row);
  if (position.unit !== unit || position.value == null) return null;
  return rememberedCaptureContext({
    page: String(position.value), positionUnit: position.unit,
    chapterNumber: row.chapter_number == null ? "" : String(row.chapter_number),
    chapterName: row.chapter_name ?? "",
  }, unit);
}

export function restoreCaptureContext<T extends { id: string | null; page: string; chapterNumber: string; chapterName: string }>(current: T, remembered: CuriosityCaptureContext | null, edited: boolean): T {
  if (!remembered || edited || current.id || current.page.trim() || current.chapterNumber.trim() || current.chapterName.trim()) return current;
  return { ...current, ...remembered };
}
