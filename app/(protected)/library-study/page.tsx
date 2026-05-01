// Library Study
// 

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeLibraryStudyColorStatus,
  getLibraryStudyEncounterStageCounts,
  type LibraryStudyGateStatus,
  type LibraryStudyColorStatus,
} from "@/lib/libraryStudyColor";
import { supabase } from "@/lib/supabaseClient";
import { recordStudyEvent } from "@/lib/studyEvents";

type UserBookJoinRow = {
  id: string;
  books:
  | {
    title: string | null;
    cover_url: string | null;
  }
  | {
    title: string | null;
    cover_url: string | null;
  }[]
  | null;
};

type UserBookWordRow = {
  id: string;
  user_book_id: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  hidden: boolean | null;
  created_at: string;
};

type LearningSettingsRow = {
  red_stages: number | null;
  orange_stages: number | null;
  yellow_stages: number | null;
  show_badge_numbers: boolean | null;
  skip_katakana_library_check?: boolean | null;
};

type LibraryWordProgressRow = {
  id?: string;
  user_id: string;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  definition_key: string;
  reading_gate_status: LibraryStudyGateStatus;
  meaning_gate_status: LibraryStudyGateStatus;
  held_before_reading_gate: boolean;
  held_before_meaning_gate: boolean;
  mastered: boolean;
  reading_gate_attempts: number;
  meaning_gate_attempts: number;
  reading_gate_passed_at: string | null;
  reading_gate_failed_at: string | null;
  meaning_gate_passed_at: string | null;
  meaning_gate_failed_at: string | null;
  mastered_at: string | null;
  last_studied_at: string | null;
};

type LibraryWordSummaryRow = {
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  total_encounter_count: number | null;
  check_ready_encounter_count: number | null;
  sample_user_book_word_id: string | null;
  sample_user_book_id: string | null;
  sample_book_title: string | null;
  sample_book_cover_url: string | null;
};

type LibraryCheckGate = "reading" | "meaning";

type StudyCard = {
  id: string;
  userBookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  surface: string;
  reading: string;
  meaning: string;
  jlpt: string | null;
  encounterCount: number;
  encounterIds: string[];
  colorStatus: LibraryStudyColorStatus;
  activeGate: LibraryCheckGate;
  studyIdentityKey: string;
  progress: LibraryWordProgressRow | null;
};

type LibraryCheckDebug = {
  threshold: number;
  rawRows: number;
  completeGroups: number;
  eligibleCards: number;
  filteredCards: number;
  topCompleteGroups: {
    surface: string;
    reading: string;
    encounters: number;
    reason: string;
  }[];
};

type StudyMode =
  | "reading_typing"
  | "meaning_typing"
  | "reading_to_meaning_typing"
  | "reading_mc"
  | "meaning_mc"
  | "reading_to_kanji_mc"
  | "reading_to_meaning_mc"
  | "complete_study";

type LibraryStudyMode = "check" | "practice";
type PracticeRevealStep = "word" | "reading" | "meaning";

const STORAGE_KEY = "library-study-seen-by-date";

const DEFAULT_LEARNING_SETTINGS: LearningSettingsRow = {
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
  skip_katakana_library_check: true,
};

const LIBRARY_CHECK_WORD_PAGE_SIZE = 1000;

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeText(value: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(value: string) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function normalizeJlpt(value: string | null | undefined) {
  return (value ?? "NON-JLPT").toUpperCase() || "NON-JLPT";
}

function isKatakanaOnly(value: string | null | undefined) {
  const compact = (value ?? "").trim().replace(/\s+/g, "");
  return compact.length > 0 && /^[ァ-ヶー・･]+$/.test(compact);
}

function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
  const normalizedSurface = normalizeText(surface ?? "");
  const normalizedReading = normalizeKana(reading ?? "");
  if (!normalizedSurface) return "";
  return `${normalizedSurface}||${normalizedReading}`;
}

function getBookMeta(row: UserBookJoinRow) {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return {
    title: book?.title ?? "Untitled",
    cover_url: book?.cover_url ?? null,
  };
}

async function loadAllLibraryCheckWords(userBookIds: string[]) {
  const allRows: UserBookWordRow[] = [];
  let from = 0;

  while (true) {
    const to = from + LIBRARY_CHECK_WORD_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("user_book_words")
      .select("id, user_book_id, surface, reading, meaning, jlpt, hidden, created_at")
      .in("user_book_id", userBookIds)
      .or("hidden.is.null,hidden.eq.false")
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<UserBookWordRow[]>();

    if (error) throw error;

    allRows.push(...(data ?? []));

    if (!data || data.length < LIBRARY_CHECK_WORD_PAGE_SIZE) {
      break;
    }

    from += LIBRARY_CHECK_WORD_PAGE_SIZE;
  }

  return allRows;
}

function libraryStudyCardClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  const base =
    "relative flex min-h-[30vh] w-full max-w-2xl items-center justify-center rounded-2xl border p-6 text-center shadow-2xl transition-colors sm:min-h-[36vh]";

  if (color === "green") return `${base} border-emerald-100 bg-[#f5fcf8]`;
  if (color === "blue") return `${base} border-sky-100 bg-[#f5fbff]`;
  if (color === "grey") return `${base} border-slate-100 bg-[#f8fafc]`;
  if (color === "purple") return `${base} border-violet-100 bg-[#fbf8ff]`;
  if (color === "red") return `${base} border-rose-100 bg-[#fff7f8]`;
  if (color === "orange") return `${base} border-orange-100 bg-[#fff9f2]`;
  return `${base} border-amber-100 bg-[#fffdf3]`;
}

function libraryStudyChipClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  const base = "rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm";

  if (color === "green") return `${base} border-emerald-100 bg-white/90 text-emerald-900`;
  if (color === "blue") return `${base} border-sky-100 bg-white/90 text-sky-900`;
  if (color === "grey") return `${base} border-slate-100 bg-white/90 text-slate-700`;
  if (color === "purple") return `${base} border-violet-100 bg-white/90 text-violet-900`;
  if (color === "red") return `${base} border-rose-100 bg-white/90 text-rose-900`;
  if (color === "orange") return `${base} border-orange-100 bg-white/90 text-orange-950`;
  return `${base} border-amber-100 bg-white/90 text-amber-950`;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickLibraryCheckGate(status: LibraryStudyColorStatus, seed: string): LibraryCheckGate {
  if (status.nextGate === "reading") return "reading";
  if (status.nextGate === "meaning") return "meaning";
  return hashString(`${seed}::${getTodayKey()}`) % 2 === 0 ? "reading" : "meaning";
}

function includeLibraryCheckCard(status: LibraryStudyColorStatus) {
  return (
    status.eligibleForLibraryStudy ||
    status.nextGate === "mastery" ||
    status.color === "purple"
  );
}

function gatePromptText(card: StudyCard | undefined) {
  if (!card) return "Will you pass through?";
  if (card.colorStatus.color === "purple") return "A mastered word is back for a quiet check.";
  if (card.colorStatus.nextGate === "mastery") return "One more check before this word settles.";
  return card.activeGate === "meaning"
    ? "Will you pass the MEANING gate?"
    : "Will you pass the READING gate?";
}

function gatePromptClass(card: StudyCard | undefined) {
  const base = "rounded-full border px-5 py-2 text-sm font-semibold shadow-sm";

  if (card?.activeGate === "meaning") {
    return `${base} border-sky-200 bg-sky-100 text-sky-950`;
  }

  return `${base} border-emerald-200 bg-emerald-100 text-emerald-950`;
}

