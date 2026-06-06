// Word Sky
//
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorSettings,
  type LibraryStudyGateStatus,
} from "@/lib/libraryStudyColor";
import { supabase } from "@/lib/supabaseClient";
import WordSkyLoadingState from "../components/WordSkyLoadingState";

type ClaimedColor = "green" | "blue" | "purple";
type SkyBubbleColor = ClaimedColor | LibraryStudyColor;

type SkyWord = {
  surface: string;
  reading: string;
  meaning: string;
  level: "soft" | "middle" | "bright";
  jlpt?: string | null;
  encounterCount?: number | null;
};

type ClaimRow = {
  id: string;
  study_identity_key: string;
  claimed_color: ClaimedColor;
};

type WordSkyPoolRow = {
  study_identity_key: string | null;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  total_encounter_count: number | null;
  book_count: number | null;
};

type LibrarySummarySkyRow = {
  study_identity_key: string | null;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  total_encounter_count: number | null;
};

type LibraryProgressSkyRow = {
  study_identity_key: string | null;
  reading_gate_status: LibraryStudyGateStatus | null;
  meaning_gate_status: LibraryStudyGateStatus | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  reading_gate_attempts: number | null;
  mastered: boolean | null;
};

type VisibleSkyWord = SkyWord & {
  skyId: string;
  lane: number;
  duration: number;
  bobDuration: number;
  delay: number;
  bobDelay: number;
};

const FALLBACK_SKY_WORDS: SkyWord[] = [
  { surface: "理由", reading: "りゆう", meaning: "reason", level: "soft", jlpt: "N4" },
  { surface: "必要", reading: "ひつよう", meaning: "necessary", level: "middle", jlpt: "N4" },
  { surface: "場所", reading: "ばしょ", meaning: "place", level: "soft", jlpt: "N5" },
  { surface: "世界", reading: "せかい", meaning: "world", level: "bright", jlpt: "N4" },
  { surface: "気持ち", reading: "きもち", meaning: "feeling", level: "middle", jlpt: "N4" },
  { surface: "意味", reading: "いみ", meaning: "meaning", level: "soft", jlpt: "N4" },
  { surface: "関係", reading: "かんけい", meaning: "relationship", level: "bright", jlpt: "N3" },
  { surface: "問題", reading: "もんだい", meaning: "problem", level: "middle", jlpt: "N4" },
  { surface: "経験", reading: "けいけん", meaning: "experience", level: "bright", jlpt: "N3" },
  { surface: "普通", reading: "ふつう", meaning: "ordinary", level: "soft", jlpt: "N4" },
  { surface: "状況", reading: "じょうきょう", meaning: "situation", level: "middle", jlpt: "N2" },
  { surface: "表情", reading: "ひょうじょう", meaning: "expression", level: "bright", jlpt: null },
];

const LANES = [3, 8, 13, 18, 24, 30, 36, 43, 50, 57, 64, 71, 78, 85, 92];
const VISIBLE_WORD_COUNT = 36;
const PERSONAL_LIBRARY_WORD_LIMIT = 45;
const PERSONAL_LIBRARY_SKY_LEVELS = new Set(["N2", "N1", "NON-JLPT"]);

