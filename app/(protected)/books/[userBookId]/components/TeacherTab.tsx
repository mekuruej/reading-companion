// Teacher Tab
// 

import { useState } from "react";

type EditingPanel =
  | "bookInfo"
  | "teacher"
  | "study"
  | "reading"
  | "story"
  | "rating"
  | "community"
  | "bookInfoDetails"
  | "bookInfoPeople"
  | "bookInfoLinks"
  | "bookInfoCopy"
  | "communityGenres"
  | "communityContentNotes"
  | "communityReaderFit";

type UserBook = {
  id: string;
  notes: string | null;
  recommended_level: string | null;
  teacher_student_use_rating: number | null;
  rating_recommend: number | null;
};

type Book = {
  title: string;
};

type KanjiMapRow = {
  id: number;
  vocabulary_cache_id: number;
  kanji: string;
  kanji_position: number;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
};

type VocabCacheQueueRow = {
  id: number;
  userBookWordId: string;
  vocabularyCacheId: number | null;
  surface: string;
  reading: string;
  jlpt: string | null;
  created_at: string;
  enrichmentStatus: "missing" | "partial" | "ready";
  vocabulary_kanji_map: KanjiMapRow[] | null;
};

type TeacherTabProps = {
  row: UserBook;
  book: Book;
  userId: string | null;

  isEditingThisTab: boolean;
  editingTab: EditingPanel | null;
  setEditingTab: React.Dispatch<React.SetStateAction<EditingPanel | null>>;

  notes: string;
  setNotes: (value: string) => void;
  saveNotes: () => Promise<boolean>;
  saveRecommendedLevel: () => Promise<void>;
  saveTeacherStudentUseRating: () => Promise<void>;
  saveLanguageLearningPotential: () => Promise<void>;

  recommendedLevel: string;
  setRecommendedLevel: (value: string) => void;
  teacherStudentUseRating: string;
  setTeacherStudentUseRating: (value: string) => void;
  ratingRecommend: string;
  setRatingRecommend: (value: string) => void;

  kanjiMapLoading: boolean;
  kanjiMapError: string | null;
  kanjiMapQueue: VocabCacheQueueRow[];
  needsKanjiEnrichmentCount: number;
  openKanjiWordIds: Record<number, boolean>;
  editingKanjiRows: Record<number, KanjiMapRow[]>;
  savingKanjiWordId: number | null;
  removeWordFromKanjiEnrichment: (vocabId: number) => Promise<void>;

  handleWorkOnKanjiWord: (word: VocabCacheQueueRow) => Promise<void>;
  updateKanjiMapRow: (
    vocabId: number,
    rowId: number,
    field: "reading_type" | "base_reading" | "realized_reading",
    value: string
  ) => void;
  saveKanjiWord: (vocabId: number) => Promise<void>;
  setKanjiWordOpen: (vocabId: number, isOpen: boolean) => void;

  hiraToKata: (text: string) => string;
};

