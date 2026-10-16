// Word Sky
//
"use client";

import { loadPersonallyHiddenStudyKeys } from "@/lib/vocabulary/personalVisibilityData";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorSettings,
  type LibraryStudyGateStatus,
} from "@/lib/libraryStudyColor";
import { supabase } from "@/lib/supabaseClient";
import WordSkyLoadingState from "./components/WordSkyLoadingState";
import WordSkyHeader from "./components/WordSkyHeader";
import WordSkyMessageBanner from "./components/WordSkyMessageBanner";
import WordSkyScene from "./components/WordSkyScene";
import WordSkyBubble from "./components/WordSkyBubble";
import WordSkySelectedPanel from "./components/WordSkySelectedPanel";
import WordSkyEmptySelectionPanel from "./components/WordSkyEmptySelectionPanel";

type ClaimedColor = "green" | "blue" | "purple";
type SkyBubbleColor = ClaimedColor | LibraryStudyColor;

type SkyWord = {
  study_identity_key?: string | null;
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

type LibraryColorSkyRow = {
  study_identity_key: string | null;
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

const LANES = [3, 8, 13, 18, 24, 30, 36, 43, 50, 57, 64, 71, 78, 85, 92];
const VISIBLE_WORD_COUNT = 36;

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
  if (jlpt === "N2") return "bright";
  return index % 3 === 0 ? "bright" : index % 2 === 0 ? "middle" : "soft";
}

function libraryColorForWord(
  row: Pick<LibraryColorSkyRow, "total_encounter_count">,
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

function makeVisibleWords(words: SkyWord[]) {
  return words.slice(0, VISIBLE_WORD_COUNT).map((word, index) => {
    const laneBase = LANES[(index * 7 + 4) % LANES.length];
    const laneNudge = ((index * 13) % 11) - 5;

    return {
      ...word,
      skyId: `${(word.study_identity_key || studyIdentityKey(word.surface, word.reading))}-${index}-${Date.now()}`,
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
  const [wordPool, setWordPool] = useState<SkyWord[]>([]);
  const [visibleWords, setVisibleWords] = useState<VisibleSkyWord[]>([]);
  const [claims, setClaims] = useState<Record<string, ClaimRow>>({});
  const [libraryColors, setLibraryColors] = useState<Record<string, LibraryStudyColor>>({});
  const [selectedWord, setSelectedWord] = useState<SkyWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [canUseWordSky, setCanUseWordSky] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const selectedKey = selectedWord
    ? (selectedWord.study_identity_key || studyIdentityKey(selectedWord.surface, selectedWord.reading))
    : "";

  const claimedCount = useMemo(() => Object.keys(claims).length, [claims]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setCanUseWordSky(false);

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

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const roleForAccess = profileRow?.is_super_teacher
          ? "super_teacher"
          : profileRow?.role;

        const appStatus = getAppAccessStatus({
          role: roleForAccess,
          app_access_type: profileRow?.app_access_type ?? null,
          app_access_expires_at: profileRow?.app_access_expires_at ?? null,
        });

        const featureAccess = getFeatureAccess({
          role: roleForAccess,
          hasFullAccess: appStatus.hasFullAccess,
          isTrialActive: appStatus.reason === "trial",
        });

        if (!featureAccess.canUseAdvancedStudy) {
          if (!cancelled) {
            setMessage("Word Sky is available with full learning access.");
            setUserId(null);
            setCanUseWordSky(false);
          }
          return;
        }

        setUserId(user.id);
        setCanUseWordSky(true);

        const [
          { data: poolData, error: poolError },
          { data: settingsData, error: settingsError },
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
              .from("user_library_word_progress")
              .select(
                "study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, reading_gate_attempts, mastered"
              )
              .eq("definition_key", "")
              .eq("user_id", user.id)
              .limit(20000)
              .returns<LibraryProgressSkyRow[]>(),
            4500,
            "Personal Word Sky progress"
          ),
        ]);

        const poolRows = Array.isArray(poolData) ? (poolData as WordSkyPoolRow[]) : [];

        if (poolError) {
          console.error("Word Sky reference pool did not load:", poolError);
          if (!cancelled) {
            setMessage("The shared Word Sky word list could not be loaded. Please try again shortly.");
          }
        }
        if (settingsError) {
          console.warn("Word Sky is using default reading color settings:", settingsError);
        }
        if (progressError) {
          console.warn("Personal Word Sky progress did not load:", progressError);
        }

        const starterPool = poolError
          ? []
          : poolRows
            .map((row, index): SkyWord | null => {
              const surface = (row.surface ?? "").trim();
              const reading = (row.reading ?? "").trim();
              const meaning = (row.meaning ?? "").trim();

              if (!surface || !reading || !meaning) return null;

              return {
                surface,
                study_identity_key: row.study_identity_key,
                reading,
                meaning,
                level: levelForWord(row, index),
                jlpt: row.jlpt ?? null,
                encounterCount: row.total_encounter_count ?? null,
              };
            })
            .filter((word): word is SkyWord => Boolean(word));

        const colorSettings = settingsError
          ? { red_stages: 1, orange_stages: 1, yellow_stages: 1 }
          : settingsData ?? { red_stages: 1, orange_stages: 1, yellow_stages: 1 };

        const progressByKey = new Map<string, LibraryProgressSkyRow>();
        for (const row of progressError ? [] : progressRows ?? []) {
          if (row.study_identity_key) progressByKey.set(row.study_identity_key, row);
        }

        const starterKeys = starterPool
          .map((word) => word.study_identity_key || studyIdentityKey(word.surface, word.reading));
        const libraryColorByKey: Record<string, LibraryStudyColor> = {};
        if (starterKeys.length > 0) {
          const { data: summaryRows, error: summaryError } = await withTimeout(
            supabase
              .from("user_library_word_summaries")
              .select("study_identity_key, total_encounter_count")
              .eq("user_id", user.id)
              .in("study_identity_key", starterKeys)
              .returns<LibraryColorSkyRow[]>(),
            4500,
            "Word Sky reading colors"
          );

          if (summaryError) {
            console.warn("Word Sky reading colors did not load:", summaryError);
          } else {
            for (const row of summaryRows ?? []) {
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

        const personallyHidden = await loadPersonallyHiddenStudyKeys();
        const loadedPool = starterPool.filter((word) => {
          const key = word.study_identity_key || studyIdentityKey(word.surface, word.reading);
          return !personallyHidden.has(key);
        });

        const finalPool = loadedPool.filter((word) => {
          const key = (word.study_identity_key || studyIdentityKey(word.surface, word.reading));
          return !shouldHideFromWordSkyByLibraryColor(libraryColorByKey[key]);
        });

        const shuffledPool = shuffleArray(finalPool);
        if (shuffledPool.length === 0 && !poolError) {
          setMessage("There are no active shared Word Sky reference words available right now.");
        }
        setWordPool(shuffledPool);
        setVisibleWords(makeVisibleWords(shuffledPool));
        setLibraryColors(libraryColorByKey);

        const keys = shuffledPool.map((word) => (word.study_identity_key || studyIdentityKey(word.surface, word.reading)));
        if (keys.length === 0) {
          if (!cancelled) setClaims({});
          return;
        }

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
        setWordPool([]);
        setVisibleWords([]);
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
    if (!userId || !canUseWordSky) return;

    const key = (word.study_identity_key || studyIdentityKey(word.surface, word.reading));
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
    if (!userId || !canUseWordSky) return;

    const key = (word.study_identity_key || studyIdentityKey(word.surface, word.reading));
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

  if (!canUseWordSky) {
    return (
      <main className="min-h-screen bg-[#eef5fb] px-4 py-5 text-slate-900 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <button
            type="button"
            onClick={() => router.push("/library-study")}
            className="w-fit text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            ← Back to Study Hub
          </button>

          <section className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Advanced Study
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Word Sky</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Word Sky is available with full learning access. It uses the shared reference word list,
              along with your reading-color progress and Word Sky claims.
            </p>

            {message ? (
              <p className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                {message}
              </p>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef5fb] px-4 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <WordSkyHeader
          claimedCount={claimedCount}
          wordPoolCount={wordPool.length}
          onBackToStudy={() => router.push("/library-study")}
        />

        <WordSkyMessageBanner message={message} />

        <WordSkyScene>

          <div className="absolute inset-0">
            {visibleWords.map((word) => {
              const key = (word.study_identity_key || studyIdentityKey(word.surface, word.reading));
              const claim = claims[key]?.claimed_color ?? null;
              const bubbleColor = claim ?? libraryColors[key] ?? null;
              const isSelected = selectedKey === key;

              return (
                <WordSkyBubble
                  key={word.skyId}
                  word={word}
                  bubbleClassName={colorClass(bubbleColor)}
                  isSelected={isSelected}
                  onClick={() => setSelectedWord(isSelected ? null : word)}
                />
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur md:left-auto md:w-[360px]">
            {selectedWord ? (
              <WordSkySelectedPanel
                selectedWord={selectedWord}
                selectedKey={selectedKey}
                hasClaim={Boolean(claims[selectedKey])}
                isSaving={savingKey === selectedKey}
                greenButtonClassName={colorClass("green")}
                greenLabel={colorLabel("green")}
                onSaveGreen={() => void saveClaim(selectedWord, "green")}
                onClearOrClose={() => {
                  if (claims[selectedKey]) {
                    void clearClaim(selectedWord);
                  } else {
                    setSelectedWord(null);
                  }
                }}
                onClose={() => setSelectedWord(null)}
              />
            ) : (
              <WordSkyEmptySelectionPanel />
            )}
          </div>
        </WordSkyScene>
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
