export type PersonalVocabularyMatch = {
  surface: string;
  reading: string;
  meaning: string;
  alternativeSurface: string;
  previousLocation?: string | null;
};

/** Stable content identity for deduplication and capture-local dismissals, not a database identity. */
export function personalVocabularyEntryKey(entry: PersonalVocabularyMatch) {
  return [entry.surface, entry.reading, entry.meaning, entry.alternativeSurface]
    .map(value => String(value ?? "").trim().normalize("NFC").toLowerCase()).join("\u0000");
}

export async function searchPersonalVocabulary(
  query: string,
  accessToken: string | null | undefined,
  userBookId: string,
  includePreviousLocation = false
): Promise<PersonalVocabularyMatch[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  if (!accessToken) throw new Error("Sign in to search your saved entries.");

  const response = await fetch(
    `/api/personal-vocabulary-search?query=${encodeURIComponent(cleanQuery)}&userBookId=${encodeURIComponent(userBookId)}${includePreviousLocation ? "&previousLocation=1" : ""}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) throw new Error("Could not search your saved entries.");
  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}
