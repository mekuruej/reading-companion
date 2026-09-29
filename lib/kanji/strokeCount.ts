/** Canonical whole-kanji stroke count, never a component or radical count. */
export function isValidStrokeCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function strokeCountChoices(strokeCount: unknown): string[] {
  if (!isValidStrokeCount(strokeCount)) return [];
  // Anchor the answer first, then add unique positive neighbours.
  const values = new Set<number>([strokeCount]);
  for (let offset = 1; values.size < 4; offset++) {
    for (const candidate of [strokeCount - offset, strokeCount + offset]) {
      if (values.size < 4 && isValidStrokeCount(candidate)) values.add(candidate);
    }
  }
  return [...values].sort((a, b) => a - b).map(String);
}
