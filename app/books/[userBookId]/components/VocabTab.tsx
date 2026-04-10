type UserBook = {
  id: string;
};

type StudyTabProps = {
  row: UserBook;

  vocabTab: "readAlong" | "bulk";
  setVocabTab: (value: "readAlong" | "bulk") => void;

  isRunning: boolean;
  isPaused: boolean;

  quickWord: string;
  setQuickWord: (value: string) => void;
  quickLoading: boolean;
  quickError: string | null;
  pullQuickWord: () => Promise<void>;

  quickPreview: {
    surface: string;
    cacheSurface: string;
    reading: string;
    meanings: string[];
    selectedMeaningIndex: number;
    meaning: string;
    isCustomMeaning: boolean;
    useAlternateSurface: boolean;
    alternateSurface: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  } | null;
  setQuickPreview: React.Dispatch<
    React.SetStateAction<{
      surface: string;
      cacheSurface: string;
      reading: string;
      meanings: string[];
      selectedMeaningIndex: number;
      meaning: string;
      isCustomMeaning: boolean;
      useAlternateSurface: boolean;
      alternateSurface: string;
      page: string;
      chapterNumber: string;
      chapterName: string;
    } | null>
  >;

  hideKanjiInReadingSupport: boolean;
  setHideKanjiInReadingSupport: (value: boolean) => void;
  saveQuickWord: () => Promise<void>;

  quickSessionWords: {
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  }[];

  editingQuickSessionId: string | null;
  editingQuickSessionWord: {
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  } | null;
  setEditingQuickSessionWord: React.Dispatch<
    React.SetStateAction<{
      id: string;
      surface: string;
      reading: string;
      meaning: string;
      page: string;
      chapterNumber: string;
      chapterName: string;
    } | null>
  >;

  startEditingQuickSessionWord: (item: {
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  }) => void;
  cancelEditingQuickSessionWord: () => void;
  saveEditedQuickSessionWord: () => Promise<void>;

  quickWordInputRef: React.RefObject<HTMLInputElement | null>;
};

