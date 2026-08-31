"use client";

type SupabaseClientLike = any;

export type JapaneseDictionaryCandidate = {
  id: string;
  surface: string;
  cacheSurface: string;
  reading: string;
  jlpt: string;
  isCommon: boolean;
  meaningChoices: string[];
  meaningChoiceIndex: number;
  meaning: string;
  isManual: boolean;
};

export function normalizeJlpt(value: string | null | undefined): string {
  const normalized = String(value ?? "").toUpperCase();

  if (normalized.includes("N5")) return "N5";
  if (normalized.includes("N4")) return "N4";
  if (normalized.includes("N3")) return "N3";
  if (normalized.includes("N2")) return "N2";
  if (normalized.includes("N1")) return "N1";

  return "NON-JLPT";
}

function extractMeaningChoices(entry: any): string[] {
  const choices = (entry?.senses ?? [])
    .map((sense: any) => (sense?.english_definitions ?? []).join("; ").trim())
    .filter(Boolean);
  const seen = new Set<string>();

  return choices.filter((choice: string) => {
    const key = choice.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isExactDictionaryMatch(entry: any, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return false;

  if ((entry?.slug ?? "") === cleanQuery) return true;

  return (entry?.japanese ?? []).some(
    (form: any) => (form?.word ?? "") === cleanQuery || (form?.reading ?? "") === cleanQuery
  );
}

export function buildJapaneseDictionaryCandidates(
  entries: any[],
  fallbackWord: string
): JapaneseDictionaryCandidate[] {
  const exactEntries = entries.filter((entry) => isExactDictionaryMatch(entry, fallbackWord));
  const sourceEntries = exactEntries.length > 0 ? exactEntries : entries;
  const candidates: JapaneseDictionaryCandidate[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < sourceEntries.length; index += 1) {
    const entry = sourceEntries[index];
    const primaryForm =
      (entry?.japanese ?? []).find((form: any) => form?.word || form?.reading) ??
      (entry?.japanese ?? [])[0] ??
      {};
    const surface = primaryForm?.word || entry?.slug || fallbackWord;
    const reading = primaryForm?.reading || "";
    const meaningChoices = extractMeaningChoices(entry);
    const candidate = {
      id: `${surface}__${reading || "no-reading"}__${index}`,
      surface,
      cacheSurface: surface,
      reading,
      jlpt: normalizeJlpt(entry?.jlpt?.[0]),
      isCommon: Boolean(entry?.is_common),
      meaningChoices,
      meaningChoiceIndex: 0,
      meaning: meaningChoices[0] || "",
      isManual: false,
    };
    const dedupeKey = [
      candidate.surface,
      candidate.reading,
      candidate.meaningChoices.join("||"),
      candidate.jlpt,
    ].join("___");

    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    candidates.push(candidate);
  }

  return candidates;
}

export async function fetchJapaneseDictionaryCandidates(
  supabase: SupabaseClientLike,
  keyword: string
) {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return [];

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(cleanKeyword)}`, {
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  });

  if (!response.ok) {
    throw new Error("Could not load dictionary data.");
  }

  const data = await response.json();
  return buildJapaneseDictionaryCandidates(data?.data ?? [], cleanKeyword);
}
