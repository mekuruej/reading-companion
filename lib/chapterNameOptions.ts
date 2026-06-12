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
