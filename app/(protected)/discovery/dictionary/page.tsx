// Dictionary
// 

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { computeLibraryStudyColorStatus } from "@/lib/libraryStudyColor";
import { supabase } from "@/lib/supabaseClient";
import DictionaryHeader from "./components/DictionaryHeader";
import DictionaryErrorMessage from "./components/DictionaryErrorMessage";
import DictionarySearchForm from "./components/DictionarySearchForm";
import DictionaryMeaningsList from "./components/DictionaryMeaningsList";
import DictionaryEntryBadges from "./components/DictionaryEntryBadges";
import DictionaryKanjiInfoPanel from "./components/DictionaryKanjiInfoPanel";
import DictionaryRelatedKanjiWordsPanel from "./components/DictionaryRelatedKanjiWordsPanel";
import DictionaryWordHistoryLink from "./components/DictionaryWordHistoryLink";
import DictionaryResultCard from "./components/DictionaryResultCard";

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
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(ch)}`, {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : undefined,
          });
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(q)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

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
      <DictionaryHeader
        title="Dictionary"
        description="Look up a word directly. When you want to know where you met it, jump over to Word History."
      />

      <DictionarySearchForm
        query={query}
        loading={loading}
        onQueryChange={setQuery}
        onSearch={() => void runSearch()}
      />

      <DictionaryErrorMessage message={errorMsg} />

      <div className="space-y-3">
        {results.map((entry, idx) => {
          const key = studyIdentityKey(entry.word, entry.reading);
          const encounterCount = summaryCountsByKey[key] ?? 0;
          const status = computeLibraryStudyColorStatus({
            encounterCount,
            settings: learningSettings,
          });
          const showBadge = encounterCount > 0;

          return (
            <DictionaryResultCard
              key={`${entry.word}-${entry.reading}-${idx}`}
              entry={entry}
              fallbackWord={query}
              showBadge={showBadge}
              colorStatus={status}
              jlptLabel={normalizeJlpt(entry.jlpt)}
              isKanjiLoading={extraLoadingWord === entry.word}
              kanjiMeta={kanjiMetaByWord[entry.word] ?? []}
              kanjiGroups={kanjiGroupsByWord[entry.word] ?? []}
            />
          );
        })}
      </div>
    </main>
  );
}