function checkModeLabel(card: StudyCard | undefined) {
  if (!card) return "Library Check";
  if (card.colorStatus.color === "purple") {
    return card.activeGate === "reading" ? "Mastered Reading Review" : "Mastered Meaning Review";
  }
  if (card.colorStatus.nextGate === "mastery") {
    return card.activeGate === "reading" ? "Mastery Reading Check" : "Mastery Meaning Check";
  }
  if (card.activeGate === "reading") return "Reading Check";
  if (card.activeGate === "meaning") return "Meaning Check";
  return "Library Check";
}

function checkModeDescription(card: StudyCard | undefined) {
  if (!card) return "Automatic typed gates move words through your library colors";
  if (card.activeGate === "reading") {
    return "Show word + meaning -> type the reading";
  }
  if (card.activeGate === "meaning") {
    return "Show word + reading -> type one meaning word";
  }
  return "Automatic typed gates move words through your library colors";
}

function promptModeClass(gate: LibraryCheckGate | undefined) {
  const base =
    "rounded-2xl border px-7 py-3 text-2xl font-bold uppercase tracking-wide shadow-sm";

  if (gate === "meaning") {
    return `${base} border-sky-200 bg-sky-100 text-sky-950`;
  }

  return `${base} border-emerald-200 bg-emerald-100 text-emerald-950`;
}

function KatakanaBadge() {
  return (
    <span
      title="Katakana-only word"
      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
    >
      カ
    </span>
  );
}