export default function TeacherTab({
  row,
  editingTab,
  setEditingTab,
  notes,
  setNotes,
  saveNotes,
  saveRecommendedLevel,
  saveTeacherStudentUseRating,
  saveLanguageLearningPotential,
  recommendedLevel,
  setRecommendedLevel,
  teacherStudentUseRating,
  setTeacherStudentUseRating,
  ratingRecommend,
  setRatingRecommend,
  kanjiMapLoading,
  kanjiMapError,
  kanjiMapQueue,
  needsKanjiEnrichmentCount,
  openKanjiWordIds,
  editingKanjiRows,
  savingKanjiWordId,
  handleWorkOnKanjiWord,
  updateKanjiMapRow,
  saveKanjiWord,
  removeWordFromKanjiEnrichment,
  setKanjiWordOpen,
  hiraToKata,
}: TeacherTabProps) {
  const KANJI_OPEN_BATCH_SIZE = 50;
  const [isEditingLevelGuidance, setIsEditingLevelGuidance] = useState(false);
  const [isEditingStudentUse, setIsEditingStudentUse] = useState(false);
  const [isEditingLanguagePotential, setIsEditingLanguagePotential] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveMessage, setNotesSaveMessage] = useState("");
  const [isPreparingAllKanjiWords, setIsPreparingAllKanjiWords] = useState(false);
  const queueWordIds = kanjiMapQueue.map((word) => word.id);
  const openQueueWordIds = queueWordIds.filter((id) => !!openKanjiWordIds[id]);
  const unopenedQueueWords = kanjiMapQueue.filter((word) => !openKanjiWordIds[word.id]);
  const nextBatchWords = unopenedQueueWords.slice(0, KANJI_OPEN_BATCH_SIZE);

  async function openNextKanjiWordBatch() {
    setIsPreparingAllKanjiWords(true);

    try {
      for (const word of nextBatchWords) {
        const editRows = editingKanjiRows[word.id] ?? [];
        const hasPreparedRows =
          editRows.length > 0 || (word.vocabulary_kanji_map ?? []).length > 0;

        if (!hasPreparedRows) {
          await handleWorkOnKanjiWord(word);
        }
      }

      nextBatchWords.forEach((word) => setKanjiWordOpen(word.id, true));
    } finally {
      setIsPreparingAllKanjiWords(false);
    }
  }

  const suitableLevelOptions = [
    {
      value: "Level 1",
      title: "Level 1",
      plain: "Absolute Beginner",
      cefr: "Pre-A1",
      jlpt: "Before N5",
      feel: "Hiragana/katakana, survival words, very guided sentences",
    },
    {
      value: "Level 2",
      title: "Level 2",
      plain: "Beginner 1",
      cefr: "A1",
      jlpt: "Early N5",
      feel: "Simple sentences, basic particles, dictionary-form verbs still hard",
    },
    {
      value: "Level 3",
      title: "Level 3",
      plain: "Beginner 2",
      cefr: "A1+",
      jlpt: "Solid N5",
      feel: "Can read graded material slowly with support",
    },
    {
      value: "Level 4",
      title: "Level 4",
      plain: "Upper Beginner",
      cefr: "A2",
      jlpt: "N4 entry",
      feel: "Longer sentences, more verb forms, lots of grammar still foggy",
    },
    {
      value: "Level 5",
      title: "Level 5",
      plain: "Pre-Intermediate",
      cefr: "A2+",
      jlpt: "Solid N4",
      feel: "Can follow simple stories, but unknown vocab blocks flow",
    },
    {
      value: "Level 6",
      title: "Level 6",
      plain: "Intermediate 1",
      cefr: "B1",
      jlpt: "N3 entry",
      feel: "Real Japanese starts becoming possible, but slow and lookup-heavy",
    },
    {
      value: "Level 7",
      title: "Level 7",
      plain: "Intermediate 2",
      cefr: "B1+",
      jlpt: "Solid N3",
      feel: "Can read easier native texts with support; nuance still hard",
    },
    {
      value: "Level 8",
      title: "Level 8",
      plain: "Upper Intermediate",
      cefr: "B2-ish",
      jlpt: "N2 entry",
      feel: "Can handle novels/articles, but kanji/vocab density hurts",
    },
    {
      value: "Level 9",
      title: "Level 9",
      plain: "Advanced",
      cefr: "B2+",
      jlpt: "Solid N2 / N1 entry",
      feel: "Reads real Japanese regularly, still misses style, implication, register",
    },
    {
      value: "Level 10",
      title: "Level 10",
      plain: "Upper Advanced",
      cefr: "C1-ish",
      jlpt: "Solid N1+",
      feel: "Can read widely with nuance, ambiguity, tone, and less hand-holding",
    },
  ] as const;

  function stars5(n: number | null) {
    if (!n || n < 1) return "☆☆☆☆☆";
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function studentUseLabel(value: number | null) {
    if (value === 5) return "Strong yes. I'd happily use this with students.";
    if (value === 4) return "Yes, with minor caveats.";
    if (value === 3) return "Maybe. Depends on the student or context.";
    if (value === 2) return "Probably not.";
    if (value === 1) return "No. I would not use this with students.";
    return "Rate whether this feels like a book you would actually want to use with students.";
  }

  function LanguageLearningRatingField() {
    const descriptions: Record<number, string> = {
      5: "This is a learner's dream come true.",
      4: "Has a lot of good material in there.",
      3: "You can learn some stuff, but nothing special.",
      2: "Not so much useful language material.",
      1: "I didn't get anything out of it.",
    };
    const selected = ratingRecommend ? Number(ratingRecommend) : null;

    return (
      <div className="rounded border bg-white p-3 text-sm">
        <div className="text-stone-600">Language Learning Potential</div>

        {!isEditingLanguagePotential ? (
          <>
            <div className="mt-1 font-medium">
              {row.rating_recommend ? `${row.rating_recommend}/5` : "—"}
            </div>
            <div className="text-amber-600">{stars5(row.rating_recommend)}</div>
            <div className="mt-1 text-xs text-stone-500">
              {row.rating_recommend ? descriptions[row.rating_recommend] : "—"}
            </div>
          </>
        ) : (
          <div className="mt-2 space-y-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const isSelected = selected === n;

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingRecommend(String(n))}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${isSelected
                    ? "border-amber-500 bg-amber-50 shadow-sm"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                >
                  <div className="font-medium text-amber-600">{stars5(n)}</div>
                  <div className="mt-1 text-xs text-stone-600">{descriptions[n]}</div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setRatingRecommend("")}
              className="rounded-lg border border-stone-200 px-3 py-2 text-left transition hover:bg-stone-50"
            >
              <div className="text-xs text-stone-600">Clear</div>
            </button>
          </div>
        )}
      </div>
    );
  }

  function suitableLevelInfo(value: string | null | undefined) {
    return suitableLevelOptions.find((option) => option.value === value) ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-900">Suitable Level</div>
            <div className="mt-1 text-xs text-stone-500">
              Mekuru-style reading level with guidance.
            </div>
          </div>

          {!isEditingLevelGuidance ? (
            <button
              type="button"
              onClick={() => setIsEditingLevelGuidance(true)}
              className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white hover:bg-black"
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await saveRecommendedLevel();
                setIsEditingLevelGuidance(false);
              }}
              className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white hover:bg-black"
            >
              Save
            </button>
          )}
        </div>

        {!isEditingLevelGuidance ? (
          <>
            {suitableLevelInfo(row.recommended_level) ? (
              <div className="rounded-xl border border-stone-200 bg-white px-3 py-3">
                <div className="text-sm font-semibold text-stone-900">
                  {suitableLevelInfo(row.recommended_level)?.title} · {suitableLevelInfo(row.recommended_level)?.plain}
                </div>
                <div className="mt-1 text-xs font-medium text-amber-700">
                  {suitableLevelInfo(row.recommended_level)?.cefr} · {suitableLevelInfo(row.recommended_level)?.jlpt}
                </div>
                <div className="mt-2 text-sm leading-6 text-stone-700">
                  {suitableLevelInfo(row.recommended_level)?.feel}
                </div>
              </div>
            ) : (
              <div className="mt-1 font-medium">{row.recommended_level || "—"}</div>
            )}
          </>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm leading-6 text-stone-700">
              Pick the level that feels suitable with guidance, not necessarily the level where the book becomes easy.
            </div>

            {suitableLevelOptions.map((opt) => {
              const isSelected = recommendedLevel === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecommendedLevel(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${isSelected
                    ? "border-stone-900 bg-stone-100"
                    : "border-stone-200 hover:bg-stone-50"
                    }`}
                >
                  <div className="text-sm font-semibold text-stone-900">
                    {opt.title} · {opt.plain} ({opt.cefr} · {opt.jlpt})
                  </div>
                  <div className="mt-2 text-sm leading-6 text-stone-700">{opt.feel}</div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setRecommendedLevel("")}
              className="rounded-lg border border-stone-200 px-3 py-2 text-left transition hover:bg-stone-50"
            >
              <div className="text-xs text-stone-600">Clear</div>
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-900">Use With Students</div>
          </div>

          {!isEditingStudentUse ? (
            <button
              type="button"
              onClick={() => setIsEditingStudentUse(true)}
              className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white hover:bg-black"
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await saveTeacherStudentUseRating();
                setIsEditingStudentUse(false);
              }}
              className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white hover:bg-black"
            >
              Save
            </button>
          )}
        </div>

        {!isEditingStudentUse ? (
          <>
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm leading-6 text-stone-700">
              {studentUseLabel(row.teacher_student_use_rating)}
            </div>
            <div className="mt-1 font-medium">
              {row.teacher_student_use_rating ? `${row.teacher_student_use_rating}/5` : "—"}
            </div>
            <div className="mt-1 text-amber-600">
              {stars5(row.teacher_student_use_rating)}
            </div>
          </>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm leading-6 text-stone-700">
              This rating is about teaching fit, not reading level alone. A book can be readable with
              guidance and still not be something you would want to use with students.
            </div>

            {[
              [5, "Strong yes. I'd happily use this with students."],
              [4, "Yes, with minor caveats."],
              [3, "Maybe. Depends on the student or context."],
              [2, "Probably not."],
              [1, "No. I would not use this with students."],
            ].map(([value, label]) => {
              const isSelected = Number(teacherStudentUseRating) === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTeacherStudentUseRating(String(value))}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${isSelected
                      ? "border-amber-500 bg-amber-50 shadow-sm"
                      : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                >
                  <div className="font-medium text-amber-600">{stars5(value as number)}</div>
                  <div className="mt-1 text-sm font-medium text-stone-900">{value} star{value === 1 ? "" : "s"}</div>
                  <div className="mt-1 text-xs text-stone-600">{label}</div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setTeacherStudentUseRating("")}
              className="rounded-lg border border-stone-200 px-3 py-2 text-left transition hover:bg-stone-50"
            >
              <div className="text-xs text-stone-600">Clear</div>
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-900">Language Learning Potential</div>
            <div className="mt-1 text-xs text-stone-500">
              Use this for the material inside the book: vocabulary, grammar, patterns, and discussion value.
            </div>
          </div>

          {!isEditingLanguagePotential ? (
            <button
              type="button"
              onClick={() => setIsEditingLanguagePotential(true)}
              className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white hover:bg-black"
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await saveLanguageLearningPotential();
                setIsEditingLanguagePotential(false);
              }}
              className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white hover:bg-black"
            >
              Save
            </button>
          )}
        </div>

        <LanguageLearningRatingField />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-stone-900">Teacher Notes</h3>

          <button
            type="button"
            onClick={() => setEditingTab(editingTab === "teacher" ? null : "teacher")}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            {editingTab === "teacher" ? "Done" : "Edit"}
          </button>
        </div>

        {editingTab === "teacher" ? (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900"
              placeholder="Add teacher notes..."
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsSavingNotes(true);
                  setNotesSaveMessage("");
                  const didSave = await saveNotes();
                  setIsSavingNotes(false);

                  if (didSave) {
                    setNotesSaveMessage("Saved.");
                    window.setTimeout(() => setNotesSaveMessage(""), 1800);
                  }
                }}
                disabled={isSavingNotes}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
              >
                {isSavingNotes ? "Saving..." : "Save Notes"}
              </button>

              <button
                type="button"
                onClick={() => setEditingTab(null)}
                className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
              >
                Cancel
              </button>
            </div>

            {notesSaveMessage ? (
              <div className="text-sm text-emerald-700">{notesSaveMessage}</div>
            ) : null}
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
            {notes?.trim() ? notes : "No teacher notes yet."}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-900">
              Kanji Enrichment
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {needsKanjiEnrichmentCount > 0
                ? `${needsKanjiEnrichmentCount} word${needsKanjiEnrichmentCount === 1 ? "" : "s"
                } may need kanji-reading work.`
                : "Open the global teacher queue to review kanji-reading work."}
            </p>
          </div>

          <a
            href="/teacher/kanji"
            className="inline-flex rounded-2xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
          >
            Open Kanji Queue →
          </a>
        </div>
      </div>
    </div>
  );
}
