type ReflectionLevelContext = {
  reader_level?: string | null;
  rating_difficulty?: number | null;
  rating_overall?: number | null;
  reader_advice?: string | null;
};

// Null on an existing contribution is an unknown historical level, not a request
// to substitute the reader's current profile level.
export function initialReflectionReaderLevel(row: ReflectionLevelContext, profileLevel?: string | null) {
  if (row.reader_level != null) return row.reader_level;
  const hasReflection = row.rating_difficulty != null || row.rating_overall != null || Boolean(row.reader_advice?.trim());
  return hasReflection ? "" : profileLevel ?? "";
}

export function reflectionReaderLevelForSave(selectedLevel: string) {
  return selectedLevel.trim() || null;
}
