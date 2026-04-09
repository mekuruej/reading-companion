type HubTab = "bookInfo" | "teacher" | "study" | "reading" | "story" | "rating";

type UserBook = {
  id: string;
  notes: string | null;
  recommended_level: string | null;
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
  surface: string;
  reading: string;
  jlpt: string | null;
  created_at: string;
  vocabulary_kanji_map: KanjiMapRow[] | null;
};

type TeacherTabProps = {
  row: UserBook;
  book: Book;
  userId: string | null;

  isEditingThisTab: boolean;
  editingTab: HubTab | null;
  setEditingTab: React.Dispatch<React.SetStateAction<HubTab | null>>;

  notes: string;
  setNotes: (value: string) => void;
  saveNotes: () => Promise<void>;

  recommendedLevel: string;
  setRecommendedLevel: (value: string) => void;
  levelStars: (value: string | null | undefined) => string;

  kanjiMapLoading: boolean;
  kanjiMapError: string | null;
  kanjiMapQueue: VocabCacheQueueRow[];
  openKanjiWordId: number | null;
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
  setOpenKanjiWordId: (value: number | null) => void;

  hiraToKata: (text: string) => string;
};

export default function TeacherTab({
  row,
  book,
  userId,
  isEditingThisTab,
  editingTab,
  setEditingTab,
  notes,
  setNotes,
  saveNotes,
  recommendedLevel,
  setRecommendedLevel,
  levelStars,
  kanjiMapLoading,
  kanjiMapError,
  kanjiMapQueue,
  openKanjiWordId,
  editingKanjiRows,
  savingKanjiWordId,
  handleWorkOnKanjiWord,
  updateKanjiMapRow,
  saveKanjiWord,
  removeWordFromKanjiEnrichment,
  setOpenKanjiWordId,
  hiraToKata,
}: TeacherTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Teacher Tools</div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            disabled
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-400 shadow-sm md:px-5 md:py-4 md:text-base"
          >
            Prepare Readings
          </button>

          <button
            disabled
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-400 shadow-sm md:px-5 md:py-4 md:text-base"
          >
            Notify Custom Readings
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Level (with guidance)</div>

        {!isEditingThisTab ? (
          <>
            <div className="mt-1 font-medium">{row.recommended_level || "—"}</div>
            <div className="mt-1 text-xs text-amber-600">{levelStars(row.recommended_level)}</div>
          </>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-5">
            {["N5", "N4", "N3", "N2", "N1"].map((opt) => {
              const isSelected = recommendedLevel === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRecommendedLevel(opt)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${isSelected
                    ? "border-stone-900 bg-stone-100"
                    : "border-stone-200 hover:bg-stone-50"
                    }`}
                >
                  <div className="text-amber-600">{levelStars(opt)}</div>
                  <div className="text-xs text-stone-600">{opt}</div>
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
                onClick={() => void saveNotes()}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
              >
                Save Notes
              </button>

              <button
                type="button"
                onClick={() => setEditingTab(null)}
                className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
            {notes?.trim() ? notes : "No teacher notes yet."}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">
          Kanji Map Enrichment Queue
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
              const hasRows = (word.vocabulary_kanji_map ?? []).length > 0;
              const isOpen = openKanjiWordId === word.id;
              const editRows = editingKanjiRows[word.id] ?? [];

              return (
                <div key={word.id} className="rounded-xl border bg-white p-3">
                  <div className="rounded-2xl border border-stone-300 bg-stone-100 px-5 py-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-2xl font-semibold text-stone-900">
                          {word.surface}
                        </div>
                        <div className="mt-1 text-lg text-stone-500">
                          {word.reading}・—
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                        <button
                          type="button"
                          onClick={() => handleWorkOnKanjiWord(word)}
                          className="rounded-2xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-700"
                        >
                          {openKanjiWordId === word.id ? "Working on this word" : "Prepare this word"}
                        </button>

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
                    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-stone-900">{word.surface}</div>
                        <div className="text-sm text-stone-500">
                          {word.reading} ・ {hiraToKata(word.reading ?? "")}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {editRows.map((rowItem) => (
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
                                updateKanjiMapRow(word.id, rowItem.id, "reading_type", e.target.value)
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
                                updateKanjiMapRow(word.id, rowItem.id, "base_reading", e.target.value)
                              }
                              placeholder="Base reading"
                              className="rounded border px-3 py-2 text-sm"
                            />

                            <input
                              value={rowItem.realized_reading ?? ""}
                              onChange={(e) =>
                                updateKanjiMapRow(word.id, rowItem.id, "realized_reading", e.target.value)
                              }
                              placeholder="Realized reading"
                              className="rounded border px-3 py-2 text-sm"
                            />
                          </div>
                        ))}
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
                          onClick={() => setOpenKanjiWordId(null)}
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