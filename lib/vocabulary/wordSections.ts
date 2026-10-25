import { wordPosition } from "./wordPosition";
import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";

export const AUTOMATIC_WORD_SECTION_SIZE = 100;
export const AUTOMATIC_WORD_SECTION_THRESHOLD = 200;

export type ReadingOrderedVocabularyWord = {
  id: string;
  chapter_number: number | null;
  position_unit?: ProgressTrackingMethod | null;
  position_value?: number | null;
  page_number: number | null;
  percent_location?: number | null;
  page_order: number | null;
  created_at: string;
};

export function compareVocabularyReadingOrder(
  a: ReadingOrderedVocabularyWord,
  b: ReadingOrderedVocabularyWord
) {
  const aChapter = a.chapter_number ?? Number.MAX_SAFE_INTEGER;
  const bChapter = b.chapter_number ?? Number.MAX_SAFE_INTEGER;
  if (aChapter !== bChapter) return aChapter - bChapter;

  const unitOrder = wordPosition(a).unit.localeCompare(wordPosition(b).unit);
  if (unitOrder) return unitOrder;
  const aPage = wordPosition(a).value ?? Number.MAX_SAFE_INTEGER;
  const bPage = wordPosition(b).value ?? Number.MAX_SAFE_INTEGER;
  if (aPage !== bPage) return aPage - bPage;

  const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;

  const created = a.created_at.localeCompare(b.created_at);
  if (created !== 0) return created;

  return a.id.localeCompare(b.id);
}

export function shouldUseAutomaticWordSections(hasChapterMetadata: boolean, wordCount: number) {
  return !hasChapterMetadata && wordCount > AUTOMATIC_WORD_SECTION_THRESHOLD;
}

export function getAutomaticWordSectionOptions(wordCount: number) {
  const options = [{ value: "all", label: "All Words" }];
  const sectionCount = Math.ceil(wordCount / AUTOMATIC_WORD_SECTION_SIZE);

  for (let index = 0; index < sectionCount; index += 1) {
    const first = index * AUTOMATIC_WORD_SECTION_SIZE + 1;
    const last = Math.min((index + 1) * AUTOMATIC_WORD_SECTION_SIZE, wordCount);
    options.push({ value: String(index), label: `Words ${first}–${last}` });
  }

  return options;
}

/** Search results stay book-wide; otherwise only the selected sorted slice is shown. */
export function selectAutomaticWordSection<T>(
  sortedRows: T[],
  selectedSection: string,
  searchIsActive: boolean
) {
  if (selectedSection === "all" || searchIsActive) return sortedRows;

  const parsedIndex = Number.parseInt(selectedSection, 10);
  const sectionCount = Math.ceil(sortedRows.length / AUTOMATIC_WORD_SECTION_SIZE);
  const requestedIndex = Number.isSafeInteger(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
  const sectionIndex = Math.min(requestedIndex, Math.max(0, sectionCount - 1));
  const start = sectionIndex * AUTOMATIC_WORD_SECTION_SIZE;
  return sortedRows.slice(start, start + AUTOMATIC_WORD_SECTION_SIZE);
}