function clampPercent(value: number) {
  return Math.max(3, Math.min(92, value));
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function studyIdentityKey(surface: string, reading: string) {
  return `${normalizeText(surface)}||${normalizeKana(reading)}`;
}

function colorClass(color: SkyBubbleColor | null) {
  if (color === "red") return "border-red-200 bg-red-50 text-red-950";
  if (color === "orange") return "border-orange-200 bg-orange-50 text-orange-950";
  if (color === "yellow") return "border-yellow-200 bg-yellow-50 text-yellow-950";
  if (color === "grey") return "border-slate-200 bg-slate-100 text-slate-700";
  if (color === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (color === "blue") return "border-sky-200 bg-sky-50 text-sky-900";
  if (color === "purple") return "border-violet-200 bg-violet-50 text-violet-900";
  return "border-white/80 bg-white/80 text-slate-800";
}

function colorLabel(color: ClaimedColor) {
  if (color === "green") return "Ready for Reading Gate";
  if (color === "blue") return "I know a meaning";
  return "Settled";
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function levelForWord(row: WordSkyPoolRow, index: number): SkyWord["level"] {
  const jlpt = (row.jlpt ?? "").toUpperCase();
  if (jlpt === "N5" || jlpt === "N4") return "soft";
  if (jlpt === "N3") return "middle";
  if (jlpt === "N2" || jlpt === "N1") return "bright";
  return index % 3 === 0 ? "bright" : index % 2 === 0 ? "middle" : "soft";
}

function shouldIncludePersonalLibraryWord(
  row: LibrarySummarySkyRow,
  progress: LibraryProgressSkyRow | null | undefined,
  settings: LibraryStudyColorSettings
) {
  const jlpt = normalizeJlpt(row.jlpt);
  if (!PERSONAL_LIBRARY_SKY_LEVELS.has(jlpt)) return false;

  const status = computeLibraryStudyColorStatus({
    encounterCount: row.total_encounter_count ?? 0,
    settings,
    readingGate: progress?.reading_gate_status ?? "not_started",
    meaningGate: progress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
    preReadingSupportCycle: progress?.held_before_reading_gate
      ? Math.max(2, (progress.reading_gate_attempts ?? 0) + 1)
      : null,
    mastered: progress?.mastered ?? false,
  });

  return status.color === "red" || status.color === "orange" || status.color === "yellow";
}

function libraryColorForWord(
  row: Pick<LibrarySummarySkyRow, "total_encounter_count">,
  progress: LibraryProgressSkyRow | null | undefined,
  settings: LibraryStudyColorSettings
) {
  return computeLibraryStudyColorStatus({
    encounterCount: row.total_encounter_count ?? 0,
    settings,
    readingGate: progress?.reading_gate_status ?? "not_started",
    meaningGate: progress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
    preReadingSupportCycle: progress?.held_before_reading_gate
      ? Math.max(2, (progress.reading_gate_attempts ?? 0) + 1)
      : null,
    mastered: progress?.mastered ?? false,
  }).color;
}

function shouldHideFromWordSkyByLibraryColor(color: LibraryStudyColor | undefined) {
  return color === "green" || color === "blue" || color === "purple";
}

function normalizeJlpt(value: string | null | undefined) {
  const normalized = (value ?? "NON-JLPT").trim().toUpperCase();
  if (normalized === "N5" || normalized === "N4" || normalized === "N3" || normalized === "N2" || normalized === "N1") {
    return normalized;
  }
  return "NON-JLPT";
}

function makeVisibleWords(words: SkyWord[]) {
  return words.slice(0, VISIBLE_WORD_COUNT).map((word, index) => {
    const laneBase = LANES[(index * 7 + 4) % LANES.length];
    const laneNudge = ((index * 13) % 11) - 5;

    return {
      ...word,
      skyId: `${studyIdentityKey(word.surface, word.reading)}-${index}-${Date.now()}`,
      lane: clampPercent(laneBase + laneNudge),
      duration: 225 + ((index * 31) % 155),
      bobDuration: 14 + ((index * 7) % 24),
      delay: -1 * ((index * 53 + 17) % 340),
      bobDelay: -1 * ((index * 11) % 27),
    };
  });
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} took too long.`));
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export default function WordSkyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [wordPool, setWordPool] = useState<SkyWord[]>(FALLBACK_SKY_WORDS);
  const [visibleWords, setVisibleWords] = useState<VisibleSkyWord[]>(
    makeVisibleWords(shuffleArray(FALLBACK_SKY_WORDS))
  );
  const [claims, setClaims] = useState<Record<string, ClaimRow>>({});
  const [libraryColors, setLibraryColors] = useState<Record<string, LibraryStudyColor>>({});
  const [selectedWord, setSelectedWord] = useState<SkyWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const selectedKey = selectedWord
    ? studyIdentityKey(selectedWord.surface, selectedWord.reading)
    : "";

  const claimedCount = useMemo(() => Object.keys(claims).length, [claims]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);

        const [
          { data: poolData, error: poolError },
          { data: settingsData, error: settingsError },
          { data: libraryRows, error: libraryError },
          { data: progressRows, error: progressError },
        ] = await Promise.all([
          withTimeout(
            supabase.rpc("get_word_sky_pool", { p_limit: 180 }),
            4500,
            "Word Sky pool"
          ),
          withTimeout(
            supabase
              .from("user_learning_settings")
              .select("red_stages, orange_stages, yellow_stages")
              .eq("user_id", user.id)
              .maybeSingle<LibraryStudyColorSettings>(),
            4500,
            "Reading color settings"
          ),
          withTimeout(
            supabase
              .from("user_library_word_summaries")
              .select("study_identity_key, surface, reading, meaning, jlpt, total_encounter_count")
              .eq("user_id", user.id)
              .or("jlpt.in.(N2,N1,NON-JLPT),jlpt.is.null")
              .not("surface", "is", null)
              .not("reading", "is", null)
              .not("meaning", "is", null)
              .order("last_seen_at", { ascending: false })
              .limit(500)
              .returns<LibrarySummarySkyRow[]>(),
            4500,
            "Personal Word Sky words"
          ),
          withTimeout(
            supabase
              .from("user_library_word_progress")
              .select(
                "study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, reading_gate_attempts, mastered"
              )
              .eq("user_id", user.id)
              .limit(20000)
              .returns<LibraryProgressSkyRow[]>(),
            4500,
            "Personal Word Sky progress"
          ),
        ]);

        const poolRows = Array.isArray(poolData) ? (poolData as WordSkyPoolRow[]) : [];

        if (poolError) {
          console.warn("Word Sky pool is using fallback words:", poolError);
        }
        if (settingsError) {
          console.warn("Word Sky is using default reading color settings:", settingsError);
        }
        if (libraryError) {
          console.warn("Personal Word Sky words did not load:", libraryError);
        }
        if (progressError) {
          console.warn("Personal Word Sky progress did not load:", progressError);
        }

        const starterPool =
          !poolError && poolRows.length > 0
            ? poolRows
              .map((row, index): SkyWord | null => {
                const surface = (row.surface ?? "").trim();
                const reading = (row.reading ?? "").trim();
                const meaning = (row.meaning ?? "").trim();

                if (!surface || !reading || !meaning) return null;

                return {
                  surface,
                  reading,
                  meaning,
                  level: levelForWord(row, index),
                  jlpt: row.jlpt ?? null,
                  encounterCount: row.total_encounter_count ?? null,
                };
              })
              .filter((word): word is SkyWord => Boolean(word))
            : FALLBACK_SKY_WORDS;

        const colorSettings = settingsError
          ? { red_stages: 1, orange_stages: 1, yellow_stages: 1 }
          : settingsData ?? { red_stages: 1, orange_stages: 1, yellow_stages: 1 };

        const progressByKey = new Map<string, LibraryProgressSkyRow>();
        for (const row of progressError ? [] : progressRows ?? []) {
          if (row.study_identity_key) progressByKey.set(row.study_identity_key, row);
        }

        const libraryColorByKey: Record<string, LibraryStudyColor> = {};
        for (const row of libraryError ? [] : libraryRows ?? []) {
          const key = row.study_identity_key;
          if (!key) continue;

          libraryColorByKey[key] = libraryColorForWord(
            row,
            progressByKey.get(key),
            colorSettings
          );
        }

        const personalPool =
          libraryError
            ? []
            : shuffleArray(
              (libraryRows ?? [])
                .map((row, index): SkyWord | null => {
                  const surface = (row.surface ?? "").trim();
                  const reading = (row.reading ?? "").trim();
                  const meaning = (row.meaning ?? "").trim();
                  if (!surface || !reading || !meaning) return null;
                  if (
                    !shouldIncludePersonalLibraryWord(
                      row,
                      row.study_identity_key ? progressByKey.get(row.study_identity_key) : null,
                      colorSettings
                    )
                  ) {
                    return null;
                  }

                  return {
                    surface,
                    reading,
                    meaning,
                    level: levelForWord(
                      {
                        study_identity_key: row.study_identity_key,
                        surface,
                        reading,
                        meaning,
                        jlpt: row.jlpt,
                        total_encounter_count: row.total_encounter_count,
                        book_count: null,
                      },
                      index
                    ),
                    jlpt: row.jlpt ?? null,
                    encounterCount: row.total_encounter_count ?? null,
                  };
                })
                .filter((word): word is SkyWord => Boolean(word))
            ).slice(0, PERSONAL_LIBRARY_WORD_LIMIT);

        const seenKeys = new Set<string>();
        const loadedPool = [...starterPool, ...personalPool].filter((word) => {
          const key = studyIdentityKey(word.surface, word.reading);
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });

        const starterKeysWithoutColor = starterPool
          .map((word) => studyIdentityKey(word.surface, word.reading))
          .filter((key) => !libraryColorByKey[key]);

        if (starterKeysWithoutColor.length > 0) {
          const { data: starterSummaryRows, error: starterSummaryError } = await withTimeout(
            supabase
              .from("user_library_word_summaries")
              .select("study_identity_key, total_encounter_count")
              .eq("user_id", user.id)
              .in("study_identity_key", starterKeysWithoutColor)
              .returns<LibrarySummarySkyRow[]>(),
            4500,
            "Starter Word Sky library colors"
          );

          if (starterSummaryError) {
            console.warn("Starter Word Sky library colors did not load:", starterSummaryError);
          } else {
            for (const row of starterSummaryRows ?? []) {
              const key = row.study_identity_key;
              if (!key) continue;

              libraryColorByKey[key] = libraryColorForWord(
                row,
                progressByKey.get(key),
                colorSettings
              );
            }
          }
        }

        const finalPool = loadedPool.filter((word) => {
          const key = studyIdentityKey(word.surface, word.reading);
          return !shouldHideFromWordSkyByLibraryColor(libraryColorByKey[key]);
        });

        const shuffledPool = shuffleArray(finalPool.length > 0 ? finalPool : loadedPool);
        setWordPool(shuffledPool);
        setVisibleWords(makeVisibleWords(shuffledPool));
        setLibraryColors(libraryColorByKey);

        const keys = shuffledPool.map((word) => studyIdentityKey(word.surface, word.reading));
        const { data, error } = await withTimeout(
          supabase
            .from("user_library_word_claims")
            .select("id, study_identity_key, claimed_color")
            .eq("user_id", user.id)
            .in("study_identity_key", keys)
            .returns<ClaimRow[]>(),
          4500,
          "Word Sky claims"
        );

        if (error) {
          console.warn("Word Sky claims did not load:", error);
        }

        if (!cancelled) {
          const next: Record<string, ClaimRow> = {};
          for (const row of error ? [] : data ?? []) {
            next[row.study_identity_key] = row;
          }
          setClaims(next);
        }
      } catch (error: any) {
        setMessage(
          error?.message?.includes("user_library_word_claims")
            ? "Word Sky needs its small claims table before it can save."
            : error?.message ?? "Could not load Word Sky."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (wordPool.length === 0) return;
    if (selectedWord) return;

    const timer = window.setInterval(() => {
      setVisibleWords(makeVisibleWords(shuffleArray(wordPool)));
    }, 55000);

    return () => window.clearInterval(timer);
  }, [wordPool, selectedWord]);

  async function saveClaim(word: SkyWord, color: ClaimedColor) {
    if (!userId) return;

    const key = studyIdentityKey(word.surface, word.reading);
    setSavingKey(key);
    setMessage("");

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("user_library_word_claims")
          .upsert(
            {
              user_id: userId,
              study_identity_key: key,
              surface: word.surface,
              reading: word.reading,
              meaning: word.meaning,
              claimed_color: color,
              source: "word_sky",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,study_identity_key" }
          )
          .select("id, study_identity_key, claimed_color")
          .single<ClaimRow>(),
        6000,
        "Saving this word"
      );

      if (error) {
        setMessage(error.message ?? "Could not save this word.");
        return;
      }

      if (data) {
        setClaims((prev) => ({ ...prev, [key]: data }));
      }
      setSelectedWord(null);
    } catch (error: any) {
      setMessage(error?.message ?? "Could not save this word.");
    } finally {
      setSavingKey(null);
    }
  }

  async function clearClaim(word: SkyWord) {
    if (!userId) return;

    const key = studyIdentityKey(word.surface, word.reading);
    setSavingKey(key);
    setMessage("");

    const { error } = await supabase
      .from("user_library_word_claims")
      .delete()
      .eq("user_id", userId)
      .eq("study_identity_key", key);

    setSavingKey(null);

    if (error) {
      setMessage(error.message ?? "Could not clear this word.");
      return;
    }

    setClaims((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSelectedWord(null);
  }

  if (loading) {
    return <WordSkyLoadingState />;
  }

  return (
    <main className="min-h-screen bg-[#eef5fb] px-4 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Word Sky</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
              Pick words you think you can read. These words can automatically move into Ability Check and Library Practice,
              but encountering words through your reading is still the ideal path.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              {claimedCount} claimed
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              {wordPool.length} in sky
            </div>
            <button
              type="button"
              onClick={() => router.push("/library-study")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Ability Check
            </button>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </div>
        ) : null}

        <section className="relative min-h-[68vh] overflow-hidden rounded-3xl border border-sky-100/80 bg-gradient-to-b from-[#f3fbff] via-[#e4f4ff] to-[#f4f7ff] shadow-sm">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute left-[8%] top-[12%] h-28 w-28 rounded-full bg-white/60 blur-3xl" />
            <div className="absolute right-[10%] top-[18%] h-56 w-56 rounded-full bg-sky-200/60 blur-3xl" />
            <div className="absolute bottom-[10%] left-[26%] h-44 w-44 rounded-full bg-blue-100/80 blur-3xl" />
            <div className="absolute bottom-[18%] right-[28%] h-36 w-36 rounded-full bg-cyan-100/70 blur-3xl" />
          </div>

          <div className="absolute inset-0">
            {visibleWords.map((word) => {
              const key = studyIdentityKey(word.surface, word.reading);
              const claim = claims[key]?.claimed_color ?? null;
              const bubbleColor = claim ?? libraryColors[key] ?? null;
              const isSelected = selectedKey === key;

              return (
                <button
                  key={word.skyId}
                  type="button"
                  onClick={() => setSelectedWord(isSelected ? null : word)}
                  className={[
                    "absolute rounded-full border-0 bg-transparent p-0 text-left shadow-none transition",
                    isSelected ? "ring-2 ring-slate-700" : "",
                  ].join(" ")}
                  style={{
                    left: "-18%",
                    top: `${word.lane}%`,
                    animation: `word-sky-cross ${word.duration}s linear ${word.delay}s infinite`,
                  }}
                >
                  <span
                    className={`block rounded-full border px-4 py-3 shadow-sm backdrop-blur transition hover:shadow-md ${colorClass(bubbleColor)}`}
                    style={{
                      animation: `word-sky-bob ${word.bobDuration}s ease-in-out ${word.bobDelay}s infinite`,
                    }}
                  >
                    <span className="block text-lg font-semibold leading-none">{word.surface}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur md:left-auto md:w-[360px]">
            {selectedWord ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Selected
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{selectedWord.surface}</div>
                    <div className="text-sm text-slate-500">
                      {selectedWord.reading} · {selectedWord.meaning}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {(selectedWord.jlpt ?? "Non-JLPT").toUpperCase()}
                      {selectedWord.encounterCount
                        ? ` · ${selectedWord.encounterCount} library encounters`
                        : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedWord(null)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
                    aria-label="Close selected word"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => saveClaim(selectedWord, "green")}
                    disabled={savingKey === selectedKey}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition hover:brightness-95 disabled:opacity-60 ${colorClass("green")}`}
                  >
                    {colorLabel("green")}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (claims[selectedKey]) {
                        void clearClaim(selectedWord);
                      } else {
                        setSelectedWord(null);
                      }
                    }}
                    disabled={savingKey === selectedKey}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Leave it clear
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="text-sm font-semibold text-slate-700">Tap a floating word.</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Claimed words stay separate from real reading encounters.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes word-sky-cross {
          0% {
            transform: translate3d(-24vw, 0, 0);
          }
          100% {
            transform: translate3d(124vw, 0, 0);
          }
        }

        @keyframes word-sky-bob {
          0% {
            transform: translate3d(0, -14px, 0) rotate(-0.8deg);
          }
          25% {
            transform: translate3d(8px, 9px, 0) rotate(0.7deg);
          }
          50% {
            transform: translate3d(-7px, 20px, 0) rotate(-0.6deg);
          }
          75% {
            transform: translate3d(7px, 2px, 0) rotate(0.7deg);
          }
          100% {
            transform: translate3d(0, -14px, 0) rotate(-0.8deg);
          }
        }
      `}</style>
    </main>
  );
}