export default function StudyTab({
  row,
  vocabTab,
  setVocabTab,
  isRunning,
  isPaused,
  quickWord,
  setQuickWord,
  quickLoading,
  quickError,
  pullQuickWord,
  quickPreview,
  setQuickPreview,
  hideKanjiInReadingSupport,
  setHideKanjiInReadingSupport,
  saveQuickWord,
  quickSessionWords,
  editingQuickSessionId,
  editingQuickSessionWord,
  setEditingQuickSessionWord,
  startEditingQuickSessionWord,
  cancelEditingQuickSessionWord,
  saveEditedQuickSessionWord,
  quickWordInputRef,
}: StudyTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Vocab</div>

        <div className="grid gap-3 md:grid-cols-2">
          <a
            href={`/books/${row.id}/words`}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
          >
            📚 Vocab List
            <p className="mt-1 text-sm text-stone-500">
              Your saved words from this book, in book order.
            </p>
            <p className="text-sm text-stone-500">
              Review, reorder, and edit each entry.
            </p>
          </a>

          <a
            href={`/vocab/explore?userBookId=${row.id}`}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
          >
            🔎 Word History Search
            <p className="mt-1 text-sm text-stone-500">
             Search your library to see where a word appeared
            </p>
            <p className="text-sm text-stone-500">
              and how it was used.
            </p>
          </a>

        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Add Vocab</div>

        <div className="overflow-x-auto">
          <div className="flex w-max gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setVocabTab("readAlong")}
              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${vocabTab === "readAlong"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                }`}
            >
              Single Add
            </button>

            <button
              type="button"
              onClick={() => setVocabTab("bulk")}
              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${vocabTab === "bulk"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                }`}
            >
              Bulk Add
            </button>

            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${isRunning || isPaused
                ? "bg-red-200 text-red-900"
                : "bg-yellow-50 text-yellow-700"
                }`}
            >
              <span>●</span>
              <span>{isRunning || isPaused ? "Timer is active" : "Timer is not running"}</span>
              <span>●</span>
            </div>
          </div>
        </div>

        {vocabTab === "readAlong" && (
          <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
            <div className="mb-3 text-sm font-medium text-stone-900">Single Add</div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={quickWordInputRef}
                type="text"
                value={quickWord}
                onChange={(e) => setQuickWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void pullQuickWord();
                  }
                }}
                placeholder="Search a word..."
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
              />

              <button
                type="button"
                onClick={() => void pullQuickWord()}
                disabled={quickLoading || !quickWord.trim()}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
              >
                {quickLoading ? "Searching..." : "Search"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setQuickPreview({
                    surface: quickWord.trim(),
                    cacheSurface: "",
                    reading: "",
                    meanings: [],
                    selectedMeaningIndex: 0,
                    meaning: "",
                    isCustomMeaning: true,
                    useAlternateSurface: false,
                    alternateSurface: "",
                    page: "",
                    chapterNumber: "",
                    chapterName: "",
                  })
                }
                className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
              >
                Manual Entry
              </button>
            </div>

            {quickError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {quickError}
              </div>
            ) : null}

            {quickPreview ? (
              <div className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-sm font-medium text-stone-700">Word</div>
                    <input
                      value={quickPreview.surface}
                      onChange={(e) =>
                        setQuickPreview((prev) =>
                          prev ? { ...prev, surface: e.target.value } : prev
                        )
                      }
                      placeholder="Word"
                      className="w-full rounded border px-3 py-2 text-sm"
                    />

                    <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={quickPreview.useAlternateSurface}
                        onChange={(e) =>
                          setQuickPreview((prev) =>
                            prev
                              ? {
                                ...prev,
                                useAlternateSurface: e.target.checked,
                              }
                              : prev
                          )
                        }
                      />
                      <span>Alternate kanji (in this book)</span>
                    </label>

                    {quickPreview.useAlternateSurface ? (
                      <input
                        value={quickPreview.alternateSurface}
                        onChange={(e) =>
                          setQuickPreview((prev) =>
                            prev
                              ? { ...prev, alternateSurface: e.target.value }
                              : prev
                          )
                        }
                        placeholder="Book form (e.g. 愉しい)"
                        className="mt-2 w-full rounded border px-3 py-2 text-sm"
                      />
                    ) : null}
                  </div>

                  <div>
                    <div className="mb-1 text-sm font-medium text-stone-700">Reading</div>
                    <input
                      value={quickPreview.reading}
                      onChange={(e) =>
                        setQuickPreview((prev) =>
                          prev ? { ...prev, reading: e.target.value } : prev
                        )
                      }
                      placeholder="Reading"
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-stone-700">Meaning</div>

                  <div className="space-y-2">
                    {quickPreview.meanings.length > 0 ? (
                      quickPreview.meanings.map((meaning, index) => (
                        <label key={index} className="flex items-start gap-2 text-sm text-stone-700">
                          <input
                            type="radio"
                            checked={
                              !quickPreview.isCustomMeaning &&
                              quickPreview.selectedMeaningIndex === index
                            }
                            onChange={() =>
                              setQuickPreview((prev) =>
                                prev
                                  ? {
                                    ...prev,
                                    selectedMeaningIndex: index,
                                    meaning,
                                    isCustomMeaning: false,
                                  }
                                  : prev
                              )
                            }
                          />
                          <span>{meaning || "—"}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-stone-500">
                        No dictionary meanings loaded. Enter your own meaning below.
                      </p>
                    )}

                    <textarea
                      value={quickPreview.isCustomMeaning ? quickPreview.meaning : ""}
                      onChange={(e) =>
                        setQuickPreview((prev) =>
                          prev
                            ? {
                              ...prev,
                              meaning: e.target.value,
                              isCustomMeaning: true,
                            }
                            : prev
                        )
                      }
                      placeholder="Type your meaning"
                      className="min-h-[80px] w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={quickPreview.page}
                    onChange={(e) =>
                      setQuickPreview((prev) =>
                        prev ? { ...prev, page: e.target.value } : prev
                      )
                    }
                    placeholder="Page"
                    className="rounded border px-3 py-2 text-sm"
                  />

                  <input
                    value={quickPreview.chapterNumber}
                    onChange={(e) =>
                      setQuickPreview((prev) =>
                        prev ? { ...prev, chapterNumber: e.target.value } : prev
                      )
                    }
                    placeholder="Chapter #"
                    className="rounded border px-3 py-2 text-sm"
                  />

                  <input
                    value={quickPreview.chapterName}
                    onChange={(e) =>
                      setQuickPreview((prev) =>
                        prev ? { ...prev, chapterName: e.target.value } : prev
                      )
                    }
                    placeholder="Chapter name"
                    className="rounded border px-3 py-2 text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={hideKanjiInReadingSupport}
                    onChange={(e) => setHideKanjiInReadingSupport(e.target.checked)}
                  />
                  <span>Hide kanji in reading support</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveQuickWord()}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                  >
                    Save to Vocab List
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickPreview(null)}
                    className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {quickSessionWords.length > 0 ? (
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="mb-3 text-sm font-medium text-stone-900">
                  Words saved into Vocab List this session
                </div>

                <div className="space-y-3">
                  {quickSessionWords.map((item) => {
                    const isEditing = editingQuickSessionId === item.id;

                    return (
                      <div key={item.id} className="rounded-lg border bg-white p-3">
                        {!isEditing ? (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-sm">
                              <div className="font-medium text-stone-900">{item.surface}</div>
                              <div className="text-stone-500">{item.reading}</div>
                              <div className="mt-1 text-stone-700">{item.meaning}</div>
                              <div className="mt-1 text-xs text-stone-500">
                                Page {item.page || "—"} · Ch {item.chapterNumber || "—"} · {item.chapterName || "—"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => startEditingQuickSessionWord(item)}
                              className="rounded bg-stone-200 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-stone-300"
                            >
                              Edit
                            </button>
                          </div>
                        ) : editingQuickSessionWord ? (
                          <div className="space-y-2">
                            <input
                              value={editingQuickSessionWord.surface}
                              onChange={(e) =>
                                setEditingQuickSessionWord((prev) =>
                                  prev ? { ...prev, surface: e.target.value } : prev
                                )
                              }
                              className="w-full rounded border px-3 py-2 text-sm"
                            />

                            <input
                              value={editingQuickSessionWord.reading}
                              onChange={(e) =>
                                setEditingQuickSessionWord((prev) =>
                                  prev ? { ...prev, reading: e.target.value } : prev
                                )
                              }
                              className="w-full rounded border px-3 py-2 text-sm"
                            />

                            <textarea
                              value={editingQuickSessionWord.meaning}
                              onChange={(e) =>
                                setEditingQuickSessionWord((prev) =>
                                  prev ? { ...prev, meaning: e.target.value } : prev
                                )
                              }
                              className="min-h-[70px] w-full rounded border px-3 py-2 text-sm"
                            />

                            <div className="grid gap-2 sm:grid-cols-3">
                              <input
                                value={editingQuickSessionWord.page}
                                onChange={(e) =>
                                  setEditingQuickSessionWord((prev) =>
                                    prev ? { ...prev, page: e.target.value } : prev
                                  )
                                }
                                className="rounded border px-3 py-2 text-sm"
                              />

                              <input
                                value={editingQuickSessionWord.chapterNumber}
                                onChange={(e) =>
                                  setEditingQuickSessionWord((prev) =>
                                    prev ? { ...prev, chapterNumber: e.target.value } : prev
                                  )
                                }
                                className="rounded border px-3 py-2 text-sm"
                              />

                              <input
                                value={editingQuickSessionWord.chapterName}
                                onChange={(e) =>
                                  setEditingQuickSessionWord((prev) =>
                                    prev ? { ...prev, chapterName: e.target.value } : prev
                                  )
                                }
                                className="rounded border px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void saveEditedQuickSessionWord()}
                                className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                              >
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={cancelEditingQuickSessionWord}
                                className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
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
              </div>
            ) : null}
          </div>
        )}

        {vocabTab === "bulk" && (
          <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
            <div className="text-sm font-medium text-stone-900">Bulk Add</div>
            <p className="mt-1 text-sm text-stone-500">
              Use the existing bulk input tool.
            </p>

            <a
              href={`/vocab/bulk?userBookId=${row.id}`}
              className="mt-4 inline-block rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              Open Bulk Add
            </a>
          </div>
        )}
      </div>
    </div >
  );
}