"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorStatus,
} from "@/lib/libraryStudyColor";
import { supabase } from "@/lib/supabaseClient";

type DictionaryEntry = {
  word: string;
  reading: string;
  meanings: string[];
  jlpt?: string | null;
  isCommon?: boolean | null;
};

type KanjiMeta = {
  kanji: string;
  strokes: number | null;
  radical: string | null;
};

type RelatedWord = {
  word: string;
  reading: string;
  meaning: string;
};

type KanjiGroup = {
  kanji: string;
  relatedWords: RelatedWord[];
};

type LearningSettingsRow = {
  red_stages: number | null;
  orange_stages: number | null;
  yellow_stages: number | null;
  show_badge_numbers: boolean | null;
};

type LibraryWordSummaryRow = {
  study_identity_key: string;
  total_encounter_count: number | null;
};

const DEFAULT_LEARNING_SETTINGS: LearningSettingsRow = {
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
};

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function normalizeText(val: string | null | undefined) {
  return (val ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(val: string | null | undefined) {
  return (val ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
  const normalizedSurface = normalizeText(surface);
  const normalizedReading = normalizeKana(reading);
  if (!normalizedSurface) return "";
  return `${normalizedSurface}||${normalizedReading}`;
}

function getUniqueKanji(surface: string) {
  return Array.from(new Set(surface.match(/[\u3400-\u9FFF]/g) || []));
}

function badgeColorClass(color: LibraryStudyColor) {
  if (color === "red") return "border-red-800 bg-red-600 text-white";
  if (color === "orange") return "border-orange-700 bg-orange-400 text-stone-950";
  if (color === "yellow") return "border-yellow-500 bg-yellow-300 text-stone-900";
  if (color === "green") return "border-green-800 bg-green-600 text-white";
  if (color === "blue") return "border-blue-800 bg-blue-600 text-white";
  if (color === "purple") return "border-purple-800 bg-purple-600 text-white";
  if (color === "grey") return "border-slate-700 bg-slate-500 text-white";
  return "border-stone-400 bg-stone-300 text-stone-700";
}

function LibraryStatusBadge({
  status,
  encounterCount,
  showNumbers,
}: {
  status: LibraryStudyColorStatus;
  encounterCount: number;
  showNumbers: boolean;
}) {
  const showStageNumber =
    showNumbers &&
    status.stageNumber != null &&
    status.stageCount != null &&
    status.stageCount > 1;

  const title = `${status.reason} · ${encounterCount} library encounter${
    encounterCount === 1 ? "" : "s"
  }`;

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold shadow-sm ${badgeColorClass(
        status.color
      )} ${showStageNumber ? "h-6 min-w-6 px-1.5" : "h-4 w-4"}`}
    >
      {showStageNumber ? status.stageNumber : ""}
    </span>
  );
}

export default function DictionaryPage() {
  const searchParams = useSearchParams();
  const initialWord = searchParams.get("word") ?? "";

  const [query, setQuery] = useState(initialWord);
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extraLoadingWord, setExtraLoadingWord] = useState<string | null>(null);
  const [kanjiMetaByWord, setKanjiMetaByWord] = useState<Record<string, KanjiMeta[]>>({});
  const [kanjiGroupsByWord, setKanjiGroupsByWord] = useState<Record<string, KanjiGroup[]>>({});
  const [learningSettings, setLearningSettings] =
    useState<LearningSettingsRow>(DEFAULT_LEARNING_SETTINGS);
  const [summaryCountsByKey, setSummaryCountsByKey] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!initialWord) return;
    void runSearch(initialWord);
  }, [initialWord]);

  async function loadDictionaryExtras(surface: string) {
    setExtraLoadingWord(surface);

    try {
      const chars = getUniqueKanji(surface);

      if (chars.length === 0) {
        setKanjiMetaByWord((prev) => ({ ...prev, [surface]: [] }));
        setKanjiGroupsByWord((prev) => ({ ...prev, [surface]: [] }));
        return;
      }

      const metaResults: KanjiMeta[] = [];
      const groupResults: KanjiGroup[] = [];

      for (const ch of chars) {
        try {
          const r = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`);
          if (!r.ok) {
            metaResults.push({ kanji: ch, strokes: null, radical: null });
          } else {
            const data = await r.json();
            metaResults.push({
              kanji: ch,
              strokes: data.stroke_count ?? null,
              radical: null,
            });
          }
        } catch {
          metaResults.push({ kanji: ch, strokes: null, radical: null });
        }

        try {
          const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(ch)}`);
          if (!res.ok) {
            groupResults.push({ kanji: ch, relatedWords: [] });
            continue;
          }

          const data = await res.json();
          const relatedWords: RelatedWord[] = (data?.data ?? [])
            .map((item: any) => ({
              word: item?.japanese?.[0]?.word ?? item?.japanese?.[0]?.reading ?? "",
              reading: item?.japanese?.[0]?.reading ?? "",
              meaning: item?.senses?.[0]?.english_definitions?.join("; ") ?? "",
            }))
            .filter((x: RelatedWord) => x.word && x.word !== surface)
            .slice(0, 3);

          groupResults.push({
            kanji: ch,
            relatedWords,
          });
        } catch {
          groupResults.push({ kanji: ch, relatedWords: [] });
        }
      }

      setKanjiMetaByWord((prev) => ({ ...prev, [surface]: metaResults }));
      setKanjiGroupsByWord((prev) => ({ ...prev, [surface]: groupResults }));
    } catch {
      setKanjiMetaByWord((prev) => ({ ...prev, [surface]: [] }));
      setKanjiGroupsByWord((prev) => ({ ...prev, [surface]: [] }));
    } finally {
      setExtraLoadingWord((current) => (current === surface ? null : current));
    }
  }

  async function runSearch(raw?: string) {
    const q = (raw ?? query).trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);
    setResults([]);
    setSummaryCountsByKey({});

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(q)}`);

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];

      const mapped: DictionaryEntry[] = data.map((item: any) => {
        const japanese0 = item?.japanese?.[0] ?? {};
        const senses = Array.isArray(item?.senses) ? item.senses : [];

        const word = japanese0.word ?? japanese0.reading ?? "";
        const reading = japanese0.reading ?? "";
        const meanings = senses
          .map((s: any) =>
            Array.isArray(s?.english_definitions)
              ? s.english_definitions.join("; ")
              : ""
          )
          .filter(Boolean);

        const jlptArr = Array.isArray(item?.jlpt) ? item.jlpt : [];
        const jlpt =
          jlptArr.length > 0
            ? String(jlptArr[0]).toUpperCase().replace("JLPT-", "")
            : null;

        return {
          word,
          reading,
          meanings: meanings.length ? meanings : ["—"],
          jlpt,
          isCommon: item?.is_common ?? false,
        };
      });

      setResults(mapped);
      void loadLibraryStatuses(mapped);
      const uniqueSurfaces = Array.from(
        new Set(mapped.map((entry) => entry.word).filter(Boolean))
      );

      for (const surface of uniqueSurfaces) {
        void loadDictionaryExtras(surface);
      }

      if (mapped.length === 0) {
        setErrorMsg("No results found.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Could not search dictionary.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadLibraryStatuses(entries: DictionaryEntry[]) {
    const keys = Array.from(
      new Set(entries.map((entry) => studyIdentityKey(entry.word, entry.reading)).filter(Boolean))
    );
    if (keys.length === 0) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("user_learning_settings")
        .select("red_stages, orange_stages, yellow_stages, show_badge_numbers")
        .eq("user_id", user.id)
        .maybeSingle<LearningSettingsRow>();

      setLearningSettings({
        ...DEFAULT_LEARNING_SETTINGS,
        ...(settings ?? {}),
      });

      const { data, error } = await supabase
        .from("user_library_word_summaries")
        .select("study_identity_key, total_encounter_count")
        .eq("user_id", user.id)
        .in("study_identity_key", keys)
        .returns<LibraryWordSummaryRow[]>();

      if (error) throw error;

      const next: Record<string, number> = {};
      for (const row of data ?? []) {
        next[row.study_identity_key] = row.total_encounter_count ?? 0;
      }
      setSummaryCountsByKey(next);
    } catch (error) {
      console.warn("Could not load dictionary library statuses:", error);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-10 pt-15">
      <h1 className="mb-1 text-2xl font-semibold">Dictionary</h1>
      <p className="mb-4 text-sm text-stone-500">
        Look up a word directly. When you want to know where you met it, jump over to Word History.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch();
          }}
          placeholder="Search Japanese word..."
          className="flex-1 border rounded px-3 py-2 bg-white"
        />

        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {errorMsg ? <p className="text-sm text-red-600 mb-3">{errorMsg}</p> : null}

      <div className="space-y-3">
        {results.map((entry, idx) => (
          (() => {
            const key = studyIdentityKey(entry.word, entry.reading);
            const encounterCount = summaryCountsByKey[key] ?? 0;
            const status = computeLibraryStudyColorStatus({
              encounterCount,
              settings: learningSettings,
            });
            const showBadge = encounterCount > 0;

            return (
          <div
            key={`${entry.word}-${entry.reading}-${idx}`}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-semibold text-stone-900">
                {entry.word || "—"}
              </div>
              {showBadge ? (
                <LibraryStatusBadge
                  status={status}
                  encounterCount={encounterCount}
                  showNumbers={learningSettings.show_badge_numbers ?? true}
                />
              ) : null}
            </div>

            <div className="mt-1 text-base text-stone-500">
              {entry.reading || "—"}
            </div>

            <div className="mt-4 space-y-2">
              {entry.meanings.map((meaning, meaningIndex) => (
                <div
                  key={`${entry.word}-${entry.reading}-${meaningIndex}`}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Meaning {meaningIndex + 1}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-stone-800">
                    {meaning}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {normalizeJlpt(entry.jlpt) !== "NON-JLPT" ? (
                <span className="rounded-full border bg-white px-2 py-1">
                  {normalizeJlpt(entry.jlpt)}
                </span>
              ) : null}

              {entry.isCommon ? (
                <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-700">
                  Common
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border p-4">
              <div className="mb-2 text-sm font-semibold text-stone-900">Kanji Info</div>

              {extraLoadingWord === entry.word ? (
                <div className="text-sm text-stone-500">Loading kanji info…</div>
              ) : (kanjiMetaByWord[entry.word] ?? []).length === 0 ? (
                <div className="text-sm text-stone-500">No kanji info for this word.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(kanjiMetaByWord[entry.word] ?? []).map((k) => (
                    <span
                      key={`${entry.word}-${k.kanji}`}
                      className="rounded-full border bg-stone-50 px-3 py-1 text-sm"
                    >
                      {k.kanji} · {k.strokes ?? "?"} strokes
                      {k.radical ? ` · radical ${k.radical}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border p-4">
              <div className="mb-2 text-sm font-semibold text-stone-900">Words Using These Kanji</div>

              {(kanjiGroupsByWord[entry.word] ?? []).length === 0 ? (
                <div className="text-sm text-stone-500">No related kanji words found.</div>
              ) : (
                <div className="space-y-5">
                  {(kanjiGroupsByWord[entry.word] ?? []).map((group) => (
                    <div key={`${entry.word}-${group.kanji}`}>
                      <div className="mb-2 text-sm font-semibold text-stone-700">
                        Words with {group.kanji}
                      </div>

                      {group.relatedWords.length === 0 ? (
                        <div className="text-sm text-stone-500">No related words found.</div>
                      ) : (
                        <div className="space-y-2">
                          {group.relatedWords.map((kw, meaningIndex) => (
                            <div
                              key={`${entry.word}-${group.kanji}-${kw.word}-${meaningIndex}`}
                              className="text-sm"
                            >
                              <span className="font-medium text-stone-900">{kw.word}</span>
                              {kw.reading ? (
                                <span className="ml-2 text-stone-600">（{kw.reading}）</span>
                              ) : null}
                              {kw.meaning ? (
                                <div className="mt-0.5 text-stone-500">{kw.meaning}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/vocab/history?word=${encodeURIComponent(entry.word || query)}`}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50"
              >
                Open in Word History
              </Link>
            </div>
          </div>
            );
          })()
        ))}
      </div>
    </main>
  );
}
