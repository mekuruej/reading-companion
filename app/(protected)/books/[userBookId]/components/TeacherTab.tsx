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

  recommendedLevel: string;
  setRecommendedLevel: (value: string) => void;
  teacherStudentUseRating: string;
  setTeacherStudentUseRating: (value: string) => void;

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
  recommendedLevel,
  setRecommendedLevel,
  teacherStudentUseRating,
  setTeacherStudentUseRating,
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
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
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

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Kanji enrichment needed: {needsKanjiEnrichmentCount}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">
            Kanji Map Enrichment Queue
          </div>

          {kanjiMapQueue.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {nextBatchWords.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void openNextKanjiWordBatch()}
                  disabled={isPreparingAllKanjiWords}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  {isPreparingAllKanjiWords
                    ? `Preparing next ${nextBatchWords.length}...`
                    : `Open next ${nextBatchWords.length} edit window${
                        nextBatchWords.length === 1 ? "" : "s"
                      }`}
                </button>
              ) : null}

              {openQueueWordIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    openQueueWordIds.forEach((id) => setKanjiWordOpen(id, false));
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  Close all edit windows
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {kanjiMapLoading ? (
          <div className="text-sm text-stone-500">Loading kanji map queue...</div>
        ) : kanjiMapError ? (
          <div className="text-sm text-red-600">{kanjiMapError}</div>
        ) : kanjiMapQueue.length === 0 ? (
          <div className="text-sm text-stone-500">No words currently need kanji-map work.</div>
        ) : (
          <div className="space-y-2">
            {kanjiMapQueue.map((word) => {
              const isOpen = !!openKanjiWordIds[word.id];
              const editRows = editingKanjiRows[word.id] ?? [];
              const hasPreparedRows =
                editRows.length > 0 || (word.vocabulary_kanji_map ?? []).length > 0;

              return (
                <div
                  id={`kanji-word-${word.id}`}
                  key={word.userBookWordId || String(word.id)}
                  className="rounded-xl border bg-white p-3"
                >
                  <div className="rounded-2xl border border-stone-300 bg-stone-100 px-5 py-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-2xl font-semibold text-stone-900">
                          {word.surface}
                        </div>
                        <div className="mt-1 text-lg text-stone-500">
                          {word.reading} ・ {hiraToKata(word.reading ?? "")}
                        </div>
                        {word.enrichmentStatus === "ready" ? (
                          <div className="mt-2 text-sm text-emerald-700">
                            Prefilled from saved kanji readings. Review and save if it looks right.
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                        {hasPreparedRows ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            Ready to review
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleWorkOnKanjiWord(word)}
                            className="rounded-2xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Prepare this word
                          </button>
                        )}

                        {hasPreparedRows ? (
                          <button
                            type="button"
                            onClick={() => setKanjiWordOpen(word.id, !isOpen)}
                            className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-base font-medium text-stone-700 transition hover:bg-stone-50"
                          >
                            {isOpen ? "Hide details" : "Show details"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => removeWordFromKanjiEnrichment(word.id)}
                          className="rounded-2xl border border-red-300 bg-white px-5 py-3 text-base font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Remove from Kanji
                        </button>
                      </div>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-2">
                        {editRows.length > 0 ? (
                          editRows.map((rowItem) => (
                            <div
                              key={rowItem.id}
                              className="grid grid-cols-1 gap-2 rounded-lg border bg-white p-3 md:grid-cols-[60px_120px_1fr_1fr]"
                            >
                              <div className="flex items-center text-lg font-medium text-stone-900">
                                {rowItem.kanji}
                              </div>

                              <select
                                value={rowItem.reading_type ?? ""}
                                onChange={(e) =>
                                  updateKanjiMapRow(
                                    word.id,
                                    rowItem.id,
                                    "reading_type",
                                    e.target.value
                                  )
                                }
                                className="rounded border px-2 py-2 text-sm"
                              >
                                <option value="">—</option>
                                <option value="on">on</option>
                                <option value="kun">kun</option>
                                <option value="other">other</option>
                              </select>

                              <input
                                value={rowItem.base_reading ?? ""}
                                onChange={(e) =>
                                  updateKanjiMapRow(
                                    word.id,
                                    rowItem.id,
                                    "base_reading",
                                    e.target.value
                                  )
                                }
                                placeholder="Base reading"
                                className="rounded border px-3 py-2 text-sm"
                              />

                              <input
                                value={rowItem.realized_reading ?? ""}
                                onChange={(e) =>
                                  updateKanjiMapRow(
                                    word.id,
                                    rowItem.id,
                                    "realized_reading",
                                    e.target.value
                                  )
                                }
                                placeholder="Realized reading"
                                className="rounded border px-3 py-2 text-sm"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed bg-white px-3 py-3 text-sm text-stone-500">
                            This word is ready to set up. Use “Prepare this word” once to create the kanji rows.
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveKanjiWord(word.id)}
                          disabled={savingKanjiWordId === word.id}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingKanjiWordId === word.id ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setKanjiWordOpen(word.id, false)}
                          className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
