"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getComponentStrokeCount } from "@/components/KanjiComponentLookup";
import { supabase } from "@/lib/supabaseClient";
import { recordStudyEvent } from "@/lib/studyEvents";
import KanjiStudyAccessState from "../kanji/components/KanjiStudyAccessState";
import KanjiStudyBottomControls from "../kanji/components/KanjiStudyBottomControls";
import KanjiStudyCardFrame from "../kanji/components/KanjiStudyCardFrame";
import KanjiStudyCompleteState from "../kanji/components/KanjiStudyCompleteState";
import KanjiStudyFilterPanel, {
  KANJI_LEVEL_FILTER_VALUES,
  type KanjiLevelFilter,
} from "../kanji/components/KanjiStudyFilterPanel";
import { KanjiStudyHeader } from "../kanji/components/KanjiStudyHeader";
import KanjiStudyLoadingState from "../kanji/components/KanjiStudyLoadingState";
import KanjiStudyNoCardsState from "../kanji/components/KanjiStudyNoCardsState";
import KanjiStudyNotice from "../kanji/components/KanjiStudyNotice";
import KanjiStudyOptionList from "../kanji/components/KanjiStudyOptionList";
import KanjiStudyProgressPanel from "../kanji/components/KanjiStudyProgressPanel";
import KanjiStudyPrompt from "../kanji/components/KanjiStudyPrompt";

const RADICAL_AUTO_ADVANCE_MS = 3000;

type RadicalRow = {
  kanji: string;
  radical: string | null;
  radical_name: string | null;
  radical_english_name: string | null;
  jlpt_level: string | null;
  is_jouyou: boolean | null;
  school_grade: number | null;
  stroke_count: number | null;
  notes: string | null;
};

type ComponentRow = {
  kanji: string;
  component: string | null;
  component_name: string | null;
  sort_order: number | null;
};

type RadicalCard = {
  key: string;
  kanji: string;
  radical: string;
  radicalStrokeCount: number | null;
  radicalName: string | null;
  radicalEnglishName: string | null;
  components: string[];
  componentNames: Record<string, string>;
  alternateMainRadicals: string[];
  jlptLevel: string | null;
  isJouyou: boolean | null;
  schoolGrade: number | null;
  strokeCount: number | null;
};

type LevelFilter = KanjiLevelFilter;
type RadicalStudyMode = "mainRadical" | "radicalStrokeCount" | "radicalName";

function normalizeKanjiLevel(jlpt: string | null | undefined): LevelFilter {
  const normalized = (jlpt ?? "")
    .trim()
    .toUpperCase()
    .replace(/^JLPT[-_\s]?/, "");

  if (normalized === "N5" || normalized === "N4" || normalized === "N3" || normalized === "N2" || normalized === "N1") {
    return normalized;
  }

  if (normalized === "5" || normalized === "4" || normalized === "3" || normalized === "2" || normalized === "1") {
    return `N${normalized}` as LevelFilter;
  }

  return "unlabeled";
}

function matchesLevelFilters(jlpt: string | null | undefined, selectedLevels: LevelFilter[]) {
  if (selectedLevels.length === 0 || selectedLevels.length === KANJI_LEVEL_FILTER_VALUES.length) {
    return true;
  }

  return selectedLevels.includes(normalizeKanjiLevel(jlpt));
}

