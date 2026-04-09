type StoryTabMode = "characters" | "plot" | "setting" | "cultural";

type Character = {
  id: string;
  user_book_id: string;
  name: string;
  reading: string | null;
  role: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ChapterSummary = {
  id: string;
  user_book_id: string;
  chapter_number: number | null;
  chapter_title: string | null;
  summary: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type SettingItem = {
  id: string;
  user_book_id: string;
  title: string | null;
  details: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CulturalItem = {
  id: string;
  user_book_id: string;
  title: string | null;
  details: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type StoryTabProps = {
  storyTab: StoryTabMode;
  setStoryTab: (value: StoryTabMode) => void;

  characters: Character[];
  visibleCharacters: Character[];
  showCharacters: boolean;
  setShowCharacters: (value: boolean) => void;
  charactersReverseOrder: boolean;
  setCharactersReverseOrder: (value: boolean) => void;
  editingCharacterIds: string[];
  savingCharacterIds: string[];
  savedCharacterIds: string[];

  addCharacter: () => void;
  updateCharacter: (id: string, field: keyof Character, value: string) => void;
  startEditingCharacter: (id: string) => void;
  stopEditingCharacter: (id: string) => void;
  saveCharacter: (item: Character) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;

  chapterSummaries: ChapterSummary[];
  visibleChapterSummaries: ChapterSummary[];
  showChapterSummaries: boolean;
  setShowChapterSummaries: (value: boolean) => void;
  chapterReverseOrder: boolean;
  setChapterReverseOrder: (value: boolean) => void;
  editingChapterIds: string[];
  savingChapterIds: string[];
  savedChapterIds: string[];

  addChapterSummary: () => void;
  updateChapterSummary: (
    id: string,
    field: keyof ChapterSummary,
    value: string
  ) => void;
  startEditingChapter: (id: string) => void;
  stopEditingChapter: (id: string) => void;
  saveChapterSummary: (item: ChapterSummary) => Promise<void>;
  deleteChapterSummary: (id: string) => Promise<void>;

  settingItems: SettingItem[];
  visibleSettingItems: SettingItem[];
  showSettingItems: boolean;
  setShowSettingItems: (value: boolean) => void;
  settingReverseOrder: boolean;
  setSettingReverseOrder: (value: boolean) => void;
  editingSettingIds: string[];
  savingSettingIds: string[];
  savedSettingIds: string[];

  addSettingItem: () => void;
  updateSettingItem: (id: string, field: keyof SettingItem, value: string) => void;
  startEditingSettingItem: (id: string) => void;
  stopEditingSettingItem: (id: string) => void;
  saveSettingItem: (item: SettingItem) => Promise<void>;
  deleteSettingItem: (id: string) => Promise<void>;

  culturalItems: CulturalItem[];
  visibleCulturalItems: CulturalItem[];
  showCulturalItems: boolean;
  setShowCulturalItems: (value: boolean) => void;
  culturalReverseOrder: boolean;
  setCulturalReverseOrder: (value: boolean) => void;
  editingCulturalIds: string[];
  savingCulturalIds: string[];
  savedCulturalIds: string[];

  addCulturalItem: () => void;
  updateCulturalItem: (id: string, field: keyof CulturalItem, value: string) => void;
  startEditingCulturalItem: (id: string) => void;
  stopEditingCulturalItem: (id: string) => void;
  saveCulturalItem: (item: CulturalItem) => Promise<void>;
  deleteCulturalItem: (id: string) => Promise<void>;
};

function StorySubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function StoryTab({
  storyTab,
  setStoryTab,

  characters,
  visibleCharacters,
  showCharacters,
  setShowCharacters,
  charactersReverseOrder,
  setCharactersReverseOrder,
  editingCharacterIds,
  savingCharacterIds,
  savedCharacterIds,
  addCharacter,
  updateCharacter,
  startEditingCharacter,
  stopEditingCharacter,
  saveCharacter,
  deleteCharacter,

  chapterSummaries,
  visibleChapterSummaries,
  showChapterSummaries,
  setShowChapterSummaries,
  chapterReverseOrder,
  setChapterReverseOrder,
  editingChapterIds,
  savingChapterIds,
  savedChapterIds,
  addChapterSummary,
  updateChapterSummary,
  startEditingChapter,
  stopEditingChapter,
  saveChapterSummary,
  deleteChapterSummary,

  settingItems,
  visibleSettingItems,
  showSettingItems,
  setShowSettingItems,
  settingReverseOrder,
  setSettingReverseOrder,
  editingSettingIds,
  savingSettingIds,
  savedSettingIds,
  addSettingItem,
  updateSettingItem,
  startEditingSettingItem,
  stopEditingSettingItem,
  saveSettingItem,
  deleteSettingItem,

  culturalItems,
  visibleCulturalItems,
  showCulturalItems,
  setShowCulturalItems,
  culturalReverseOrder,
  setCulturalReverseOrder,
  editingCulturalIds,
  savingCulturalIds,
  savedCulturalIds,
  addCulturalItem,
  updateCulturalItem,
  startEditingCulturalItem,
  stopEditingCulturalItem,
  saveCulturalItem,
  deleteCulturalItem,
}: StoryTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <StorySubTab active={storyTab === "characters"} onClick={() => setStoryTab("characters")}>
          Characters
        </StorySubTab>
        <StorySubTab active={storyTab === "plot"} onClick={() => setStoryTab("plot")}>
          Plot
        </StorySubTab>
        <StorySubTab active={storyTab === "setting"} onClick={() => setStoryTab("setting")}>
          Setting
        </StorySubTab>
        <StorySubTab active={storyTab === "cultural"} onClick={() => setStoryTab("cultural")}>
          Cultural
        </StorySubTab>
      </div>

      {storyTab === "characters" && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-stone-900">Characters</div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCharacters(!showCharacters)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {showCharacters ? "Hide" : "Show"}
              </button>

              <button
                type="button"
                onClick={() => setCharactersReverseOrder(!charactersReverseOrder)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {charactersReverseOrder ? "Oldest First" : "Newest First"}
              </button>

              <button
                type="button"
                onClick={addCharacter}
                className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Add Character
              </button>
            </div>
          </div>

          {showCharacters ? (
            characters.length === 0 ? (
              <div className="text-sm text-stone-500">No characters yet.</div>
            ) : (
              <div className="space-y-3">
                {visibleCharacters.map((character) => {
                  const isEditing = editingCharacterIds.includes(character.id);
                  const isSaving = savingCharacterIds.includes(character.id);
                  const isSaved = savedCharacterIds.includes(character.id);

                  return (
                    <div key={character.id} className="rounded-xl border bg-white p-4">
                      {!isEditing ? (
                        <div className="space-y-2 text-sm">
                          <div className="font-medium text-stone-900">
                            {character.name || "—"}
                            {character.reading ? ` · ${character.reading}` : ""}
                          </div>
                          <div className="text-stone-700">{character.role || "—"}</div>
                          <div className="whitespace-pre-wrap text-stone-700">
                            {character.notes || "—"}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingCharacter(character.id)}
                              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteCharacter(character.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            value={character.name}
                            onChange={(e) => updateCharacter(character.id, "name", e.target.value)}
                            placeholder="Character name"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <input
                            value={character.reading ?? ""}
                            onChange={(e) =>
                              updateCharacter(character.id, "reading", e.target.value)
                            }
                            placeholder="Reading"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <input
                            value={character.role ?? ""}
                            onChange={(e) => updateCharacter(character.id, "role", e.target.value)}
                            placeholder="Role"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <textarea
                            value={character.notes ?? ""}
                            onChange={(e) => updateCharacter(character.id, "notes", e.target.value)}
                            placeholder="Notes"
                            className="min-h-[120px] w-full rounded border px-3 py-2 text-sm"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveCharacter(character)}
                              disabled={isSaving}
                              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
                            </button>

                            <button
                              type="button"
                              onClick={() => stopEditingCharacter(character.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteCharacter(character.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="text-sm text-stone-500">Hidden.</div>
          )}
        </div>
      )}

      {storyTab === "plot" && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-stone-900">Chapter Summaries</div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowChapterSummaries(!showChapterSummaries)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {showChapterSummaries ? "Hide" : "Show"}
              </button>

              <button
                type="button"
                onClick={() => setChapterReverseOrder(!chapterReverseOrder)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {chapterReverseOrder ? "Oldest First" : "Newest First"}
              </button>

              <button
                type="button"
                onClick={addChapterSummary}
                className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Add Summary
              </button>
            </div>
          </div>

          {showChapterSummaries ? (
            chapterSummaries.length === 0 ? (
              <div className="text-sm text-stone-500">No chapter summaries yet.</div>
            ) : (
              <div className="space-y-3">
                {visibleChapterSummaries.map((chapter) => {
                  const isEditing = editingChapterIds.includes(chapter.id);
                  const isSaving = savingChapterIds.includes(chapter.id);
                  const isSaved = savedChapterIds.includes(chapter.id);

                  return (
                    <div key={chapter.id} className="rounded-xl border bg-white p-4">
                      {!isEditing ? (
                        <div className="space-y-2 text-sm">
                          <div className="font-medium text-stone-900">
                            Chapter {chapter.chapter_number ?? "—"}
                            {chapter.chapter_title ? ` · ${chapter.chapter_title}` : ""}
                          </div>
                          <div className="whitespace-pre-wrap text-stone-700">
                            {chapter.summary || "—"}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingChapter(chapter.id)}
                              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteChapterSummary(chapter.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            value={chapter.chapter_number ?? ""}
                            onChange={(e) =>
                              updateChapterSummary(chapter.id, "chapter_number", e.target.value)
                            }
                            placeholder="Chapter number"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <input
                            value={chapter.chapter_title ?? ""}
                            onChange={(e) =>
                              updateChapterSummary(chapter.id, "chapter_title", e.target.value)
                            }
                            placeholder="Chapter title"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <textarea
                            value={chapter.summary}
                            onChange={(e) =>
                              updateChapterSummary(chapter.id, "summary", e.target.value)
                            }
                            placeholder="Summary"
                            className="min-h-[120px] w-full rounded border px-3 py-2 text-sm"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveChapterSummary(chapter)}
                              disabled={isSaving}
                              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
                            </button>

                            <button
                              type="button"
                              onClick={() => stopEditingChapter(chapter.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteChapterSummary(chapter.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="text-sm text-stone-500">Hidden.</div>
          )}
        </div>
      )}

      {storyTab === "setting" && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-stone-900">Setting</div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSettingItems(!showSettingItems)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {showSettingItems ? "Hide" : "Show"}
              </button>

              <button
                type="button"
                onClick={() => setSettingReverseOrder(!settingReverseOrder)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {settingReverseOrder ? "Oldest First" : "Newest First"}
              </button>

              <button
                type="button"
                onClick={addSettingItem}
                className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Add Setting
              </button>
            </div>
          </div>

          {showSettingItems ? (
            settingItems.length === 0 ? (
              <div className="text-sm text-stone-500">No setting notes yet.</div>
            ) : (
              <div className="space-y-3">
                {visibleSettingItems.map((item) => {
                  const isEditing = editingSettingIds.includes(item.id);
                  const isSaving = savingSettingIds.includes(item.id);
                  const isSaved = savedSettingIds.includes(item.id);

                  return (
                    <div key={item.id} className="rounded-xl border bg-white p-4">
                      {!isEditing ? (
                        <div className="space-y-2 text-sm">
                          <div className="font-medium text-stone-900">{item.title || "—"}</div>
                          <div className="whitespace-pre-wrap text-stone-700">
                            {item.details || "—"}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingSettingItem(item.id)}
                              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteSettingItem(item.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            value={item.title ?? ""}
                            onChange={(e) =>
                              updateSettingItem(item.id, "title", e.target.value)
                            }
                            placeholder="Title"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <textarea
                            value={item.details}
                            onChange={(e) =>
                              updateSettingItem(item.id, "details", e.target.value)
                            }
                            placeholder="Details"
                            className="min-h-[120px] w-full rounded border px-3 py-2 text-sm"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveSettingItem(item)}
                              disabled={isSaving}
                              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
                            </button>

                            <button
                              type="button"
                              onClick={() => stopEditingSettingItem(item.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteSettingItem(item.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="text-sm text-stone-500">Hidden.</div>
          )}
        </div>
      )}

      {storyTab === "cultural" && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-stone-900">Cultural</div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCulturalItems(!showCulturalItems)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {showCulturalItems ? "Hide" : "Show"}
              </button>

              <button
                type="button"
                onClick={() => setCulturalReverseOrder(!culturalReverseOrder)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {culturalReverseOrder ? "Oldest First" : "Newest First"}
              </button>

              <button
                type="button"
                onClick={addCulturalItem}
                className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Add Cultural
              </button>
            </div>
          </div>

          {showCulturalItems ? (
            culturalItems.length === 0 ? (
              <div className="text-sm text-stone-500">No cultural notes yet.</div>
            ) : (
              <div className="space-y-3">
                {visibleCulturalItems.map((item) => {
                  const isEditing = editingCulturalIds.includes(item.id);
                  const isSaving = savingCulturalIds.includes(item.id);
                  const isSaved = savedCulturalIds.includes(item.id);

                  return (
                    <div key={item.id} className="rounded-xl border bg-white p-4">
                      {!isEditing ? (
                        <div className="space-y-2 text-sm">
                          <div className="font-medium text-stone-900">{item.title || "—"}</div>
                          <div className="whitespace-pre-wrap text-stone-700">
                            {item.details || "—"}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingCulturalItem(item.id)}
                              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteCulturalItem(item.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            value={item.title ?? ""}
                            onChange={(e) =>
                              updateCulturalItem(item.id, "title", e.target.value)
                            }
                            placeholder="Title"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <textarea
                            value={item.details}
                            onChange={(e) =>
                              updateCulturalItem(item.id, "details", e.target.value)
                            }
                            placeholder="Details"
                            className="min-h-[120px] w-full rounded border px-3 py-2 text-sm"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveCulturalItem(item)}
                              disabled={isSaving}
                              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
                            </button>

                            <button
                              type="button"
                              onClick={() => stopEditingCulturalItem(item.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteCulturalItem(item.id)}
                              className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="text-sm text-stone-500">Hidden.</div>
          )}
        </div>
      )}
    </div>
  );
}