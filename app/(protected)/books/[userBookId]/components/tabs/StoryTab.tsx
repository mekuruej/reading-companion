// Reading Journal Tab
// 

import ReadingJournalDetectiveTab from "./ReadingJournalDetectiveTab";
import ReadingJournalQuotesTab from "./ReadingJournalQuotesTab";
import type { FavoriteQuoteInput } from "./quoteLocationHelpers";
import type { DetectiveEntry, StoryTabMode } from "./readingJournalTypes";

const SIMPLE_RATING_VALUES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function formatSimpleRating(value: number | string | null | undefined) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "";

  return Number(value)
    .toFixed(1)
    .replace(/\.0$/, "");
}

type Character = {
  id: string;
  user_book_id: string;
  name: string;
  reading: string | null;
  role: string | null;
  first_seen_location: string | null;
  first_seen_page_number: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ChapterSummary = {
  id: string;
  user_book_id: string;
  chapter_number: number | string | null;
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
  tabOrder: StoryTabMode[];
  showCharacterReadingField?: boolean;

  detectiveEntries: DetectiveEntry[];
  detectiveSearch: string;
  setDetectiveSearch: (value: string) => void;
  collapsedDetectiveGroups: string[];
  expandedDetectiveIds: string[];
  editingDetectiveIds: string[];
  savingDetectiveIds: string[];
  savedDetectiveIds: string[];

  addDetectiveEntry: () => void;
  updateDetectiveEntry: (
    id: string,
    field: keyof DetectiveEntry,
    value: string | number | null
  ) => void;
  startEditingDetectiveEntry: (id: string) => void;
  stopEditingDetectiveEntry: (id: string) => void;
  toggleDetectiveEntryExpanded: (id: string) => void;
  toggleDetectiveGroup: (groupKey: string) => void;
  saveDetectiveEntry: (entry: DetectiveEntry) => Promise<void>;
  deleteDetectiveEntry: (id: string) => Promise<void>;

  characters: Character[];
  visibleCharacters: Character[];
  characterSearch: string;
  setCharacterSearch: (value: string) => void;
  showCharacters: boolean;
  setShowCharacters: (value: boolean) => void;
  charactersReverseOrder: boolean;
  setCharactersReverseOrder: (value: boolean) => void;
  editingCharacterIds: string[];
  savingCharacterIds: string[];
  savedCharacterIds: string[];

  addCharacter: () => void;
  updateCharacter: (id: string, field: keyof Character, value: string | number | null) => void;
  startEditingCharacter: (id: string) => void;
  stopEditingCharacter: (id: string) => void;
  saveCharacter: (item: Character) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;

  chapterSummaries: ChapterSummary[];
  visibleChapterSummaries: ChapterSummary[];
  plotSearch: string;
  setPlotSearch: (value: string) => void;
  showChapterSummaries: boolean;
  setShowChapterSummaries: (value: boolean) => void;
  chapterReverseOrder: boolean;
  setChapterReverseOrder: (value: boolean) => void;
  expandedChapterIds: string[];
  toggleChapterExpanded: (id: string) => void;
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
  settingSearch: string;
  setSettingSearch: (value: string) => void;
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
  culturalSearch: string;
  setCulturalSearch: (value: string) => void;
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

  favoriteQuoteInputs: FavoriteQuoteInput[];
  quoteSearch: string;
  setQuoteSearch: (value: string) => void;
  savedFavoriteQuotes: FavoriteQuoteInput[];
  savingQuotes: boolean;
  quotesSaveMessage: string;
  addFavoriteQuote: () => void;
  updateFavoriteQuote: (index: number, field: keyof FavoriteQuoteInput, value: string) => void;
  removeFavoriteQuote: (index: number) => void;
  saveFavoriteQuotes: () => Promise<void>;

  notes: string;
  savedNotes: string | null;
  setNotes: (value: string) => void;
  savingNotes: boolean;
  notesSaveMessage: string;
  saveNotes: () => Promise<void>;

  ratingOverall: string;
  savedRatingOverall: number | null;
  setRatingOverall: (value: string) => void;
  myReview: string;
  savedMyReview: string | null;
  setMyReview: (value: string) => void;
  savingReview: boolean;
  reviewSaveMessage: string;
  saveReviewRatings: () => Promise<void>;
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

function characterFirstAppearance(character: Character) {
  const location = character.first_seen_location?.trim();
  if (location) return location;
  return character.first_seen_page_number == null ? "" : String(character.first_seen_page_number);
}

function pageNumberFromFlexibleLocation(value: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const pageNumber = Number(trimmed);
  return Number.isFinite(pageNumber) ? Math.max(1, Math.trunc(pageNumber)) : null;
}

export default function StoryTab({
  storyTab,
  setStoryTab,
  tabOrder,
  showCharacterReadingField = true,

  detectiveEntries,
  detectiveSearch,
  setDetectiveSearch,
  collapsedDetectiveGroups,
  expandedDetectiveIds,
  editingDetectiveIds,
  savingDetectiveIds,
  savedDetectiveIds,
  addDetectiveEntry,
  updateDetectiveEntry,
  startEditingDetectiveEntry,
  stopEditingDetectiveEntry,
  toggleDetectiveEntryExpanded,
  toggleDetectiveGroup,
  saveDetectiveEntry,
  deleteDetectiveEntry,

  characters,
  visibleCharacters,
  characterSearch,
  setCharacterSearch,
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
  plotSearch,
  setPlotSearch,
  showChapterSummaries,
  setShowChapterSummaries,
  chapterReverseOrder,
  setChapterReverseOrder,
  expandedChapterIds,
  toggleChapterExpanded,
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
  settingSearch,
  setSettingSearch,
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
  culturalSearch,
  setCulturalSearch,
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

  favoriteQuoteInputs,
  quoteSearch,
  setQuoteSearch,
  savedFavoriteQuotes,
  savingQuotes,
  quotesSaveMessage,
  addFavoriteQuote,
  updateFavoriteQuote,
  removeFavoriteQuote,
  saveFavoriteQuotes,

  notes,
  savedNotes,
  setNotes,
  savingNotes,
  notesSaveMessage,
  saveNotes,

  ratingOverall,
  savedRatingOverall,
  setRatingOverall,
  myReview,
  savedMyReview,
  setMyReview,
  savingReview,
  reviewSaveMessage,
  saveReviewRatings,
}: StoryTabProps) {
  const cleanCharacterSearch = characterSearch.trim().toLowerCase();
  const filteredVisibleCharacters = cleanCharacterSearch
    ? visibleCharacters.filter((character) =>
        [
	          character.name,
	          showCharacterReadingField ? character.reading : "",
          character.role,
          characterFirstAppearance(character),
          character.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(cleanCharacterSearch)
      )
    : visibleCharacters;

  const cleanPlotSearch = plotSearch.trim().toLowerCase();
  const filteredVisibleChapterSummaries = cleanPlotSearch
    ? visibleChapterSummaries.filter((chapter) =>
        [
          chapter.chapter_number == null ? "" : String(chapter.chapter_number),
          chapter.chapter_title,
          chapter.summary,
        ]
          .join(" ")
          .toLowerCase()
          .includes(cleanPlotSearch)
      )
    : visibleChapterSummaries;

  const cleanSettingSearch = settingSearch.trim().toLowerCase();
  const filteredVisibleSettingItems = cleanSettingSearch
    ? visibleSettingItems.filter((item) =>
        [item.title, item.details].join(" ").toLowerCase().includes(cleanSettingSearch)
      )
    : visibleSettingItems;

  const cleanCulturalSearch = culturalSearch.trim().toLowerCase();
  const filteredVisibleCulturalItems = cleanCulturalSearch
    ? visibleCulturalItems.filter((item) =>
        [item.title, item.details].join(" ").toLowerCase().includes(cleanCulturalSearch)
      )
    : visibleCulturalItems;
  const tabLabels: Record<StoryTabMode, string> = {
    characters: "Characters",
    plot: "Plot",
    detective: "Detective",
    setting: "Setting",
    cultural: "Cultural",
    quotes: "Quotes",
    notes: "Notes",
    review: "Review & Ratings",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 pl-2">
        {tabOrder.map((tab) => (
          <StorySubTab key={tab} active={storyTab === tab} onClick={() => setStoryTab(tab)}>
            {tabLabels[tab]}
          </StorySubTab>
        ))}
      </div>

      {storyTab === "detective" && (
        <ReadingJournalDetectiveTab
          detectiveEntries={detectiveEntries}
          detectiveSearch={detectiveSearch}
          setDetectiveSearch={setDetectiveSearch}
          collapsedDetectiveGroups={collapsedDetectiveGroups}
          expandedDetectiveIds={expandedDetectiveIds}
          editingDetectiveIds={editingDetectiveIds}
          savingDetectiveIds={savingDetectiveIds}
          savedDetectiveIds={savedDetectiveIds}
          addDetectiveEntry={addDetectiveEntry}
          updateDetectiveEntry={updateDetectiveEntry}
          startEditingDetectiveEntry={startEditingDetectiveEntry}
          stopEditingDetectiveEntry={stopEditingDetectiveEntry}
          toggleDetectiveEntryExpanded={toggleDetectiveEntryExpanded}
          toggleDetectiveGroup={toggleDetectiveGroup}
          saveDetectiveEntry={saveDetectiveEntry}
          deleteDetectiveEntry={deleteDetectiveEntry}
        />
      )}

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
	                Flip Order
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

          <input
            value={characterSearch}
            onChange={(event) => setCharacterSearch(event.target.value)}
            placeholder="Search characters..."
            className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
          />

          {showCharacters ? (
            characters.length === 0 ? (
              <div className="text-sm text-stone-500">No characters yet.</div>
            ) : filteredVisibleCharacters.length === 0 ? (
              <div className="text-sm text-stone-500">No characters match this search.</div>
            ) : (
              <div className="space-y-3">
                {filteredVisibleCharacters.map((character) => {
                  const isEditing = editingCharacterIds.includes(character.id);
                  const isSaving = savingCharacterIds.includes(character.id);
                  const isSaved = savedCharacterIds.includes(character.id);
                  const firstAppearance = characterFirstAppearance(character);

                  return (
                    <div key={character.id} className="rounded-xl border bg-white p-4">
                      {!isEditing ? (
                        <div className="space-y-2 text-sm">
	                          <div className="font-medium text-stone-900">
	                            {character.name || "—"}
	                            {showCharacterReadingField && character.reading ? ` · ${character.reading}` : ""}
	                          </div>
                          {firstAppearance ? (
                            <div className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                              First appearance: {firstAppearance}
                            </div>
                          ) : null}
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

	                          {showCharacterReadingField ? (
	                            <input
	                              value={character.reading ?? ""}
	                              onChange={(e) =>
	                                updateCharacter(character.id, "reading", e.target.value)
	                              }
	                              placeholder="Reading"
	                              className="w-full rounded border px-3 py-2 text-sm"
	                            />
	                          ) : null}

                          <input
                            value={character.role ?? ""}
                            onChange={(e) => updateCharacter(character.id, "role", e.target.value)}
                            placeholder="Role"
                            className="w-full rounded border px-3 py-2 text-sm"
                          />

                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                              First appearance
                            </span>
                            <input
                              type="text"
                              value={characterFirstAppearance(character)}
                              onChange={(e) => {
                                const nextLocation = e.target.value;
                                updateCharacter(character.id, "first_seen_location", nextLocation);
                                updateCharacter(
                                  character.id,
                                  "first_seen_page_number",
                                  pageNumberFromFlexibleLocation(nextLocation)
                                );
                              }}
                              placeholder="Page, chapter, percentage, or other location"
                              className="w-full rounded border px-3 py-2 text-sm"
                            />
                            <span className="mt-1 block text-xs text-stone-500">
                              Page, chapter, percentage, or other location
                            </span>
                          </label>

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
	                Flip Order
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

          <input
            value={plotSearch}
            onChange={(event) => setPlotSearch(event.target.value)}
            placeholder="Search plot notes..."
            className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
          />

          {showChapterSummaries ? (
            chapterSummaries.length === 0 ? (
              <div className="text-sm text-stone-500">No chapter summaries yet.</div>
            ) : filteredVisibleChapterSummaries.length === 0 ? (
              <div className="text-sm text-stone-500">No plot notes match this search.</div>
            ) : (
              <div className="space-y-3">
                {filteredVisibleChapterSummaries.map((chapter) => {
                  const isEditing = editingChapterIds.includes(chapter.id);
                  const isSaving = savingChapterIds.includes(chapter.id);
                  const isSaved = savedChapterIds.includes(chapter.id);
                  const isExpanded = isEditing || expandedChapterIds.includes(chapter.id);

                  return (
                    <div key={chapter.id} className="rounded-xl border bg-white p-4">
                      {!isEditing ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="font-medium text-stone-900">
                              Chapter {chapter.chapter_number ?? "—"}
                              {chapter.chapter_title ? ` · ${chapter.chapter_title}` : ""}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleChapterExpanded(chapter.id)}
                              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                            >
                              {isExpanded ? "Collapse" : "Expand"}
                            </button>
                          </div>

                          {isExpanded ? (
                            <div className="whitespace-pre-wrap text-stone-700">
                              {chapter.summary || "—"}
                            </div>
                          ) : null}

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
                            inputMode="decimal"
                            placeholder="Chapter number, e.g. 5.2"
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
	                Flip Order
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

          <input
            value={settingSearch}
            onChange={(event) => setSettingSearch(event.target.value)}
            placeholder="Search setting notes..."
            className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
          />

          {showSettingItems ? (
            settingItems.length === 0 ? (
              <div className="text-sm text-stone-500">No setting notes yet.</div>
            ) : filteredVisibleSettingItems.length === 0 ? (
              <div className="text-sm text-stone-500">No setting notes match this search.</div>
            ) : (
              <div className="space-y-3">
                {filteredVisibleSettingItems.map((item) => {
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
	                Flip Order
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

          <input
            value={culturalSearch}
            onChange={(event) => setCulturalSearch(event.target.value)}
            placeholder="Search cultural notes..."
            className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
          />

          {showCulturalItems ? (
            culturalItems.length === 0 ? (
              <div className="text-sm text-stone-500">No cultural notes yet.</div>
            ) : filteredVisibleCulturalItems.length === 0 ? (
              <div className="text-sm text-stone-500">No cultural notes match this search.</div>
            ) : (
              <div className="space-y-3">
                {filteredVisibleCulturalItems.map((item) => {
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

      {storyTab === "quotes" && (
        <ReadingJournalQuotesTab
          favoriteQuoteInputs={favoriteQuoteInputs}
          quoteSearch={quoteSearch}
          setQuoteSearch={setQuoteSearch}
          savedFavoriteQuotes={savedFavoriteQuotes}
          savingQuotes={savingQuotes}
          quotesSaveMessage={quotesSaveMessage}
          addFavoriteQuote={addFavoriteQuote}
          updateFavoriteQuote={updateFavoriteQuote}
          removeFavoriteQuote={removeFavoriteQuote}
          saveFavoriteQuotes={saveFavoriteQuotes}
        />
      )}

      {storyTab === "notes" && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-stone-900">Notes</div>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                A private place for anything you want to remember.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveNotes()}
              disabled={savingNotes}
              className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[220px] w-full rounded-xl border border-stone-200 bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
            placeholder="Add thoughts, questions, or anything else you want to remember."
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <span>{savedNotes?.trim() ? "Saved notes are private." : "No notes saved yet."}</span>
            {notesSaveMessage ? <span className="font-semibold">{notesSaveMessage}</span> : null}
          </div>
        </div>
      )}

      {storyTab === "review" && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-stone-900">Review & Ratings</div>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                Your private response to this book.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveReviewRatings()}
              disabled={savingReview}
              className="rounded-xl bg-purple-700 px-3 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
            >
              {savingReview ? "Saving..." : "Save Review"}
            </button>
          </div>

	          <div>
	            <p className="text-sm font-semibold text-stone-900">Overall Enjoyment</p>
	            <p className="mt-1 text-xs text-stone-500">1 = hated it · 5 = loved it</p>
	            <div className="mt-2 flex flex-wrap gap-2">
              {SIMPLE_RATING_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRatingOverall(String(value))}
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black transition",
                    ratingOverall === String(value)
                      ? "border-amber-400 bg-amber-100 text-amber-950"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100",
                  ].join(" ")}
                >
                  {formatSimpleRating(value)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRatingOverall("")}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-stone-50"
              >
                Clear
              </button>
            </div>
            {savedRatingOverall != null ? (
              <p className="mt-2 text-xs text-stone-500">Saved rating: {formatSimpleRating(savedRatingOverall)}/5</p>
            ) : null}
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-stone-900">My Review</span>
            <span className="mt-1 block text-xs text-stone-500">What did you think of the book?</span>
            <textarea
              value={myReview}
              onChange={(event) => setMyReview(event.target.value)}
              className="mt-2 min-h-[180px] w-full rounded-xl border border-stone-200 bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
              placeholder="Write your private review here..."
            />
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <span>{savedMyReview?.trim() ? "Saved review is private." : "No review saved yet."}</span>
            {reviewSaveMessage ? <span className="font-semibold">{reviewSaveMessage}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
