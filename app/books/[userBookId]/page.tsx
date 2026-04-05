// Book Hub
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Book = {
  id: string;
  title: string;
  title_reading: string | null;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  cover_url: string | null;

  genre: string | null;
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
  created_at: string;
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

const LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"] as const;

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
  const [triggerWarnings, setTriggerWarnings] = useState<string>("");
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

  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacters, setShowCharacters] = useState(false);
  const [editingCharacterIds, setEditingCharacterIds] = useState<string[]>([]);
  const [savingCharacterIds, setSavingCharacterIds] = useState<string[]>([]);
  const [savedCharacterIds, setSavedCharacterIds] = useState<string[]>([]);


  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSessionDate(today);
  }, []);
  const daysRead = useMemo(() => {
    if (!readingSessions.length) return null;
    return new Set(readingSessions.map((s) => s.read_on)).size;
  }, [readingSessions]);

  const [userId, setUserId] = useState<string | null>(null);

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
  const quickWordInputRef = useRef<HTMLInputElement>(null);

  const kanjiReadingMemoryRef = useRef<
    Record<
      string,
      {
        reading_type: "on" | "kun" | "other" | null;
        base: string | null;
        realized: string | null;
      }
    >
  >({});

  const [quickPreview, setQuickPreview] = useState<{
    surface: string;
    reading: string;
    meanings: string[];
    selectedMeaningIndex: number;
    meaning: string;
    isCustomMeaning: boolean;
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

  const isEditingThisTab = editingTab === activeTab;
  const canEditThisTab =
    activeTab === "bookInfo"
      ? canEditBookInfo
      : true; // members can edit everything else

  const started = useMemo(() => safeDate(row?.started_at ?? null), [row?.started_at]);
  const finished = useMemo(() => safeDate(row?.finished_at ?? null), [row?.finished_at]);
  const book = row?.books ?? null;

  const totalPagesRead = useMemo(
    () => readingSessions.reduce((sum, s) => sum + (s.end_page - s.start_page + 1), 0),
    [readingSessions]
  );

  const timedSessions = useMemo(
    () => readingSessions.filter((s) => s.minutes_read != null),
    [readingSessions]
  );

  const totalTimedMinutes = useMemo(
    () => timedSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0),
    [timedSessions]
  );

  const totalTimedPages = useMemo(
    () => timedSessions.reduce((sum, s) => sum + (s.end_page - s.start_page + 1), 0),
    [timedSessions]
  );

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
    if (readingSessions.length === 0) return null;
    return readingSessions[0]?.read_on ?? null;
  }, [readingSessions]);

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
    setEditingCharacterIds((prev) => [...prev, newId]);
  }

  function updateCharacter(id: string, field: keyof Character, value: string) {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
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

    await loadKanjiMapQueue();
    setOpenKanjiWordId(null);
    setSavingKanjiWordId(null);
  }

  async function loadReadingSessions(userBookIdValue: string) {
    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("id, user_book_id, read_on, start_page, end_page, minutes_read, created_at")
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
      setEditingCharacterIds((prev) =>
        prev.map((x) => (x === oldId ? saved.id : x))
      );

      stopEditingCharacter(saved.id);
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

    stopEditingCharacter(saved.id);
    markCharacterSaved(saved.id);
  }

  async function deleteCharacter(id: string) {
    if (id.startsWith("new-character-")) {
      setCharacters((prev) => prev.filter((x) => x.id !== id));
      setEditingCharacterIds((prev) => prev.filter((x) => x !== id));
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
    setEditingCharacterIds((prev) => prev.filter((x) => x !== id));
    setSavingCharacterIds((prev) => prev.filter((x) => x !== id));
    setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
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

  async function loadKanjiMapQueue() {
    setKanjiMapLoading(true);
    setKanjiMapError(null);

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
      const memory = kanjiReadingMemoryRef.current[r.kanji];

      if (!memory) return r;

      return {
        ...r,
        reading_type: r.reading_type || memory.reading_type,
        base_reading: r.base_reading || memory.base,
        realized_reading: r.realized_reading || memory.realized,
      };
    });

    setEditingKanjiRows((prev) => ({
      ...prev,
      [word.id]: enrichedRows,
    }));

    setOpenKanjiWordId(word.id);
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

        const memory = kanjiReadingMemoryRef.current[row.kanji];

        let updatedRow: KanjiMapRow = row;

        if (field === "reading_type") {
          updatedRow = {
            ...row,
            reading_type: nextValue as "on" | "kun" | "other" | null,
            base_reading:
              row.base_reading || memory?.base || null,
            realized_reading:
              row.realized_reading || memory?.realized || null,
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

        kanjiReadingMemoryRef.current[row.kanji] = {
          reading_type: updatedRow.reading_type,
          base: updatedRow.base_reading,
          realized: updatedRow.realized_reading,
        };

        return updatedRow;
      }),
    }));
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

    if (!existingStartedAt || sessionDate < existingStartedAt) {
      const { error: startErr } = await supabase
        .from("user_books")
        .update({ started_at: sessionDate })
        .eq("id", row.id);

      if (startErr) {
        console.error("Error setting started_at from reading session:", startErr);
      } else {
        setStartedAt(sessionDate);
        setRow((prev) =>
          prev
            ? {
              ...prev,
              started_at: sessionDate,
            }
            : prev
        );
      }
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
        books (
          id,
          title,
          title_reading,
          author,
          translator,
          illustrator,
          cover_url,
          genre,
          trigger_warnings,
          page_count,
          isbn,
          isbn13,
          publisher,
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

    const b = r.books as Book | null;
    setGenre(b?.genre ?? "");
    setTriggerWarnings(b?.trigger_warnings ?? "");
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
    await loadKanjiMapQueue();

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId]);

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

    const b = row.books;
    setGenre(b?.genre ?? "");
    setTriggerWarnings(b?.trigger_warnings ?? "");
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

    const pc = pageCount.trim() ? Number(pageCount.trim()) : null;
    const page_count = Number.isFinite(pc as any) ? (pc as number) : null;

    const ro = ratingOverall.trim() ? clampRating5(Number(ratingOverall.trim())) : null;
    const rr = ratingRecommend.trim() ? clampRating5(Number(ratingRecommend.trim())) : null;
    const rd = ratingDifficulty.trim() ? clampRating5(Number(ratingDifficulty.trim())) : null;

    const related_links = linksText.trim() ? parseLinks(linksText) : null;

    const userBooksUpdate = supabase
      .from("user_books")
      .update({
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
      })
      .eq("id", row.id);

    const booksUpdate = supabase
      .from("books")
      .update({
        author: authorName || null,
        translator: translatorName || null,
        illustrator: illustratorName || null,
        publisher: publisherName || null,
        genre: genre || null,
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
        reading,
        meanings: meanings.length ? meanings : [""],
        selectedMeaningIndex: 0,
        meaning: meanings.length ? meanings[0] : "",
        isCustomMeaning: false,
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

  async function saveQuickWord() {
    if (!row?.id || !quickPreview) return;

    const selectedMeaning = quickPreview.meaning ?? "";

    let vocabularyCacheId: number | null = null;

    const normalizedSurface = quickPreview.surface?.trim() ?? "";
    const normalizedReading = quickPreview.reading?.trim() ?? "";

    if (normalizedSurface) {
      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", normalizedSurface)
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
            surface: normalizedSurface,
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

    await loadUniqueLookupCount(row.id);
    quickWordInputRef.current?.focus();
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
          ? { ...editingQuickSessionWord }
          : item
      )
    );

    cancelEditingQuickSessionWord();

    if (row?.id) {
      await loadUniqueLookupCount(row.id);
    }
  }

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

  const relatedLinksArr = Array.isArray(book.related_links) ? book.related_links : [];

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-5 md:flex-row md:items-start md:gap-8 md:p-8">
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

              {isEditingThisTab && activeTab === "bookInfo" && (
                <input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Cover URL"
                  className="mt-3 w-full rounded border px-3 py-2 text-sm"
                />
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

              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-2 text-sm text-stone-700">
                    <div className="font-medium">Progress</div>
                    <div className="mt-1 text-stone-500">
                      {finished
                        ? "100%"
                        : readingSessions.length > 0 && progressPercent != null && furthestPage != null
                          ? `${progressPercent}% · page ${furthestPage}`
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

                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-xl border bg-white p-3 text-center">
                    <div className="text-xs text-stone-500">Pages Read</div>
                    <div className="mt-1 font-medium">{totalPagesRead || "—"}</div>
                  </div>

                  <div className="rounded-xl border bg-white p-3 text-center">
                    <div className="text-xs text-stone-500">Days Read</div>
                    <div className="mt-1 font-medium">{daysRead != null ? daysRead : "—"}</div>
                  </div>

                  <div className="rounded-xl border bg-white p-3 text-center">
                    <div className="text-xs text-stone-500">Words Looked Up</div>
                    <div className="mt-1 font-medium">
                      {uniqueLookupCount != null ? uniqueLookupCount : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white p-3 text-center">
                    <div className="text-xs text-stone-500">Time Read</div>
                    <div className="mt-1 font-medium">{formatMinutes(totalTimedMinutes)}</div>
                  </div>

                  <div className="rounded-xl border bg-white p-3 text-center">
                    <div className="text-xs text-stone-500">Avg Min/Page</div>
                    <div className="mt-1 font-medium">
                      {averageMinutesPerPage != null ? averageMinutesPerPage.toFixed(2) : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white p-3 text-center">
                    <div className="text-xs text-stone-500">Avg Pages/Session</div>
                    <div className="mt-1 font-medium">
                      {readingSessions.length > 0 ? (totalPagesRead / readingSessions.length).toFixed(1) : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-sm text-stone-500">
                  Time your reading session and log it more easily.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  {!isRunning && !isPaused ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSessionDate(new Date().toISOString().slice(0, 10));
                        setStartTime(Date.now());
                        setElapsed(0);
                        setIsRunning(true);
                        setIsPaused(false);
                      }}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-base font-medium text-white transition hover:bg-emerald-700"
                    >
                      Start Timer
                    </button>
                  ) : null}

                  {isRunning ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (startTime) {
                            setElapsed(Math.floor((Date.now() - startTime) / 1000));
                          }
                          setIsRunning(false);
                          setIsPaused(true);
                        }}
                        className="rounded-2xl bg-amber-500 px-5 py-3 text-base font-medium text-white transition hover:bg-amber-600"
                      >
                        Pause
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (startTime) {
                            setElapsed(Math.floor((Date.now() - startTime) / 1000));
                          }
                          setIsRunning(false);
                          setIsPaused(false);
                          setSessionStartPage(furthestPage != null ? String(furthestPage + 1) : "");
                          setShowTimedSessionForm(true);
                        }}
                        className="rounded-2xl bg-red-600 px-5 py-3 text-base font-medium text-white transition hover:bg-red-700"
                      >
                        Finish
                      </button>
                    </>
                  ) : null}

                  {isPaused ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setStartTime(Date.now() - elapsed * 1000);
                          setIsRunning(true);
                          setIsPaused(false);
                        }}
                        className="rounded-2xl bg-emerald-600 px-5 py-3 text-base font-medium text-white transition hover:bg-emerald-700"
                      >
                        Resume
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsPaused(false);
                          setSessionStartPage(furthestPage != null ? String(furthestPage + 1) : "");
                          setShowTimedSessionForm(true);
                        }}
                        className="rounded-2xl bg-red-600 px-5 py-3 text-base font-medium text-white transition hover:bg-red-700"
                      >
                        Finish
                      </button>
                    </>
                  ) : null}

                  <div className="flex items-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-base font-medium text-stone-700">
                    ⏱ {formatTimer(elapsed)}
                  </div>
                </div>
              </div>

              {showTimedSessionForm && !isRunning ? (
                <div className="mt-3 rounded-2xl border border-stone-300 bg-white p-4">
                  <div className="mb-3 text-sm font-medium text-stone-700">
                    Save this reading session
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 text-sm text-stone-600">Start page</div>
                      <input
                        type="number"
                        min={1}
                        value={sessionStartPage}
                        onChange={(e) => setSessionStartPage(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm text-stone-600">End page</div>
                      <input
                        type="number"
                        min={1}
                        value={sessionEndPage}
                        onChange={(e) => setSessionEndPage(e.target.value)}
                        placeholder="e.g. 52"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-stone-500">
                    Time: {formatTimer(elapsed)}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setSessionMinutesRead(String(Math.max(1, Math.round(elapsed / 60))));
                        await saveReadingSession();
                        setIsPaused(false);
                      }}
                      className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                    >
                      Save Timed Session
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowTimedSessionForm(false);
                        setElapsed(0);
                        setStartTime(null);
                        setIsPaused(false);
                      }}
                      className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {(isRunning || isPaused) ? (
                <p className="mt-2 text-xs text-amber-600">
                  Timer is active. If you leave the Book Hub or refresh the page, you may lose your session.
                </p>
              ) : null}

              {timerSaveMessage ? (
                <p className="mt-2 text-xs text-emerald-600">
                  {timerSaveMessage}
                </p>
              ) : null}

              <div className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmLeaveIfTimerActive()) return;
                    router.push(`/books/${row.id}/weekly-readings`);
                  }}
                  className="rounded-xl border border-stone-900 bg-blue-50 p-3 text-center transition hover:bg-blue-100"
                >
                  <div className="text-xs text-blue-700">Practice</div>
                  <div className="mt-1 font-medium text-stone-900">Kanji Readings</div>
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/books/${row.id}/readalong`)}
                  className="rounded-xl border border-stone-900 bg-emerald-50 p-3 text-center transition hover:bg-emerald-100"
                >
                  <div className="text-xs text-emerald-700">Read Along</div>
                  <div className="mt-1 font-medium text-stone-900">Book Support</div>
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/books/${row.id}/study`)}
                  className="rounded-xl border border-stone-900 bg-amber-50 p-3 text-center transition hover:bg-amber-100"
                >
                  <div className="text-xs text-amber-700">Study</div>
                  <div className="mt-1 font-medium text-stone-900">Review Words</div>
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="border-t border-stone-200 px-5 py-3 text-sm text-red-600 md:px-8">
              {error}
            </div>
          ) : null}

          <div className="mt-2 px-4 md:px-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="overflow-x-auto">
                <div className="flex w-max gap-2 border-b border-stone-300 px-2 whitespace-nowrap">
                  <div className="flex flex-wrap gap-2">
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

              {canEditThisTab && (
                !isEditingThisTab ? (
                  <button
                    onClick={() => setEditingTab(activeTab)}
                    className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTab(null)}
                      className="rounded-2xl bg-stone-200 px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveAll}
                      className="rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white"
                    >
                      Save
                    </button>
                  </div>
                )
              )}

            </div>
          </div>

          <div className="rounded-b-2xl rounded-tr-2xl border border-stone-300 bg-white p-5 shadow-sm">
            {activeTab === "bookInfo" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Book Info</div>

                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <Detail
                      label="Genre"
                      value={book.genre}
                      editing={isEditingThisTab}
                      inputValue={genre}
                      setInputValue={setGenre}
                      placeholder="e.g. novel, mystery, picture book..."
                    />
                    <Detail
                      label="Page Count"
                      value={book.page_count}
                      editing={isEditingThisTab}
                      inputValue={pageCount}
                      setInputValue={setPageCount}
                      placeholder="e.g. 352"
                    />
                    <Detail
                      label="ISBN"
                      value={book.isbn}
                      editing={isEditingThisTab}
                      inputValue={isbn}
                      setInputValue={setIsbn}
                      placeholder="ISBN"
                    />
                    <Detail
                      label="ISBN-13"
                      value={book.isbn13}
                      editing={isEditingThisTab}
                      inputValue={isbn13}
                      setInputValue={setIsbn13}
                      placeholder="ISBN-13"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium">Trigger Warnings</div>
                    {!isEditingThisTab ? (
                      <div className="mt-1 min-h-[40px] whitespace-pre-wrap text-sm text-stone-700">
                        {book.trigger_warnings?.trim() ? book.trigger_warnings : "—"}
                      </div>
                    ) : (
                      <textarea
                        value={triggerWarnings}
                        onChange={(e) => setTriggerWarnings(e.target.value)}
                        placeholder="Anything you want to flag"
                        className="mt-2 min-h-[90px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">People</div>

                  <div className="space-y-4">
                    <PersonRow
                      label="Author"
                      name={isEditingThisTab ? authorName : book.author}
                      reading={isEditingThisTab ? authorReading : book.author_reading}
                      img={isEditingThisTab ? authorImg : book.author_image_url}
                      editing={isEditingThisTab}
                      nameValue={authorName}
                      setNameValue={setAuthorName}
                      imgValue={authorImg}
                      setImgValue={setAuthorImg}
                      readingValue={authorReading}
                      setReadingValue={setAuthorReading}
                    />

                    {(book.translator || book.translator_image_url || isEditingThisTab) && (
                      <PersonRow
                        label="Translator"
                        name={isEditingThisTab ? translatorName : book.translator}
                        reading={isEditingThisTab ? translatorReading : book.translator_reading}
                        img={isEditingThisTab ? translatorImg : book.translator_image_url}
                        editing={isEditingThisTab}
                        nameValue={translatorName}
                        setNameValue={setTranslatorName}
                        imgValue={translatorImg}
                        setImgValue={setTranslatorImg}
                        readingValue={translatorReading}
                        setReadingValue={setTranslatorReading}
                      />
                    )}

                    {(book.illustrator || book.illustrator_image_url || isEditingThisTab) && (
                      <PersonRow
                        label="Illustrator"
                        name={isEditingThisTab ? illustratorName : book.illustrator}
                        reading={isEditingThisTab ? illustratorReading : book.illustrator_reading}
                        img={isEditingThisTab ? illustratorImg : book.illustrator_image_url}
                        editing={isEditingThisTab}
                        nameValue={illustratorName}
                        setNameValue={setIllustratorName}
                        imgValue={illustratorImg}
                        setImgValue={setIllustratorImg}
                        readingValue={illustratorReading}
                        setReadingValue={setIllustratorReading}
                      />
                    )}

                    {(book.publisher || book.publisher_image_url || isEditingThisTab) && (
                      <PersonRow
                        label="Publisher"
                        name={isEditingThisTab ? publisherName : book.publisher}
                        reading={isEditingThisTab ? publisherReading : book.publisher_reading}
                        img={isEditingThisTab ? publisherImg : book.publisher_image_url}
                        editing={isEditingThisTab}
                        nameValue={publisherName}
                        setNameValue={setPublisherName}
                        imgValue={publisherImg}
                        setImgValue={setPublisherImg}
                        readingValue={publisherReading}
                        setReadingValue={setPublisherReading}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Related Links</div>

                  {!isEditingThisTab ? (
                    relatedLinksArr.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {relatedLinksArr.map((l: any, idx: number) => {
                          const label = displayLinkLabel(l);
                          const url = displayLinkUrl(l);
                          return (
                            <li key={idx} className="flex items-center justify-between gap-3">
                              <span className="truncate">{label}</span>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-blue-600 hover:underline"
                                >
                                  Open
                                </a>
                              ) : (
                                <span className="text-stone-500">—</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-sm text-stone-500">—</div>
                    )
                  ) : (
                    <div>
                      <div className="mb-2 text-xs text-stone-500">
                        One per line. Optional format: <span className="font-mono">Label | URL</span>
                      </div>
                      <textarea
                        value={linksText}
                        onChange={(e) => setLinksText(e.target.value)}
                        placeholder={`Amazon | https://...\nPublisher | https://...\nhttps://...`}
                        className="min-h-[120px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "teacher" && isTeacher && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Teacher Tools</div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <button
                      onClick={() => router.push(`/books/${row.id}/weekly-readings/prepare`)}
                      className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                    >
                      📝 Prepare Readings
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!row?.id || !userId) return;

                        const { data: students } = await supabase
                          .from("teacher_students")
                          .select("student_id")
                          .eq("teacher_id", userId);

                        for (const s of students ?? []) {
                          await supabase.from("user_alerts").insert({
                            user_id: s.student_id,
                            user_book_id: row.id,
                            type: "kanji",
                            message: `Custom readings are ready to practice for ${book.title}`,
                          });
                        }
                      }}
                      className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                    >
                      🔔 Notify Custom Readings
                    </button>
                  </div>
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
                          <div
                            key={word.id}
                            className="rounded-xl border bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-stone-900">{word.surface}</div>
                                <div className="text-sm text-stone-500">
                                  {word.reading} · {word.jlpt ?? "—"}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleWorkOnKanjiWord(word)}
                                className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                              >
                                {hasRows ? "Work on this word" : "Prepare this word"}
                              </button>
                            </div>

                            {isOpen ? (
                              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                                <div className="mb-3">
                                  <div className="text-sm font-semibold text-stone-900">{word.surface}</div>
                                  <div className="text-sm text-stone-500">{word.reading}</div>
                                </div>

                                <div className="space-y-2">
                                  {editRows.map((row) => (
                                    <div
                                      key={row.id}
                                      className="grid grid-cols-1 gap-2 rounded-lg border bg-white p-3 md:grid-cols-[60px_120px_1fr_1fr]"
                                    >
                                      <div className="flex items-center text-lg font-medium text-stone-900">
                                        {row.kanji}
                                      </div>

                                      <select
                                        value={row.reading_type ?? ""}
                                        onChange={(e) =>
                                          updateKanjiMapRow(word.id, row.id, "reading_type", e.target.value)
                                        }
                                        className="rounded border px-2 py-2 text-sm"
                                      >
                                        <option value="">—</option>
                                        <option value="on">on</option>
                                        <option value="kun">kun</option>
                                        <option value="other">other</option>
                                      </select>

                                      <input
                                        value={row.base_reading ?? ""}
                                        onChange={(e) =>
                                          updateKanjiMapRow(word.id, row.id, "base_reading", e.target.value)
                                        }
                                        placeholder="Base reading"
                                        className="rounded border px-3 py-2 text-sm"
                                      />

                                      <input
                                        value={row.realized_reading ?? ""}
                                        onChange={(e) =>
                                          updateKanjiMapRow(word.id, row.id, "realized_reading", e.target.value)
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
                                    onClick={() => saveKanjiWord(word.id)}
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

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Level (with guidance)</div>

                  {!isEditingThisTab ? (
                    <>
                      <div className="mt-1 font-medium">{row.recommended_level || "—"}</div>
                      <div className="mt-1 text-xs text-amber-600">
                        {levelStars(row.recommended_level)}
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-5">
                      {[
                        { value: "N5", stars: "★☆☆☆☆" },
                        { value: "N4", stars: "★★☆☆☆" },
                        { value: "N3", stars: "★★★☆☆" },
                        { value: "N2", stars: "★★★★☆" },
                        { value: "N1", stars: "★★★★★" },
                      ].map((opt) => {
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
                            <div className="text-amber-600">{opt.stars}</div>
                            <div className="text-xs text-stone-600">{opt.value}</div>
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
                  <div className="mb-3 text-sm font-semibold text-stone-900">Teacher Notes</div>
                  <div className="text-sm text-stone-400">Coming next</div>
                </div>
              </div>
            )}

            {activeTab === "reading" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Book Status</div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!row?.id) return;

                        const today = new Date().toISOString().slice(0, 10);
                        const isDnf = !!row.dnf_at;

                        const updateValues = isDnf
                          ? {
                            finished_at: null,
                            dnf_at: null,
                          }
                          : {
                            started_at: today,
                            finished_at: null,
                            dnf_at: null,
                          };

                        const { error } = await supabase
                          .from("user_books")
                          .update(updateValues)
                          .eq("id", row.id);

                        if (error) {
                          console.error("Error updating book status:", error);
                          alert("Could not update book status.");
                          return;
                        }

                        if (!isDnf) {
                          setStartedAt(today);
                        }

                        setFinishedAt("");
                        setDnfAt("");
                        await load();
                        alert(isDnf ? "Book resumed." : "Marked as started.");
                      }}
                      className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                    >
                      {row.dnf_at ? "Resume Book" : "Start Today"}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!row?.id) return;

                        const today = new Date().toISOString().slice(0, 10);

                        const { error } = await supabase
                          .from("user_books")
                          .update({
                            finished_at: today,
                            dnf_at: null,
                          })
                          .eq("id", row.id);

                        if (error) {
                          console.error("Error marking book as finished:", error);
                          alert("Could not update book status.");
                          return;
                        }

                        setFinishedAt(today);
                        setDnfAt("");
                        await load();
                      }}
                      className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                    >
                      Mark Finished
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!row?.id) return;

                        const confirmed = window.confirm("Mark this book as DNF?");
                        if (!confirmed) return;

                        const today = new Date().toISOString().slice(0, 10);

                        const { error } = await supabase
                          .from("user_books")
                          .update({
                            dnf_at: today,
                            finished_at: null,
                          })
                          .eq("id", row.id);

                        if (error) {
                          console.error("Error marking book as DNF:", error);
                          alert("Could not update book status.");
                          return;
                        }

                        setFinishedAt("");
                        setDnfAt(today);
                        await load();
                      }}
                      className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                    >
                      Mark DNF
                    </button>
                  </div>

                  {canFillBeginningPages || canFillEndingPages ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canFillBeginningPages ? (
                        <button
                          type="button"
                          onClick={fillBeginningPages}
                          className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                        >
                          Fill the empty beginning pages
                        </button>
                      ) : null}

                      {canFillEndingPages ? (
                        <button
                          type="button"
                          onClick={fillEndingPages}
                          className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                        >
                          Fill the empty ending pages
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {canFillBeginningPages ? (
                    <div className="mt-2 text-xs text-stone-500">
                      Looks like you started the book on page {earliestStartPage}. Fill pages 1–{earliestStartPage! - 1}?
                    </div>
                  ) : null}

                  {canFillEndingPages ? (
                    <div className="mt-2 text-xs text-stone-500">
                      Looks like your story ends on page {furthestPage}. Fill pages {furthestPage! + 1}–{book.page_count}?
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Reading History</div>

                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <DateField
                      label="Started"
                      value={safeDate(startedAt) ?? started}
                      editing={isEditingThisTab}
                      inputValue={startedAt}
                      setInputValue={setStartedAt}
                    />

                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="text-stone-600">Finished / DNF</div>
                      {!isEditingThisTab ? (
                        <div className="mt-1 font-medium">
                          {dnfAt
                            ? `${dnfAt} (DNF)`
                            : safeDate(finishedAt) ?? finished
                              ? formatYmd((safeDate(finishedAt) ?? finished) as Date)
                              : "—"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={finishedAt}
                            onChange={(e) => setFinishedAt(e.target.value)}
                            className="w-full rounded border px-2 py-1"
                          />
                          <input
                            type="date"
                            value={dnfAt}
                            onChange={(e) => setDnfAt(e.target.value)}
                            className="w-full rounded border px-2 py-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Log Reading Session</div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="text-stone-600">Date</div>
                      <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="mt-1 w-full rounded border px-2 py-1"
                      />
                    </div>

                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="text-stone-600">Minutes read (optional)</div>
                      <input
                        type="number"
                        min={1}
                        value={sessionMinutesRead}
                        onChange={(e) => setSessionMinutesRead(e.target.value)}
                        placeholder="e.g. 25"
                        className="mt-1 w-full rounded border px-2 py-1"
                      />
                    </div>

                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="text-stone-600">Start page</div>
                      <input
                        type="number"
                        min={1}
                        value={sessionStartPage}
                        onChange={(e) => setSessionStartPage(e.target.value)}
                        placeholder="e.g. 4"
                        className="mt-1 w-full rounded border px-2 py-1"
                      />
                    </div>

                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="text-stone-600">End page</div>
                      <input
                        type="number"
                        min={1}
                        value={sessionEndPage}
                        onChange={(e) => setSessionEndPage(e.target.value)}
                        placeholder="e.g. 10"
                        className="mt-1 w-full rounded border px-2 py-1"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={saveReadingSession}
                      className="rounded-2xl !bg-stone-900 px-4 py-2 text-sm font-medium !text-white transition hover:!bg-black"
                    >
                      Save Session
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Reading Sessions</div>

                  {readingSessions.length === 0 ? (
                    <div className="text-sm text-stone-500">No sessions yet.</div>
                  ) : (
                    <>
                      {showAllSessions && <div className="mb-3">{renderSessionToggle()}</div>}

                      <div className="space-y-2">
                        {visibleReadingSessions.map((session) => {
                          const pagesRead = session.end_page - session.start_page + 1;

                          return (
                            <div
                              key={session.id}
                              className="rounded-xl border bg-white p-3 text-sm text-stone-700"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">{session.read_on}</div>
                                  <div className="mt-1">
                                    p. {session.start_page} → {session.end_page}
                                  </div>
                                  <div className="mt-1 text-stone-500">
                                    {session.minutes_read != null
                                      ? `${session.minutes_read} min · ${pagesRead} pages`
                                      : `Untimed · ${pagesRead} pages`}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => deleteReadingSession(session.id)}
                                  className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3">{renderSessionToggle()}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === "rating" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">My Review</div>

                  {!isEditingThisTab ? (
                    <div className="min-h-[140px] whitespace-pre-wrap text-sm text-stone-700">
                      {row.my_review?.trim() ? row.my_review : "—"}
                    </div>
                  ) : (
                    <textarea
                      value={myReview}
                      onChange={(e) => setMyReview(e.target.value)}
                      placeholder="Write your review here…"
                      className="min-h-[160px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Ratings</div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <StarRatingField
                      label="Overall Rating"
                      value={row.rating_overall}
                      editing={isEditingThisTab}
                      inputValue={ratingOverall}
                      setInputValue={setRatingOverall}
                    />

                    <StarRatingField
                      label="Would Recommend"
                      value={row.rating_recommend}
                      editing={isEditingThisTab}
                      inputValue={ratingRecommend}
                      setInputValue={setRatingRecommend}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Reading Level & Difficulty</div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="text-stone-600">My Level at Time of Reading</div>
                      {!isEditingThisTab ? (
                        <div className="mt-1 font-medium">{row.reader_level || "—"}</div>
                      ) : (
                        <select
                          value={readerLevel}
                          onChange={(e) => setReaderLevel(e.target.value)}
                          className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
                        >
                          <option value="">—</option>
                          {LEVEL_OPTIONS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <DifficultyField
                      value={row.rating_difficulty}
                      editing={isEditingThisTab}
                      inputValue={ratingDifficulty}
                      setInputValue={setRatingDifficulty}
                    />

                    <div className="rounded border bg-white p-3 text-sm sm:col-span-2">
                      <div className="text-stone-600">Level (with guidance)</div>

                      {!isEditingThisTab ? (
                        <>
                          <div className="mt-1 font-medium">{row.recommended_level || "—"}</div>
                          <div className="mt-1 text-xs text-amber-600">
                            {levelStars(row.recommended_level)}
                          </div>
                        </>
                      ) : (
                        <div className="mt-2 grid gap-2 sm:grid-cols-5">
                          {[
                            { value: "N5", stars: "★☆☆☆☆" },
                            { value: "N4", stars: "★★☆☆☆" },
                            { value: "N3", stars: "★★★☆☆" },
                            { value: "N2", stars: "★★★★☆" },
                            { value: "N1", stars: "★★★★★" },
                          ].map((opt) => {
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
                                <div className="text-amber-600">{opt.stars}</div>
                                <div className="text-xs text-stone-600">{opt.value}</div>
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
                  </div>
                </div>
              </div>
            )}

            {activeTab === "story" && (
              <div className="space-y-6">
                <div className="mb-4 flex gap-2 border-b border-stone-300 px-2">
                  <button
                    onClick={() => setStoryTab("characters")}
                    className={`px-3 py-2 text-sm font-medium ${storyTab === "characters"
                      ? "border-b-2 border-stone-900 text-stone-900"
                      : "text-stone-500"
                      }`}
                  >
                    Characters
                  </button>

                  <button
                    onClick={() => setStoryTab("plot")}
                    className={`px-3 py-2 text-sm font-medium ${storyTab === "plot"
                      ? "border-b-2 border-stone-900 text-stone-900"
                      : "text-stone-500"
                      }`}
                  >
                    Plot
                  </button>

                  <button
                    onClick={() => setStoryTab("setting")}
                    className={`px-3 py-2 text-sm font-medium ${storyTab === "setting"
                      ? "border-b-2 border-stone-900 text-stone-900"
                      : "text-stone-500"
                      }`}
                  >
                    Setting
                  </button>

                  <button
                    onClick={() => setStoryTab("cultural")}
                    className={`px-3 py-2 text-sm font-medium ${storyTab === "cultural"
                      ? "border-b-2 border-stone-900 text-stone-900"
                      : "text-stone-500"
                      }`}
                  >
                    Cultural Notes
                  </button>
                </div>

                {storyTab === "characters" && (
                  <>
                    {/* Your existing CHARACTER code goes here */}

                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-stone-900">Character List</div>
                          <p className="mt-1 text-sm text-stone-400">
                            Forgetting the readings of characters names? Jot them down here.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCharacters((prev) => !prev)}
                            className="rounded border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:bg-stone-50"
                          >
                            {showCharacters ? "Hide" : "Show"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowCharacters(true);
                              addCharacter();
                            }}
                            className="rounded !bg-stone-900 px-3 py-1 text-xs font-medium !text-white transition hover:!bg-black"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {showCharacters && (
                        <>
                          {characters.length === 0 ? (
                            <div className="text-sm text-stone-400">No characters yet.</div>
                          ) : (
                            <div className="space-y-4">
                              {characters.map((c) => {
                                const isEditing =
                                  c.id.startsWith("new-character-") ||
                                  editingCharacterIds.includes(c.id);
                                const isSaving = savingCharacterIds.includes(c.id);
                                const wasJustSaved = savedCharacterIds.includes(c.id);

                                return (
                                  <div key={c.id} className="rounded-xl border bg-white p-3">
                                    {!isEditing ? (
                                      <>
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="min-w-0">
                                              <div className="text-sm font-medium text-stone-900">
                                                {c.name || "—"}
                                                {c.reading ? (
                                                  <span className="ml-2 hidden text-stone-500 sm:inline">
                                                    （{c.reading}）
                                                  </span>
                                                ) : null}
                                              </div>

                                              {c.reading ? (
                                                <div className="text-xs text-stone-500 sm:hidden">
                                                  {c.reading}
                                                </div>
                                              ) : null}

                                              {c.role ? (
                                                <div className="mt-1 text-xs text-stone-500">{c.role}</div>
                                              ) : null}
                                            </div>
                                          </div>

                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowCharacters(true);
                                                startEditingCharacter(c.id);
                                              }}
                                              className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                                            >
                                              Edit
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => deleteCharacter(c.id)}
                                              className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>

                                        {c.notes ? (
                                          <div className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                                            {c.notes}
                                          </div>
                                        ) : null}
                                      </>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <input
                                            value={c.name ?? ""}
                                            onChange={(e) =>
                                              updateCharacter(c.id, "name", e.target.value)
                                            }
                                            placeholder="Name"
                                            className="w-1/2 rounded border px-2 py-1 text-sm"
                                          />

                                          <input
                                            value={c.reading ?? ""}
                                            onChange={(e) =>
                                              updateCharacter(c.id, "reading", e.target.value)
                                            }
                                            placeholder="Reading"
                                            className="w-1/2 rounded border px-2 py-1 text-sm"
                                          />
                                        </div>

                                        <input
                                          value={c.role ?? ""}
                                          onChange={(e) =>
                                            updateCharacter(c.id, "role", e.target.value)
                                          }
                                          placeholder="Role (e.g. 主人公, 先輩, 母)"
                                          className="w-full rounded border px-2 py-1 text-sm"
                                        />

                                        <textarea
                                          value={c.notes ?? ""}
                                          onChange={(e) =>
                                            updateCharacter(c.id, "notes", e.target.value)
                                          }
                                          placeholder="Notes about this character"
                                          className="w-full rounded border p-2 text-sm"
                                        />

                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => saveCharacter(c)}
                                            disabled={isSaving}
                                            className={`rounded px-3 py-2 text-sm font-medium text-white transition ${wasJustSaved
                                              ? "bg-green-600 hover:bg-green-700"
                                              : "bg-blue-600 hover:bg-blue-700"
                                              } disabled:opacity-50`}
                                          >
                                            {isSaving ? "Saving..." : wasJustSaved ? "Saved!" : "Save"}
                                          </button>

                                          {!c.id.startsWith("new-character-") && (
                                            <button
                                              type="button"
                                              onClick={() => stopEditingCharacter(c.id)}
                                              className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                                            >
                                              Cancel
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => deleteCharacter(c.id)}
                                            className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
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
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                {storyTab === "plot" && (
                  <>
                    {/* Your existing CHAPTER SUMMARY code goes here */}

                    <div className="rounded-2xl border bg-stone-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-stone-900">Chapter Summaries</div>
                          <p className="mt-1 text-sm text-stone-400">
                            Writing short summaries can help you remember the story later on.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowChapterSummaries((prev) => !prev)}
                            className="rounded border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:bg-stone-50"
                          >
                            {showChapterSummaries ? "Hide" : "Show"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setChapterReverseOrder((prev) => !prev)}
                            className="rounded border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:bg-stone-50"
                          >
                            {chapterReverseOrder ? "Oldest First" : "Newest First"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowChapterSummaries(true);
                              addChapterSummary();
                            }}
                            className="rounded !bg-stone-900 px-3 py-1 text-xs font-medium !text-white transition hover:!bg-black"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {showChapterSummaries && (
                        <div className="mt-4 space-y-3">
                          {chapterSummaries.length === 0 ? (
                            <div className="text-sm text-stone-500">No chapter summaries yet.</div>
                          ) : (
                            visibleChapterSummaries.map((item) => {
                              const isEditing =
                                item.id.startsWith("new-") || editingChapterIds.includes(item.id);
                              const isSaving = savingChapterIds.includes(item.id);
                              const wasJustSaved = savedChapterIds.includes(item.id);

                              return (
                                <div key={item.id} className="rounded-xl border bg-white p-4">
                                  {!isEditing ? (
                                    <>
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold text-stone-900">
                                            {item.chapter_number != null
                                              ? `Chapter ${item.chapter_number}`
                                              : "Untitled chapter"}
                                            {item.chapter_title ? (
                                              <span className="ml-2 font-normal text-stone-500">
                                                · {item.chapter_title}
                                              </span>
                                            ) : null}
                                          </div>

                                          {item.sort_order != null && (
                                            <div className="mt-1 text-xs text-stone-400">
                                              Sort order: {item.sort_order}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex shrink-0 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => startEditingChapter(item.id)}
                                            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => deleteChapterSummary(item.id)}
                                            className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                                        {item.summary}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="grid gap-3 md:grid-cols-[120px_1fr_120px]">
                                        <input
                                          type="number"
                                          value={item.chapter_number ?? ""}
                                          onChange={(e) =>
                                            updateChapterSummary(
                                              item.id,
                                              "chapter_number",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Chapter #"
                                          className="rounded border px-3 py-2 text-sm"
                                        />

                                        <input
                                          value={item.chapter_title ?? ""}
                                          onChange={(e) =>
                                            updateChapterSummary(
                                              item.id,
                                              "chapter_title",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Chapter title (optional)"
                                          className="rounded border px-3 py-2 text-sm"
                                        />

                                        <input
                                          type="number"
                                          value={item.sort_order ?? 0}
                                          onChange={(e) =>
                                            updateChapterSummary(
                                              item.id,
                                              "sort_order",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Sort order"
                                          className="rounded border px-3 py-2 text-sm"
                                        />
                                      </div>

                                      <p className="mt-2 text-xs text-stone-500">
                                        Usually you can ignore sort order unless you want to rearrange chapters.
                                      </p>

                                      <textarea
                                        value={item.summary}
                                        onChange={(e) =>
                                          updateChapterSummary(item.id, "summary", e.target.value)
                                        }
                                        placeholder="Write a short summary..."
                                        className="mt-3 min-h-[120px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                                      />

                                      <div className="mt-3 flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => saveChapterSummary(item)}
                                          disabled={isSaving}
                                          className={`rounded px-3 py-2 text-sm font-medium text-white transition ${wasJustSaved
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-blue-600 hover:bg-blue-700"
                                            } disabled:opacity-50`}
                                        >
                                          {isSaving ? "Saving..." : wasJustSaved ? "Saved!" : "Save"}
                                        </button>

                                        {!item.id.startsWith("new-") && (
                                          <button
                                            type="button"
                                            onClick={() => stopEditingChapter(item.id)}
                                            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                                          >
                                            Cancel
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => deleteChapterSummary(item.id)}
                                          className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}

                          <button
                            type="button"
                            onClick={addChapterSummary}
                            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
                          >
                            + Add chapter summary
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  {storyTab === "setting" && (
                    <div className="rounded-2xl border bg-white p-6 text-sm text-stone-600">
                      <div className="font-medium text-stone-900">Setting</div>
                      <p className="mt-2">
                        Keep track of where and when the story takes place, including locations,
                        time periods, and atmosphere.
                      </p>
                      <p className="mt-3 text-stone-400 italic">
                        Setting notes coming soon.
                      </p>
                    </div>
                  )}

                  {storyTab === "cultural" && (
                    <div className="rounded-2xl border bg-white p-6 text-sm text-stone-600">
                      <div className="font-medium text-stone-900">Cultural Notes</div>
                      <p className="mt-2">
                        Capture cultural references, customs, and nuances that help deepen your
                        understanding of the story.
                      </p>
                      <p className="mt-3 text-stone-400 italic">
                        Cultural notes coming soon.
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="text-sm font-medium">Notes</div>

                    {!isEditingThisTab ? (
                      <div className="mt-3 min-h-[260px] whitespace-pre-wrap text-sm text-stone-700">
                        {row.notes?.trim() ? row.notes : "—"}
                      </div>
                    ) : (
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Story notes, interpretation notes, reminders, etc."
                        className="mt-3 min-h-[260px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                      />
                    )}
                  </div>
                </div>

              </div>
            )}

            {activeTab === "study" && (
              <div className="space-y-6">

                {/* TOP: Vocab actions */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Vocab</div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      onClick={() => router.push(`/books/${row.id}/words`)}
                      className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                    >
                      📚 Vocab List
                    </button>

                    <button
                      onClick={() => router.push(`/vocab/explore?userBookId=${row.id}`)}
                      className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                    >
                      🔎 Explore the Word
                    </button>
                  </div>
                </div>

                {/* ADD VOCAB SECTION */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-stone-900">Add Vocab</div>

                  {/* SUB TABS */}
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
                        Read Along
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
                      <div className="text-sm font-medium text-stone-900">Read Along</div>
                      <p className="mt-1 text-sm text-stone-500">
                        This will be your real-time vocab input during lessons or single input for members.
                      </p>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                          ref={quickWordInputRef}
                          type="text"
                          value={quickWord}
                          onChange={(e) => setQuickWord(e.target.value)}
                          placeholder="Type a word..."
                          className="w-full rounded border px-3 py-2 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              pullQuickWord();
                            }
                          }}
                        />

                        <button
                          type="button"
                          onClick={pullQuickWord}
                          disabled={quickLoading || !quickWord.trim()}
                          className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
                        >
                          {quickLoading ? "Pulling..." : "Pull"}
                        </button>
                      </div>

                      {quickError ? (
                        <div className="mt-3 text-sm text-red-600">{quickError}</div>
                      ) : null}

                      {quickPreview && (
                        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs text-stone-500">Word</div>
                              <input
                                value={quickPreview.surface}
                                onChange={(e) =>
                                  setQuickPreview((prev) =>
                                    prev ? { ...prev, surface: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded border px-3 py-2 text-sm"
                              />
                            </div>

                            <div>
                              <div className="mb-1 text-xs text-stone-500">Reading</div>
                              <input
                                value={quickPreview.reading}
                                onChange={(e) =>
                                  setQuickPreview((prev) =>
                                    prev ? { ...prev, reading: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded border px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <div className="mb-1 text-xs text-stone-500">Definition</div>
                              <div className="flex flex-col gap-3 md:flex-row">
                                <select
                                  value={quickPreview.isCustomMeaning ? "other" : String(quickPreview.selectedMeaningIndex)}
                                  onChange={(e) => {
                                    const value = e.target.value;

                                    setQuickPreview((prev) => {
                                      if (!prev) return prev;

                                      if (value === "other") {
                                        return {
                                          ...prev,
                                          isCustomMeaning: true,
                                          meaning: "",
                                        };
                                      }

                                      const index = Number(value);
                                      return {
                                        ...prev,
                                        selectedMeaningIndex: index,
                                        isCustomMeaning: false,
                                        meaning: prev.meanings[index] ?? "",
                                      };
                                    });
                                  }}
                                  className="w-full rounded border bg-white px-3 py-2 text-sm md:w-56"
                                >
                                  {quickPreview.meanings.map((m, i) => (
                                    <option key={i} value={i}>
                                      Definition {i + 1}
                                    </option>
                                  ))}
                                  <option value="other">Other</option>
                                </select>

                                <input
                                  value={quickPreview.meaning}
                                  onChange={(e) =>
                                    setQuickPreview((prev) =>
                                      prev ? { ...prev, meaning: e.target.value } : prev
                                    )
                                  }
                                  readOnly={!quickPreview.isCustomMeaning}
                                  placeholder="Meaning"
                                  className={`w-full rounded border px-3 py-2 text-sm ${quickPreview.isCustomMeaning
                                    ? "bg-white"
                                    : "bg-stone-100 text-stone-700"
                                    }`}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 text-xs text-stone-500">Page</div>
                              <input
                                type="number"
                                min={1}
                                value={quickPreview.page}
                                onChange={(e) =>
                                  setQuickPreview((prev) =>
                                    prev ? { ...prev, page: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded border px-3 py-2 text-sm"
                              />
                            </div>

                            <div>
                              <div className="mb-1 text-xs text-stone-500">Chapter #</div>
                              <input
                                type="number"
                                min={1}
                                value={quickPreview.chapterNumber}
                                onChange={(e) =>
                                  setQuickPreview((prev) =>
                                    prev ? { ...prev, chapterNumber: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded border px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <div className="mb-1 text-xs text-stone-500">Chapter Name</div>
                              <input
                                value={quickPreview.chapterName}
                                onChange={(e) =>
                                  setQuickPreview((prev) =>
                                    prev ? { ...prev, chapterName: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded border px-3 py-2 text-sm"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={saveQuickWord}
                              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                              Save Word
                            </button>

                            <button
                              type="button"
                              onClick={() => setQuickPreview(null)}
                              className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-6">
                        <div className="text-sm font-medium text-stone-900">
                          Words saved into Vocab List this session
                        </div>
                        <p className="mt-1 text-xs text-stone-400">
                          These words have already been saved to your Vocab List.
                        </p>

                        {quickSessionWords.length === 0 ? (
                          <div className="mt-2 text-sm text-stone-500">No words saved yet.</div>
                        ) : (
                          <div className="mt-3 space-y-2">

                            {quickSessionWords.map((item) => {
                              const isEditing = editingQuickSessionId === item.id;
                              const editItem = isEditing ? editingQuickSessionWord : null;

                              return (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm"
                                >
                                  {!isEditing || !editItem ? (
                                    <>
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="font-medium text-stone-900">
                                            {item.surface}
                                            {item.reading ? (
                                              <span className="ml-2 text-stone-500">({item.reading})</span>
                                            ) : null}
                                          </div>
                                          <div className="mt-1 text-stone-700">{item.meaning || "—"}</div>
                                          <div className="mt-1 text-xs text-stone-500">
                                            Page {item.page || "—"}
                                            {item.chapterNumber ? ` · Ch ${item.chapterNumber}` : ""}
                                            {item.chapterName ? ` · ${item.chapterName}` : ""}
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => startEditingQuickSessionWord(item)}
                                          className="rounded border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                          <div className="mb-1 text-xs text-stone-500">Word</div>
                                          <input
                                            value={editItem.surface}
                                            onChange={(e) =>
                                              setEditingQuickSessionWord((prev) =>
                                                prev ? { ...prev, surface: e.target.value } : prev
                                              )
                                            }
                                            className="w-full rounded border px-3 py-2 text-sm"
                                          />
                                        </div>

                                        <div>
                                          <div className="mb-1 text-xs text-stone-500">Reading</div>
                                          <input
                                            value={editItem.reading}
                                            onChange={(e) =>
                                              setEditingQuickSessionWord((prev) =>
                                                prev ? { ...prev, reading: e.target.value } : prev
                                              )
                                            }
                                            className="w-full rounded border px-3 py-2 text-sm"
                                          />
                                        </div>

                                        <div className="md:col-span-2">
                                          <div className="mb-1 text-xs text-stone-500">Meaning</div>
                                          <input
                                            value={editItem.meaning}
                                            onChange={(e) =>
                                              setEditingQuickSessionWord((prev) =>
                                                prev ? { ...prev, meaning: e.target.value } : prev
                                              )
                                            }
                                            className="w-full rounded border px-3 py-2 text-sm"
                                          />
                                        </div>

                                        <div>
                                          <div className="mb-1 text-xs text-stone-500">Page</div>
                                          <input
                                            type="number"
                                            min={1}
                                            value={editItem.page}
                                            onChange={(e) =>
                                              setEditingQuickSessionWord((prev) =>
                                                prev ? { ...prev, page: e.target.value } : prev
                                              )
                                            }
                                            className="w-full rounded border px-3 py-2 text-sm"
                                          />
                                        </div>

                                        <div>
                                          <div className="mb-1 text-xs text-stone-500">Chapter #</div>
                                          <input
                                            type="number"
                                            min={1}
                                            value={editItem.chapterNumber}
                                            onChange={(e) =>
                                              setEditingQuickSessionWord((prev) =>
                                                prev ? { ...prev, chapterNumber: e.target.value } : prev
                                              )
                                            }
                                            className="w-full rounded border px-3 py-2 text-sm"
                                          />
                                        </div>

                                        <div className="md:col-span-2">
                                          <div className="mb-1 text-xs text-stone-500">Chapter Name</div>
                                          <input
                                            value={editItem.chapterName}
                                            onChange={(e) =>
                                              setEditingQuickSessionWord((prev) =>
                                                prev ? { ...prev, chapterName: e.target.value } : prev
                                              )
                                            }
                                            className="w-full rounded border px-3 py-2 text-sm"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={saveEditedQuickSessionWord}
                                          className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                        >
                                          Save
                                        </button>

                                        <button
                                          type="button"
                                          onClick={cancelEditingQuickSessionWord}
                                          className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BULK ADD */}
                  {vocabTab === "bulk" && (
                    <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
                      <div className="text-sm font-medium text-stone-900">Bulk Add</div>
                      <p className="mt-1 text-sm text-stone-500">
                        Use the existing bulk input tool.
                      </p>

                      <button
                        onClick={() => router.push(`/vocab/bulk?userBookId=${row.id}`)}
                        className="mt-4 rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                      >
                        Open Bulk Add
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </section>
      </div>
    </main>
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
}: {
  label: string;
  value: number | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
}) {
  const selected = inputValue ? Number(inputValue) : null;

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{label}</div>

      {!editing ? (
        <>
          <div className="mt-1 font-medium">{value ? `${value}/5` : "—"}</div>
          <div className="text-amber-600">{stars5(value)}</div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const isSelected = selected === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setInputValue(String(n))}
                className={`rounded-lg border px-3 py-2 transition ${isSelected
                  ? "border-amber-500 bg-amber-50 shadow-sm"
                  : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
              >
                <span className="font-medium text-amber-600">{stars5(n)}</span>
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