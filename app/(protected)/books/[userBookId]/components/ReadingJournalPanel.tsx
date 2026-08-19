"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  JapaneseLearningJournalArchiveTabs,
  JapaneseLearningJournalTab,
} from "@/lib/access/readingCompanion";
import { supabase } from "@/lib/supabaseClient";
import StoryTab from "./tabs/StoryTab";
import type { StoryTabMode } from "./tabs/readingJournalTypes";
import {
  emptyFavoriteQuoteInput,
  favoriteQuoteInputsToText,
  favoriteQuoteTextToInputs,
} from "./tabs/quoteLocationHelpers";
import { useDetectiveEntries } from "../story/useDetectiveEntries";

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

type UserBookReview = {
  id: string;
  user_book_id: string;
  review_language: string;
  review_text: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ReadingJournalPanelProps = {
  userBookId: string;
  ownerUserId: string;
  favoriteQuotes?: string | null;
  bookLanguageCode?: string | null;
  currentPageNumber?: number | null;
  selectedChapterLabel?: string | null;
  selectedChapterNumber?: number | null;
  compact?: boolean;
  vocabListHref?: string;
  canUseJapaneseLearningJournal?: boolean;
  japaneseLearningArchiveTabs?: JapaneseLearningJournalArchiveTabs;
  onFavoriteQuotesChange?: (value: string | null) => void;
};

const characterSelectWithFlexibleLocation =
  "id, user_book_id, name, reading, role, first_seen_location, first_seen_page_number, notes, sort_order, created_at, updated_at";
const legacyCharacterSelect =
  "id, user_book_id, name, reading, role, first_seen_page_number, notes, sort_order, created_at, updated_at";

function normalizeCharacters(data: any[] | null | undefined): Character[] {
  return ((data ?? []) as any[]).map((item) => ({
    ...item,
    first_seen_location: item.first_seen_location ?? null,
  })) as Character[];
}

function isMissingFirstSeenLocationError(error: any) {
  const text = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("first_seen_location") || text.includes("pgrst204") || text.includes("42703");
}

function isMissingReviewsTableError(error: any) {
  const text = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("user_book_reviews") || text.includes("pgrst205") || text.includes("42p01");
}

function omitFlexibleCharacterLocation<T extends { first_seen_location?: unknown }>(payload: T) {
  const { first_seen_location: _firstSeenLocation, ...legacyPayload } = payload;
  return legacyPayload;
}

function latestChapterSummaryId(items: ChapterSummary[]) {
  const latest = [...items].sort((a, b) => {
    const bTime = Date.parse(b.created_at || b.updated_at || "");
    const aTime = Date.parse(a.created_at || a.updated_at || "");
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  })[0];

  return latest?.id ?? null;
}

function nextChapterSummaryNumber(items: ChapterSummary[]) {
  const chapterNumbers = items
    .map((item) => item.chapter_number)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return chapterNumbers.length > 0 ? Math.max(...chapterNumbers) + 1 : 1;
}

function parseChapterSummaryNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^(?:\d+|\d+\.\d*|\.\d+)$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function isChapterSummaryNumberDraft(value: string) {
  return /^\d*(?:\.\d*)?$/.test(value);
}

function chapterSummarySaveErrorMessage(chapterNumber: number | null) {
  if (chapterNumber != null && !Number.isInteger(chapterNumber)) {
    return "Could not save this decimal chapter number. The database needs the decimal chapter-number migration applied.";
  }

  return "Could not save chapter summary.";
}

const baseJournalStartTabs: StoryTabMode[] = ["characters", "plot"];
const japaneseLearningJournalTabs: JapaneseLearningJournalTab[] = [
  "detective",
  "setting",
  "cultural",
];
const baseJournalEndTabs: StoryTabMode[] = ["quotes", "notes"];

function clampRating5(value: number) {
  if (!Number.isFinite(value)) return null;
  return Math.min(5, Math.max(1, Math.round(value * 2) / 2));
}

export default function ReadingJournalPanel({
  userBookId,
  ownerUserId,
  favoriteQuotes,
  bookLanguageCode,
  currentPageNumber,
  selectedChapterLabel,
  selectedChapterNumber,
  compact = false,
  canUseJapaneseLearningJournal = false,
  japaneseLearningArchiveTabs = {
    detective: false,
    setting: false,
    cultural: false,
  },
  onFavoriteQuotesChange,
}: ReadingJournalPanelProps) {
  const [storyTab, setStoryTab] = useState<StoryTabMode>("characters");
  const learningTabs = useMemo(
    () =>
      canUseJapaneseLearningJournal
        ? japaneseLearningJournalTabs
        : japaneseLearningJournalTabs.filter((tab) => japaneseLearningArchiveTabs[tab]),
    [
      canUseJapaneseLearningJournal,
      japaneseLearningArchiveTabs.cultural,
      japaneseLearningArchiveTabs.detective,
      japaneseLearningArchiveTabs.setting,
    ]
  );
  const tabOrder = useMemo<StoryTabMode[]>(
    () => [
      ...baseJournalStartTabs,
      ...learningTabs,
      ...baseJournalEndTabs,
      "review",
    ],
    [learningTabs]
  );
  const learningArchiveReadOnlyTabs = useMemo(
    () => ({
      detective: !canUseJapaneseLearningJournal && japaneseLearningArchiveTabs.detective,
      setting: !canUseJapaneseLearningJournal && japaneseLearningArchiveTabs.setting,
      cultural: !canUseJapaneseLearningJournal && japaneseLearningArchiveTabs.cultural,
    }),
    [
      canUseJapaneseLearningJournal,
      japaneseLearningArchiveTabs.cultural,
      japaneseLearningArchiveTabs.detective,
      japaneseLearningArchiveTabs.setting,
    ]
  );
  const detective = useDetectiveEntries();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterSearch, setCharacterSearch] = useState("");
  const [showCharacters, setShowCharacters] = useState(true);
  const [charactersReverseOrder, setCharactersReverseOrder] = useState(true);
  const [editingCharacterIds, setEditingCharacterIds] = useState<string[]>([]);
  const [savingCharacterIds, setSavingCharacterIds] = useState<string[]>([]);
  const [savedCharacterIds, setSavedCharacterIds] = useState<string[]>([]);

  const [chapterSummaries, setChapterSummaries] = useState<ChapterSummary[]>([]);
  const [plotSearch, setPlotSearch] = useState("");
  const [showChapterSummaries, setShowChapterSummaries] = useState(true);
  const [chapterReverseOrder, setChapterReverseOrder] = useState(true);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);
  const [editingChapterIds, setEditingChapterIds] = useState<string[]>([]);
  const [savingChapterIds, setSavingChapterIds] = useState<string[]>([]);
  const [savedChapterIds, setSavedChapterIds] = useState<string[]>([]);
  const initializedExpandedChapterIdsForBookRef = useRef<string | null>(null);

  const [settingItems, setSettingItems] = useState<SettingItem[]>([]);
  const [settingSearch, setSettingSearch] = useState("");
  const [showSettingItems, setShowSettingItems] = useState(true);
  const [settingReverseOrder, setSettingReverseOrder] = useState(true);
  const [editingSettingIds, setEditingSettingIds] = useState<string[]>([]);
  const [savingSettingIds, setSavingSettingIds] = useState<string[]>([]);
  const [savedSettingIds, setSavedSettingIds] = useState<string[]>([]);

  const [culturalItems, setCulturalItems] = useState<CulturalItem[]>([]);
  const [culturalSearch, setCulturalSearch] = useState("");
  const [showCulturalItems, setShowCulturalItems] = useState(true);
  const [culturalReverseOrder, setCulturalReverseOrder] = useState(true);
  const [editingCulturalIds, setEditingCulturalIds] = useState<string[]>([]);
  const [savingCulturalIds, setSavingCulturalIds] = useState<string[]>([]);
  const [savedCulturalIds, setSavedCulturalIds] = useState<string[]>([]);

  const [favoriteQuoteInputs, setFavoriteQuoteInputs] = useState(() =>
    favoriteQuoteTextToInputs(favoriteQuotes)
  );
  const [quoteSearch, setQuoteSearch] = useState("");
  const [savingQuotes, setSavingQuotes] = useState(false);
  const [quotesSaveMessage, setQuotesSaveMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaveMessage, setNotesSaveMessage] = useState("");
  const [ratingOverall, setRatingOverall] = useState("");
  const [savedRatingOverall, setSavedRatingOverall] = useState<number | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewSaveMessage, setReviewSaveMessage] = useState("");
  const [reviews, setReviews] = useState<UserBookReview[]>([]);
  const [reviewDraftLanguage, setReviewDraftLanguage] = useState("");
  const [reviewDraftText, setReviewDraftText] = useState("");
  const [savingReviewIds, setSavingReviewIds] = useState<string[]>([]);

  const visibleCharacters = useMemo(() => {
    const copy = [...characters];
    return charactersReverseOrder ? copy.reverse() : copy;
  }, [characters, charactersReverseOrder]);

  const visibleChapterSummaries = useMemo(() => {
    const copy = [...chapterSummaries];
    return chapterReverseOrder ? copy.reverse() : copy;
  }, [chapterSummaries, chapterReverseOrder]);

  const visibleSettingItems = useMemo(() => {
    const copy = [...settingItems];
    return settingReverseOrder ? copy.reverse() : copy;
  }, [settingItems, settingReverseOrder]);

  const visibleCulturalItems = useMemo(() => {
    const copy = [...culturalItems];
    return culturalReverseOrder ? copy.reverse() : copy;
  }, [culturalItems, culturalReverseOrder]);

  const visibleReviews = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return Date.parse(a.created_at || "") - Date.parse(b.created_at || "");
      }),
    [reviews]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await Promise.all([
        detective.loadDetectiveEntries({ userBookId, ownerUserId }),
        loadCharacters(userBookId, cancelled),
        loadChapterSummaries(userBookId, cancelled),
        loadSettingItems(userBookId, cancelled),
        loadCulturalItems(userBookId, cancelled),
        loadReviews(userBookId, cancelled),
      ]);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userBookId, ownerUserId]);

  useEffect(() => {
    if (!tabOrder.includes(storyTab)) {
      setStoryTab(tabOrder[0] ?? "characters");
    }
  }, [storyTab, tabOrder]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadingCompanionFields() {
      const { data, error } = await supabase
        .from("user_books")
        .select("notes, rating_overall")
        .eq("id", userBookId)
        .eq("user_id", ownerUserId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading Reading Journal companion fields:", error);
        return;
      }

      setNotes(data?.notes ?? "");
      setSavedNotes(data?.notes ?? null);
      setRatingOverall(data?.rating_overall == null ? "" : String(data.rating_overall));
      setSavedRatingOverall(data?.rating_overall ?? null);
      setNotesSaveMessage("");
      setReviewSaveMessage("");
    }

    void loadReadingCompanionFields();

    return () => {
      cancelled = true;
    };
  }, [ownerUserId, userBookId]);

  useEffect(() => {
    setFavoriteQuoteInputs(favoriteQuoteTextToInputs(favoriteQuotes));
    setQuotesSaveMessage("");
  }, [favoriteQuotes]);

  async function loadCharacters(id: string, cancelled: boolean) {
    const query = () =>
      supabase
        .from("user_book_characters")
        .select(characterSelectWithFlexibleLocation)
        .eq("user_book_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    const legacyQuery = () =>
      supabase
        .from("user_book_characters")
        .select(legacyCharacterSelect)
        .eq("user_book_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    const { data, error } = await query();
    const result =
      error && isMissingFirstSeenLocationError(error)
        ? await legacyQuery()
        : { data, error };

    if (cancelled) return;
    if (result.error) {
      console.error("Error loading characters:", result.error);
      setCharacters([]);
      return;
    }

    setCharacters(normalizeCharacters(result.data));
  }

  async function saveCharacterWithFlexibleLocation(payload: {
    user_book_id: string;
    name: string;
    reading: string | null;
    role: string | null;
    first_seen_location: string | null;
    first_seen_page_number: number | null;
    notes: string | null;
    sort_order: number;
  }, itemId?: string) {
    const selectColumns = characterSelectWithFlexibleLocation;
    const legacySelectColumns = legacyCharacterSelect;

    const runSave = (nextPayload: typeof payload | ReturnType<typeof omitFlexibleCharacterLocation>) => {
      const query = itemId
        ? supabase.from("user_book_characters").update(nextPayload).eq("id", itemId)
        : supabase.from("user_book_characters").insert(nextPayload);

      return query.select(selectColumns).single();
    };

    const runLegacySave = (nextPayload: ReturnType<typeof omitFlexibleCharacterLocation>) => {
      const query = itemId
        ? supabase.from("user_book_characters").update(nextPayload).eq("id", itemId)
        : supabase.from("user_book_characters").insert(nextPayload);

      return query.select(legacySelectColumns).single();
    };

    const result = await runSave(payload);
    if (!result.error || !isMissingFirstSeenLocationError(result.error)) {
      return result;
    }

    return runLegacySave(omitFlexibleCharacterLocation(payload));
  }

  async function loadChapterSummaries(id: string, cancelled: boolean) {
    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .select("id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at")
      .eq("user_book_id", id)
      .order("sort_order", { ascending: true })
      .order("chapter_number", { ascending: true })
      .order("created_at", { ascending: true });

    if (cancelled) return;
    if (error) {
      console.error("Error loading chapter summaries:", error);
      setChapterSummaries([]);
      return;
    }

    setChapterSummaries((data as ChapterSummary[]) ?? []);
    if (initializedExpandedChapterIdsForBookRef.current !== id) {
      initializedExpandedChapterIdsForBookRef.current = id;
      const latestId = latestChapterSummaryId((data as ChapterSummary[]) ?? []);
      setExpandedChapterIds(latestId ? [latestId] : []);
    }
  }

  async function loadSettingItems(id: string, cancelled: boolean) {
    const { data, error } = await supabase
      .from("user_book_setting_items")
      .select("id, user_book_id, title, details, sort_order, created_at, updated_at")
      .eq("user_book_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (cancelled) return;
    if (error) {
      console.error("Error loading setting notes:", error);
      setSettingItems([]);
      return;
    }

    setSettingItems((data as SettingItem[]) ?? []);
  }

  async function loadCulturalItems(id: string, cancelled: boolean) {
    const { data, error } = await supabase
      .from("user_book_cultural_items")
      .select("id, user_book_id, title, details, sort_order, created_at, updated_at")
      .eq("user_book_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (cancelled) return;
    if (error) {
      console.error("Error loading cultural notes:", error);
      setCulturalItems([]);
      return;
    }

    setCulturalItems((data as CulturalItem[]) ?? []);
  }

  async function loadReviews(id: string, cancelled: boolean) {
    const { data, error } = await supabase
      .from("user_book_reviews")
      .select("id, user_book_id, review_language, review_text, sort_order, created_at, updated_at")
      .eq("user_book_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (cancelled) return;
    if (error) {
      if (isMissingReviewsTableError(error)) {
        setReviewSaveMessage("Multiple reviews need the user_book_reviews migration.");
        return;
      }

      console.error("Error loading Reading Journal reviews:", error);
      setReviewSaveMessage("Could not load reviews.");
      return;
    }

    setReviews((data as UserBookReview[]) ?? []);
  }

  function startEditingCharacter(id: string) {
    setEditingCharacterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopEditingCharacter(id: string) {
    setEditingCharacterIds((prev) => prev.filter((x) => x !== id));
  }

  function markCharacterSaved(id: string) {
    setSavedCharacterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  function addCharacter() {
    const newId = `new-character-${Date.now()}`;
    setCharacters((prev) => [
      ...prev,
      {
        id: newId,
        user_book_id: userBookId,
        name: "",
        reading: "",
        role: "",
        first_seen_location: "",
        first_seen_page_number: null,
        notes: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setShowCharacters(true);
    startEditingCharacter(newId);
  }

  function updateCharacter(id: string, field: keyof Character, value: string | number | null) {
    setCharacters((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function saveCharacter(item: Character) {
    const payload = {
      user_book_id: userBookId,
      name: item.name.trim(),
      reading: item.reading?.trim() || null,
      role: item.role?.trim() || null,
      first_seen_location: item.first_seen_location?.trim() || null,
      first_seen_page_number:
        typeof item.first_seen_page_number === "number" && Number.isFinite(item.first_seen_page_number)
          ? Math.max(1, Math.trunc(item.first_seen_page_number))
          : null,
      notes: item.notes?.trim() || null,
      sort_order: item.sort_order ?? 0,
    };

    if (!payload.name) {
      alert("Please enter a character name before saving.");
      return;
    }

    setSavingCharacterIds((prev) => [...prev, item.id]);

    if (item.id.startsWith("new-character-")) {
      const oldId = item.id;
      const { data, error } = await saveCharacterWithFlexibleLocation(payload);

      setSavingCharacterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating character:", error);
        alert(`Could not save character.\n${error.message}`);
        return;
      }

      const saved = normalizeCharacters(data ? [data] : [])[0];
      setCharacters((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingCharacterIds((prev) => prev.map((x) => (x === oldId ? saved.id : x)));
      stopEditingCharacter(saved.id);
      markCharacterSaved(saved.id);
      return;
    }

    const { data, error } = await saveCharacterWithFlexibleLocation(payload, item.id);

    setSavingCharacterIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating character:", error);
      alert(`Could not update character.\n${error.message}`);
      return;
    }

    const saved = normalizeCharacters(data ? [data] : [])[0];
    setCharacters((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    stopEditingCharacter(saved.id);
    markCharacterSaved(saved.id);
  }

  async function deleteCharacter(id: string) {
    if (id.startsWith("new-character-")) {
      setCharacters((prev) => prev.filter((x) => x.id !== id));
      setSavingCharacterIds((prev) => prev.filter((x) => x !== id));
      setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    if (!window.confirm("Delete this character?")) return;

    const { error } = await supabase.from("user_book_characters").delete().eq("id", id);
    if (error) {
      console.error("Error deleting character:", error);
      alert("Could not delete character.");
      return;
    }

    setCharacters((prev) => prev.filter((x) => x.id !== id));
    stopEditingCharacter(id);
  }

  function startEditingChapter(id: string) {
    setEditingChapterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setExpandedChapterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopEditingChapter(id: string) {
    setEditingChapterIds((prev) => prev.filter((x) => x !== id));
  }

  function markChapterSaved(id: string) {
    setSavedChapterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedChapterIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  function addChapterSummary() {
    const newId = `new-${Date.now()}`;
    setChapterSummaries((prev) => [
      ...prev,
      {
        id: newId,
        user_book_id: userBookId,
        chapter_number: selectedChapterNumber ?? nextChapterSummaryNumber(prev),
        chapter_title: selectedChapterLabel && selectedChapterLabel !== "All chapters" ? selectedChapterLabel : "",
        summary: "",
        sort_order: prev.length > 0 ? Math.max(...prev.map((x) => x.sort_order ?? 0)) + 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setShowChapterSummaries(true);
    setExpandedChapterIds([newId]);
    startEditingChapter(newId);
  }

  function updateChapterSummary(id: string, field: keyof ChapterSummary, value: string) {
    setChapterSummaries((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "chapter_number" || field === "sort_order"
                  ? value === ""
                    ? null
                    : field === "chapter_number"
                      ? isChapterSummaryNumberDraft(value)
                        ? value
                        : item.chapter_number
                      : Number(value)
                  : value,
            }
          : item
      )
    );
  }

  async function saveChapterSummary(item: ChapterSummary) {
    const payload = {
      user_book_id: userBookId,
      chapter_number: parseChapterSummaryNumber(String(item.chapter_number ?? "")),
      chapter_title: item.chapter_title?.trim() || null,
      summary: item.summary.trim(),
      sort_order: item.sort_order ?? 0,
    };

    if (!payload.summary) {
      alert("Please write a short summary before saving.");
      return;
    }

    setSavingChapterIds((prev) => [...prev, item.id]);

    if (item.id.startsWith("new-")) {
      const oldId = item.id;
      const { data, error } = await supabase
        .from("user_book_chapter_summaries")
        .insert(payload)
        .select("id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at")
        .single();

      setSavingChapterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating chapter summary:", {
          error,
          chapterNumber: payload.chapter_number,
        });
        alert(chapterSummarySaveErrorMessage(payload.chapter_number));
        return;
      }

      const saved = data as ChapterSummary;
      setChapterSummaries((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingChapterIds((prev) => prev.map((x) => (x === oldId ? saved.id : x)));
      setExpandedChapterIds([saved.id]);
      stopEditingChapter(saved.id);
      markChapterSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .update(payload)
      .eq("id", item.id)
      .select("id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at")
      .single();

    setSavingChapterIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating chapter summary:", {
        error,
        chapterNumber: payload.chapter_number,
      });
      alert(chapterSummarySaveErrorMessage(payload.chapter_number));
      return;
    }

    const saved = data as ChapterSummary;
    setChapterSummaries((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    setExpandedChapterIds((prev) => (prev.includes(saved.id) ? prev : [...prev, saved.id]));
    stopEditingChapter(saved.id);
    markChapterSaved(saved.id);
  }

  async function deleteChapterSummary(id: string) {
    if (id.startsWith("new-")) {
      setChapterSummaries((prev) => prev.filter((x) => x.id !== id));
      setEditingChapterIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    if (!window.confirm("Delete this chapter summary?")) return;

    const { error } = await supabase.from("user_book_chapter_summaries").delete().eq("id", id);
    if (error) {
      console.error("Error deleting chapter summary:", error);
      alert("Could not delete chapter summary.");
      return;
    }

    setChapterSummaries((prev) => prev.filter((x) => x.id !== id));
    stopEditingChapter(id);
    setExpandedChapterIds((prev) => prev.filter((x) => x !== id));
  }

  function addSettingItem() {
    const id = `new-setting-${Date.now()}`;
    setSettingItems((prev) => [
      ...prev,
      {
        id,
        user_book_id: userBookId,
        title: "",
        details: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setEditingSettingIds((prev) => [...prev, id]);
  }

  function markSettingSaved(id: string) {
    setSavedSettingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedSettingIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  async function saveSettingItem(item: SettingItem) {
    if (learningArchiveReadOnlyTabs.setting) return;

    const payload = {
      user_book_id: userBookId,
      title: item.title?.trim() || null,
      details: item.details.trim(),
      sort_order: item.sort_order ?? 0,
    };

    if (!payload.title && !payload.details) {
      alert("Please add a title or details before saving this setting note.");
      return;
    }

    setSavingSettingIds((prev) => [...prev, item.id]);

    if (item.id.startsWith("new-setting-")) {
      const oldId = item.id;
      const { data, error } = await supabase
        .from("user_book_setting_items")
        .insert(payload)
        .select("id, user_book_id, title, details, sort_order, created_at, updated_at")
        .single();

      setSavingSettingIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating setting note:", error);
        alert("Could not save setting note.");
        return;
      }

      const saved = data as SettingItem;
      setSettingItems((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingSettingIds((prev) => prev.map((x) => (x === oldId ? saved.id : x)));
      setEditingSettingIds((prev) => prev.filter((x) => x !== saved.id));
      markSettingSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_setting_items")
      .update(payload)
      .eq("id", item.id)
      .select("id, user_book_id, title, details, sort_order, created_at, updated_at")
      .single();

    setSavingSettingIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating setting note:", error);
      alert("Could not update setting note.");
      return;
    }

    const saved = data as SettingItem;
    setSettingItems((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    setEditingSettingIds((prev) => prev.filter((x) => x !== saved.id));
    markSettingSaved(saved.id);
  }

  async function deleteSettingItem(id: string) {
    if (learningArchiveReadOnlyTabs.setting) return;

    if (id.startsWith("new-setting-")) {
      setSettingItems((prev) => prev.filter((x) => x.id !== id));
      setEditingSettingIds((prev) => prev.filter((x) => x !== id));
      setSavingSettingIds((prev) => prev.filter((x) => x !== id));
      setSavedSettingIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    if (!window.confirm("Delete this setting note?")) return;

    const { error } = await supabase.from("user_book_setting_items").delete().eq("id", id);
    if (error) {
      console.error("Error deleting setting note:", error);
      alert("Could not delete setting note.");
      return;
    }

    setSettingItems((prev) => prev.filter((x) => x.id !== id));
    setEditingSettingIds((prev) => prev.filter((x) => x !== id));
    setSavingSettingIds((prev) => prev.filter((x) => x !== id));
    setSavedSettingIds((prev) => prev.filter((x) => x !== id));
  }

  function addCulturalItem() {
    const id = `new-cultural-${Date.now()}`;
    setCulturalItems((prev) => [
      ...prev,
      {
        id,
        user_book_id: userBookId,
        title: "",
        details: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setEditingCulturalIds((prev) => [...prev, id]);
  }

  function markCulturalSaved(id: string) {
    setSavedCulturalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedCulturalIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  async function saveCulturalItem(item: CulturalItem) {
    if (learningArchiveReadOnlyTabs.cultural) return;

    const payload = {
      user_book_id: userBookId,
      title: item.title?.trim() || null,
      details: item.details.trim(),
      sort_order: item.sort_order ?? 0,
    };

    if (!payload.title && !payload.details) {
      alert("Please add a title or details before saving this cultural note.");
      return;
    }

    setSavingCulturalIds((prev) => [...prev, item.id]);

    if (item.id.startsWith("new-cultural-")) {
      const oldId = item.id;
      const { data, error } = await supabase
        .from("user_book_cultural_items")
        .insert(payload)
        .select("id, user_book_id, title, details, sort_order, created_at, updated_at")
        .single();

      setSavingCulturalIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating cultural note:", error);
        alert("Could not save cultural note.");
        return;
      }

      const saved = data as CulturalItem;
      setCulturalItems((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingCulturalIds((prev) => prev.map((x) => (x === oldId ? saved.id : x)));
      setEditingCulturalIds((prev) => prev.filter((x) => x !== saved.id));
      markCulturalSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_cultural_items")
      .update(payload)
      .eq("id", item.id)
      .select("id, user_book_id, title, details, sort_order, created_at, updated_at")
      .single();

    setSavingCulturalIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating cultural note:", error);
      alert("Could not update cultural note.");
      return;
    }

    const saved = data as CulturalItem;
    setCulturalItems((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    setEditingCulturalIds((prev) => prev.filter((x) => x !== saved.id));
    markCulturalSaved(saved.id);
  }

  async function deleteCulturalItem(id: string) {
    if (learningArchiveReadOnlyTabs.cultural) return;

    if (id.startsWith("new-cultural-")) {
      setCulturalItems((prev) => prev.filter((x) => x.id !== id));
      setEditingCulturalIds((prev) => prev.filter((x) => x !== id));
      setSavingCulturalIds((prev) => prev.filter((x) => x !== id));
      setSavedCulturalIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    if (!window.confirm("Delete this cultural note?")) return;

    const { error } = await supabase.from("user_book_cultural_items").delete().eq("id", id);
    if (error) {
      console.error("Error deleting cultural note:", error);
      alert("Could not delete cultural note.");
      return;
    }

    setCulturalItems((prev) => prev.filter((x) => x.id !== id));
    setEditingCulturalIds((prev) => prev.filter((x) => x !== id));
    setSavingCulturalIds((prev) => prev.filter((x) => x !== id));
    setSavedCulturalIds((prev) => prev.filter((x) => x !== id));
  }

  async function saveFavoriteQuotes() {
    setSavingQuotes(true);
    setQuotesSaveMessage("");

    const nextFavoriteQuotes = favoriteQuoteInputsToText(favoriteQuoteInputs);
    const { error } = await supabase
      .from("user_books")
      .update({ favorite_quotes: nextFavoriteQuotes || null })
      .eq("id", userBookId);

    setSavingQuotes(false);

    if (error) {
      console.error("Error saving Reading Journal quotes:", error);
      setQuotesSaveMessage("Could not save quotes.");
      return;
    }

    setQuotesSaveMessage("Saved.");
    onFavoriteQuotesChange?.(nextFavoriteQuotes || null);
  }

  async function saveNativeNotes() {
    setSavingNotes(true);
    setNotesSaveMessage("");

    const nextNotes = notes.trim() || null;
    const { error } = await supabase
      .from("user_books")
      .update({ notes: nextNotes })
      .eq("id", userBookId)
      .eq("user_id", ownerUserId);

    setSavingNotes(false);

    if (error) {
      console.error("Error saving Reading Journal notes:", error);
      setNotesSaveMessage("Could not save notes.");
      return;
    }

    setSavedNotes(nextNotes);
    setNotesSaveMessage("Saved.");
  }

  async function saveNativeReviewRatings() {
    setSavingReview(true);
    setReviewSaveMessage("");

    const nextRating = ratingOverall.trim()
      ? clampRating5(Number(ratingOverall.trim()))
      : null;

    const { error } = await supabase
      .from("user_books")
      .update({
        rating_overall: nextRating,
      })
      .eq("id", userBookId)
      .eq("user_id", ownerUserId);

    setSavingReview(false);

    if (error) {
      console.error("Error saving native Reading Journal review:", error);
      setReviewSaveMessage("Could not save review.");
      return;
    }

    setSavedRatingOverall(nextRating);
    setRatingOverall(nextRating == null ? "" : String(nextRating));
    setReviewSaveMessage("Rating saved.");
  }

  async function addBookReview() {
    const nextLanguage = reviewDraftLanguage.trim();
    const nextText = reviewDraftText.trim();
    if (!nextLanguage || !nextText) {
      setReviewSaveMessage("Choose a language and write a review first.");
      return;
    }

    setSavingReview(true);
    setReviewSaveMessage("");

    const nextSortOrder =
      reviews.length > 0 ? Math.max(...reviews.map((review) => review.sort_order)) + 10 : 10;
    const { data, error } = await supabase
      .from("user_book_reviews")
      .insert({
        user_book_id: userBookId,
        review_language: nextLanguage,
        review_text: nextText,
        sort_order: nextSortOrder,
      })
      .select("id, user_book_id, review_language, review_text, sort_order, created_at, updated_at")
      .single();

    setSavingReview(false);

    if (error) {
      console.error("Error adding Reading Journal review:", error);
      setReviewSaveMessage("Could not add review.");
      return;
    }

    setReviews((prev) => [...prev, data as UserBookReview]);
    setReviewDraftText("");
    setReviewSaveMessage("Review added.");
  }

  function updateBookReview(
    id: string,
    field: keyof Pick<UserBookReview, "review_language" | "review_text">,
    value: string
  ) {
    setReviews((prev) =>
      prev.map((review) => (review.id === id ? { ...review, [field]: value } : review))
    );
    setReviewSaveMessage("");
  }

  async function saveBookReview(review: UserBookReview) {
    const nextLanguage = review.review_language.trim();
    const nextText = review.review_text.trim();
    if (!nextLanguage || !nextText) {
      setReviewSaveMessage("Language and review text are required.");
      return;
    }

    setSavingReviewIds((prev) => [...prev, review.id]);
    setReviewSaveMessage("");

    const { data, error } = await supabase
      .from("user_book_reviews")
      .update({
        review_language: nextLanguage,
        review_text: nextText,
      })
      .eq("id", review.id)
      .select("id, user_book_id, review_language, review_text, sort_order, created_at, updated_at")
      .single();

    setSavingReviewIds((prev) => prev.filter((x) => x !== review.id));

    if (error) {
      console.error("Error saving Reading Journal review:", error);
      setReviewSaveMessage("Could not save review.");
      return;
    }

    setReviews((prev) =>
      prev.map((item) => (item.id === review.id ? (data as UserBookReview) : item))
    );
    setReviewSaveMessage("Review saved.");
  }

  async function deleteBookReview(id: string) {
    if (!window.confirm("Delete this review?")) return;

    setSavingReviewIds((prev) => [...prev, id]);
    setReviewSaveMessage("");

    const { error } = await supabase.from("user_book_reviews").delete().eq("id", id);

    setSavingReviewIds((prev) => prev.filter((x) => x !== id));

    if (error) {
      console.error("Error deleting Reading Journal review:", error);
      setReviewSaveMessage("Could not delete review.");
      return;
    }

    setReviews((prev) => prev.filter((review) => review.id !== id));
    setReviewSaveMessage("Review deleted.");
  }

  const panel = (
    <StoryTab
	      storyTab={storyTab}
	      setStoryTab={setStoryTab}
	      tabOrder={tabOrder}
	      showCharacterReadingField={bookLanguageCode !== "en"}
      learningArchiveReadOnlyTabs={learningArchiveReadOnlyTabs}
      detectiveEntries={detective.detectiveEntries}
      detectiveSearch={detective.detectiveSearch}
      setDetectiveSearch={detective.setDetectiveSearch}
      collapsedDetectiveGroups={detective.collapsedDetectiveGroups}
      expandedDetectiveIds={detective.expandedDetectiveIds}
      editingDetectiveIds={detective.editingDetectiveIds}
      savingDetectiveIds={detective.savingDetectiveIds}
      savedDetectiveIds={detective.savedDetectiveIds}
      addDetectiveEntry={() => {
        if (learningArchiveReadOnlyTabs.detective) return;
        detective.addDetectiveEntry(
          { userBookId, ownerUserId },
          {
            pageNumber: currentPageNumber ?? null,
            chapterLabel:
              selectedChapterLabel && selectedChapterLabel !== "All chapters"
                ? selectedChapterLabel
                : null,
            chapterNumber: selectedChapterNumber ?? null,
          }
        );
      }}
      updateDetectiveEntry={(id, field, value) => {
        if (learningArchiveReadOnlyTabs.detective) return;
        detective.updateDetectiveEntry(id, field, value);
      }}
      startEditingDetectiveEntry={(id) => {
        if (learningArchiveReadOnlyTabs.detective) return;
        detective.startEditingDetectiveEntry(id);
      }}
      stopEditingDetectiveEntry={detective.stopEditingDetectiveEntry}
      toggleDetectiveEntryExpanded={detective.toggleDetectiveEntryExpanded}
      toggleDetectiveGroup={detective.toggleDetectiveGroup}
      saveDetectiveEntry={(entry) => {
        if (learningArchiveReadOnlyTabs.detective) return Promise.resolve();
        return detective.saveDetectiveEntry(entry, { userBookId, ownerUserId });
      }}
      deleteDetectiveEntry={(id) => {
        if (learningArchiveReadOnlyTabs.detective) return Promise.resolve();
        return detective.deleteDetectiveEntry(id, { userBookId, ownerUserId });
      }}
      characters={characters}
      visibleCharacters={visibleCharacters}
      characterSearch={characterSearch}
      setCharacterSearch={setCharacterSearch}
      showCharacters={showCharacters}
      setShowCharacters={setShowCharacters}
      charactersReverseOrder={charactersReverseOrder}
      setCharactersReverseOrder={setCharactersReverseOrder}
      editingCharacterIds={editingCharacterIds}
      savingCharacterIds={savingCharacterIds}
      savedCharacterIds={savedCharacterIds}
      addCharacter={addCharacter}
      updateCharacter={updateCharacter}
      startEditingCharacter={startEditingCharacter}
      stopEditingCharacter={stopEditingCharacter}
      saveCharacter={saveCharacter}
      deleteCharacter={deleteCharacter}
      chapterSummaries={chapterSummaries}
      visibleChapterSummaries={visibleChapterSummaries}
      plotSearch={plotSearch}
      setPlotSearch={setPlotSearch}
      showChapterSummaries={showChapterSummaries}
      setShowChapterSummaries={setShowChapterSummaries}
      chapterReverseOrder={chapterReverseOrder}
      setChapterReverseOrder={setChapterReverseOrder}
      expandedChapterIds={expandedChapterIds}
      setExpandedChapterIds={setExpandedChapterIds}
      toggleChapterExpanded={(id) =>
        setExpandedChapterIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
      }
      editingChapterIds={editingChapterIds}
      savingChapterIds={savingChapterIds}
      savedChapterIds={savedChapterIds}
      addChapterSummary={addChapterSummary}
      updateChapterSummary={updateChapterSummary}
      startEditingChapter={startEditingChapter}
      stopEditingChapter={stopEditingChapter}
      saveChapterSummary={saveChapterSummary}
      deleteChapterSummary={deleteChapterSummary}
      settingItems={settingItems}
      visibleSettingItems={visibleSettingItems}
      settingSearch={settingSearch}
      setSettingSearch={setSettingSearch}
      showSettingItems={showSettingItems}
      setShowSettingItems={setShowSettingItems}
      settingReverseOrder={settingReverseOrder}
      setSettingReverseOrder={setSettingReverseOrder}
      editingSettingIds={editingSettingIds}
      savingSettingIds={savingSettingIds}
      savedSettingIds={savedSettingIds}
      addSettingItem={() => {
        if (learningArchiveReadOnlyTabs.setting) return;
        addSettingItem();
      }}
      updateSettingItem={(id, field, value) =>
        !learningArchiveReadOnlyTabs.setting &&
        setSettingItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        )
      }
      startEditingSettingItem={(id) =>
        !learningArchiveReadOnlyTabs.setting &&
        setEditingSettingIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      }
      stopEditingSettingItem={(id) =>
        setEditingSettingIds((prev) => prev.filter((x) => x !== id))
      }
      saveSettingItem={saveSettingItem}
      deleteSettingItem={deleteSettingItem}
      culturalItems={culturalItems}
      visibleCulturalItems={visibleCulturalItems}
      culturalSearch={culturalSearch}
      setCulturalSearch={setCulturalSearch}
      showCulturalItems={showCulturalItems}
      setShowCulturalItems={setShowCulturalItems}
      culturalReverseOrder={culturalReverseOrder}
      setCulturalReverseOrder={setCulturalReverseOrder}
      editingCulturalIds={editingCulturalIds}
      savingCulturalIds={savingCulturalIds}
      savedCulturalIds={savedCulturalIds}
      addCulturalItem={() => {
        if (learningArchiveReadOnlyTabs.cultural) return;
        addCulturalItem();
      }}
      updateCulturalItem={(id, field, value) =>
        !learningArchiveReadOnlyTabs.cultural &&
        setCulturalItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        )
      }
      startEditingCulturalItem={(id) =>
        !learningArchiveReadOnlyTabs.cultural &&
        setEditingCulturalIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      }
      stopEditingCulturalItem={(id) =>
        setEditingCulturalIds((prev) => prev.filter((x) => x !== id))
      }
      saveCulturalItem={saveCulturalItem}
      deleteCulturalItem={deleteCulturalItem}
      favoriteQuoteInputs={favoriteQuoteInputs}
      quoteSearch={quoteSearch}
      setQuoteSearch={setQuoteSearch}
      savedFavoriteQuotes={favoriteQuoteTextToInputs(favoriteQuotes)}
      savingQuotes={savingQuotes}
      quotesSaveMessage={quotesSaveMessage}
      addFavoriteQuote={() => {
        setFavoriteQuoteInputs((prev) => [...prev, emptyFavoriteQuoteInput()]);
        setQuotesSaveMessage("");
      }}
      updateFavoriteQuote={(index, field, value) => {
        setFavoriteQuoteInputs((prev) =>
          prev.map((quote, quoteIndex) =>
            quoteIndex === index ? { ...quote, [field]: value } : quote
          )
        );
        setQuotesSaveMessage("");
      }}
      removeFavoriteQuote={(index) => {
        setFavoriteQuoteInputs((prev) => {
          const next = prev.filter((_, quoteIndex) => quoteIndex !== index);
          return next.length > 0 ? next : [emptyFavoriteQuoteInput()];
        });
        setQuotesSaveMessage("");
      }}
      saveFavoriteQuotes={saveFavoriteQuotes}
      notes={notes}
      savedNotes={savedNotes}
      setNotes={(value) => {
        setNotes(value);
        setNotesSaveMessage("");
      }}
      savingNotes={savingNotes}
      notesSaveMessage={notesSaveMessage}
      saveNotes={saveNativeNotes}
      ratingOverall={ratingOverall}
      savedRatingOverall={savedRatingOverall}
      setRatingOverall={(value) => {
        setRatingOverall(value);
        setReviewSaveMessage("");
      }}
      reviews={visibleReviews}
      reviewDraftLanguage={reviewDraftLanguage}
      reviewDraftText={reviewDraftText}
      savingReviewIds={savingReviewIds}
      setReviewDraftLanguage={(value) => {
        setReviewDraftLanguage(value);
        setReviewSaveMessage("");
      }}
      setReviewDraftText={(value) => {
        setReviewDraftText(value);
        setReviewSaveMessage("");
      }}
      updateBookReview={updateBookReview}
      savingReview={savingReview}
      reviewSaveMessage={reviewSaveMessage}
      saveReviewRatings={saveNativeReviewRatings}
      addBookReview={addBookReview}
      saveBookReview={saveBookReview}
      deleteBookReview={deleteBookReview}
    />
  );

  if (compact) {
    return (
      <aside className="rounded-[2rem] border border-violet-200 bg-white p-3 shadow-sm">
        <div className="mb-3 px-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                Split view
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">Reading Journal</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                Keep notes beside your book.
              </p>
            </div>
          </div>
        </div>
        <div className="max-h-[78vh] overflow-y-auto pr-1">{panel}</div>
      </aside>
    );
  }

  return (
    <div className="space-y-4">
      {panel}
    </div>
  );
}
