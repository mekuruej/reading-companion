// Single Book Hub
//
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BookInfoTab from "./components/BookInfoTab";
import ReadingTab from "./components/ReadingTab";
import RatingTab from "./components/RatingTab";
import TeacherTab from "./components/TeacherTab";
import StoryTab from "./components/StoryTab";
import VocabTab from "./components/VocabTab";

type Book = {
  id: string;
  title: string;
  title_reading: string | null;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  cover_url: string | null;
  genre: string | null;
  book_type: string | null;
  published_date: string | null;
  trigger_warnings: string | null;
  page_count: number | null;
  isbn: string | null;
  isbn13: string | null;
  publisher: string | null;

  author_image_url: string | null;
  translator_image_url: string | null;
  illustrator_image_url: string | null;
  publisher_image_url: string | null;

  author_reading: string | null;
  translator_reading: string | null;
  illustrator_reading: string | null;
  publisher_reading: string | null;

  related_links: any | null;
};

type UserBook = {
  id: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  notes: string | null;
  my_review: string | null;

  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
  recommended_level: string | null;

  format_type: string | null;
  progress_mode: string | null;
  show_page_numbers: boolean | null;

  books: Book | null;
};

type LookupRow = {
  surface?: string | null;
  meaning?: string | null;
};

type ReadingSession = {
  id: string;
  user_book_id: string;
  read_on: string;
  start_page: number;
  end_page: number;
  minutes_read: number | null;
  is_filler: boolean;
  created_at: string;
  session_mode: string | null;
};

type HubTab = "bookInfo" | "teacher" | "study" | "reading" | "story" | "rating";
type VocabTab = "readAlong" | "bulk";
type ProfileRole = "teacher" | "member" | "student";

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

type SavedKanjiReading = {
  kanji: string;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
  updated_at?: string | null;
};

type SessionKanjiReading = {
  reading_type: "on" | "kun" | "other" | null;
  base: string | null;
  realized: string | null;
};

const LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"] as const;

const BOOK_TYPE_OPTIONS = [
  { value: "picture_book", label: "Picture Book" },
  { value: "early_reader", label: "Early Reader" },
  { value: "chapter_book", label: "Chapter Book" },
  { value: "middle_grade", label: "Middle Grade" },
  { value: "ya", label: "YA" },
  { value: "novel", label: "Novel" },
  { value: "short_story", label: "Short Story" },
  { value: "manga", label: "Manga" },
  { value: "nonfiction", label: "Nonfiction" },
  { value: "essay", label: "Essay" },
  { value: "memoir", label: "Memoir" },
  { value: "textbook", label: "Textbook" },
  { value: "other", label: "Other" },
] as const;

const GENRE_OPTIONS = [
  { value: "fantasy", label: "Fantasy" },
  { value: "science_fiction", label: "Science Fiction" },
  { value: "mystery", label: "Mystery" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "historical_fiction", label: "Historical Fiction" },
  { value: "literary_fiction", label: "Literary Fiction" },
  { value: "adventure", label: "Adventure" },
  { value: "horror", label: "Horror" },
  { value: "humor", label: "Humor" },
  { value: "slice_of_life", label: "Slice of Life" },
  { value: "memoir", label: "Memoir" },
  { value: "biography", label: "Biography" },
  { value: "history", label: "History" },
  { value: "self_help", label: "Self-Help" },
  { value: "language_learning", label: "Language Learning" },
  { value: "education", label: "Education" },
  { value: "essays", label: "Essays" },
  { value: "reference", label: "Reference" },
  { value: "general_nonfiction", label: "General Nonfiction" },
  { value: "other", label: "Other" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Extremely difficult" },
  { value: 2, label: "Very hard" },
  { value: 3, label: "Challenging but manageable" },
  { value: 4, label: "Comfortable" },
  { value: 5, label: "Easy" },
] as const;

function safeDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function linksToText(links: any): string {
  if (!links) return "";
  if (!Array.isArray(links)) return "";

  return links
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const label = (x.label ?? x.url ?? "").toString();
        const url = (x.url ?? "").toString();
        return url ? `${label} | ${url}` : label;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseLinks(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length === 1) return { label: parts[0], url: parts[0] };
    return { label: parts[0], url: parts.slice(1).join("|") };
  });
}

function displayLinkLabel(l: any) {
  if (!l) return "Link";
  if (typeof l === "string") return l;
  if (typeof l === "object") return l.label ?? l.url ?? "Link";
  return "Link";
}

function displayLinkUrl(l: any) {
  if (!l) return "";
  if (typeof l === "string") return l;
  if (typeof l === "object") return l.url ?? "";
  return "";
}

function clampRating5(n: number | null) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(1, Math.min(5, n));
}

function stars5(value: number | null) {
  if (!value) return "☆☆☆☆☆";
  const v = Math.max(1, Math.min(5, value));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

function entertainmentRatingText(value: number | null) {
  switch (value) {
    case 5:
      return "Exceptional! Already want to read it again!"
    case 4:
      return "Very good! Definitely will recommend it."
    case 3:
      return "Good solid book."
    case 2:
      return "Not bad, but I would have liked to read something else."
    case 1:
      return "Didn’t like it."
    default:
      return "—"
  }
}

function languageLearningRatingText(value: number | null) {
  switch (value) {
    case 5:
      return "This is a learner’s dream come true!"
    case 4:
      return "Has a lot of good material in there."
    case 3:
      return "You can learn some stuff, but nothing special."
    case 2:
      return "Not so much useful language material."
    case 1:
      return "I didn’t get anything out of it."
    default:
      return "—"
  }
}

function formatTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "paperback":
      return "Paperback";
    case "hardcover":
      return "Hardcover";
    case "ebook":
      return "eBook";
    case "audiobook":
      return "Audiobook";
    case "other":
      return "Other";
    default:
      return "—";
  }
}

function bookTypeLabel(value: string | null | undefined) {
  return (
    BOOK_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? "—"
  );
}

function progressModeLabel(value: string | null | undefined) {
  switch (value) {
    case "pages":
      return "Pages";
    case "percent":
      return "Percent";
    case "chapters":
      return "Chapters";
    case "time":
      return "Time";
    default:
      return "—";
  }
}