function levelSummaryLabel(selectedLevels: LevelFilter[]) {
  if (selectedLevels.length === 0 || selectedLevels.length === KANJI_LEVEL_FILTER_VALUES.length) {
    return "All levels";
  }

  return KANJI_LEVEL_FILTER_VALUES.filter((level) => selectedLevels.includes(level))
    .map((level) => (level === "unlabeled" ? "Unlabeled" : level))
    .join(" + ");
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function cleanText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function radicalNameText(card: RadicalCard) {
  return cleanText(card.radicalName) || cleanText(card.radicalEnglishName);
}

function radicalEnglishNameText(card: RadicalCard) {
  return cleanText(card.radicalEnglishName);
}

function radicalFullNameText(card: RadicalCard) {
  return [card.radicalName, card.radicalEnglishName].map(cleanText).filter(Boolean).join(" / ");
}

function oneCardPerRadical(cards: RadicalCard[]) {
  const selected = new Map<string, RadicalCard>();

  for (const card of shuffleArray(cards)) {
    const radical = cleanText(card.radical);
    if (!radical || selected.has(radical)) continue;
    selected.set(radical, card);
  }

  return Array.from(selected.values());
}

function firstVisibleChar(value: string) {
  return Array.from(value.trim()).find((char) => !/[\s,、/;:：|]+/u.test(char)) ?? "";
}

function parseAlternateMainRadicals(notes: string | null | undefined) {
  const text = notes ?? "";
  const matches = text.matchAll(/(?:alternate|alternative|also|other)\s+(?:(?:main\s+)?radicals?|main)\s*[:：]\s*([^\n;]+)/giu);
  const radicals: string[] = [];

  for (const match of matches) {
    const rawList = match[1] ?? "";
    for (const token of rawList.split(/[\s,、/]+/u)) {
      const radical = firstVisibleChar(token);
      if (radical && !radicals.includes(radical)) radicals.push(radical);
    }
  }

  return radicals;
}

function makeRadicalOptions(card: RadicalCard, cards: RadicalCard[]) {
  const correct = card.radical;
  const distractors: string[] = [];
  const blockedDistractors = new Set([correct, ...card.alternateMainRadicals]);

  const componentPool = uniqueValues(card.components).filter((component) => !blockedDistractors.has(component));
  for (const component of shuffleArray(componentPool)) {
    if (!distractors.includes(component)) distractors.push(component);
    if (distractors.length >= 3) break;
  }

  if (distractors.length < 3) {
    const relatedPool = uniqueValues(
      cards
        .filter((candidate) => candidate.key !== card.key && candidate.jlptLevel === card.jlptLevel)
        .map((candidate) => candidate.radical)
    ).filter((radical) => !blockedDistractors.has(radical) && !distractors.includes(radical));

    for (const radical of shuffleArray(relatedPool)) {
      distractors.push(radical);
      if (distractors.length >= 3) break;
    }
  }

  if (distractors.length < 3) {
    const broaderPool = uniqueValues(cards.map((candidate) => candidate.radical)).filter(
      (radical) => !blockedDistractors.has(radical) && !distractors.includes(radical)
    );

    for (const radical of shuffleArray(broaderPool)) {
      distractors.push(radical);
      if (distractors.length >= 3) break;
    }
  }

  return shuffleArray([correct, ...distractors]).filter(Boolean);
}

function makeStrokeCountOptions(card: RadicalCard, _cards: RadicalCard[]) {
  const correct = card.radicalStrokeCount;
  if (correct == null) return [];

  const bucketStart = Math.floor((correct - 1) / 4) * 4 + 1;
  return Array.from({ length: 4 }, (_, index) => String(bucketStart + index));
}

function makeRadicalNameOptions(card: RadicalCard, cards: RadicalCard[]) {
  const correct = radicalNameText(card);
  if (!correct) return [];

  const distractors = uniqueValues(
    cards
      .filter((candidate) => candidate.key !== card.key)
      .map(radicalNameText)
      .filter((name) => name && name !== correct)
  );

  return shuffleArray([correct, ...shuffleArray(distractors).slice(0, 3)]).filter(Boolean);
}

function makeOptions(card: RadicalCard, cards: RadicalCard[], mode: RadicalStudyMode) {
  if (mode === "radicalStrokeCount") return makeStrokeCountOptions(card, cards);
  if (mode === "radicalName") return makeRadicalNameOptions(card, cards);
  return makeRadicalOptions(card, cards);
}

function correctAnswerForMode(card: RadicalCard, mode: RadicalStudyMode) {
  if (mode === "radicalStrokeCount") return String(card.radicalStrokeCount ?? "");
  if (mode === "radicalName") return radicalNameText(card);
  return card.radical;
}

function studyModeLabel(mode: RadicalStudyMode) {
  if (mode === "radicalStrokeCount") return "Radical stroke count";
  if (mode === "radicalName") return "Radical name";
  return "Main radical";
}

async function loadRadicalRows() {
  const rows: RadicalRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("kanji_radicals")
      .select("kanji, radical, radical_name, radical_english_name, jlpt_level, is_jouyou, school_grade, stroke_count, notes")
      .not("radical", "is", null)
      .order("kanji", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<RadicalRow[]>();

    if (error) throw error;

    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function loadComponentRows(kanji: string[]) {
  const rows: ComponentRow[] = [];

  for (const chunk of chunkArray(kanji, 400)) {
    const { data, error } = await supabase
      .from("kanji_components")
      .select("kanji, component, component_name, sort_order")
      .in("kanji", chunk)
      .order("sort_order", { ascending: true })
      .returns<ComponentRow[]>();

    if (error) throw error;
    rows.push(...(data ?? []));
  }

  return rows;
}

export default function RadicalFlashcardsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [baseCards, setBaseCards] = useState<RadicalCard[]>([]);
  const [deck, setDeck] = useState<RadicalCard[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [endedEarly, setEndedEarly] = useState(false);
  const [levelFilters, setLevelFilters] = useState<LevelFilter[]>([...KANJI_LEVEL_FILTER_VALUES]);
  const [studyMode, setStudyMode] = useState<RadicalStudyMode>("mainRadical");

  const filteredBaseCards = useMemo(
    () => baseCards.filter((card) => matchesLevelFilters(card.jlptLevel, levelFilters)),
    [baseCards, levelFilters]
  );

  const card = deck[index] ?? null;

  const options = useMemo(() => {
    if (!card) return [];
    return makeOptions(card, filteredBaseCards, studyMode);
  }, [card, filteredBaseCards, studyMode]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNeedsSignIn(false);
      setErrorMsg(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        const radicalRows = await loadRadicalRows();
        const kanji = uniqueValues(radicalRows.map((row) => row.kanji));
        const componentRows = await loadComponentRows(kanji);

        const componentsByKanji = new Map<string, ComponentRow[]>();
        for (const row of componentRows) {
          const key = cleanText(row.kanji);
          if (!key || !cleanText(row.component)) continue;
          const group = componentsByKanji.get(key) ?? [];
          group.push(row);
          componentsByKanji.set(key, group);
        }

        const cardsByKanji = new Map<string, RadicalCard>();

        for (const row of radicalRows) {
          const rowKanji = cleanText(row.kanji);
          const radical = cleanText(row.radical);
          if (!rowKanji || !radical || cardsByKanji.has(rowKanji)) continue;

          const components = componentsByKanji.get(rowKanji) ?? [];
          const componentNames: Record<string, string> = {};
          for (const component of components) {
            const componentText = cleanText(component.component);
            const componentName = cleanText(component.component_name);
            if (componentText && componentName) componentNames[componentText] = componentName;
          }

          cardsByKanji.set(rowKanji, {
            key: rowKanji,
            kanji: rowKanji,
            radical,
            radicalStrokeCount: getComponentStrokeCount(radical),
            radicalName: row.radical_name ?? null,
            radicalEnglishName: row.radical_english_name ?? null,
            components: uniqueValues(components.map((component) => cleanText(component.component))),
            componentNames,
            alternateMainRadicals: parseAlternateMainRadicals(row.notes),
            jlptLevel: row.jlpt_level ?? null,
            isJouyou: row.is_jouyou ?? null,
            schoolGrade: row.school_grade ?? null,
            strokeCount: row.stroke_count ?? null,
          });
        }

        setBaseCards(Array.from(cardsByKanji.values()));
      } catch (error) {
        console.error("Error loading radical flashcards:", error);
        setErrorMsg(typeof (error as any)?.message === "string" ? (error as any).message : "Could not load radical flashcards.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    restartDeck(filteredBaseCards);
  }, [filteredBaseCards, studyMode]);

  useEffect(() => {
    if (!checked || autoAdvancePaused) return;

    const timer = window.setTimeout(() => {
      nextCard();
    }, RADICAL_AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [checked, autoAdvancePaused]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (!card) return;

      if (checked && event.key === "Enter") {
        event.preventDefault();
        nextCard();
        return;
      }

      if (checked) return;

      if (event.key === "1" && options[0]) checkAnswer(options[0]);
      if (event.key === "2" && options[1]) checkAnswer(options[1]);
      if (event.key === "3" && options[2]) checkAnswer(options[2]);
      if (event.key === "4" && options[3]) checkAnswer(options[3]);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [card, checked, options]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  function restartDeck(cards = filteredBaseCards, mode: RadicalStudyMode = studyMode) {
    const usableCards = cards.filter((candidate) => makeOptions(candidate, cards, mode).length >= 2);
    const sessionCards = oneCardPerRadical(usableCards);
    setDeck(shuffleArray(sessionCards));
    setIndex(0);
    setSelected(null);
    setChecked(null);
    setCompleted(false);
    setEndedEarly(false);
    setAutoAdvancePaused(false);
  }

  function startStudyMode(mode: RadicalStudyMode) {
    setStudyMode(mode);
    restartDeck(filteredBaseCards, mode);
  }

  function nextRadicalStudyMode() {
    if (studyMode === "radicalStrokeCount") return "radicalName";
    if (studyMode === "radicalName") return "mainRadical";
    return "radicalStrokeCount";
  }

  function nextCard() {
    setSelected(null);
    setChecked(null);

    if (index >= deck.length - 1) {
      setCompleted(true);
      return;
    }

    setIndex((current) => current + 1);
  }

  function previousCard() {
    if (index <= 0) return;
    setSelected(null);
    setChecked(null);
    setIndex((current) => current - 1);
  }

  function shuffleCurrentDeck() {
    restartDeck(filteredBaseCards);
    setNotice("Shuffled radical cards");
  }

  function checkAnswer(value: string) {
    if (!card || checked) return;

    const correct = correctAnswerForMode(card, studyMode);
    const ok = value.trim() === correct.trim();
    setSelected(value);
    setChecked({ ok, correct });

    void recordStudyEvent({
      studyMode: "other",
      cardType: "radical_flashcard",
      result: ok ? "correct" : "incorrect",
      isCorrect: ok,
      surface: card.kanji,
      reading: card.radical,
      meaning: studyMode === "radicalStrokeCount"
        ? `Main radical stroke count: ${card.radicalStrokeCount ?? "unknown"}`
        : radicalFullNameText(card) || null,
    });
  }

  function handleToggleLevelFilter(level: LevelFilter) {
    setLevelFilters((current) => {
      if (current.includes(level)) return current.filter((item) => item !== level);
      return [...current, level];
    });
  }

  function handleSelectAllLevelFilters() {
    setLevelFilters([...KANJI_LEVEL_FILTER_VALUES]);
  }

  function handleClearLevelFilters() {
    setLevelFilters([]);
  }

  if (loading) {
    return <KanjiStudyLoadingState message="Loading radical flashcards..." />;
  }

  if (needsSignIn) {
    return (
      <KanjiStudyAccessState
        title="Sign in to study radicals"
        message="Radical flashcards use the kanji data in Mekuru, so you need to be signed in first."
        primaryHref="/login"
        primaryLabel="Go to login"
      />
    );
  }

  if (errorMsg) {
    return (
      <KanjiStudyAccessState
        title="Radical flashcards need a little setup"
        message={errorMsg}
        primaryHref="/library-study/characters"
        primaryLabel="Back to Basic Study"
      />
    );
  }

  if (completed) {
    return (
      <KanjiStudyCompleteState
        endedEarly={endedEarly}
        nextModeLabel={studyModeLabel(nextRadicalStudyMode())}
        onBackToStudyHub={() => router.push("/library-study/characters")}
        onNextMode={() => startStudyMode(nextRadicalStudyMode())}
        onRestart={() => restartDeck(filteredBaseCards)}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 px-6 py-4">
      <KanjiStudyHeader
        title="Radical Flashcards"
        description="Practice KangXi main radicals, radical names, and radical stroke counts."
        onOpenCharacterStudy={() => router.push("/library-study/characters")}
        onOpenLibrary={() => router.push("/library")}
      />

      <div className="mb-4 w-full max-w-3xl space-y-0" />

      <KanjiStudyFilterPanel
        selectedLevels={levelFilters}
        onToggleLevel={handleToggleLevelFilter}
        onSelectAll={handleSelectAllLevelFilters}
        onClear={handleClearLevelFilters}
      />

      <section className="mt-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          Question Type
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { value: "mainRadical", label: "Main radical" },
            { value: "radicalStrokeCount", label: "Radical stroke count" },
            { value: "radicalName", label: "Radical name" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => startStudyMode(option.value as RadicalStudyMode)}
              className={`rounded-full border px-4 py-2 text-sm font-black shadow-sm transition ${
                studyMode === option.value
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mb-5 w-full max-w-3xl" />

      {deck.length > 0 ? (
        <KanjiStudyProgressPanel
          current={index + 1}
          total={deck.length}
          summaryText={studyModeLabel(studyMode)}
          answerModeLabel="Multiple Choice"
          levelSummaryLabel={levelSummaryLabel(levelFilters)}
        />
      ) : null}

      <KanjiStudyNotice notice={notice} />

      {!card ? (
        <KanjiStudyNoCardsState
          title="No radical cards in this set yet"
          message={studyMode === "radicalStrokeCount" ? "Add main radicals with known component stroke counts, or choose a wider kanji level filter." : studyMode === "radicalName" ? "Add radical names in Radical Upkeep, or choose a wider kanji level filter." : "Add main radicals in Radical Upkeep, or choose a wider kanji level filter."}
        />
      ) : (
        <>
          <KanjiStudyCardFrame
            flaggedForReview={false}
            kanji={card.kanji}
            showReadingTypeBadge
            readingTypeText={studyMode === "radicalStrokeCount" ? "Strokes" : studyMode === "radicalName" ? "Name" : "Radical"}
            strokeCount={null}
            radical={null}
            radicalName={null}
            radicalEnglishName={null}
            isJouyou={null}
            schoolGrade={null}
            onCardClick={() => {
              if (checked) nextCard();
            }}
          >
            <>
              {studyMode === "radicalStrokeCount" ? (
                <div className="pointer-events-none absolute bottom-5 right-6 text-6xl font-black leading-none text-slate-300 sm:text-7xl">
                  {card.kanji}
                </div>
              ) : null}

              <div className="flex w-full flex-col items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                <KanjiStudyPrompt
                  label={studyMode === "radicalStrokeCount" ? "Main Radical Stroke Count" : studyMode === "radicalName" ? "Radical Name" : "Main Radical"}
                  mainText={studyMode === "radicalStrokeCount" || studyMode === "radicalName" ? card.radical : card.kanji}
                />
                <p className="text-sm font-semibold text-slate-500">
                  {studyMode === "radicalStrokeCount"
                    ? "How many strokes is this main radical?"
                    : studyMode === "radicalName"
                      ? "What is this radical called?"
                      : "What is the main radical of this kanji?"}
                </p>
                </div>

                <KanjiStudyOptionList
                disabled={!!checked}
                onChoose={checkAnswer}
                options={options.map((option) => {
                  const correct = correctAnswerForMode(card, studyMode);
                  const isCorrect = !!checked && option === correct;
                  const isChosen = !!selected && option === selected;

                  return {
                    value: option,
                    largeText: studyMode === "mainRadical",
                    compactText: studyMode === "radicalName",
                    state: !checked
                      ? "idle"
                      : isCorrect
                        ? "correct"
                        : isChosen
                          ? "wrong"
                          : "neutral",
                  };
                })}
                />

                {checked ? (
                <div className="mt-1 w-full max-w-sm text-center text-sm">
                  {checked.ok ? (
                    <p className="font-semibold text-green-700">Correct!</p>
                  ) : (
                    <p className="font-semibold text-red-700">Not quite.</p>
                  )}

                  <div className="mt-2 flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAutoAdvancePaused((current) => !current);
                      }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      {autoAdvancePaused ? "Resume" : "Pause"}
                    </button>

                    <p className="text-xs text-slate-400">
                      {autoAdvancePaused ? "Paused. Take your time with this radical." : "Next card comes automatically."}
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      {studyMode === "radicalStrokeCount" ? "Stroke count" : studyMode === "radicalName" ? "Radical name" : "Main radical"}
                    </p>
                    <div className="mt-1 text-4xl font-black text-slate-950">
                      {studyMode === "radicalStrokeCount" ? `${card.radicalStrokeCount} strokes` : studyMode === "radicalName" ? radicalNameText(card) : card.radical}
                    </div>

                    {studyMode === "radicalStrokeCount" ? (
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {card.radical} {radicalFullNameText(card) ? `· ${radicalFullNameText(card)}` : ""}
                      </p>
                    ) : studyMode === "radicalName" ? (
                      <div className="mt-2 text-sm font-semibold text-slate-600">
                        <p>{card.radical}</p>
                        {radicalEnglishNameText(card) ? (
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            English: {radicalEnglishNameText(card)}
                          </p>
                        ) : null}
                      </div>
                    ) : radicalFullNameText(card) ? (
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {radicalFullNameText(card)}
                      </p>
                    ) : null}

                    {studyMode === "mainRadical" && card.components.length > 0 ? (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Visible components
                        </p>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          {card.components.map((component) => (
                            <span
                              key={component}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-lg font-bold text-slate-800"
                              title={card.componentNames[component] ?? undefined}
                            >
                              {component}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                ) : null}
              </div>
            </>
          </KanjiStudyCardFrame>

          <KanjiStudyBottomControls
            canGoPrevious={index > 0}
            onPrevious={previousCard}
            onShuffle={shuffleCurrentDeck}
          />
        </>
      )}
    </main>
  );
}