function LibraryCheckIntroCard({
  mode,
  onModeChange,
}: {
  mode: LibraryStudyMode;
  onModeChange: (mode: LibraryStudyMode) => void;
}) {
  const colorSteps = [
    { label: "Green", className: "bg-emerald-500", text: "reading passed" },
    { label: "Blue", className: "bg-sky-500", text: "meaning passed" },
    { label: "Purple", className: "bg-violet-500", text: "mastered" },
  ];

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">
            {mode === "practice" ? "Library Practice" : "Library Check"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {mode === "practice"
              ? "A gentle reveal space for reviewing words without moving their colors."
              : "Strict typed gates for words that are ready to move."}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => onModeChange("check")}
            className={`rounded-lg px-3 py-2 transition ${
              mode === "check" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Check
          </button>
          <button
            type="button"
            onClick={() => onModeChange("practice")}
            className={`rounded-lg px-3 py-2 transition ${
              mode === "practice" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Practice
          </button>
        </div>
      </div>

      {mode === "practice" ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-sky-50 px-3 py-2">
            <div className="text-xs font-semibold text-sky-950">Reveal slowly</div>
            <div className="text-[11px] leading-4 text-slate-500">Word, then reading, then meaning.</div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-xs font-semibold text-slate-800">No gate movement</div>
            <div className="text-[11px] leading-4 text-slate-500">Practice never passes or fails a word.</div>
          </div>

          <div className="rounded-xl bg-violet-50 px-3 py-2">
            <div className="text-xs font-semibold text-violet-950">Repeat freely</div>
            <div className="text-[11px] leading-4 text-slate-500">Shuffle and review as much as you want.</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {colorSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className={`h-3 w-3 rounded-full ${step.className}`} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800">{step.label}</div>
                <div className="truncate text-[11px] text-slate-500">{step.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryPracticePanel({
  card,
  total,
  revealStep,
  onRevealReading,
  onRevealMeaning,
  onNext,
  onPrevious,
  onShuffle,
}: {
  card: StudyCard | undefined;
  total: number;
  revealStep: PracticeRevealStep;
  onRevealReading: () => void;
  onRevealMeaning: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
}) {
  if (!card) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Practice Study
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">No practice cards here yet.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          Try another JLPT filter, or add a few easier words from Word Sky.
        </p>
      </div>
    );
  }

  const showReading = revealStep === "reading" || revealStep === "meaning";
  const showMeaning = revealStep === "meaning";

  return (
    <div className="w-full max-w-2xl space-y-2">
      <div className={libraryStudyCardClass(card.colorStatus)}>
        <div className="absolute left-4 right-4 top-4 flex justify-center">
          <div className="rounded-full border border-sky-100 bg-white/90 px-5 py-2 text-sm font-semibold text-sky-950 shadow-sm">
            Practice Study
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          {isKatakanaOnly(card.surface) ? <KatakanaBadge /> : null}

          {card.jlpt ? (
            <div className={libraryStudyChipClass(card.colorStatus)}>{card.jlpt}</div>
          ) : null}

          {card.progress?.definition_key ? (
            <div className={libraryStudyChipClass(card.colorStatus)}>
              Def {card.progress.definition_key}
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
          <div className={libraryStudyChipClass(card.colorStatus)}>
            {card.encounterCount} encounter{card.encounterCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-5 pt-12 pb-10">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Word
          </div>
          <div className="text-5xl font-bold text-slate-950">{card.surface}</div>

          <div className="grid w-full max-w-md gap-3 text-center">
            <div className="rounded-2xl border border-slate-100 bg-white/75 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reading
              </div>
              <div className={`mt-1 text-2xl font-semibold ${showReading ? "text-slate-900" : "text-slate-300"}`}>
                {showReading ? card.reading : "Hidden"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white/75 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Meaning
              </div>
              <div className={`mt-1 text-xl font-semibold ${showMeaning ? "text-slate-900" : "text-slate-300"}`}>
                {showMeaning ? card.meaning : "Hidden"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr]">
        <button
          type="button"
          onClick={onPrevious}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          disabled={total <= 1}
        >
          Previous
        </button>

        {revealStep === "word" ? (
          <button
            type="button"
            onClick={onRevealReading}
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Show Reading
          </button>
        ) : revealStep === "reading" ? (
          <button
            type="button"
            onClick={onRevealMeaning}
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Show Meaning
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Next Card
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          disabled={total <= 1}
        >
          Skip
        </button>

        <button
          type="button"
          onClick={onShuffle}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          disabled={total <= 1}
        >
          Shuffle
        </button>
      </div>

      <p className="text-center text-xs leading-5 text-slate-500">
        Practice does not move colors or count as passing a Library Check gate.
      </p>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const maybeError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return (
    [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter(Boolean)
      .join(" ") || "Unknown error"
  );
}

function uniqueByNormalized(
  values: string[],
  normalize: (value: string) => string,
  exclude: string
) {
  const seen = new Set<string>();
  const out: string[] = [];
  const excludeNorm = normalize(exclude);

  for (const value of values) {
    const norm = normalize(value);
    if (!norm || norm === excludeNorm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(value);
  }

  return out;
}

function matchesAnyMeaning(input: string, fullMeaning: string) {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return false;

  const semicolonParts = fullMeaning
    .split(";")
    .map((part) => normalizeText(part))
    .filter(Boolean);

  for (const part of semicolonParts) {
    if (part === normalizedInput) return true;

    const commaParts = part
      .split(",")
      .map((piece) => normalizeText(piece))
      .filter(Boolean);

    for (const piece of commaParts) {
      if (piece === normalizedInput) return true;

      const words = piece
        .replace(/[()]/g, " ")
        .split(/\s+/)
        .map((word) => normalizeText(word))
        .filter(Boolean);

      if (words.includes(normalizedInput)) {
        return true;
      }
    }
  }

  return false;
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadSeenForToday() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const today = getTodayKey();
    const todaysValues = parsed[today] ?? [];
    return new Set(todaysValues);
  } catch {
    return new Set<string>();
  }
}

function saveSeenForToday(values: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    const today = getTodayKey();

    const cleaned: Record<string, string[]> = {};
    cleaned[today] = Array.from(values);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...cleaned }));
  } catch {
    // ignore localStorage failures
  }
}

function clearSeenForToday() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    const today = getTodayKey();
    delete parsed[today];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore localStorage failures
  }
}

export default function LibraryStudyPage() {
  const router = useRouter();
  const typingInputRef = useRef<HTMLInputElement | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [learningSettings, setLearningSettings] =
    useState<LearningSettingsRow>(DEFAULT_LEARNING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [allCards, setAllCards] = useState<StudyCard[]>([]);
  const [deck, setDeck] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [practiceDeck, setPracticeDeck] = useState<StudyCard[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceRevealStep, setPracticeRevealStep] = useState<PracticeRevealStep>("word");
  const [, setDebugInfo] = useState<LibraryCheckDebug | null>(null);

  const [libraryMode, setLibraryMode] = useState<LibraryStudyMode>("check");
  const [selectedJlpt, setSelectedJlpt] = useState("all");
  const [studyMode, setStudyMode] = useState<StudyMode>("reading_typing");

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);
  const [typingInput, setTypingInput] = useState("");

  const [twoStepStage, setTwoStepStage] = useState<1 | 2>(1);
  const [firstStepChecked, setFirstStepChecked] = useState<null | { ok: boolean; correct: string }>(
    null
  );
  const [secondStepInput, setSecondStepInput] = useState("");
  const [secondStepChecked, setSecondStepChecked] = useState<
    null | { ok: boolean; correct: string }
  >(null);

  const [endedEarly, setEndedEarly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [seenTodayIds, setSeenTodayIds] = useState<Set<string>>(new Set());

  const currentCard = deck[index];
  const practiceCard = practiceDeck[practiceIndex];

  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      const jlptMatch = selectedJlpt === "all" || normalizeJlpt(card.jlpt) === selectedJlpt;
      const notSeenToday = !seenTodayIds.has(card.id);
      return jlptMatch && notSeenToday;
    });
  }, [allCards, selectedJlpt, seenTodayIds]);

  const practiceFilteredCards = useMemo(() => {
    return allCards.filter((card) => selectedJlpt === "all" || normalizeJlpt(card.jlpt) === selectedJlpt);
  }, [allCards, selectedJlpt]);

  useEffect(() => {
    setDebugInfo((prev) => (prev ? { ...prev, filteredCards: filteredCards.length } : prev));
  }, [filteredCards.length]);

  const meaningOptions = useMemo(() => {
    if (!currentCard) return [];

    const distractors = uniqueByNormalized(
      filteredCards
        .filter((card) => card.id !== currentCard.id)
        .map((card) => card.meaning),
      normalizeText,
      currentCard.meaning
    ).slice(0, 3);

    return shuffleArray([currentCard.meaning, ...distractors]);
  }, [currentCard, filteredCards]);

  const readingOptions = useMemo(() => {
    if (!currentCard) return [];

    const distractors = uniqueByNormalized(
      filteredCards
        .filter((card) => card.id !== currentCard.id)
        .map((card) => card.reading),
      normalizeKana,
      currentCard.reading
    ).slice(0, 3);

    return shuffleArray([currentCard.reading, ...distractors]);
  }, [currentCard, filteredCards]);

  const surfaceOptions = useMemo(() => {
    if (!currentCard) return [];

    const distractors = uniqueByNormalized(
      filteredCards
        .filter((card) => card.id !== currentCard.id)
        .map((card) => card.surface),
      normalizeText,
      currentCard.surface
    ).slice(0, 3);

    return shuffleArray([currentCard.surface, ...distractors]);
  }, [currentCard, filteredCards]);

  useEffect(() => {
    setSeenTodayIds(loadSeenForToday());
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNeedsSignIn(false);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          setCurrentUserId(null);
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        const { data: userBooks, error: userBooksErr } = await supabase
          .from("user_books")
          .select(`
            id,
            books:book_id (
              title,
              cover_url
            )
          `)
          .eq("user_id", user.id)
          .returns<UserBookJoinRow[]>();

        if (userBooksErr) throw userBooksErr;

        const userBookIds = (userBooks ?? []).map((row) => row.id).filter(Boolean);

        if (userBookIds.length === 0) {
          setAllCards([]);
          setDeck([]);
          setLoading(false);
          return;
        }

        const { data: learningSettings, error: settingsErr } = await supabase
          .from("user_learning_settings")
          .select("red_stages, orange_stages, yellow_stages, show_badge_numbers, skip_katakana_library_check")
          .eq("user_id", user.id)
          .maybeSingle<LearningSettingsRow>();

        if (settingsErr) throw settingsErr;

        const colorSettings = {
          ...DEFAULT_LEARNING_SETTINGS,
          ...(learningSettings ?? {}),
        };
        const encounterThreshold = getLibraryStudyEncounterStageCounts(colorSettings).total;
        setLearningSettings(colorSettings);

        const metaById = new Map<string, { title: string; cover_url: string | null }>();
        for (const row of userBooks ?? []) {
          metaById.set(row.id, getBookMeta(row));
        }

        const { data: summaryRows, error: summaryErr } = await supabase
          .from("user_library_word_summaries")
          .select(
            `
              study_identity_key,
              surface,
              reading,
              meaning,
              jlpt,
              total_encounter_count,
              check_ready_encounter_count,
              sample_user_book_word_id,
              sample_user_book_id,
              sample_book_title,
              sample_book_cover_url
            `
          )
          .eq("user_id", user.id)
          .gte("check_ready_encounter_count", encounterThreshold)
          .order("total_encounter_count", { ascending: false })
          .limit(500)
          .returns<LibraryWordSummaryRow[]>();

        if (!summaryErr && summaryRows && summaryRows.length > 0) {
          const studyKeys = summaryRows
            .map((row) => row.study_identity_key)
            .filter(Boolean);

          const progressByKey = new Map<string, LibraryWordProgressRow>();

          if (studyKeys.length > 0) {
            const { data: progressRows, error: progressErr } = await supabase
              .from("user_library_word_progress")
              .select(
                `
                  id,
                  user_id,
                  study_identity_key,
                  surface,
                  reading,
                  definition_key,
                  reading_gate_status,
                  meaning_gate_status,
                  held_before_reading_gate,
                  held_before_meaning_gate,
                  mastered,
                  reading_gate_attempts,
                  meaning_gate_attempts,
                  reading_gate_passed_at,
                  reading_gate_failed_at,
                  meaning_gate_passed_at,
                  meaning_gate_failed_at,
                  mastered_at,
                  last_studied_at
                `
              )
              .eq("user_id", user.id)
              .eq("definition_key", "")
              .in("study_identity_key", studyKeys)
              .returns<LibraryWordProgressRow[]>();

            if (progressErr) {
              console.warn("Library Check progress did not load:", progressErr);
              setNotice(
                "Library Check loaded, but saved gate progress did not load. You can still preview the cards."
              );
            } else {
              for (const row of progressRows ?? []) {
                progressByKey.set(row.study_identity_key, row);
              }
            }
          }

          const cards: StudyCard[] = summaryRows
            .map((summary) => {
              const surface = (summary.surface ?? "").trim();
              const reading = (summary.reading ?? "").trim();
              const meaning = (summary.meaning ?? "").trim();
              const encounterCount = summary.total_encounter_count ?? 0;
              const progress = progressByKey.get(summary.study_identity_key) ?? null;

              if (!surface || !reading || !meaning || !summary.sample_user_book_word_id) {
                return null;
              }

              if (colorSettings.skip_katakana_library_check && isKatakanaOnly(surface)) {
                return null;
              }

              const colorStatus = computeLibraryStudyColorStatus({
                encounterCount,
                settings: colorSettings,
                readingGate: progress?.reading_gate_status ?? "not_started",
                meaningGate: progress?.meaning_gate_status ?? "not_started",
                heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
                heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
                mastered: progress?.mastered ?? false,
              });

              if (!includeLibraryCheckCard(colorStatus)) return null;

              return {
                id: summary.sample_user_book_word_id,
                userBookId: summary.sample_user_book_id ?? "",
                bookTitle: summary.sample_book_title ?? "Untitled",
                bookCoverUrl: summary.sample_book_cover_url ?? null,
                surface,
                reading,
                meaning,
                jlpt: summary.jlpt ?? null,
                encounterCount,
                encounterIds: [summary.sample_user_book_word_id],
                colorStatus,
                activeGate: pickLibraryCheckGate(colorStatus, summary.study_identity_key),
                studyIdentityKey: summary.study_identity_key,
                progress,
              };
            })
            .filter((card): card is StudyCard => Boolean(card));

          setAllCards(cards);
          setDebugInfo({
            threshold: encounterThreshold,
            rawRows: summaryRows.length,
            completeGroups: summaryRows.length,
            eligibleCards: cards.length,
            filteredCards: cards.length,
            topCompleteGroups: summaryRows.slice(0, 8).map((summary) => {
              const progress = progressByKey.get(summary.study_identity_key) ?? null;
              const encounterCount = summary.total_encounter_count ?? 0;
              const status = computeLibraryStudyColorStatus({
                encounterCount,
                settings: colorSettings,
                readingGate: progress?.reading_gate_status ?? "not_started",
                meaningGate: progress?.meaning_gate_status ?? "not_started",
                heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
                heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
                mastered: progress?.mastered ?? false,
              });

              return {
                surface: summary.surface?.trim() ?? "",
                reading: summary.reading?.trim() ?? "",
                encounters: encounterCount,
                reason: status.reason,
              };
            }),
          });
          return;
        }

        if (summaryErr) {
          console.warn("Library word summaries are not available yet:", summaryErr);
        }

        const words = await loadAllLibraryCheckWords(userBookIds);

        const groupedWords = new Map<string, UserBookWordRow[]>();

        for (const row of words) {
          const surface = row.surface?.trim() ?? "";
          const reading = row.reading?.trim() ?? "";
          const meaning = row.meaning?.trim() ?? "";
          const key = studyIdentityKey(surface, reading);

          if (!surface || !reading || !meaning || !key) continue;

          const group = groupedWords.get(key) ?? [];
          group.push(row);
          groupedWords.set(key, group);
        }

        const progressByKey = new Map<string, LibraryWordProgressRow>();
        const studyKeys = Array.from(groupedWords.entries())
          .filter(([, group]) => group.length >= encounterThreshold)
          .map(([key]) => key);

        if (studyKeys.length > 0) {
          const { data: progressRows, error: progressErr } = await supabase
            .from("user_library_word_progress")
            .select(
              `
                id,
                user_id,
                study_identity_key,
                surface,
                reading,
                definition_key,
                reading_gate_status,
                meaning_gate_status,
                held_before_reading_gate,
                held_before_meaning_gate,
                mastered,
                reading_gate_attempts,
                meaning_gate_attempts,
                reading_gate_passed_at,
                reading_gate_failed_at,
                meaning_gate_passed_at,
                meaning_gate_failed_at,
                mastered_at,
                last_studied_at
              `
            )
            .eq("user_id", user.id)
            .eq("definition_key", "")
            .in("study_identity_key", studyKeys)
            .returns<LibraryWordProgressRow[]>();

          if (progressErr) {
            console.warn("Library Check progress did not load:", progressErr);
            setNotice(
              "Library Check loaded, but saved gate progress did not load. You can still preview the cards."
            );
          } else {
            for (const row of progressRows ?? []) {
              progressByKey.set(row.study_identity_key, row);
            }
          }
        }

        const cards: StudyCard[] = Array.from(groupedWords.entries())
          .map(([key, group]) => {
            const representative = group[0];
            const meta = metaById.get(representative.user_book_id);
            const progress = progressByKey.get(key) ?? null;

            if (
              colorSettings.skip_katakana_library_check &&
              isKatakanaOnly(representative.surface)
            ) {
              return null;
            }

            const colorStatus = computeLibraryStudyColorStatus({
              encounterCount: group.length,
              settings: colorSettings,
              readingGate: progress?.reading_gate_status ?? "not_started",
              meaningGate: progress?.meaning_gate_status ?? "not_started",
              heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
              heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
              mastered: progress?.mastered ?? false,
            });

            if (!includeLibraryCheckCard(colorStatus)) return null;

            return {
              id: representative.id,
              userBookId: representative.user_book_id,
              bookTitle: meta?.title ?? "Untitled",
              bookCoverUrl: meta?.cover_url ?? null,
              surface: representative.surface!.trim(),
              reading: representative.reading!.trim(),
              meaning: representative.meaning!.trim(),
              jlpt: representative.jlpt ?? null,
              encounterCount: group.length,
              encounterIds: group.map((word) => word.id),
              colorStatus,
              activeGate: pickLibraryCheckGate(colorStatus, key),
              studyIdentityKey: key,
              progress,
            };
          })
          .filter((card): card is StudyCard => Boolean(card));

        setAllCards(cards);
        setDebugInfo({
          threshold: encounterThreshold,
          rawRows: words?.length ?? 0,
          completeGroups: groupedWords.size,
          eligibleCards: cards.length,
          filteredCards: cards.length,
          topCompleteGroups: Array.from(groupedWords.entries())
            .map(([key, group]) => {
              const representative = group[0];
              const progress = progressByKey.get(key) ?? null;
              const status = computeLibraryStudyColorStatus({
                encounterCount: group.length,
                settings: colorSettings,
                readingGate: progress?.reading_gate_status ?? "not_started",
                meaningGate: progress?.meaning_gate_status ?? "not_started",
                heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
                heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
                mastered: progress?.mastered ?? false,
              });

              return {
                surface: representative.surface?.trim() ?? "",
                reading: representative.reading?.trim() ?? "",
                encounters: group.length,
                reason: status.reason,
              };
            })
            .sort((a, b) => b.encounters - a.encounters)
            .slice(0, 8),
        });
      } catch (err: any) {
        console.error("Error loading Library Check:", err);
        setErrorMsg(errorMessage(err) || "Failed to load Library Check.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    setDeck(shuffleArray(filteredCards));
    setIndex(0);
    resetCardState();
    setEndedEarly(false);
  }, [filteredCards]);

  useEffect(() => {
    setPracticeDeck(shuffleArray(practiceFilteredCards));
    setPracticeIndex(0);
    setPracticeRevealStep("word");
  }, [practiceFilteredCards]);

  useEffect(() => {
    if (!currentCard) return;
    if (studyMode !== "reading_typing" && studyMode !== "meaning_typing") return;
    if (checked || firstStepChecked || secondStepChecked) return;

    const activeGate = currentCard.activeGate;

    if (activeGate === "reading" && studyMode !== "reading_typing") {
      setStudyMode("reading_typing");
      resetCardState();
    } else if (activeGate === "meaning" && studyMode !== "meaning_typing") {
      setStudyMode("meaning_typing");
      resetCardState();
    }
  }, [currentCard, studyMode, checked, firstStepChecked, secondStepChecked]);

  useEffect(() => {
    if (!checked) return;

    const timer = window.setTimeout(() => {
      movePastCurrentCard();
    }, checked.ok ? 5000 : 5000);

    return () => window.clearTimeout(timer);
  }, [checked]);

  useEffect(() => {
    if (!firstStepChecked || firstStepChecked.ok) return;

    const timer = window.setTimeout(() => {
      movePastCurrentCard();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [firstStepChecked]);

  useEffect(() => {
    if (!secondStepChecked) return;

    const timer = window.setTimeout(() => {
      movePastCurrentCard();
    }, secondStepChecked.ok ? 5000 : 5000);

    return () => window.clearTimeout(timer);
  }, [secondStepChecked]);

  useEffect(() => {
    const needsTypingFocus =
      studyMode === "reading_typing" ||
      studyMode === "meaning_typing" ||
      studyMode === "reading_to_meaning_typing" ||
      studyMode === "complete_study";

    if (!needsTypingFocus) return;
    if (!currentCard) return;

    const timer = window.setTimeout(() => {
      typingInputRef.current?.focus();
      typingInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentCard, index, studyMode, twoStepStage]);

  function resetCardState() {
    setSelectedAnswer(null);
    setChecked(null);
    setTypingInput("");
    setTwoStepStage(1);
    setFirstStepChecked(null);
    setSecondStepInput("");
    setSecondStepChecked(null);
  }

  function markCardSeen(cardId: string) {
    setSeenTodayIds((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      saveSeenForToday(next);
      return next;
    });
  }

  function restartDeck() {
    setDeck(shuffleArray(filteredCards));
    setIndex(0);
    resetCardState();
    setEndedEarly(false);
    setNotice(null);
  }

  function studyAgainToday() {
    clearSeenForToday();
    setSeenTodayIds(new Set());
    setDeck(shuffleArray(allCards));
    setIndex(0);
    resetCardState();
    setEndedEarly(false);
    setNotice("Today’s Library Check memory was cleared for testing.");
  }

  function resetPracticeReveal() {
    setPracticeRevealStep("word");
  }

  function goToNextPracticeCard() {
    if (practiceDeck.length === 0) return;

    setPracticeIndex((prev) => {
      if (prev + 1 >= practiceDeck.length) return 0;
      return prev + 1;
    });
    resetPracticeReveal();
  }

  function goToPreviousPracticeCard() {
    if (practiceDeck.length === 0) return;

    setPracticeIndex((prev) => {
      if (prev <= 0) return practiceDeck.length - 1;
      return prev - 1;
    });
    resetPracticeReveal();
  }

  function shufflePracticeDeck() {
    setPracticeDeck(shuffleArray(practiceFilteredCards));
    setPracticeIndex(0);
    resetPracticeReveal();
  }

  function nextCardWithoutMarkingSeen() {
    if (index + 1 >= deck.length) {
      setIndex(deck.length);
      resetCardState();
      return;
    }

    setIndex((prev) => prev + 1);
    resetCardState();
    setNotice(null);
  }

  function movePastCurrentCard() {
    if (currentCard) {
      markCardSeen(currentCard.id);
    }
    nextCardWithoutMarkingSeen();
  }

  function finishForToday() {
    setEndedEarly(true);
    setIndex(deck.length);
    resetCardState();
  }

  function recordCurrentStudyEvent(
    result: "correct" | "incorrect" | "skipped" | "reviewed",
    isCorrect: boolean | null,
    cardType: string
  ) {
    if (!currentCard) return;

    void recordStudyEvent({
      userBookId:
        (currentCard as any).user_book_id ??
        (currentCard as any).userBookId ??
        null,
      userBookWordId: currentCard.id,
      studyMode: "study_flashcards",
      cardType,
      result,
      isCorrect,
      surface: currentCard.surface,
      reading: currentCard.reading,
      meaning: currentCard.meaning,
    });
  }

  async function saveTypedGateProgress(
    gate: "reading" | "meaning",
    ok: boolean,
    options: { forceMeaning?: boolean } = {}
  ) {
    if (!currentUserId || !currentCard) return;

    const now = new Date().toISOString();
    const existing = currentCard.progress;
    const isMasteryCheck =
      currentCard.colorStatus.nextGate === "mastery" ||
      currentCard.colorStatus.color === "purple" ||
      Boolean(existing?.mastered);

    if (!options.forceMeaning && currentCard.activeGate !== gate) return;

    const nextProgress: LibraryWordProgressRow = {
      id: existing?.id,
      user_id: currentUserId,
      study_identity_key: currentCard.studyIdentityKey,
      surface: currentCard.surface,
      reading: currentCard.reading,
      definition_key: "",
      reading_gate_status: existing?.reading_gate_status ?? "not_started",
      meaning_gate_status: existing?.meaning_gate_status ?? "not_started",
      held_before_reading_gate: existing?.held_before_reading_gate ?? false,
      held_before_meaning_gate: existing?.held_before_meaning_gate ?? false,
      mastered: existing?.mastered ?? false,
      reading_gate_attempts: existing?.reading_gate_attempts ?? 0,
      meaning_gate_attempts: existing?.meaning_gate_attempts ?? 0,
      reading_gate_passed_at: existing?.reading_gate_passed_at ?? null,
      reading_gate_failed_at: existing?.reading_gate_failed_at ?? null,
      meaning_gate_passed_at: existing?.meaning_gate_passed_at ?? null,
      meaning_gate_failed_at: existing?.meaning_gate_failed_at ?? null,
      mastered_at: existing?.mastered_at ?? null,
      last_studied_at: now,
    };

    if (gate === "reading") {
      nextProgress.reading_gate_status = ok ? "passed" : "failed";
      nextProgress.held_before_reading_gate = false;
      nextProgress.reading_gate_attempts += 1;
      if (ok) {
        nextProgress.reading_gate_passed_at = now;
      } else {
        nextProgress.reading_gate_failed_at = now;
      }
    } else {
      nextProgress.meaning_gate_status = ok ? "passed" : "failed";
      nextProgress.held_before_meaning_gate = false;
      nextProgress.meaning_gate_attempts += 1;
      if (ok) {
        nextProgress.meaning_gate_passed_at = now;
      } else {
        nextProgress.meaning_gate_failed_at = now;
      }
    }

    if (isMasteryCheck) {
      if (ok) {
        nextProgress.reading_gate_status = "passed";
        nextProgress.meaning_gate_status = "passed";
        nextProgress.mastered = true;
        nextProgress.mastered_at = nextProgress.mastered_at ?? now;
      } else {
        nextProgress.mastered = false;
        nextProgress.mastered_at = null;

        if (gate === "reading") {
          nextProgress.reading_gate_status = "failed";
          nextProgress.meaning_gate_status = "not_started";
          nextProgress.meaning_gate_passed_at = null;
          nextProgress.meaning_gate_failed_at = null;
        } else {
          nextProgress.reading_gate_status = "passed";
          nextProgress.meaning_gate_status = "failed";
        }
      }
    }

    const { error } = await supabase
      .from("user_library_word_progress")
      .upsert(
        {
          user_id: nextProgress.user_id,
          study_identity_key: nextProgress.study_identity_key,
          surface: nextProgress.surface,
          reading: nextProgress.reading,
          definition_key: nextProgress.definition_key,
          reading_gate_status: nextProgress.reading_gate_status,
          meaning_gate_status: nextProgress.meaning_gate_status,
          held_before_reading_gate: nextProgress.held_before_reading_gate,
          held_before_meaning_gate: nextProgress.held_before_meaning_gate,
          mastered: nextProgress.mastered,
          reading_gate_attempts: nextProgress.reading_gate_attempts,
          meaning_gate_attempts: nextProgress.meaning_gate_attempts,
          reading_gate_passed_at: nextProgress.reading_gate_passed_at,
          reading_gate_failed_at: nextProgress.reading_gate_failed_at,
          meaning_gate_passed_at: nextProgress.meaning_gate_passed_at,
          meaning_gate_failed_at: nextProgress.meaning_gate_failed_at,
          mastered_at: nextProgress.mastered_at,
          last_studied_at: nextProgress.last_studied_at,
        },
        { onConflict: "user_id,study_identity_key,definition_key" }
      )
      .select(
        `
          id,
          user_id,
          study_identity_key,
          surface,
          reading,
          definition_key,
          reading_gate_status,
          meaning_gate_status,
          held_before_reading_gate,
          held_before_meaning_gate,
          mastered,
          reading_gate_attempts,
          meaning_gate_attempts,
          reading_gate_passed_at,
          reading_gate_failed_at,
          meaning_gate_passed_at,
          meaning_gate_failed_at,
          mastered_at,
          last_studied_at
        `
      )
      .single<LibraryWordProgressRow>();

    if (error) {
      console.error("Error saving Library Check gate progress:", error);
      setNotice("Could not save Library Check gate progress.");
      return;
    }

    // Keep the active card on its original gate for this session.
    // The saved progress is picked up next time, so a word cannot climb twice in one sitting.
  }

  function checkMultipleChoice(choice: string) {
    if (!currentCard || checked) return;

    let correct = currentCard.meaning;
    let ok = false;

    if (studyMode === "reading_mc") {
      correct = currentCard.reading;
      ok = normalizeKana(choice) === normalizeKana(correct);
    }
    else if (studyMode === "meaning_mc" || studyMode === "reading_to_meaning_mc") {
      correct = currentCard.meaning;
      ok = normalizeText(choice) === normalizeText(correct);
    }
    else if (studyMode === "reading_to_kanji_mc") {
      correct = currentCard.surface;
      ok = normalizeText(choice) === normalizeText(correct);
    }

    setSelectedAnswer(choice);
    setChecked({ ok, correct });

    recordCurrentStudyEvent(
      ok ? "correct" : "incorrect",
      ok,
      studyMode
    );
  }

  function checkTypingSingle() {
    if (!currentCard || checked) return;

    let correct = currentCard.reading;
    let ok = false;

    if (studyMode === "reading_typing") {
      correct = currentCard.reading;
      ok = normalizeKana(typingInput) === normalizeKana(correct);
    } else if (studyMode === "meaning_typing" || studyMode === "reading_to_meaning_typing") {
      correct = currentCard.meaning;
      ok = matchesAnyMeaning(typingInput, correct);
    }

    setChecked({ ok, correct });

    recordCurrentStudyEvent(
      ok ? "correct" : "incorrect",
      ok,
      studyMode
    );

    if (studyMode === "reading_typing") {
      void saveTypedGateProgress("reading", ok);
    } else if (studyMode === "meaning_typing" || studyMode === "reading_to_meaning_typing") {
      void saveTypedGateProgress("meaning", ok);
    }
  }

  function checkCompleteStudyStep1() {
    if (!currentCard || firstStepChecked) return;

    const ok = normalizeKana(typingInput) === normalizeKana(currentCard.reading);
    setFirstStepChecked({ ok, correct: currentCard.reading });

    recordCurrentStudyEvent(
      ok ? "correct" : "incorrect",
      ok,
      "complete_study_reading_step"
    );

    void saveTypedGateProgress("reading", ok);

    if (ok) {
      setTwoStepStage(2);
      setSecondStepInput("");
    }
  }

  function checkCompleteStudyStep2() {
    if (!currentCard || !firstStepChecked?.ok || secondStepChecked) return;

    const ok = matchesAnyMeaning(secondStepInput, currentCard.meaning);
    setSecondStepChecked({ ok, correct: currentCard.meaning });

    recordCurrentStudyEvent(
      ok ? "correct" : "incorrect",
      ok,
      "complete_study_meaning_step"
    );

    void saveTypedGateProgress("meaning", ok, { forceMeaning: true });
  }

  async function flagCurrentCard() {
    if (!currentCard) return;

    const ok = window.confirm("Hide this card from study?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_words")
      .update({ hidden: true })
      .eq("id", currentCard.id);

    if (error) {
      console.error("Error hiding study card:", error);
      alert(`Could not flag card.\n${error.message}`);
      return;
    }

    setAllCards((prev) => prev.filter((card) => card.id !== currentCard.id));
    setNotice("Card hidden from study.");
  }

    if (loading) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
          <p className="text-lg text-gray-500">Loading Library Check...</p>
        </main>
      );
    }

    if (needsSignIn) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 p-6">
          <p className="text-gray-700">You need to sign in to use Library Check.</p>
          <button onClick={() => router.push("/login")} className="rounded bg-gray-200 px-4 py-2">
            Go to Login
          </button>
        </main>
      );
    }

    if (errorMsg) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 p-6">
          <p className="text-red-700">{errorMsg}</p>
          <button onClick={() => router.push("/books")} className="rounded bg-gray-200 px-4 py-2">
            Back to Library
          </button>
        </main>
      );
    }

    if (allCards.length === 0) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-6">
          <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-2xl font-semibold text-gray-700">
              No saved vocab is ready for Library Check yet.
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Real reading encounters will unlock strict checks. You can also warm up with Word Sky.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/library-study/word-sky")}
                className="rounded-xl bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-200"
              >
                Try Word Sky
              </button>
              <button
                type="button"
                onClick={() => router.push("/books")}
                className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium"
              >
                Back to Library
              </button>
            </div>
          </div>
        </main>
      );
    }

    if (libraryMode === "check" && filteredCards.length === 0) {
      return (
        <main className="min-h-screen bg-slate-100 px-6 py-8">
          <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold">Library Check</h1>
            <p className="mt-3 text-gray-600">
              {selectedJlpt === "all"
                ? "You’ve already checked all available Library Check cards today."
                : "No cards match your current JLPT filter, or you already checked them today."}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Debug: {allCards.length} eligible cards loaded, {filteredCards.length} left after today/JLPT filters.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setSelectedJlpt("all")}
                className="rounded bg-gray-700 px-4 py-2 text-white"
              >
                Clear JLPT Filter
              </button>
              <button
                onClick={studyAgainToday}
                className="rounded bg-amber-100 px-4 py-2 text-amber-900"
              >
                Check Again Today
              </button>
              <button
                onClick={() => router.push("/books")}
                className="rounded bg-gray-200 px-4 py-2"
              >
                Back to Library
              </button>
            </div>
          </div>
        </main>
      );
    }

    if (libraryMode === "check" && index >= deck.length) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold">
              {endedEarly ? "Nice work today!" : "Nice work!"}
            </h1>

            {endedEarly ? (
              <>
                <p className="mt-3 text-gray-700">You gave your library some practice.</p>
                <p className="mt-2 text-sm text-gray-500">Come back when you’re ready.</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-gray-700">You finished this Library Check session.</p>
                <p className="mt-2 text-sm text-gray-500">
                  Come back tomorrow to run into more old book memories.
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => router.push("/books")} className="rounded bg-gray-200 px-4 py-2">
                Back to Library
              </button>
              <button onClick={restartDeck} className="rounded bg-gray-700 px-4 py-2 text-white">
                Refresh Remaining Checks
              </button>
              <button
                onClick={studyAgainToday}
                className="rounded bg-amber-100 px-4 py-2 text-amber-900"
              >
                Check Again Today
              </button>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen flex flex-col items-center bg-slate-100 px-4 py-4 sm:px-6">
        <div className="mb-3 flex w-full max-w-3xl flex-col items-center justify-center gap-2 text-center">
            <h1 className="text-2xl font-semibold">Library Study</h1>
            <p className="text-sm leading-6 text-gray-500 sm:whitespace-nowrap">
              Study the readings and meanings to master words across your library encounters.
            </p>
          </div>

        <div className="mb-2 w-full max-w-3xl space-y-2">
          <LibraryCheckIntroCard mode={libraryMode} onModeChange={setLibraryMode} />

          <button
            type="button"
            onClick={() => router.push("/library-study/word-sky")}
            className="w-full rounded-2xl border border-sky-100 bg-[#f5fbff] px-4 py-3 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-sky-950">
                  Need more words, or bogged down with difficult words?
                </div>
                <div className="text-xs leading-5 text-slate-500">
                  Add easier words you may not need to look up in a book to your study.
                </div>
              </div>
              <div className="text-sm font-semibold text-sky-900">Open Word Sky</div>
            </div>
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {libraryMode === "practice" ? "Practice Progress" : "Session Progress"}
                </p>
                <p className="text-base font-semibold text-slate-800">
                  Card{" "}
                  {libraryMode === "practice"
                    ? `${practiceDeck.length > 0 ? practiceIndex + 1 : 0}/${practiceDeck.length}`
                    : `${index + 1}/${deck.length}`}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {libraryMode === "practice" ? "Practice Pool" : "Cards Left"}
                </p>
                <p className="text-base font-semibold text-slate-800">
                  {libraryMode === "practice"
                    ? practiceDeck.length
                    : Math.max(deck.length - index, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedJlpt}
                onChange={(e) => setSelectedJlpt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All Levels</option>
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
                <option value="NON-JLPT">NON-JLPT</option>
              </select>

              <div className="flex shrink-0 items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
                {libraryMode === "practice" ? "Reveal practice" : "Automatic typed gates"}
              </div>
            </div>
          </div>
        </div>

          {libraryMode === "practice" ? (
            <LibraryPracticePanel
              card={practiceCard}
              total={practiceDeck.length}
              revealStep={practiceRevealStep}
              onRevealReading={() => setPracticeRevealStep("reading")}
              onRevealMeaning={() => setPracticeRevealStep("meaning")}
              onNext={goToNextPracticeCard}
              onPrevious={goToPreviousPracticeCard}
              onShuffle={shufflePracticeDeck}
            />
          ) : (
            <>
          {notice ? (
            <div className="mb-3 w-full max-w-2xl rounded-xl border border-amber-100 bg-[#fffaf0] px-4 py-2 text-sm text-amber-900">
              {notice}
            </div>
          ) : null}

          <div className={libraryStudyCardClass(currentCard?.colorStatus)}>
            {currentCard ? (
              <div className="absolute left-4 right-4 top-4 flex justify-center">
                <div className={gatePromptClass(currentCard)}>
                  {gatePromptText(currentCard)}
                </div>
              </div>
            ) : null}

            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
              {isKatakanaOnly(currentCard?.surface) ? <KatakanaBadge /> : null}

              {currentCard?.jlpt ? (
                <div className={libraryStudyChipClass(currentCard?.colorStatus)}>
                  {currentCard.jlpt}
                </div>
              ) : null}

              {currentCard?.progress?.definition_key ? (
                <div className={libraryStudyChipClass(currentCard?.colorStatus)}>
                  Def {currentCard.progress.definition_key}
                </div>
              ) : null}
            </div>

            {currentCard ? (
              <div className="absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
                <div className={libraryStudyChipClass(currentCard.colorStatus)}>
                  {currentCard.encounterCount} encounter
                  {currentCard.encounterCount === 1 ? "" : "s"}
                </div>
              </div>
            ) : null}

            <div className="flex w-full flex-col items-center gap-6 pt-12 pb-10">
              {(studyMode === "reading_typing" ||
                studyMode === "reading_mc" ||
                studyMode === "complete_study") && (
                  <>
                    <div className={promptModeClass("reading")}>
                      Reading
                    </div>
                    <div className="text-5xl font-bold">{currentCard?.surface}</div>
                  </>
                )}

              {(studyMode === "meaning_typing" || studyMode === "meaning_mc") && (
                <>
                  <div className={promptModeClass("meaning")}>
                    Meaning
                  </div>
                  <div className="text-5xl font-bold">{currentCard?.surface}</div>
                  <div className="text-lg text-slate-500">{currentCard?.reading}</div>
                </>
              )}

              {(studyMode === "reading_to_kanji_mc" ||
                studyMode === "reading_to_meaning_mc" ||
                studyMode === "reading_to_meaning_typing") && (
                  <>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {studyMode === "reading_to_kanji_mc"
                        ? "Which word matches this reading?"
                        : "What is the meaning of this reading?"}
                    </div>
                    <div className="text-4xl font-bold">{currentCard?.reading}</div>
                  </>
                )}

              {studyMode === "reading_mc" && (
                <div className="flex w-full max-w-sm flex-col gap-3">
                  {readingOptions.map((opt, i) => {
                    const isCorrect =
                      !!checked && normalizeKana(opt) === normalizeKana(currentCard!.reading);
                    const isChosen =
                      !!selectedAnswer && normalizeKana(opt) === normalizeKana(selectedAnswer);

                    let className = "w-full rounded border px-4 py-3 text-base ";
                    if (!checked) className += "bg-white hover:bg-gray-50";
                    else if (isCorrect) className += "border-green-400 bg-green-100";
                    else if (isChosen) className += "border-red-400 bg-red-100";
                    else className += "bg-white";

                    return (
                      <button
                        key={`${opt}-${i}`}
                        type="button"
                        disabled={!!checked}
                        onClick={() => checkMultipleChoice(opt)}
                        className={className}
                      >
                        <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {studyMode === "meaning_mc" && (
                <div className="flex w-full max-w-sm flex-col gap-3">
                  {meaningOptions.map((opt, i) => {
                    const isCorrect =
                      !!checked && normalizeText(opt) === normalizeText(currentCard!.meaning);
                    const isChosen =
                      !!selectedAnswer && normalizeText(opt) === normalizeText(selectedAnswer);

                    let className = "w-full rounded border px-4 py-3 text-base ";
                    if (!checked) className += "bg-white hover:bg-gray-50";
                    else if (isCorrect) className += "border-green-400 bg-green-100";
                    else if (isChosen) className += "border-red-400 bg-red-100";
                    else className += "bg-white";

                    return (
                      <button
                        key={`${opt}-${i}`}
                        type="button"
                        disabled={!!checked}
                        onClick={() => checkMultipleChoice(opt)}
                        className={className}
                      >
                        <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {studyMode === "reading_to_kanji_mc" && (
                <div className="flex w-full max-w-sm flex-col gap-3">
                  {surfaceOptions.map((opt, i) => {
                    const isCorrect =
                      !!checked && normalizeText(opt) === normalizeText(currentCard!.surface);
                    const isChosen =
                      !!selectedAnswer && normalizeText(opt) === normalizeText(selectedAnswer);

                    let className = "w-full rounded border px-4 py-3 text-base ";
                    if (!checked) className += "bg-white hover:bg-gray-50";
                    else if (isCorrect) className += "border-green-400 bg-green-100";
                    else if (isChosen) className += "border-red-400 bg-red-100";
                    else className += "bg-white";

                    return (
                      <button
                        key={`${opt}-${i}`}
                        type="button"
                        disabled={!!checked}
                        onClick={() => checkMultipleChoice(opt)}
                        className={className}
                      >
                        <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {studyMode === "reading_to_meaning_mc" && (
                <div className="flex w-full max-w-sm flex-col gap-3">
                  {meaningOptions.map((opt, i) => {
                    const isCorrect =
                      !!checked && normalizeText(opt) === normalizeText(currentCard!.meaning);
                    const isChosen =
                      !!selectedAnswer && normalizeText(opt) === normalizeText(selectedAnswer);

                    let className = "w-full rounded border px-4 py-3 text-base ";
                    if (!checked) className += "bg-white hover:bg-gray-50";
                    else if (isCorrect) className += "border-green-400 bg-green-100";
                    else if (isChosen) className += "border-red-400 bg-red-100";
                    else className += "bg-white";

                    return (
                      <button
                        key={`${opt}-${i}`}
                        type="button"
                        disabled={!!checked}
                        onClick={() => checkMultipleChoice(opt)}
                        className={className}
                      >
                        <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {(studyMode === "reading_typing" ||
                studyMode === "meaning_typing" ||
                studyMode === "reading_to_meaning_typing") && (
                  <div className="w-full max-w-sm">
                    <input
                      ref={typingInputRef}
                      value={typingInput}
                      onChange={(e) => setTypingInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;

                        e.preventDefault();
                        e.stopPropagation();

                        if (!checked) {
                          checkTypingSingle();
                        }
                      }}
                      placeholder={
                        studyMode === "reading_typing"
                          ? "Type the reading"
                          : "Type the meaning"
                      }
                      className="w-full rounded border px-4 py-3 text-base"
                      disabled={!!checked}
                    />

                    <div className="mt-2 text-center text-xs uppercase tracking-wide text-slate-500">
                      {studyMode === "reading_typing"
                        ? "Type the reading"
                        : "Type one meaning word"}
                    </div>

                    {!checked ? (
                      <div className="mt-3 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={checkTypingSingle}
                          className="rounded bg-gray-700 px-4 py-2 text-white"
                        >
                          Check
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

              {studyMode === "complete_study" && (
                <div className="w-full max-w-sm">
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 text-sm text-gray-500">Step 1: Reading</div>
                      <input
                        ref={twoStepStage === 1 ? typingInputRef : null}
                        value={typingInput}
                        onChange={(e) => setTypingInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;

                          e.preventDefault();
                          e.stopPropagation();

                          if (!firstStepChecked) {
                            checkCompleteStudyStep1();
                          }
                        }}
                        placeholder="Type the reading"
                        className="w-full rounded border px-4 py-3 text-base"
                        disabled={!!firstStepChecked}
                      />
                      <div className="mt-2">
                        {!firstStepChecked ? (
                          <button
                            type="button"
                            onClick={checkCompleteStudyStep1}
                            className="rounded bg-gray-700 px-4 py-2 text-white"
                          >
                            Check Reading
                          </button>
                        ) : firstStepChecked.ok ? (
                          <p className="text-green-700">✅ Reading correct!</p>
                        ) : (
                          <>
                            <p className="text-red-700">❌ Reading: {firstStepChecked.correct}</p>
                            <p className="mt-2 text-xs text-slate-400">
                              Next card in a moment...
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-sm text-gray-500">Step 2: Meaning</div>
                      <input
                        ref={twoStepStage === 2 ? typingInputRef : null}
                        value={secondStepInput}
                        onChange={(e) => setSecondStepInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;

                          e.preventDefault();
                          e.stopPropagation();

                          if (firstStepChecked?.ok && !secondStepChecked) {
                            checkCompleteStudyStep2();
                          }
                        }}
                        placeholder="Type the meaning"
                        className="w-full rounded border px-4 py-3 text-base"
                        disabled={!firstStepChecked?.ok || !!secondStepChecked}
                      />
                      <div className="mt-2">
                        {!secondStepChecked ? (
                          <button
                            type="button"
                            onClick={checkCompleteStudyStep2}
                            disabled={!firstStepChecked?.ok}
                            className="rounded bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
                          >
                            Check Meaning
                          </button>
                        ) : secondStepChecked.ok ? (
                          <p className="text-green-700">✅ Meaning correct!</p>
                        ) : (
                          <>
                            <p className="text-red-700">❌ Meaning: {secondStepChecked.correct}</p>
                            <p className="mt-2 text-xs text-slate-400">
                              Next card in a moment...
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {studyMode !== "complete_study" && checked ? (
                <div className="mt-2 w-full max-w-sm text-center text-sm">
                  {checked.ok ? (
                    <p className="text-green-700">✅ Correct!</p>
                  ) : (
                    <>
                      <p className="text-red-700">❌ Not quite.</p>
                      <p className="mt-1 text-gray-600">Correct answer: {checked.correct}</p>
                    </>
                  )}

                  <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold">{currentCard?.surface}</div>
                    <div className="mt-1 text-sm text-slate-500">{currentCard?.reading}</div>
                    <div className="mt-1 text-sm text-slate-700">{currentCard?.meaning}</div>
                    <div className="mt-2 text-xs text-slate-500">From: {currentCard?.bookTitle}</div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">Next card in a moment...</p>
                </div>
              ) : null}

              {studyMode === "complete_study" && secondStepChecked ? (
                <div className="mt-2 w-full max-w-sm text-center text-sm">
                  <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold">{currentCard?.surface}</div>
                    <div className="mt-1 text-sm text-slate-500">{currentCard?.reading}</div>
                    <div className="mt-1 text-sm text-slate-700">{currentCard?.meaning}</div>
                    <div className="mt-2 text-xs text-slate-500">From: {currentCard?.bookTitle}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 w-full max-w-2xl space-y-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:justify-between">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Check Mode
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-900">
                    {checkModeLabel(currentCard)}
                    </div>

                    <p className="mt-1 truncate text-xs text-gray-600">
                    {checkModeDescription(currentCard)}
                    </p>
                  </div>
                </div>

                <div className="md:w-[180px]">
                  <button
                    type="button"
                    onClick={flagCurrentCard}
                    className="h-full min-h-[74px] w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                  >
                    <div className="leading-tight">Flag</div>
                    <div className="text-[10px] font-normal text-amber-700">
                      Problem card
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </main>
    );
}
