/** A promotion changes display forms only; callers retain the rest of the row. */
export function promotedSpelling(surface: string, alternative: string) {
  const next = alternative.trim();
  if (!next || next === surface.trim()) return null;
  return { surface: next, alternative_surface: surface.trim() };
}
