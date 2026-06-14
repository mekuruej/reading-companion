export function normalizeChapterNameOptions(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const options: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push(value);
  }

  return options.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function addChapterNameOption(options: string[], value: string | null | undefined) {
  return normalizeChapterNameOptions([...options, value]);
}

export function sortChapterNameOptionsByNumber(
  options: string[],
  chapterNumberByName: Record<string, string>
) {
  return [...options].sort((a, b) => {
    const aNumber = Number.parseFloat(chapterNumberByName[a.trim()] ?? "");
    const bNumber = Number.parseFloat(chapterNumberByName[b.trim()] ?? "");
    const aHasNumber = Number.isFinite(aNumber);
    const bHasNumber = Number.isFinite(bNumber);

    if (aHasNumber && bHasNumber && aNumber !== bNumber) {
      return aNumber - bNumber;
    }

    if (aHasNumber !== bHasNumber) {
      return aHasNumber ? -1 : 1;
    }

    return a.localeCompare(b, undefined, { numeric: true });
  });
}