function formatMinutes(total: number | null) {
  if (!total || total <= 0) return "—";

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function genreLabel(value: string | null | undefined) {
  return GENRE_OPTIONS.find((opt) => opt.value === value)?.label ?? "—";
}

function levelStars(level: string | null | undefined) {
  switch ((level ?? "").toUpperCase()) {
    case "N1":
      return "★★★★★";
    case "N2":
      return "★★★★☆";
    case "N3":
      return "★★★☆☆";
    case "N4":
      return "★★☆☆☆";
    case "N5":
      return "★☆☆☆☆";
    default:
      return "—";
  }
}

function hiraToKata(text: string) {
  return text.replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

export default function BookHubPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<UserBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<ProfileRole>("member");
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);

  const isTeacher = myRole === "teacher";
  const canEditBookInfo = isSuperTeacher;

  const [editingTab, setEditingTab] = useState<HubTab | null>(null);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<HubTab>("study");
  const [uniqueLookupCount, setUniqueLookupCount] = useState<number | null>(null);

  const [startedAt, setStartedAt] = useState<string>("");
  const [finishedAt, setFinishedAt] = useState<string>("");
  const [dnfAt, setDnfAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [myReview, setMyReview] = useState<string>("");

  const [ratingOverall, setRatingOverall] = useState<string>("");
  const [ratingRecommend, setRatingRecommend] = useState<string>("");
  const [ratingDifficulty, setRatingDifficulty] = useState<string>("");

  const [readerLevel, setReaderLevel] = useState<string>("");
  const [recommendedLevel, setRecommendedLevel] = useState<string>("");

  const [genre, setGenre] = useState<string>("");
  const [bookType, setBookType] = useState<string>("");
  const [triggerWarnings, setTriggerWarnings] = useState<string>("");
  const [publishedDate, setPublishedDate] = useState("");
  const [pageCount, setPageCount] = useState<string>("");
  const [isbn, setIsbn] = useState<string>("");
  const [isbn13, setIsbn13] = useState<string>("");

  const [authorName, setAuthorName] = useState<string>("");
  const [translatorName, setTranslatorName] = useState<string>("");
  const [illustratorName, setIllustratorName] = useState<string>("");
  const [publisherName, setPublisherName] = useState<string>("");

  const [publisherReading, setPublisherReading] = useState<string>("");

  const [coverUrl, setCoverUrl] = useState<string>("");
  const [authorImg, setAuthorImg] = useState<string>("");
  const [translatorImg, setTranslatorImg] = useState<string>("");
  const [illustratorImg, setIllustratorImg] = useState<string>("");
  const [publisherImg, setPublisherImg] = useState<string>("");

  const [authorReading, setAuthorReading] = useState<string>("");
  const [translatorReading, setTranslatorReading] = useState<string>("");
  const [illustratorReading, setIllustratorReading] = useState<string>("");

  const [openKanjiWordId, setOpenKanjiWordId] = useState<number | null>(null);
  const [editingKanjiRows, setEditingKanjiRows] = useState<Record<number, KanjiMapRow[]>>({});
  const [savingKanjiWordId, setSavingKanjiWordId] = useState<number | null>(null);

  const [linksText, setLinksText] = useState<string>("");

  const [settingItems, setSettingItems] = useState<SettingItem[]>([]);
  const [showSettingItems, setShowSettingItems] = useState(true);

  const [settingReverseOrder, setSettingReverseOrder] = useState(false);
  const [editingSettingIds, setEditingSettingIds] = useState<string[]>([]);
  const [savingSettingIds, setSavingSettingIds] = useState<string[]>([]);
  const [savedSettingIds, setSavedSettingIds] = useState<string[]>([]);

  const visibleSettingItems = useMemo(() => {
    const copy = [...settingItems];
    return settingReverseOrder ? copy.reverse() : copy;
  }, [settingItems, settingReverseOrder]);

  function startEditingSettingItem(id: string) {
    setEditingSettingIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }

  function stopEditingSettingItem(id: string) {
    setEditingSettingIds((prev) =>
      prev.filter((x) => x !== id)
    );
  }

  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacters, setShowCharacters] = useState(true);

  const [charactersReverseOrder, setCharactersReverseOrder] = useState(false);
  const [editingCharacterIds, setEditingCharacterIds] = useState<string[]>([]);
  const [savingCharacterIds, setSavingCharacterIds] = useState<string[]>([]);
  const [savedCharacterIds, setSavedCharacterIds] = useState<string[]>([]);

  const visibleCharacters = useMemo(() => {
    const copy = [...characters];
    return charactersReverseOrder ? copy.reverse() : copy;
  }, [characters, charactersReverseOrder]);

  function startEditingCharacter(id: string) {
    setEditingCharacterIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }

  function stopEditingCharacter(id: string) {
    setEditingCharacterIds((prev) =>
      prev.filter((x) => x !== id)
    );
  }

  const [culturalItems, setCulturalItems] = useState<CulturalItem[]>([]);
  const [showCulturalItems, setShowCulturalItems] = useState(true);

  const [culturalReverseOrder, setCulturalReverseOrder] = useState(false);
  const [editingCulturalIds, setEditingCulturalIds] = useState<string[]>([]);
  const [savingCulturalIds, setSavingCulturalIds] = useState<string[]>([]);
  const [savedCulturalIds, setSavedCulturalIds] = useState<string[]>([]);

  const visibleCulturalItems = useMemo(() => {
    const copy = [...culturalItems];
    return culturalReverseOrder ? copy.reverse() : copy;
  }, [culturalItems, culturalReverseOrder]);

  function startEditingCulturalItem(id: string) {
    setEditingCulturalIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }

  function stopEditingCulturalItem(id: string) {
    setEditingCulturalIds((prev) =>
      prev.filter((x) => x !== id)
    );
  }

  const [savedKanjiDefaults, setSavedKanjiDefaults] = useState<
    Record<string, SessionKanjiReading>
  >({});

  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );


  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSessionDate(today);
  }, []);

  const realReadingSessions = useMemo(() => {
    return readingSessions.filter((s) => !s.is_filler);
  }, [readingSessions]);

  const daysRead = useMemo(() => {
    if (!realReadingSessions.length) return null;
    return new Set(realReadingSessions.map((s) => s.read_on)).size;
  }, [realReadingSessions]);

  const [userId, setUserId] = useState<string | null>(null);
  const [bookOptions, setBookOptions] = useState<
    { id: string; title: string; started_at: string | null; finished_at: string | null; dnf_at: string | null }[]
  >([]);

  const [chapterSummaries, setChapterSummaries] = useState<ChapterSummary[]>([]);
  const [showChapterSummaries, setShowChapterSummaries] = useState(false);
  const [chapterReverseOrder, setChapterReverseOrder] = useState(false);
  const [editingChapterIds, setEditingChapterIds] = useState<string[]>([]);
  const [savingChapterIds, setSavingChapterIds] = useState<string[]>([]);
  const [savedChapterIds, setSavedChapterIds] = useState<string[]>([]);
  const [kanjiMapQueue, setKanjiMapQueue] = useState<VocabCacheQueueRow[]>([]);
  const [kanjiMapLoading, setKanjiMapLoading] = useState(false);
  const [kanjiMapError, setKanjiMapError] = useState<string | null>(null);
  const [storyTab, setStoryTab] = useState<"characters" | "plot" | "setting" | "cultural">("characters");

  const [sessionStartPage, setSessionStartPage] = useState<string>("");
  const [sessionEndPage, setSessionEndPage] = useState<string>("");
  const [sessionMinutesRead, setSessionMinutesRead] = useState<string>("");

  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showTimedSessionForm, setShowTimedSessionForm] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerSaveMessage, setTimerSaveMessage] = useState("");

  const [vocabTab, setVocabTab] = useState<VocabTab>("readAlong");
  const [quickWord, setQuickWord] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [hideKanjiInReadingSupport, setHideKanjiInReadingSupport] = useState(false);


  const [showWordExplorer, setShowWordExplorer] = useState(false);
  const [wordExplorerQuery, setWordExplorerQuery] = useState("");
  const [wordExplorerLoading, setWordExplorerLoading] = useState(false);
  const [wordExplorerError, setWordExplorerError] = useState<string | null>(null);
  const [wordExplorerResults, setWordExplorerResults] = useState<any[]>([]);

  const [quickPreview, setQuickPreview] = useState<{
    surface: string;
    cacheSurface: string; // ✅ ADD THIS
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
  } | null>(null);

  const [quickSessionWords, setQuickSessionWords] = useState<
    {
      id: string;
      surface: string;
      reading: string;
      meaning: string;
      page: string;
      chapterNumber: string;
      chapterName: string;
    }[]
  >([]);

  const [editingQuickSessionId, setEditingQuickSessionId] = useState<string | null>(null);
  const [editingQuickSessionWord, setEditingQuickSessionWord] = useState<{
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  } | null>(null);

  const [defaultVocabPage, setDefaultVocabPage] = useState("");
  const [defaultChapterNumber, setDefaultChapterNumber] = useState("");
  const [defaultChapterName, setDefaultChapterName] = useState("");

  const [formatType, setFormatType] = useState<string>("");
  const [progressMode, setProgressMode] = useState<string>("");
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  const quickWordInputRef = useRef<HTMLInputElement>(null);
  const kanjiReadingMemoryRef = useRef<
    Record<
      string,
      Partial<
        Record<
          "on" | "kun" | "other",
          {
            base: string | null;
            realized: string | null;
          }
        >
      >
    >
  >({});

  const isEditingThisTab = editingTab === activeTab;
  const canEditThisTab =
    activeTab === "bookInfo"
      ? canEditBookInfo
      : true; // members can edit everything else

  const started = useMemo(() => safeDate(row?.started_at ?? null), [row?.started_at]);
  const finished = useMemo(() => safeDate(row?.finished_at ?? null), [row?.finished_at]);
  const book = row?.books ?? null;

  const totalPagesRead = useMemo(() => {
    return realReadingSessions.reduce((sum, s) => {
      return sum + (s.end_page - s.start_page + 1);
    }, 0);
  }, [realReadingSessions]);

  const timedSessions = useMemo(() => {
    return realReadingSessions.filter((s) => s.minutes_read != null);
  }, [realReadingSessions]);

  const totalTimedMinutes = useMemo(() => {
    return timedSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [timedSessions]);

  const totalTimedPages = useMemo(() => {
    return timedSessions.reduce((sum, s) => sum + (s.end_page - s.start_page + 1), 0);
  }, [timedSessions]);

  const averageMinutesPerPage = useMemo(() => {
    if (!totalTimedPages) return null;
    return totalTimedMinutes / totalTimedPages;
  }, [totalTimedMinutes, totalTimedPages]);

  const furthestPage = useMemo(() => {
    if (readingSessions.length === 0) return null;
    return Math.max(...readingSessions.map((s) => s.end_page));
  }, [readingSessions]);

  const earliestStartPage = useMemo(() => {
    if (readingSessions.length === 0) return null;
    return Math.min(...readingSessions.map((s) => s.start_page));
  }, [readingSessions]);

  const canFillBeginningPages = useMemo(() => {
    return earliestStartPage != null && earliestStartPage > 1;
  }, [earliestStartPage]);

  const canFillEndingPages = useMemo(() => {
    if (!finished || !book?.page_count || readingSessions.length === 0) return false;
    return furthestPage != null && furthestPage < book.page_count;
  }, [finished, book?.page_count, readingSessions.length, furthestPage]);

  const progressPercent = useMemo(() => {
    if (finished) return 100;
    if (!book?.page_count || !furthestPage) return null;
    return Math.min(100, Math.round((furthestPage / book.page_count) * 100));
  }, [book?.page_count, furthestPage, finished]);

  const lastReadDate = useMemo(() => {
    if (realReadingSessions.length === 0) return null;
    return realReadingSessions[0]?.read_on ?? null;
  }, [realReadingSessions]);

  const visibleReadingSessions = useMemo(() => {
    return showAllSessions ? readingSessions : readingSessions.slice(0, 3);
  }, [readingSessions, showAllSessions]);

  const visibleChapterSummaries = useMemo(() => {
    const sorted = [...chapterSummaries].sort((a, b) => {
      const aSort = a.sort_order ?? 0;
      const bSort = b.sort_order ?? 0;
      if (aSort !== bSort) return aSort - bSort;

      const aChapter = a.chapter_number ?? 0;
      const bChapter = b.chapter_number ?? 0;
      if (aChapter !== bChapter) return aChapter - bChapter;

      return a.created_at.localeCompare(b.created_at);
    });

    return chapterReverseOrder ? sorted.reverse() : sorted;
  }, [chapterSummaries, chapterReverseOrder]);

  function openWordExplorer(word?: string) {
    setWordExplorerQuery(word ?? "");
    setWordExplorerError(null);
    setWordExplorerResults([]);
    setShowWordExplorer(true);
  }

  function addSettingItem() {
    const newItem: SettingItem = {
      id: crypto.randomUUID(),
      user_book_id: userBookId,
      title: "",
      details: "",
      sort_order: settingItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSettingItems((prev) => [...prev, newItem]);
    startEditingSettingItem(newItem.id);
  }


  function addChapterSummary() {
    if (!row?.id) return;

    const newId = `new-${Date.now()}`;

    setChapterSummaries((prev) => [
      ...prev,
      {
        id: newId,
        user_book_id: row.id,
        chapter_number: 1,
        chapter_title: "",
        summary: "",
        sort_order:
          prev.length > 0
            ? Math.max(...prev.map((x) => x.sort_order ?? 0)) + 1
            : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setShowChapterSummaries(true);
    setEditingChapterIds((prev) => [...prev, newId]);
  }

  function updateChapterSummary(
    id: string,
    field: keyof ChapterSummary,
    value: string
  ) {
    setChapterSummaries((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            [field]:
              field === "chapter_number" || field === "sort_order"
                ? value === ""
                  ? null
                  : Number(value)
                : value,
          }
          : item
      )
    );
  }

  function startEditingChapter(id: string) {
    setEditingChapterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
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


  function updateSettingItem(id: string, field: keyof SettingItem, value: string) {
    setSettingItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function saveSettingItem(item: SettingItem) {
    setSavingSettingIds((prev) => [...prev, item.id]);

    setSavingSettingIds((prev) => prev.filter((x) => x !== item.id));
    stopEditingSettingItem(item.id);
  }

  async function deleteSettingItem(id: string) {
    setSettingItems((prev) => prev.filter((x) => x.id !== id));
  }

  function addCulturalItem() {
    const newItem: CulturalItem = {
      id: crypto.randomUUID(),
      user_book_id: userBookId,
      title: "",
      details: "",
      sort_order: culturalItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCulturalItems((prev) => [...prev, newItem]);
    startEditingCulturalItem(newItem.id);
  }

  function updateCulturalItem(id: string, field: keyof CulturalItem, value: string) {
    setCulturalItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function saveCulturalItem(item: CulturalItem) {
    setSavingCulturalIds((prev) => [...prev, item.id]);

    setSavingCulturalIds((prev) => prev.filter((x) => x !== item.id));
    stopEditingCulturalItem(item.id);
  }

  async function deleteCulturalItem(id: string) {
    setCulturalItems((prev) => prev.filter((x) => x.id !== id));
  }

  function addCharacter() {
    if (!row?.id) return;

    const newId = `new-character-${Date.now()}`;

    setCharacters((prev) => [
      ...prev,
      {
        id: newId,
        user_book_id: row.id,
        name: "",
        reading: "",
        role: "",
        notes: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setShowCharacters(true);
  }

  function updateCharacter(id: string, field: keyof Character, value: string) {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function markCharacterSaved(id: string) {
    setSavedCharacterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  async function saveNotes() {
    if (!userBookId) return;

    const { error } = await supabase
      .from("user_books")
      .update({ notes })
      .eq("id", userBookId);

    if (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes");
    }
  }

  async function saveKanjiWord(vocabId: number) {
    const rows = editingKanjiRows[vocabId] ?? [];
    if (rows.length === 0) return;

    setSavingKanjiWordId(vocabId);

    for (const row of rows) {
      const { error } = await supabase
        .from("vocabulary_kanji_map")
        .update({
          reading_type: row.reading_type,
          base_reading: row.base_reading,
          realized_reading: row.realized_reading,
        })
        .eq("id", row.id);

      if (error) {
        console.error("Error saving kanji map row:", error);
        alert(`Could not save kanji row ${row.kanji}.\n${error.message}`);
        setSavingKanjiWordId(null);
        return;
      }
    }

    if (row?.id) {
      await loadSavedKanjiDefaults(row.id);
      await loadKanjiMapQueue();
    }
    setOpenKanjiWordId(null);
    setSavingKanjiWordId(null);
  }

  async function loadReadingSessions(userBookIdValue: string) {
    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode")
      .eq("user_book_id", userBookIdValue)
      .order("read_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reading sessions:", error);
      setReadingSessions([]);
      return;
    }

    setReadingSessions((data as ReadingSession[]) ?? []);
  }

  async function loadCharacters(userBookIdValue: string) {
    const { data, error } = await supabase
      .from("user_book_characters")
      .select("id, user_book_id, name, reading, role, notes, sort_order, created_at, updated_at")
      .eq("user_book_id", userBookIdValue)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading characters:", error);
      setCharacters([]);
      return;
    }

    setCharacters((data as Character[]) ?? []);
  }

  async function saveCharacter(item: Character) {
    if (!row?.id) return;

    const payload = {
      user_book_id: row.id,
      name: item.name.trim(),
      reading: item.reading?.trim() || null,
      role: item.role?.trim() || null,
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

      const { data, error } = await supabase
        .from("user_book_characters")
        .insert(payload)
        .select("id, user_book_id, name, reading, role, notes, sort_order, created_at, updated_at")
        .single();

      setSavingCharacterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating character:", error);
        alert(`Could not save character.\n${error.message}`);
        return;
      }

      const saved = data as Character;

      setCharacters((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      markCharacterSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_characters")
      .update(payload)
      .eq("id", item.id)
      .select("id, user_book_id, name, reading, role, notes, sort_order, created_at, updated_at")
      .single();

    setSavingCharacterIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating character:", error);
      alert(`Could not update character.\n${error.message}`);
      return;
    }

    const saved = data as Character;

    setCharacters((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    markCharacterSaved(saved.id);
  }

  async function deleteCharacter(id: string) {
    if (id.startsWith("new-character-")) {
      setCharacters((prev) => prev.filter((x) => x.id !== id));
      setSavingCharacterIds((prev) => prev.filter((x) => x !== id));
      setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    const ok = window.confirm("Delete this character?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_characters")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting character:", error);
      alert("Could not delete character.");
      return;
    }

    setCharacters((prev) => prev.filter((x) => x.id !== id));
    setSavingCharacterIds((prev) => prev.filter((x) => x !== id));
    setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
    stopEditingCharacter(id);
  }

  async function loadChapterSummaries(userBookIdValue: string) {
    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .select(
        "id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at"
      )
      .eq("user_book_id", userBookIdValue)
      .order("sort_order", { ascending: true })
      .order("chapter_number", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading chapter summaries:", error);
      setChapterSummaries([]);
      return;
    }

    setChapterSummaries((data as ChapterSummary[]) ?? []);
  }

  async function loadSavedKanjiDefaults(userBookIdValue: string) {
    const { data: bookWordRows, error: bookWordErr } = await supabase
      .from("user_book_words")
      .select("vocabulary_cache_id, is_manual_override")
      .eq("user_book_id", userBookIdValue)
      .eq("is_manual_override", false)
      .not("vocabulary_cache_id", "is", null);

    if (bookWordErr) {
      console.error("Error loading book vocabulary cache ids:", bookWordErr);
      setSavedKanjiDefaults({});
      return;
    }

    const cacheIds = Array.from(
      new Set(
        (bookWordRows ?? [])
          .map((r: any) => r.vocabulary_cache_id)
          .filter((id: number | null) => id != null)
      )
    );

    if (cacheIds.length === 0) {
      setSavedKanjiDefaults({});
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_kanji_map")
      .select("kanji, reading_type, base_reading, realized_reading")
      .in("vocabulary_cache_id", cacheIds);

    if (error) {
      console.error("Error loading saved kanji defaults:", error);
      setSavedKanjiDefaults({});
      return;
    }

    const rows = (data ?? []) as Array<{
      kanji: string;
      reading_type: "on" | "kun" | "other" | null;
      base_reading: string | null;
      realized_reading: string | null;
    }>;

    const byKanji: Record<string, SessionKanjiReading> = {};

    for (const row of rows) {
      if (!row.kanji) continue;

      const nextValue: SessionKanjiReading = {
        reading_type: row.reading_type,
        base: row.base_reading,
        realized: row.realized_reading,
      };

      const hasUsefulReading =
        !!nextValue.base?.trim() || !!nextValue.realized?.trim();

      if (!hasUsefulReading) continue;

      const existing = byKanji[row.kanji];

      if (!existing) {
        byKanji[row.kanji] = nextValue;
        continue;
      }

      if (existing.reading_type === "on") continue;

      if (row.reading_type === "on") {
        byKanji[row.kanji] = nextValue;
      }
    }

    setSavedKanjiDefaults(byKanji);
  }

  async function loadKanjiMapQueue() {
    if (!row?.id) return;

    setKanjiMapLoading(true);
    setKanjiMapError(null);

    const { data: bookWordRows, error: bookWordErr } = await supabase
      .from("user_book_words")
      .select("vocabulary_cache_id, is_manual_override")
      .eq("is_manual_override", false)
      .eq("user_book_id", row.id)
      .not("vocabulary_cache_id", "is", null);

    if (bookWordErr) {
      console.error("Error loading book vocabulary cache ids:", bookWordErr);
      setKanjiMapQueue([]);
      setKanjiMapError(bookWordErr.message);
      setKanjiMapLoading(false);
      return;
    }

    const cacheIds = Array.from(
      new Set(
        (bookWordRows ?? [])
          .map((r: any) => r.vocabulary_cache_id)
          .filter((id: number | null) => id != null)
      )
    );

    if (cacheIds.length === 0) {
      setKanjiMapQueue([]);
      setKanjiMapLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_cache")
      .select(`
      id,
      surface,
      reading,
      jlpt,
      created_at,
      vocabulary_kanji_map (
        id,
        vocabulary_cache_id,
        kanji,
        kanji_position,
        reading_type,
        base_reading,
        realized_reading
      )
    `)
      .in("id", cacheIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading kanji map queue:", error);
      setKanjiMapQueue([]);
      setKanjiMapError(error.message);
      setKanjiMapLoading(false);
      return;
    }

    const rows = (data ?? []) as VocabCacheQueueRow[];

    const needsWork = rows.filter((word) => {
      const hasKanji = /[\p{Script=Han}]/u.test(word.surface ?? "");
      if (!hasKanji) return false;

      const mapRows = word.vocabulary_kanji_map ?? [];

      if (mapRows.length === 0) return true;

      return mapRows.some(
        (r) =>
          !r.reading_type ||
          !r.base_reading ||
          !r.realized_reading
      );
    });

    setKanjiMapQueue(needsWork);
    setKanjiMapLoading(false);
  }

  async function deleteReadingSession(sessionId: string) {
    const ok = window.confirm("Delete this reading session?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_reading_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting reading session:", error);
      alert(`Could not delete reading session.\n${error.message || "Unknown error"}`);
      return;
    }

    if (row?.id) {
      await loadReadingSessions(row.id);
    }
  }

  async function fillBeginningPages() {
    if (!row?.id || earliestStartPage == null || earliestStartPage <= 1) return;

    const { error } = await supabase
      .from("user_book_reading_sessions")
      .insert({
        user_book_id: row.id,
        read_on: startedAt || new Date().toISOString().slice(0, 10),
        start_page: 1,
        end_page: earliestStartPage - 1,
        minutes_read: null,
        is_filler: true,
        session_mode: "fluid",
      });

    if (error) {
      console.error("Error filling beginning pages:", error);
      alert("Could not fill the empty beginning pages.");
      return;
    }

    await loadReadingSessions(row.id);
  }

  async function fillEndingPages() {
    if (!row?.id || !book?.page_count || furthestPage == null || furthestPage >= book.page_count) return;

    const { error } = await supabase
      .from("user_book_reading_sessions")
      .insert({
        user_book_id: row.id,
        read_on: finishedAt || new Date().toISOString().slice(0, 10),
        start_page: furthestPage + 1,
        end_page: book.page_count,
        minutes_read: null,
        is_filler: true,
        session_mode: "fluid",
      });

    if (error) {
      console.error("Error filling ending pages:", error);
      alert("Could not fill the empty ending pages.");
      return;
    }

    await loadReadingSessions(row.id);
  }

  const renderSessionToggle = () => {

    return (
      <button
        type="button"
        onClick={() => setShowAllSessions((prev) => !prev)}
        className="text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900"
      >
        {showAllSessions ? "Show less" : `View all (${readingSessions.length})`}
      </button>
    );
  };

  async function saveChapterSummary(item: ChapterSummary) {
    if (!row?.id) return;

    const payload = {
      user_book_id: row.id,
      chapter_number: item.chapter_number,
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
        .select(
          "id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at"
        )
        .single();

      setSavingChapterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating chapter summary:", error);
        alert("Could not save chapter summary.");
        return;
      }

      const saved = data as ChapterSummary;

      setChapterSummaries((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingChapterIds((prev) =>
        prev.map((x) => (x === oldId ? saved.id : x))
      );

      stopEditingChapter(saved.id);
      markChapterSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .update(payload)
      .eq("id", item.id)
      .select(
        "id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at"
      )
      .single();

    setSavingChapterIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating chapter summary:", error);
      alert("Could not update chapter summary.");
      return;
    }

    const saved = data as ChapterSummary;

    setChapterSummaries((prev) => prev.map((x) => (x.id === item.id ? saved : x)));

    stopEditingChapter(saved.id);
    markChapterSaved(saved.id);
  }

  async function deleteChapterSummary(id: string) {
    if (id.startsWith("new-")) {
      setChapterSummaries((prev) => prev.filter((x) => x.id !== id));
      setEditingChapterIds((prev) => prev.filter((x) => x !== id));
      setSavingChapterIds((prev) => prev.filter((x) => x !== id));
      setSavedChapterIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    const ok = window.confirm("Delete this chapter summary?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_chapter_summaries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting chapter summary:", error);
      alert("Could not delete chapter summary.");
      return;
    }

    setChapterSummaries((prev) => prev.filter((x) => x.id !== id));
    setEditingChapterIds((prev) => prev.filter((x) => x !== id));
    setSavingChapterIds((prev) => prev.filter((x) => x !== id));
    setSavedChapterIds((prev) => prev.filter((x) => x !== id));
  }

  async function handleWorkOnKanjiWord(word: VocabCacheQueueRow) {
    const hasRows = (word.vocabulary_kanji_map ?? []).length > 0;

    if (!hasRows) {
      const res = await fetch("/api/vocabulary-kanji-map/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vocabulary_cache_id: word.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Kanji map generate error:", json);
        alert(json?.error ?? "Could not prepare this word.");
        return;
      }

      await loadKanjiMapQueue();
    }

    const { data, error } = await supabase
      .from("vocabulary_kanji_map")
      .select(`
      id,
      vocabulary_cache_id,
      kanji,
      kanji_position,
      reading_type,
      base_reading,
      realized_reading
    `)
      .eq("vocabulary_cache_id", word.id)
      .order("kanji_position", { ascending: true });

    if (error) {
      console.error("Error loading kanji rows:", error);
      alert("Could not load kanji rows.");
      return;
    }

    const rows = (data ?? []) as KanjiMapRow[];

    const enrichedRows = rows.map((r) => {
      const sessionMemory = kanjiReadingMemoryRef.current[r.kanji];
      const savedDefault = savedKanjiDefaults[r.kanji];

      const rememberedForType =
        r.reading_type && sessionMemory
          ? sessionMemory[r.reading_type]
          : null;

      if (rememberedForType) {
        return {
          ...r,
          base_reading: r.base_reading || rememberedForType.base,
          realized_reading: r.realized_reading || rememberedForType.realized,
        };
      }

      if (savedDefault) {
        return {
          ...r,
          reading_type: r.reading_type || savedDefault.reading_type,
          base_reading: r.base_reading || savedDefault.base,
          realized_reading: r.realized_reading || savedDefault.realized,
        };
      }

      return r;
    });

    setEditingKanjiRows((prev) => ({
      ...prev,
      [word.id]: enrichedRows,
    }));

    setOpenKanjiWordId(word.id);
  }

  async function removeWordFromKanjiEnrichment(vocabId: number) {
    if (!row?.id) return;

    const ok = window.confirm(
      "Remove this word from this book's kanji enrichment area?"
    );
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_words")
      .update({
        vocabulary_cache_id: null,
        is_manual_override: true,
      })
      .eq("user_book_id", row.id)
      .eq("vocabulary_cache_id", vocabId);

    if (error) {
      console.error("Error removing word from kanji enrichment:", error);
      alert(`Could not remove word.\n${error.message}`);
      return;
    }

    await loadSavedKanjiDefaults(row.id);
    await loadKanjiMapQueue();
  }

  function updateKanjiMapRow(
    vocabId: number,
    rowId: number,
    field: keyof Pick<KanjiMapRow, "reading_type" | "base_reading" | "realized_reading">,
    value: string
  ) {
    setEditingKanjiRows((prev) => ({
      ...prev,
      [vocabId]: (prev[vocabId] ?? []).map((row) => {
        if (row.id !== rowId) return row;

        const nextValue = value === "" ? null : value;
        const kanjiMemory = kanjiReadingMemoryRef.current[row.kanji] ?? {};

        let updatedRow: KanjiMapRow = row;

        if (field === "reading_type") {
          const nextType = nextValue as "on" | "kun" | "other" | null;
          const remembered =
            nextType && kanjiMemory[nextType]
              ? kanjiMemory[nextType]
              : null;

          updatedRow = {
            ...row,
            reading_type: nextType,
            base_reading: remembered?.base ?? null,
            realized_reading: remembered?.realized ?? null,
          };
        } else if (field === "base_reading") {
          const prevBase = row.base_reading ?? "";
          const prevRealized = row.realized_reading ?? "";

          const shouldSyncRealized =
            prevRealized.trim() === "" || prevRealized === prevBase;

          updatedRow = {
            ...row,
            base_reading: nextValue,
            realized_reading: shouldSyncRealized ? nextValue : row.realized_reading,
          };
        } else {
          updatedRow = {
            ...row,
            realized_reading: nextValue,
          };
        }

        const type = updatedRow.reading_type;
        if (type) {
          kanjiReadingMemoryRef.current[row.kanji] = {
            ...(kanjiReadingMemoryRef.current[row.kanji] ?? {}),
            [type]: {
              base: updatedRow.base_reading,
              realized: updatedRow.realized_reading,
            },
          };
        }

        return updatedRow;
      }),
    }));
  }

  function markStartedToday() {
    const today = new Date().toISOString().slice(0, 10);
    setStartedAt(today);
    setFinishedAt("");
    setDnfAt("");
  }

  function markFinishedToday() {
    const today = new Date().toISOString().slice(0, 10);
    if (!startedAt) {
      setStartedAt(today);
    }
    setFinishedAt(today);
    setDnfAt("");
  }

  function markDnfToday() {
    const today = new Date().toISOString().slice(0, 10);
    if (!startedAt) {
      setStartedAt(today);
    }
    setDnfAt(today);
    setFinishedAt("");
  }

  async function saveReadingSession() {
    if (!row?.id) return;

    const start = Number(sessionStartPage);
    const end = Number(sessionEndPage);
    const minutesFromInput =
      sessionMinutesRead.trim() === "" ? null : Number(sessionMinutesRead);

    const minutes =
      showTimedSessionForm
        ? Math.max(1, Math.round(elapsed / 60))
        : minutesFromInput;

    if (!sessionDate || !Number.isFinite(start) || !Number.isFinite(end)) {
      alert("Please fill in date, start page, and end page.");
      return;
    }

    if (start <= 0 || end <= 0) {
      alert("Pages must be greater than 0.");
      return;
    }

    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) {
      alert("Minutes must be greater than 0 if provided.");
      return;
    }

    if (end < start) {
      alert("End page must be greater than or equal to start page.");
      return;
    }

    const newSession = {
      user_book_id: row.id,
      read_on: sessionDate,
      start_page: start,
      end_page: end,
      minutes_read: minutes,
      session_mode: "fluid",
    };

    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .insert(newSession)
      .select()
      .single();

    if (error) {
      console.error("Error saving reading session:", error);
      alert(`Could not save reading session.\n${error.message || "Unknown error"}`);
      return;
    }

    setTimerSaveMessage("Your session has been saved in the Reading Tab.");
    setTimeout(() => setTimerSaveMessage(""), 4000);

    const existingStartedAt = row.started_at ? row.started_at.slice(0, 10) : null;

    const nextStartedAt =
      !existingStartedAt || sessionDate < existingStartedAt
        ? sessionDate
        : existingStartedAt;

    const { error: startErr } = await supabase
      .from("user_books")
      .update({
        status: "reading",
        started_at: nextStartedAt,
        finished_at: null,
        dnf_at: null,
      })
      .eq("id", row.id);

    if (startErr) {
      console.error("Error updating user_books from reading session:", startErr);
    } else {
      setStartedAt(nextStartedAt);
      setFinishedAt("");
      setDnfAt("");
      setRow((prev) =>
        prev
          ? {
            ...prev,
            started_at: nextStartedAt,
            finished_at: null,
            dnf_at: null,
          }
          : prev
      );
    }

    setReadingSessions((prev) =>
      [data as ReadingSession, ...prev].sort((a, b) => {
        const dateCompare = b.read_on.localeCompare(a.read_on);
        if (dateCompare !== 0) return dateCompare;
        return b.created_at.localeCompare(a.created_at);
      })
    );

    setSessionStartPage("");
    setSessionEndPage("");
    setSessionMinutesRead("");
    setShowTimedSessionForm(false);
    setElapsed(0);
    setStartTime(null);
  }

  const loadUniqueLookupCount = async (id: string) => {
    const { data, error } = await supabase
      .from("user_book_words")
      .select("surface, meaning")
      .eq("user_book_id", id);

    if (error) {
      console.error("Error loading lookup count:", error);
      setUniqueLookupCount(null);
      return;
    }

    const rows = (data ?? []) as LookupRow[];

    const set = new Set<string>();
    for (const r of rows) {
      const surface = (r.surface ?? "").trim();
      const meaning = (r.meaning ?? "").trim();
      if (!surface && !meaning) continue;
      set.add(`${surface}|||${meaning}`);
    }

    setUniqueLookupCount(set.size);
  };

  const load = async () => {
    if (!userBookId) return;

    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      setError("Please sign in.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: meProfile, error: meProfileErr } = await supabase
      .from("profiles")
      .select("role, is_super_teacher")
      .eq("id", user.id)
      .single();

    if (meProfileErr) {
      console.error("Error loading profile role:", meProfileErr);
    }

    setMyRole((meProfile?.role as ProfileRole | null) ?? "member");
    setIsSuperTeacher(!!meProfile?.is_super_teacher);

    const { data, error } = await supabase
      .from("user_books")
      .select(
        `
        id,
        book_id,
        started_at,
        finished_at,
        dnf_at,
        notes,
        my_review,
        rating_overall,
        rating_recommend,
        rating_difficulty,
        reader_level,
        recommended_level,
        format_type,
        progress_mode,
        show_page_numbers,
        books (
          id,
          title,
          title_reading,
          author,
          translator,
          illustrator,
          cover_url,
          genre,
          book_type,
          audience_category,
          trigger_warnings,
          page_count,
          isbn,
          isbn13,
          publisher,
          published_date,
          publisher_reading,
          publisher_image_url,
          related_links,
          author_image_url,
          translator_image_url,
          illustrator_image_url,
          author_reading,
          translator_reading,
          illustrator_reading
        )
      `
      )
      .eq("id", userBookId)
      .single();

    if (error) {
      setRow(null);
      setError(error.message);
      setLoading(false);
      return;
    }

    const r = data as unknown as UserBook;
    setRow(r);

    setStartedAt(r.started_at ? formatYmd(new Date(r.started_at)) : "");
    setFinishedAt(r.finished_at ? formatYmd(new Date(r.finished_at)) : "");
    setDnfAt(r.dnf_at ? formatYmd(new Date(r.dnf_at)) : "");
    setNotes(r.notes ?? "");
    setMyReview(r.my_review ?? "");

    setRatingOverall(r.rating_overall != null ? String(r.rating_overall) : "");
    setRatingRecommend(r.rating_recommend != null ? String(r.rating_recommend) : "");
    setRatingDifficulty(r.rating_difficulty != null ? String(r.rating_difficulty) : "");

    setReaderLevel(r.reader_level ?? "");
    setRecommendedLevel(r.recommended_level ?? "");
    setFormatType(r.format_type ?? "");
    setProgressMode(r.progress_mode ?? "");
    setShowPageNumbers(r.show_page_numbers ?? true);

    const b = r.books as Book | null;
    setGenre(b?.genre ?? "");
    setBookType(b?.book_type ?? "");
    setTriggerWarnings(b?.trigger_warnings ?? "");
    setPublishedDate(b?.published_date ?? "");
    setPageCount(b?.page_count != null ? String(b.page_count) : "");
    setIsbn(b?.isbn ?? "");
    setIsbn13(b?.isbn13 ?? "");

    setAuthorName(b?.author ?? "");
    setTranslatorName(b?.translator ?? "");
    setIllustratorName(b?.illustrator ?? "");
    setPublisherName(b?.publisher ?? "");
    setPublisherReading(b?.publisher_reading ?? "");

    setCoverUrl(b?.cover_url ?? "");
    setAuthorImg(b?.author_image_url ?? "");
    setTranslatorImg(b?.translator_image_url ?? "");
    setIllustratorImg(b?.illustrator_image_url ?? "");
    setPublisherImg(b?.publisher_image_url ?? "");

    setAuthorReading(b?.author_reading ?? "");
    setTranslatorReading(b?.translator_reading ?? "");
    setIllustratorReading(b?.illustrator_reading ?? "");

    setLinksText(linksToText(b?.related_links));

    await loadUniqueLookupCount(r.id);
    await loadReadingSessions(r.id);
    await loadChapterSummaries(r.id);
    await loadCharacters(r.id);
    await loadSavedKanjiDefaults(r.id);
    await loadKanjiMapQueue();

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId]);

  useEffect(() => {
    async function loadBookOptions() {
      if (!userId) return;

      const { data, error } = await supabase
        .from("user_books")
        .select(`
          id,
          started_at,
          finished_at,
          dnf_at,
          books (
            title
          )
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Error loading book options:", error);
        setBookOptions([]);
        return;
      }

      setBookOptions(
        (data ?? []).map((item: any) => ({
          id: item.id,
          title: item.books?.title ?? "Untitled",
          started_at: item.started_at ?? null,
          finished_at: item.finished_at ?? null,
          dnf_at: item.dnf_at ?? null,
        }))
      );
    }

    loadBookOptions();
  }, [userId]);

  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  useEffect(() => {
    const shouldWarn = isRunning || isPaused;

    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRunning, isPaused]);

  const confirmLeaveIfTimerActive = () => {
    if (isRunning || isPaused) {
      return window.confirm(
        "Timer is active. If you leave the Book Hub or refresh the page, you may lose your session. Continue?"
      );
    }
    return true;
  };

  const cancelEdits = () => {
    if (!row) return;

    setEditingTab(null);

    setStartedAt(row.started_at ? formatYmd(new Date(row.started_at)) : "");
    setFinishedAt(row.finished_at ? formatYmd(new Date(row.finished_at)) : "");
    setDnfAt(row.dnf_at ? formatYmd(new Date(row.dnf_at)) : "");
    setNotes(row.notes ?? "");
    setMyReview(row.my_review ?? "");

    setRatingOverall(row.rating_overall != null ? String(row.rating_overall) : "");
    setRatingRecommend(row.rating_recommend != null ? String(row.rating_recommend) : "");
    setRatingDifficulty(row.rating_difficulty != null ? String(row.rating_difficulty) : "");

    setReaderLevel(row.reader_level ?? "");
    setRecommendedLevel(row.recommended_level ?? "");

    setFormatType(row.format_type ?? "");
    setProgressMode(row.progress_mode ?? "");
    setShowPageNumbers(row.show_page_numbers ?? true);

    const b = row.books;
    setGenre(b?.genre ?? "");
    setBookType(b?.book_type ?? "");
    setTriggerWarnings(b?.trigger_warnings ?? "");
    setPublishedDate(b?.published_date ?? "");
    setPageCount(b?.page_count != null ? String(b.page_count) : "");
    setIsbn(b?.isbn ?? "");
    setIsbn13(b?.isbn13 ?? "");

    setAuthorName(b?.author ?? "");
    setTranslatorName(b?.translator ?? "");
    setIllustratorName(b?.illustrator ?? "");
    setPublisherName(b?.publisher ?? "");
    setPublisherReading(b?.publisher_reading ?? "");

    setCoverUrl(b?.cover_url ?? "");
    setAuthorImg(b?.author_image_url ?? "");
    setTranslatorImg(b?.translator_image_url ?? "");
    setIllustratorImg(b?.illustrator_image_url ?? "");
    setPublisherImg(b?.publisher_image_url ?? "");

    setAuthorReading(b?.author_reading ?? "");
    setTranslatorReading(b?.translator_reading ?? "");
    setIllustratorReading(b?.illustrator_reading ?? "");

    setLinksText(linksToText(b?.related_links));
  };

  const saveAll = async () => {
    if (!row?.id || !row.books?.id) return;

    setSaving(true);
    setError(null);

    const started_at = startedAt.trim() ? startedAt.trim() : null;
    const finished_at = finishedAt.trim() ? finishedAt.trim() : null;
    const dnf_at = dnfAt.trim() ? dnfAt.trim() : null;

    const status =
      dnf_at ? "did_not_finish" :
        finished_at ? "finished" :
          started_at ? "reading" :
            "what_to_read";

    const pc = pageCount.trim() ? Number(pageCount.trim()) : null;
    const page_count = Number.isFinite(pc as any) ? (pc as number) : null;

    const ro = ratingOverall.trim() ? clampRating5(Number(ratingOverall.trim())) : null;
    const rr = ratingRecommend.trim() ? clampRating5(Number(ratingRecommend.trim())) : null;
    const rd = ratingDifficulty.trim() ? clampRating5(Number(ratingDifficulty.trim())) : null;

    const related_links = linksText.trim() ? parseLinks(linksText) : null;
    const userBooksUpdate = supabase
      .from("user_books")
      .update({
        status,
        started_at,
        finished_at,
        dnf_at,
        notes: notes || null,
        my_review: myReview || null,
        rating_overall: ro,
        rating_recommend: rr,
        rating_difficulty: rd,
        reader_level: readerLevel || null,
        recommended_level: recommendedLevel || null,
        format_type: formatType || null,
        progress_mode: progressMode || null,
        show_page_numbers: showPageNumbers,
      })
      .eq("id", row.id);

    const booksUpdate = supabase
      .from("books")
      .update({
        author: authorName || null,
        translator: translatorName || null,
        illustrator: illustratorName || null,
        publisher: publisherName || null,
        published_date: publishedDate || null,
        genre: genre || null,
        book_type: bookType || null,
        trigger_warnings: triggerWarnings || null,
        page_count,
        isbn: isbn || null,
        isbn13: isbn13 || null,
        publisher_reading: publisherReading || null,
        publisher_image_url: publisherImg || null,
        related_links,
        cover_url: coverUrl || null,
        author_image_url: authorImg || null,
        translator_image_url: translatorImg || null,
        illustrator_image_url: illustratorImg || null,
        author_reading: authorReading || null,
        translator_reading: translatorReading || null,
        illustrator_reading: illustratorReading || null,
      })
      .eq("id", row.books.id);

    const [uRes, bRes] = await Promise.all([userBooksUpdate, booksUpdate]);

    if (uRes.error || bRes.error) {
      setError(
        `user_books: ${uRes.error?.message ?? "ok"} | books: ${bRes.error?.message ?? "ok"}`
      );
      setSaving(false);
      return;
    }

    setEditingTab(null);
    setSaving(false);
    await load();
  };

  async function pullQuickWord() {
    const word = quickWord.trim();
    if (!word) return;

    setQuickLoading(true);
    setQuickError(null);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(word)}`);
      const json = await res.json();

      const first = json?.data?.[0];
      if (!first) {
        setQuickPreview(null);
        setQuickError("No result found.");
        setQuickLoading(false);
        return;
      }

      const surface =
        first?.japanese?.[0]?.word ||
        first?.slug ||
        word;

      const reading =
        first?.japanese?.[0]?.reading || "";

      const meanings =
        (first?.senses ?? [])
          .map((sense: any) => (sense.english_definitions ?? []).join("; "))
          .filter(Boolean);

      setQuickPreview({
        surface,
        cacheSurface: surface,
        reading,
        meanings: meanings.length ? meanings : [""],
        selectedMeaningIndex: 0,
        meaning: meanings.length ? meanings[0] : "",
        isCustomMeaning: false,
        useAlternateSurface: false,
        alternateSurface: "",
        page: defaultVocabPage || (furthestPage != null ? String(furthestPage + 1) : ""),
        chapterNumber: defaultChapterNumber,
        chapterName: defaultChapterName,
      });
    } catch (err) {
      console.error(err);
      setQuickPreview(null);
      setQuickError("Could not pull word data.");
    } finally {
      setQuickLoading(false);
    }
  }

  async function searchWordExplorer() {
    const query = wordExplorerQuery.trim();

    if (!query) {
      setWordExplorerResults([]);
      setWordExplorerError(null);
      return;
    }

    setWordExplorerLoading(true);
    setWordExplorerError(null);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(query)}`);
      const json = await res.json();

      const results = (json?.data ?? []).slice(0, 8);
      setWordExplorerResults(results);

      if (results.length === 0) {
        setWordExplorerError("No results found.");
      }
    } catch (err) {
      console.error(err);
      setWordExplorerResults([]);
      setWordExplorerError("Could not load word data.");
    } finally {
      setWordExplorerLoading(false);
    }
  }

  async function saveQuickWord() {
    if (!row?.id || !quickPreview) return;

    const selectedMeaning = quickPreview.meaning ?? "";

    let vocabularyCacheId: number | null = null;

    const normalizedSurface = (
      quickPreview.useAlternateSurface
        ? quickPreview.alternateSurface
        : quickPreview.surface
    )?.trim() ?? "";
    const normalizedCacheSurface =
      quickPreview.cacheSurface?.trim() || normalizedSurface;
    const normalizedReading = quickPreview.reading?.trim() ?? "";
    const isManualEntry =
      quickPreview.isCustomMeaning && quickPreview.meanings.length === 0;

    if (normalizedCacheSurface && !isManualEntry) {
      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", normalizedCacheSurface)
        .eq("reading", normalizedReading || "")
        .maybeSingle();

      if (cacheLookupError) {
        console.error("Error looking up vocabulary cache:", cacheLookupError);
        alert(`Could not save word.\n${cacheLookupError.message}`);
        return;
      }

      if (existingCache?.id) {
        vocabularyCacheId = existingCache.id;
      } else {
        const { data: createdCache, error: cacheInsertError } = await supabase
          .from("vocabulary_cache")
          .insert({
            surface: normalizedCacheSurface,
            reading: normalizedReading || "",
          })
          .select("id")
          .single();

        if (cacheInsertError) {
          console.error("Error creating vocabulary cache row:", cacheInsertError);
          alert(`Could not save word.\n${cacheInsertError.message}`);
          return;
        }

        vocabularyCacheId = createdCache.id;

        await fetch("/api/vocabulary-kanji-map/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ vocabulary_cache_id: createdCache.id }),
        });
      }
    }

    const payload = {
      user_book_id: row.id,
      vocabulary_cache_id: vocabularyCacheId,
      surface: quickPreview.surface || null,
      reading: quickPreview.reading || null,
      meaning: selectedMeaning || null,
      meaning_choices: quickPreview.meanings,
      meaning_choice_index: quickPreview.isCustomMeaning
        ? null
        : quickPreview.selectedMeaningIndex,
      page_number: quickPreview.page ? Number(quickPreview.page) : null,
      chapter_number: quickPreview.chapterNumber
        ? Number(quickPreview.chapterNumber)
        : null,
      chapter_name: quickPreview.chapterName || null,
      hide_kanji_in_reading_support: hideKanjiInReadingSupport,
    };

    const { data, error } = await supabase
      .from("user_book_words")
      .insert(payload)
      .select("id, surface, reading, meaning, page_number, chapter_number, chapter_name, vocabulary_cache_id")
      .single();

    if (error) {
      console.error("Error saving quick word:", error);
      alert(`Could not save word.\n${error.message}`);
      return;
    }

    setQuickSessionWords((prev) => [
      {
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
      },
      ...prev,
    ]);

    setDefaultVocabPage(quickPreview.page);
    setDefaultChapterNumber(quickPreview.chapterNumber);
    setDefaultChapterName(quickPreview.chapterName);

    setQuickWord("");
    setQuickPreview(null);
    setHideKanjiInReadingSupport(false);

    await loadUniqueLookupCount(row.id);
    quickWordInputRef.current?.focus();
  }

  function StatBox({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="rounded-xl border bg-white p-3 text-center">
        <div className="text-xs text-stone-500">{label}</div>
        <div className="mt-1 font-medium text-stone-900">{value}</div>
      </div>
    );
  }

  function startEditingQuickSessionWord(item: {
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  }) {
    setEditingQuickSessionId(item.id);
    setEditingQuickSessionWord({ ...item });
  }

  function cancelEditingQuickSessionWord() {
    setEditingQuickSessionId(null);
    setEditingQuickSessionWord(null);
  }

  async function saveEditedQuickSessionWord() {
    if (!editingQuickSessionWord) return;

    const payload = {
      surface: editingQuickSessionWord.surface || null,
      reading: editingQuickSessionWord.reading || null,
      meaning: editingQuickSessionWord.meaning || null,
      page_number: editingQuickSessionWord.page
        ? Number(editingQuickSessionWord.page)
        : null,
      chapter_number: editingQuickSessionWord.chapterNumber
        ? Number(editingQuickSessionWord.chapterNumber)
        : null,
      chapter_name: editingQuickSessionWord.chapterName || null,
      is_manual_override: true,
      vocabulary_cache_id: null,
    };

    const { error } = await supabase
      .from("user_book_words")
      .update(payload)
      .eq("id", editingQuickSessionWord.id);

    if (error) {
      console.error("Error updating session word:", error);
      alert(`Could not update word.\n${error.message}`);
      return;
    }

    setQuickSessionWords((prev) =>
      prev.map((item) =>
        item.id === editingQuickSessionWord.id
          ? {
            ...editingQuickSessionWord,
            is_manual_override: true,
            vocabulary_cache_id: null,
          }
          : item
      )
    );

    cancelEditingQuickSessionWord();

    if (row?.id) {
      await loadUniqueLookupCount(row.id);
    }
  }

  const curiositySessions = useMemo(() => {
    return realReadingSessions.filter((s: any) => s.session_mode === "curiosity");
  }, [realReadingSessions]);

  const fluidSessions = useMemo(() => {
    return realReadingSessions.filter((s: any) => s.session_mode === "fluid");
  }, [realReadingSessions]);

  const curiosityMinutes = useMemo(() => {
    return curiositySessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [curiositySessions]);

  const fluidMinutes = useMemo(() => {
    return fluidSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [fluidSessions]);

  const curiosityPages = useMemo(() => {
    return curiositySessions.reduce((sum, s) => sum + (s.end_page - s.start_page + 1), 0);
  }, [curiositySessions]);

  const fluidPages = useMemo(() => {
    return fluidSessions.reduce((sum, s) => sum + (s.end_page - s.start_page + 1), 0);
  }, [fluidSessions]);

  const curiosityMinPerPage = useMemo(() => {
    if (!curiosityPages) return null;
    return curiosityMinutes / curiosityPages;
  }, [curiosityMinutes, curiosityPages]);

  const fluidMinPerPage = useMemo(() => {
    if (!fluidPages) return null;
    return fluidMinutes / fluidPages;
  }, [fluidMinutes, fluidPages]);

  if (loading) {
    return (
      <main className="p-6">
        <div className="text-sm text-gray-600">Loading book info…</div>
      </main>
    );
  }

  if (!row || !book) {
    return (
      <main className="p-6">
        <div className="text-2xl font-semibold">Book not found</div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </main>
    );
  }

  const currentlyReadingBooks = [...bookOptions]
    .filter((b) => b.started_at && !b.finished_at && !b.dnf_at)
    .sort((a, b) => a.title.localeCompare(b.title));

  const otherBooks = [...bookOptions]
    .filter((b) => !(b.started_at && !b.finished_at && !b.dnf_at))
    .sort((a, b) => a.title.localeCompare(b.title));

  const relatedLinksArr = Array.isArray(book.related_links) ? book.related_links : [];

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="p-5 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
              <div className="w-[140px] shrink-0 md:w-[150px]">
                {(isEditingThisTab ? coverUrl : book.cover_url) ? (
                  <img
                    src={isEditingThisTab ? coverUrl : (book.cover_url ?? "")}
                    alt={`${book.title} cover`}
                    className="w-full rounded-2xl border border-stone-200 object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-sm text-stone-400">
                    No cover
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="space-y-3">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
                      {book.title}
                    </h1>

                    {book.title_reading ? (
                      <div className="mt-1 text-lg text-stone-500 md:text-xl">
                        {book.title_reading}
                      </div>
                    ) : null}
                  </div>

                  {book.author && (
                    <div>
                      <div className="text-xl font-semibold text-stone-900 md:text-2xl">
                        {book.author}
                      </div>

                      {book.author_reading ? (
                        <div className="mt-1 text-base text-stone-500 md:text-lg">
                          {book.author_reading}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {book.translator && (
                    <div>
                      <div className="text-base font-medium text-stone-700 md:text-lg">
                        Translated by {book.translator}
                      </div>

                      {book.translator_reading ? (
                        <div className="mt-1 text-sm text-stone-500 md:text-base">
                          {book.translator_reading}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="mt-4 max-w-sm">
                  <div className="mb-1 text-xs uppercase tracking-wide text-stone-500">
                    Switch Book
                  </div>

                  <select
                    value={userBookId ?? ""}
                    onChange={(e) => {
                      const newId = e.target.value;
                      if (!newId) return;

                      if (newId === "all-book-hubs") {
                        router.push("/books");
                        return;
                      }

                      if (newId === userBookId) return;
                      router.push(`/books/${newId}`);
                    }}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
                  >
                    <option value="all-book-hubs">All Book Hubs</option>

                    {currentlyReadingBooks.length > 0 && (
                      <optgroup label="Currently Reading">
                        {currentlyReadingBooks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {otherBooks.length > 0 && (
                      <optgroup label="All Books">
                        {otherBooks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="mb-2 text-sm text-stone-700">
                  <div className="font-medium">Progress</div>
                  <div className="mt-1 text-stone-500">
                    {finished
                      ? `${uniqueLookupCount != null ? uniqueLookupCount : 0} word${uniqueLookupCount === 1 ? "" : "s"} saved · 100%`
                      : readingSessions.length > 0 && progressPercent != null && furthestPage != null
                        ? `${uniqueLookupCount != null ? uniqueLookupCount : 0} word${uniqueLookupCount === 1 ? "" : "s"} saved · ${progressPercent}% · On page ${furthestPage}`
                        : started
                          ? "In progress"
                          : "Not started"}
                  </div>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-stone-700 transition-all"
                    style={{
                      width:
                        progressPercent != null
                          ? `${progressPercent}%`
                          : finished
                            ? "100%"
                            : started
                              ? "8%"
                              : "0%",
                    }}
                  />
                </div>
              </div>

              <p className="mt-2 mb-4 text-xs text-stone-500">
                Last read: {lastReadDate ?? "—"}
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Days Read</div>
                  <div className="mt-1 font-medium">{daysRead != null ? daysRead : "—"}</div>
                  <div className="mt-1 text-[10px] text-stone-400">
                    Logged dates only
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Pages Read</div>
                  <div className="mt-1 font-medium">{totalPagesRead || "—"}</div>
                  <div className="mt-1 text-[10px] text-stone-400">
                    Logged sessions only
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Avg Pages/Session</div>
                  <div className="mt-1 font-medium">
                    {realReadingSessions.length > 0
                      ? (totalPagesRead / realReadingSessions.length).toFixed(1)
                      : "—"}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Total Time Read</div>
                  <div className="mt-1 font-medium">{formatMinutes(totalTimedMinutes)}</div>
                </div>

                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Curiosity Time</div>
                  <div className="mt-1 font-medium">{formatMinutes(curiosityMinutes)}</div>
                </div>

                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Curiosity Min/Page</div>
                  <div className="mt-1 font-medium">
                    {curiosityMinPerPage != null ? curiosityMinPerPage.toFixed(2) : "—"}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Fluid Time</div>
                  <div className="mt-1 font-medium">{formatMinutes(fluidMinutes)}</div>
                </div>

                <div className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-xs text-stone-500">Fluid Min/Page</div>
                  <div className="mt-1 font-medium">
                    {fluidMinPerPage != null ? fluidMinPerPage.toFixed(2) : "—"}
                  </div>
                </div>
              </div>

              <div className="mb-3 text-center">
                <h2 className="text-base font-semibold text-stone-900 sm:text-lg">
                  What do you want to do with your book today?
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Choose how you want to read, review, or study.
                </p>
              </div>

              {error ? (
                <div className="border-t border-stone-200 px-5 py-3 text-sm text-red-600 md:px-8">
                  {error}
                </div>
              ) : null}

              <div className="pb-2">
                <div className="mt-6 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmLeaveIfTimerActive()) return;
                      router.push(`/vocab/single-add?userBookId=${row.id}`);
                    }}
                    className="rounded-xl border border-stone-900 bg-rose-50 p-3 text-center transition hover:bg-rose-100"
                  >
                    <div className="font-medium text-stone-900">Curiosity Reading</div>
                    <div className="mt-2 text-xs leading-5 text-stone-700">
                      Read while saving vocab and logging a slower, mindful session.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmLeaveIfTimerActive()) return;
                      router.push(`/books/${row.id}/study`);
                    }}
                    className="rounded-xl border border-stone-900 bg-amber-50 p-3 text-center transition hover:bg-amber-100"
                  >
                    <div className="font-medium text-stone-900">Study Flashcards</div>
                    <div className="mt-2 text-xs leading-5 text-stone-700">
                      Review the words you saved from this book.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmLeaveIfTimerActive()) return;
                      router.push(`/books/${row.id}/readalong`);
                    }}
                    className="rounded-xl border border-stone-900 bg-emerald-50 p-3 text-center transition hover:bg-emerald-100"
                  >
                    <div className="font-medium text-stone-900">Fluid Reading</div>
                    <div className="mt-2 text-xs leading-5 text-stone-700">
                      Read without lookups, use saved-word support, and log a quicker session.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmLeaveIfTimerActive()) return;
                      router.push(`/books/${row.id}/weekly-readings`);
                    }}
                    className="rounded-xl border border-stone-900 bg-blue-50 p-3 text-center transition hover:bg-blue-100"
                  >
                    <div className="font-medium text-stone-900">Kanji Readings</div>
                    <div className="mt-2 text-xs leading-5 text-stone-700">
                      Practice onyomi and kunyomi from your saved vocabulary.
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <div className="mb-4 w-full border-b border-stone-300 px-2">
                  <div className="flex flex-wrap items-end gap-3">
                    {isTeacher && (
                      <FilingTab
                        active={activeTab === "teacher"}
                        onClick={() => setActiveTab("teacher")}
                      >
                        Teacher
                      </FilingTab>
                    )}

                    <FilingTab
                      active={activeTab === "study"}
                      onClick={() => setActiveTab("study")}
                    >
                      Vocab
                    </FilingTab>

                    <FilingTab
                      active={activeTab === "reading"}
                      onClick={() => setActiveTab("reading")}
                    >
                      Reading
                    </FilingTab>

                    <FilingTab
                      active={activeTab === "story"}
                      onClick={() => setActiveTab("story")}
                    >
                      Story
                    </FilingTab>

                    <FilingTab
                      active={activeTab === "rating"}
                      onClick={() => setActiveTab("rating")}
                    >
                      Ratings
                    </FilingTab>

                    <FilingTab
                      active={activeTab === "bookInfo"}
                      onClick={() => setActiveTab("bookInfo")}
                    >
                      Book Info
                    </FilingTab>
                  </div>
                </div>
              </div>

              {activeTab === "bookInfo" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 px-4 md:px-6">
                    <div className="text-base font-semibold text-stone-900">Book Info</div>

                    {!isEditingThisTab ? (
                      <button
                        type="button"
                        onClick={() => setEditingTab("bookInfo")}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdits}
                          className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAll}
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>

                  <BookInfoTab
                    book={book}
                    isEditing={isEditingThisTab}
                    genre={genre}
                    setGenre={setGenre}
                    bookType={bookType}
                    setBookType={setBookType}
                    triggerWarnings={triggerWarnings}
                    setTriggerWarnings={setTriggerWarnings}
                    publishedDate={publishedDate}
                    setPublishedDate={setPublishedDate}
                    pageCount={pageCount}
                    setPageCount={setPageCount}
                    isbn={isbn}
                    setIsbn={setIsbn}
                    isbn13={isbn13}
                    setIsbn13={setIsbn13}
                    authorName={authorName}
                    setAuthorName={setAuthorName}
                    translatorName={translatorName}
                    setTranslatorName={setTranslatorName}
                    illustratorName={illustratorName}
                    setIllustratorName={setIllustratorName}
                    publisherName={publisherName}
                    setPublisherName={setPublisherName}
                    publisherReading={publisherReading}
                    setPublisherReading={setPublisherReading}
                    coverUrl={coverUrl}
                    setCoverUrl={setCoverUrl}
                    authorImg={authorImg}
                    setAuthorImg={setAuthorImg}
                    translatorImg={translatorImg}
                    setTranslatorImg={setTranslatorImg}
                    illustratorImg={illustratorImg}
                    setIllustratorImg={setIllustratorImg}
                    publisherImg={publisherImg}
                    setPublisherImg={setPublisherImg}
                    authorReading={authorReading}
                    setAuthorReading={setAuthorReading}
                    translatorReading={translatorReading}
                    setTranslatorReading={setTranslatorReading}
                    illustratorReading={illustratorReading}
                    setIllustratorReading={setIllustratorReading}
                    relatedLinksArr={relatedLinksArr}
                    genreLabel={genreLabel}
                    bookTypeLabel={bookTypeLabel}
                    displayLinkLabel={displayLinkLabel}
                    displayLinkUrl={displayLinkUrl}
                    GENRE_OPTIONS={GENRE_OPTIONS}
                    BOOK_TYPE_OPTIONS={BOOK_TYPE_OPTIONS}
                    Detail={Detail}
                    PersonRow={PersonRow}
                  />
                </div>
              )}

              {activeTab === "study" && (
                <div className="space-y-4">
                  <div className="px-4 md:px-6">
                    <div className="text-base font-semibold text-stone-900">Vocab</div>
                  </div>

                  <VocabTab
                    row={row}
                    vocabTab={vocabTab}
                    setVocabTab={setVocabTab}
                  />
                </div>
              )}

              {activeTab === "teacher" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 px-4 md:px-6">
                    <div className="text-base font-semibold text-stone-900">Teacher</div>

                    {!isEditingThisTab ? (
                      <button
                        type="button"
                        onClick={() => setEditingTab("teacher")}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdits}
                          className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAll}
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>

                  <TeacherTab
                    row={row}
                    book={book}
                    userId={userId}
                    isEditingThisTab={isEditingThisTab}
                    editingTab={editingTab}
                    setEditingTab={setEditingTab}
                    notes={notes}
                    setNotes={setNotes}
                    saveNotes={saveNotes}
                    recommendedLevel={recommendedLevel}
                    setRecommendedLevel={setRecommendedLevel}
                    levelStars={levelStars}
                    kanjiMapLoading={kanjiMapLoading}
                    kanjiMapError={kanjiMapError}
                    kanjiMapQueue={kanjiMapQueue}
                    openKanjiWordId={openKanjiWordId}
                    editingKanjiRows={editingKanjiRows}
                    savingKanjiWordId={savingKanjiWordId}
                    handleWorkOnKanjiWord={handleWorkOnKanjiWord}
                    updateKanjiMapRow={updateKanjiMapRow}
                    saveKanjiWord={saveKanjiWord}
                    setOpenKanjiWordId={setOpenKanjiWordId}
                    hiraToKata={hiraToKata}
                    removeWordFromKanjiEnrichment={removeWordFromKanjiEnrichment}
                  />
                </div>
              )}

              {activeTab === "reading" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 px-4 md:px-6">
                    <div className="text-base font-semibold text-stone-900">Reading</div>

                    {!isEditingThisTab ? (
                      <button
                        type="button"
                        onClick={() => setEditingTab("reading")}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdits}
                          className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAll}
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>

                  <ReadingTab
                    row={row}
                    book={book}
                    isEditingThisTab={isEditingThisTab}
                    markStartedToday={markStartedToday}
                    markFinishedToday={markFinishedToday}
                    markDnfToday={markDnfToday}
                    formatType={formatType}
                    setFormatType={setFormatType}
                    progressMode={progressMode}
                    setProgressMode={setProgressMode}
                    showPageNumbers={showPageNumbers}
                    setShowPageNumbers={setShowPageNumbers}
                    startedAt={startedAt}
                    setStartedAt={setStartedAt}
                    finishedAt={finishedAt}
                    setFinishedAt={setFinishedAt}
                    dnfAt={dnfAt}
                    setDnfAt={setDnfAt}
                    started={started}
                    finished={finished}
                    sessionDate={sessionDate}
                    setSessionDate={setSessionDate}
                    sessionMinutesRead={sessionMinutesRead}
                    setSessionMinutesRead={setSessionMinutesRead}
                    sessionStartPage={sessionStartPage}
                    setSessionStartPage={setSessionStartPage}
                    sessionEndPage={sessionEndPage}
                    setSessionEndPage={setSessionEndPage}
                    saveReadingSession={saveReadingSession}
                    deleteReadingSession={deleteReadingSession}
                    readingSessions={readingSessions}
                    visibleReadingSessions={visibleReadingSessions}
                    showAllSessions={showAllSessions}
                    renderSessionToggle={renderSessionToggle}
                    canFillBeginningPages={canFillBeginningPages}
                    canFillEndingPages={canFillEndingPages}
                    fillBeginningPages={fillBeginningPages}
                    fillEndingPages={fillEndingPages}
                    earliestStartPage={earliestStartPage}
                    furthestPage={furthestPage}
                    formatTypeLabel={formatTypeLabel}
                    progressModeLabel={progressModeLabel}
                    DateField={DateField}
                  />
                </div>
              )}

              {activeTab === "story" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 px-4 md:px-6">
                    <div className="text-base font-semibold text-stone-900">Story</div>

                    {!isEditingThisTab ? (
                      <button
                        type="button"
                        onClick={() => setEditingTab("story")}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdits}
                          className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAll}
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>

                  <StoryTab
                    storyTab={storyTab}
                    setStoryTab={setStoryTab}

                    characters={characters}
                    visibleCharacters={visibleCharacters}
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
                    showChapterSummaries={showChapterSummaries}
                    setShowChapterSummaries={setShowChapterSummaries}
                    chapterReverseOrder={chapterReverseOrder}
                    setChapterReverseOrder={setChapterReverseOrder}
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
                    showSettingItems={showSettingItems}
                    setShowSettingItems={setShowSettingItems}
                    settingReverseOrder={settingReverseOrder}
                    setSettingReverseOrder={setSettingReverseOrder}
                    editingSettingIds={editingSettingIds}
                    savingSettingIds={savingSettingIds}
                    savedSettingIds={savedSettingIds}
                    addSettingItem={addSettingItem}
                    updateSettingItem={updateSettingItem}
                    startEditingSettingItem={startEditingSettingItem}
                    stopEditingSettingItem={stopEditingSettingItem}
                    saveSettingItem={saveSettingItem}
                    deleteSettingItem={deleteSettingItem}

                    culturalItems={culturalItems}
                    visibleCulturalItems={visibleCulturalItems}
                    showCulturalItems={showCulturalItems}
                    setShowCulturalItems={setShowCulturalItems}
                    culturalReverseOrder={culturalReverseOrder}
                    setCulturalReverseOrder={setCulturalReverseOrder}
                    editingCulturalIds={editingCulturalIds}
                    savingCulturalIds={savingCulturalIds}
                    savedCulturalIds={savedCulturalIds}
                    addCulturalItem={addCulturalItem}
                    updateCulturalItem={updateCulturalItem}
                    startEditingCulturalItem={startEditingCulturalItem}
                    stopEditingCulturalItem={stopEditingCulturalItem}
                    saveCulturalItem={saveCulturalItem}
                    deleteCulturalItem={deleteCulturalItem}
                  />
                </div>
              )}

              {activeTab === "rating" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 px-4 md:px-6">
                    <div className="text-base font-semibold text-stone-900">Rating</div>

                    {!isEditingThisTab ? (
                      <button
                        type="button"
                        onClick={() => setEditingTab("rating")}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdits}
                          className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAll}
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>

                  <RatingTab
                    row={row}
                    isEditingThisTab={isEditingThisTab}
                    myReview={myReview}
                    setMyReview={setMyReview}
                    ratingOverall={ratingOverall}
                    setRatingOverall={setRatingOverall}
                    ratingRecommend={ratingRecommend}
                    setRatingRecommend={setRatingRecommend}
                    ratingDifficulty={ratingDifficulty}
                    setRatingDifficulty={setRatingDifficulty}
                    readerLevel={readerLevel}
                    setReaderLevel={setReaderLevel}
                    LEVEL_OPTIONS={LEVEL_OPTIONS}
                    StarRatingField={StarRatingField}
                    DifficultyField={DifficultyField}
                  />
                </div>
              )}
            </div>

            {showWordExplorer && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => setShowWordExplorer(false)}
              >
                <div
                  className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-stone-900">Word Explorer</h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Search and explore a word without leaving the page.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowWordExplorer(false)}
                      className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={wordExplorerQuery}
                        onChange={(e) => setWordExplorerQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            searchWordExplorer();
                          }
                        }}
                        placeholder="Search a word..."
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                      />

                      <button
                        type="button"
                        onClick={searchWordExplorer}
                        disabled={wordExplorerLoading || !wordExplorerQuery.trim()}
                        className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                      >
                        {wordExplorerLoading ? "Searching..." : "Search"}
                      </button>
                    </div>

                    {wordExplorerError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {wordExplorerError}
                      </div>
                    ) : null}

                    {wordExplorerResults.length > 0 ? (
                      <div className="space-y-3">
                        {wordExplorerResults.map((item, i) => {
                          const japanese = item?.japanese?.[0];
                          const senses = item?.senses ?? [];

                          return (
                            <div key={i} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                              <div className="text-lg font-semibold text-stone-900">
                                {japanese?.word || item?.slug || "—"}
                              </div>

                              {japanese?.reading ? (
                                <div className="mt-1 text-sm text-stone-500">{japanese.reading}</div>
                              ) : null}

                              <div className="mt-3 space-y-2">
                                {senses.slice(0, 3).map((sense: any, idx: number) => (
                                  <div key={idx} className="text-sm text-stone-700">
                                    <span className="font-medium text-stone-500">{idx + 1}.</span>{" "}
                                    {(sense?.english_definitions ?? []).join("; ") || "—"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : !wordExplorerLoading && !wordExplorerError && wordExplorerQuery.trim() ? (
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
                        No results yet.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
                        Type a word to explore.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div >
    </main >
  );
}

function FilingTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative -mb-px rounded-t-2xl border px-6 py-3 text-base font-medium transition",
        active
          ? "z-10 border-stone-300 border-b-white bg-white text-stone-900 shadow-sm"
          : "border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Detail({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
  placeholder,
}: {
  label: string;
  value: any;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
  placeholder?: string;
}) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);

  return (
    <div className="rounded border bg-white p-3">
      <div className="text-stone-600">{label}</div>
      {!editing ? (
        <div className="font-medium">{display}</div>
      ) : (
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
}: {
  label: string;
  value: Date | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
}) {
  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{label}</div>
      {!editing ? (
        <div className="mt-1 font-medium">{value ? formatYmd(value) : "—"}</div>
      ) : (
        <input
          type="date"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      )}
    </div>
  );
}

function StarRatingField({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
  descriptions,
}: {
  label: string;
  value: number | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
  descriptions: Record<number, string>;
}) {
  const selected = inputValue ? Number(inputValue) : null;

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{label}</div>

      {!editing ? (
        <>
          <div className="mt-1 font-medium">{value ? `${value}/5` : "—"}</div>
          <div className="text-amber-600">{stars5(value)}</div>
          <div className="mt-1 text-xs text-stone-500">
            {value ? descriptions[value] : "—"}
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
                onClick={() => setInputValue(String(n))}
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
        </div>
      )}
    </div>
  );
}

function DifficultyField({
  value,
  editing,
  inputValue,
  setInputValue,
}: {
  value: number | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
}) {
  const selected = inputValue ? Number(inputValue) : null;
  const label = DIFFICULTY_OPTIONS.find((o) => o.value === value)?.label ?? "";

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">Difficulty (for me)</div>

      {!editing ? (
        <>
          <div className="mt-1 font-medium">{value ? `${value}/5` : "—"}</div>
          <div className="text-amber-600">{stars5(value)}</div>
          <div className="mt-1 text-xs text-stone-500">{label}</div>
        </>
      ) : (
        <div className="mt-2 space-y-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInputValue(String(opt.value))}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${isSelected
                  ? "border-stone-900 bg-stone-100"
                  : "border-stone-200 hover:bg-stone-50"
                  }`}
              >
                <div className="text-amber-600">{stars5(opt.value)}</div>
                <div className="text-xs text-stone-600">{opt.label}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonRow({
  label,
  name,
  reading,
  img,
  editing,
  nameValue,
  setNameValue,
  imgValue,
  setImgValue,
  readingValue,
  setReadingValue,
}: {
  label: string;
  name: string | null | undefined;
  reading: string | null | undefined;
  img: string | null | undefined;
  editing: boolean;
  nameValue: string;
  setNameValue: (v: string) => void;
  imgValue: string;
  setImgValue: (v: string) => void;
  readingValue: string;
  setReadingValue: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-stone-100">
        {img ? (
          <img src={img} alt={name || label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!editing ? (
          <>
            <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-medium text-stone-900">{name || "—"}</div>
            <div className="text-sm text-stone-500">{reading || "—"}</div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder={`${label} name`}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <input
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              placeholder={`${label} reading`}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <input
              value={imgValue}
              onChange={(e) => setImgValue(e.target.value)}
              placeholder={`${label} image URL`}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}