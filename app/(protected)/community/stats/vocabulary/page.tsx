// Vocabulary Growth
// All-time vocabulary growth + saved words → study rhythm.

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SectionBand from "./components/SectionBand";
import BookCategoryFilterSelector from "./components/BookCategoryFilterSelector";
import VocabularyHeader from "./components/VocabularyHeader";
import VocabularyCategoryPanel from "./components/VocabularyCategoryPanel";
import VocabularyDistributionPanels from "./components/VocabularyDistributionPanels";
import VocabularyMetricGrid from "./components/VocabularyMetricGrid";
import VocabularyRhythmPanel from "./components/VocabularyRhythmPanel";
import {
  VocabularyErrorBanner,
  VocabularyLoadingPanel,
} from "./components/VocabularyStatePanels";

type SessionMode = "fluid" | "curiosity" | "listening" | string;

type SessionRow = {
  user_book_id: string;
  read_on: string | null;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  session_mode: SessionMode | null;
  is_filler?: boolean | null;
};

type WordRow = {
  id: string;
  user_book_id: string;
  created_at: string;
  surface: string | null;
  reading?: string | null;
  meaning: string | null;
};

type StudyEventRow = {
  id?: string | null;
  user_book_id: string | null;
  user_book_word_id?: string | null;
  created_at: string;
  study_mode?: string | null;
  result?: string | null;
  is_correct?: boolean | null;
  surface?: string | null;
  reading?: string | null;
  meaning?: string | null;
};

type RawUserBookRow = {
  id: string;
  books:
  | {
    id: string;
    title: string | null;
    book_type: string | null;
    cover_url: string | null;
  }
  | {
    id: string;
    title: string | null;
    book_type: string | null;
    cover_url: string | null;
  }[]
  | null;
};

type UserBookRow = {
  id: string;
  books: {
    id: string;
    title: string | null;
    book_type: string | null;
    cover_url: string | null;
  } | null;
};

type VocabularyBookMetric = {
  userBookId: string;
  title: string;
  bookType: string;
  pagesRead: number;
  wordsSaved: number;
  uniqueWords: number;
  wordsPerPage: number | null;
};

type TypeMetric = {
  bookType: string;
  pagesRead: number;
  wordsSaved: number;
  uniqueWords: number;
  wordsPerPage: number | null;
};

type BookCategoryFilter =
  | "all"
  | "image_supported"
  | "bridge_books"
  | "text_dense";

const BOOK_CATEGORY_FILTERS: {
  value: BookCategoryFilter;
  title: string;
  description: string;
  activeClass: string;
  inactiveClass: string;
}[] = [
    {
      value: "all",
      title: "All Reading",
      description: "All books with saved vocabulary",
      activeClass: "border-sky-600 bg-sky-600 text-white shadow-md",
      inactiveClass: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    },
    {
      value: "image_supported",
      title: "Image-Supported",
      description: "Manga, picture books, early readers",
      activeClass: "border-emerald-600 bg-emerald-600 text-white shadow-md",
      inactiveClass:
        "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    },
    {
      value: "bridge_books",
      title: "Bridge Books",
      description: "Chapter books, middle grade, YA",
      activeClass: "border-violet-600 bg-violet-600 text-white shadow-md",
      inactiveClass:
        "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
    },
    {
      value: "text_dense",
      title: "Text-Dense",
      description: "Novels, essays, nonfiction, textbooks",
      activeClass: "border-amber-600 bg-amber-500 text-white shadow-md",
      inactiveClass:
        "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    },
  ];

const STATS_QUERY_PAGE_SIZE = 1000;
const USER_BOOK_ID_CHUNK_SIZE = 200;
const VOCABULARY_RHYTHM_DAY_COUNT = 365;
const COLLAPSED_VOCABULARY_RHYTHM_DAY_COUNT = 90;

// Change this if your study-event table has a different name.
const STUDY_EVENT_TABLE = "user_study_events";

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monthStartYmd() {
  const now = new Date();
  return ymdLocal(new Date(now.getFullYear(), now.getMonth(), 1));
}

function isThisMonth(dateString: string | null | undefined) {
  if (!dateString) return false;
  return dateString >= monthStartYmd();
}

function sessionPages(row: SessionRow) {
  const start = Number(row.start_page);
  const end = Number(row.end_page);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (end <= start) return 0;

  return end - start;
}

function wordKey(word: WordRow | StudyEventRow) {
  return `${word.surface ?? ""}::${word.reading ?? ""}::${word.meaning ?? ""}`.trim();
}

function bookTypeLabel(value: string | null | undefined) {
  if (!value) return "Other";

  const labels: Record<string, string> = {
    picture_book: "Picture books",
    early_reader: "Early readers",
    chapter_book: "Chapter books",
    middle_grade: "Middle grade",
    young_adult: "Young adult",
    ya: "YA",
    adult: "Adult",
    novel: "Novel",
    manga: "Manga",
    graded_reader: "Graded readers",
    nonfiction: "Nonfiction",
    short_story: "Short story",
    "short story": "Short story",
    essay: "Essay",
    textbook: "Textbook",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function bookCategoryForBookType(
  bookType: string | null | undefined
): BookCategoryFilter {
  if (
    bookType === "manga" ||
    bookType === "picture_book" ||
    bookType === "early_reader"
  ) {
    return "image_supported";
  }

  if (
    bookType === "chapter_book" ||
    bookType === "middle_grade" ||
    bookType === "ya" ||
    bookType === "young_adult"
  ) {
    return "bridge_books";
  }

  if (
    bookType === "novel" ||
    bookType === "short_story" ||
    bookType === "short story" ||
    bookType === "nonfiction" ||
    bookType === "essay" ||
    bookType === "textbook" ||
    bookType === "adult"
  ) {
    return "text_dense";
  }

  return "text_dense";
}

function vocabularyGrowthTheme(value: BookCategoryFilter) {
  if (value === "image_supported") {
    return {
      pageHeader: "border-emerald-300 bg-white",
      section: "border-emerald-300 bg-white",
      softSection: "border-emerald-300 bg-white",
      statOne: "border-emerald-300 bg-white",
      statTwo: "border-emerald-300 bg-white",
      statThree: "border-emerald-300 bg-white",
      statFour: "border-emerald-300 bg-white",
      plainCard: "border-emerald-300 bg-white",
    };
  }

  if (value === "bridge_books") {
    return {
      pageHeader: "border-violet-300 bg-white",
      section: "border-violet-300 bg-white",
      softSection: "border-violet-300 bg-white",
      statOne: "border-violet-300 bg-white",
      statTwo: "border-violet-300 bg-white",
      statThree: "border-violet-300 bg-white",
      statFour: "border-violet-300 bg-white",
      plainCard: "border-violet-300 bg-white",
    };
  }

  if (value === "text_dense") {
    return {
      pageHeader: "border-amber-300 bg-white",
      section: "border-amber-300 bg-white",
      softSection: "border-amber-300 bg-white",
      statOne: "border-amber-300 bg-white",
      statTwo: "border-amber-300 bg-white",
      statThree: "border-amber-300 bg-white",
      statFour: "border-amber-300 bg-white",
      plainCard: "border-amber-300 bg-white",
    };
  }

  return {
    pageHeader: "border-sky-300 bg-white",
    section: "border-sky-300 bg-white",
    softSection: "border-sky-300 bg-white",
    statOne: "border-sky-300 bg-white",
    statTwo: "border-sky-300 bg-white",
    statThree: "border-sky-300 bg-white",
    statFour: "border-sky-300 bg-white",
    plainCard: "border-sky-300 bg-white",
  };
}

function formatDecimal(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}%`;
}

function isCorrectStudyEvent(event: StudyEventRow) {
  return event.result === "correct" || event.is_correct === true;
}

function isIncorrectStudyEvent(event: StudyEventRow) {
  return event.result === "incorrect" || event.is_correct === false;
}

function isSkippedStudyEvent(event: StudyEventRow) {
  return event.result === "skipped";
}

function isKanjiStudyEvent(event: StudyEventRow) {
  const mode = event.study_mode ?? "";
  return mode === "kanji_reading_flashcards" || mode.includes("kanji");
}



function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

async function fetchAllReadingSessionsForBooks(userBookIds: string[]) {
  const allRows: SessionRow[] = [];

  for (const idChunk of chunkArray(userBookIds, USER_BOOK_ID_CHUNK_SIZE)) {
    let from = 0;

    while (true) {
      const to = from + STATS_QUERY_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("user_book_reading_sessions")
        .select(
          "user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler"
        )
        .in("user_book_id", idChunk)
        .range(from, to);

      if (error) throw error;

      const rows = (data ?? []) as SessionRow[];
      allRows.push(...rows);

      if (rows.length < STATS_QUERY_PAGE_SIZE) break;

      from += STATS_QUERY_PAGE_SIZE;
    }
  }

  return allRows;
}

async function fetchAllWordsForBooks(userBookIds: string[]) {
  const allRows: WordRow[] = [];

  for (const idChunk of chunkArray(userBookIds, USER_BOOK_ID_CHUNK_SIZE)) {
    let from = 0;

    while (true) {
      const to = from + STATS_QUERY_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("user_book_words")
        .select("id, user_book_id, created_at, surface, reading, meaning")
        .in("user_book_id", idChunk)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows = (data ?? []) as WordRow[];
      allRows.push(...rows);

      if (rows.length < STATS_QUERY_PAGE_SIZE) break;

      from += STATS_QUERY_PAGE_SIZE;
    }
  }

  return allRows;
}

async function fetchAllStudyEventsForBooks(userBookIds: string[]) {
  const allRows: StudyEventRow[] = [];

  for (const idChunk of chunkArray(userBookIds, USER_BOOK_ID_CHUNK_SIZE)) {
    let from = 0;

    while (true) {
      const to = from + STATS_QUERY_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from(STUDY_EVENT_TABLE)
        .select(
          "id, user_book_id, user_book_word_id, created_at, study_mode, result, is_correct, surface, reading, meaning"
        )
        .in("user_book_id", idChunk)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.warn("Could not load vocabulary study events:", error.message);
        return allRows;
      }

      const rows = (data ?? []) as StudyEventRow[];
      allRows.push(...rows);

      if (rows.length < STATS_QUERY_PAGE_SIZE) break;

      from += STATS_QUERY_PAGE_SIZE;
    }
  }

  return allRows;
}

export default function VocabularyGrowthPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [words, setWords] = useState<WordRow[]>([]);
  const [studyEvents, setStudyEvents] = useState<StudyEventRow[]>([]);
  const [bookCategoryFilter, setBookCategoryFilter] =
    useState<BookCategoryFilter>("all");
  const [showFullVocabularyRhythm, setShowFullVocabularyRhythm] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadVocabularyGrowth() {
      setLoading(true);
      setErrorMsg("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          if (!isMounted) return;
          setRows([]);
          setSessions([]);
          setWords([]);
          setStudyEvents([]);
          return;
        }

        const { data: userBooks, error: userBooksError } = await supabase
          .from("user_books")
          .select(
            `
              id,
              books:book_id (
                id,
                title,
                book_type,
                cover_url
              )
            `
          )
          .eq("user_id", user.id);

        if (userBooksError) throw userBooksError;

        const loadedRows: UserBookRow[] = ((userBooks ?? []) as RawUserBookRow[]).map(
          (row) => ({
            id: row.id,
            books: Array.isArray(row.books)
              ? row.books[0] ?? null
              : row.books ?? null,
          })
        );

        const userBookIds = loadedRows.map((row) => row.id).filter(Boolean);

        if (userBookIds.length === 0) {
          if (!isMounted) return;
          setRows(loadedRows);
          setSessions([]);
          setWords([]);
          setStudyEvents([]);
          return;
        }

        const [sessionData, wordData, studyEventData] = await Promise.all([
          fetchAllReadingSessionsForBooks(userBookIds),
          fetchAllWordsForBooks(userBookIds),
          fetchAllStudyEventsForBooks(userBookIds),
        ]);

        if (!isMounted) return;

        setRows(loadedRows);
        setSessions(sessionData.filter((row) => !row.is_filler));
        setWords(wordData);
        setStudyEvents(studyEventData);
      } catch (error: any) {
        console.error("Error loading vocabulary growth:", error);
        if (!isMounted) return;
        setErrorMsg(error?.message ?? "Could not load vocabulary growth.");
        setRows([]);
        setSessions([]);
        setWords([]);
        setStudyEvents([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVocabularyGrowth();

    return () => {
      isMounted = false;
    };
  }, []);

  const vocabularyBookMetrics = useMemo(() => {
    const sessionsByBook = new Map<string, SessionRow[]>();
    const wordsByBook = new Map<string, WordRow[]>();

    for (const session of sessions) {
      const list = sessionsByBook.get(session.user_book_id) ?? [];
      list.push(session);
      sessionsByBook.set(session.user_book_id, list);
    }

    for (const word of words) {
      const list = wordsByBook.get(word.user_book_id) ?? [];
      list.push(word);
      wordsByBook.set(word.user_book_id, list);
    }

    return rows
      .map((row) => {
        const bookSessions = sessionsByBook.get(row.id) ?? [];
        const bookWords = wordsByBook.get(row.id) ?? [];

        const pagesRead = bookSessions.reduce((sum, session) => {
          if (session.session_mode === "listening") return sum;
          return sum + sessionPages(session);
        }, 0);

        const uniqueWords = new Set(bookWords.map((word) => wordKey(word))).size;

        return {
          userBookId: row.id,
          title: row.books?.title ?? "Untitled book",
          bookType: row.books?.book_type ?? "other",
          pagesRead,
          wordsSaved: bookWords.length,
          uniqueWords,
          wordsPerPage: pagesRead > 0 ? bookWords.length / pagesRead : null,
        } satisfies VocabularyBookMetric;
      })
      .filter((item) => item.pagesRead > 0 || item.wordsSaved > 0)
      .sort((a, b) => b.wordsSaved - a.wordsSaved);
  }, [rows, sessions, words]);

  const filteredVocabularyBookMetrics = useMemo(() => {
    if (bookCategoryFilter === "all") return vocabularyBookMetrics;

    return vocabularyBookMetrics.filter(
      (item) => bookCategoryForBookType(item.bookType) === bookCategoryFilter
    );
  }, [vocabularyBookMetrics, bookCategoryFilter]);

  const filteredVocabularyBookIds = useMemo(() => {
    return new Set(filteredVocabularyBookMetrics.map((item) => item.userBookId));
  }, [filteredVocabularyBookMetrics]);

  const filteredWords = useMemo(() => {
    return words.filter((word) => filteredVocabularyBookIds.has(word.user_book_id));
  }, [words, filteredVocabularyBookIds]);

  const filteredStudyEvents = useMemo(() => {
    return studyEvents.filter(
      (event) =>
        !!event.user_book_id && filteredVocabularyBookIds.has(event.user_book_id)
    );
  }, [studyEvents, filteredVocabularyBookIds]);

  const monthlyWords = useMemo(() => {
    return filteredWords.filter((word) => isThisMonth(word.created_at));
  }, [filteredWords]);

  const selectedFilter = BOOK_CATEGORY_FILTERS.find(
    (option) => option.value === bookCategoryFilter
  );

  const selectedFilterLabel = selectedFilter?.title ?? "All Reading";

  const selectedTheme = vocabularyGrowthTheme(bookCategoryFilter);

  const vocabularyTotals = useMemo(() => {
    const pagesRead = filteredVocabularyBookMetrics.reduce(
      (sum, item) => sum + item.pagesRead,
      0
    );

    const wordsSaved = filteredWords.length;
    const uniqueWords = new Set(filteredWords.map((word) => wordKey(word))).size;
    const monthlyUniqueWords = new Set(monthlyWords.map((word) => wordKey(word)))
      .size;

    return {
      pagesRead,
      wordsSaved,
      uniqueWords,
      monthlyWordsSaved: monthlyWords.length,
      monthlyUniqueWords,
      wordsPerPage: pagesRead > 0 ? wordsSaved / pagesRead : null,
      booksWithWords: filteredVocabularyBookMetrics.filter(
        (item) => item.wordsSaved > 0
      ).length,
    };
  }, [filteredVocabularyBookMetrics, filteredWords, monthlyWords]);

  const studySignals = useMemo(() => {
    const studyDays = new Set<string>();
    const studiedBooks = new Set<string>();
    const studiedCards = new Set<string>();
    const studiedWords = new Set<string>();

    const byBook = new Map<
      string,
      {
        userBookId: string;
        title: string;
        total: number;
        vocab: number;
        kanji: number;
        correct: number;
        incorrect: number;
        shown: number;
        lastStudiedAt: number;
      }
    >();

    const bookTitleByUserBookId = new Map(
      rows.map((row) => [row.id, row.books?.title ?? "Untitled"])
    );

    let correct = 0;
    let incorrect = 0;
    let reviewed = 0;
    let skipped = 0;

    for (const event of filteredStudyEvents) {
      studyDays.add(ymdLocal(new Date(event.created_at)));

      if (event.user_book_id) {
        studiedBooks.add(event.user_book_id);

        const title = bookTitleByUserBookId.get(event.user_book_id) ?? "Untitled";
        const eventTime = new Date(event.created_at).getTime();

        const bookStats =
          byBook.get(event.user_book_id) ??
          {
            userBookId: event.user_book_id,
            title,
            total: 0,
            vocab: 0,
            kanji: 0,
            correct: 0,
            incorrect: 0,
            shown: 0,
            lastStudiedAt: 0,
          };

        bookStats.total += 1;

        if (isKanjiStudyEvent(event)) {
          bookStats.kanji += 1;
        } else {
          bookStats.vocab += 1;
        }

        if (isCorrectStudyEvent(event)) {
          bookStats.correct += 1;
        } else if (isIncorrectStudyEvent(event)) {
          bookStats.incorrect += 1;
        } else {
          bookStats.shown += 1;
        }

        if (Number.isFinite(eventTime)) {
          bookStats.lastStudiedAt = Math.max(bookStats.lastStudiedAt, eventTime);
        }

        byBook.set(event.user_book_id, bookStats);
      }

      const studyItemKey = String(
        event.user_book_word_id ??
        `${event.study_mode ?? "study"}|||${event.user_book_id ?? ""}|||${event.surface ?? ""
        }|||${event.reading ?? ""}|||${event.meaning ?? ""}`
      );

      if (studyItemKey.trim()) {
        studiedCards.add(studyItemKey);
      }

      const wordStudyKey = String(
        event.user_book_word_id ??
        `${event.surface ?? ""}|||${event.reading ?? ""}|||${event.meaning ?? ""
        }`
      );

      if (wordStudyKey.trim()) {
        studiedWords.add(wordStudyKey);
      }

      if (isCorrectStudyEvent(event)) {
        correct += 1;
      } else if (isIncorrectStudyEvent(event)) {
        incorrect += 1;
      } else if (isSkippedStudyEvent(event)) {
        skipped += 1;
      } else {
        reviewed += 1;
      }
    }

    const answered = correct + incorrect;
    const accuracyPercent =
      answered > 0 ? Math.round((correct / answered) * 100) : null;

    const bookStudyItems = Array.from(byBook.values())
      .map((item) => {
        const answered = item.correct + item.incorrect;

        const studyTypeLabel =
          item.vocab > 0 && item.kanji > 0
            ? "Mixed"
            : item.kanji > 0
              ? "Kanji"
              : item.vocab > 0
                ? "Vocab"
                : "—";

        const studyTypeDetail =
          item.vocab > 0 && item.kanji > 0
            ? `Vocab ${item.vocab} · Kanji ${item.kanji}`
            : item.kanji > 0
              ? `${item.kanji} card${item.kanji === 1 ? "" : "s"}`
              : item.vocab > 0
                ? `${item.vocab} card${item.vocab === 1 ? "" : "s"}`
                : null;

        return {
          ...item,
          studyTypeLabel,
          studyTypeDetail,
          accuracyPercent:
            answered > 0 ? Math.round((item.correct / answered) * 100) : null,
        };
      })
      .sort((a, b) => {
        if (b.incorrect !== a.incorrect) return b.incorrect - a.incorrect;

        const aAccuracy = a.accuracyPercent ?? 101;
        const bAccuracy = b.accuracyPercent ?? 101;

        if (aAccuracy !== bAccuracy) return aAccuracy - bAccuracy;

        return b.total - a.total;
      })
      .slice(0, 6);

    const answerMixItems = [
      { label: "Correct", value: correct, colorClass: "bg-emerald-500" },
      { label: "Still sticky", value: incorrect, colorClass: "bg-rose-500" },
      { label: "Reviewed", value: reviewed, colorClass: "bg-sky-500" },
      { label: "Skipped", value: skipped, colorClass: "bg-slate-400" },
    ].filter((item) => item.value > 0);

    return {
      totalEvents: filteredStudyEvents.length,
      studyDays: studyDays.size,
      studiedBooks: studiedBooks.size,
      studiedCards: studiedCards.size,
      studiedWords: studiedWords.size,
      correct,
      incorrect,
      reviewed,
      skipped,
      accuracyPercent,
      bookStudyItems,
      answerMixItems,
    };
  }, [rows, filteredStudyEvents]);

  const vocabularyRhythmActivity = useMemo(() => {
    const today = startOfToday();
    const start = addDays(today, -(VOCABULARY_RHYTHM_DAY_COUNT - 1));

    const buckets = new Map<
      string,
      {
        words: number;
        studyEvents: number;
        correct: number;
        incorrect: number;
        reviewed: number;
        skipped: number;
      }
    >();

    for (let i = 0; i < VOCABULARY_RHYTHM_DAY_COUNT; i++) {
      buckets.set(ymdLocal(addDays(start, i)), {
        words: 0,
        studyEvents: 0,
        correct: 0,
        incorrect: 0,
        reviewed: 0,
        skipped: 0,
      });
    }

    for (const word of filteredWords) {
      const day = ymdLocal(new Date(word.created_at));
      if (!buckets.has(day)) continue;

      const bucket = buckets.get(day)!;
      bucket.words += 1;
    }

    for (const event of filteredStudyEvents) {
      const day = ymdLocal(new Date(event.created_at));
      if (!buckets.has(day)) continue;

      const bucket = buckets.get(day)!;
      bucket.studyEvents += 1;

      if (isCorrectStudyEvent(event)) {
        bucket.correct += 1;
      } else if (isIncorrectStudyEvent(event)) {
        bucket.incorrect += 1;
      } else if (isSkippedStudyEvent(event)) {
        bucket.skipped += 1;
      } else {
        bucket.reviewed += 1;
      }
    }

    return Array.from(buckets.entries()).map(([day, value]) => ({
      day,
      ...value,
    }));
  }, [filteredWords, filteredStudyEvents]);

  const visibleVocabularyRhythmActivity = useMemo(() => {
    if (showFullVocabularyRhythm) return vocabularyRhythmActivity;

    return vocabularyRhythmActivity.slice(
      -COLLAPSED_VOCABULARY_RHYTHM_DAY_COUNT
    );
  }, [showFullVocabularyRhythm, vocabularyRhythmActivity]);

  const vocabularyRhythmSummary = useMemo(() => {
    const savedWordDays = visibleVocabularyRhythmActivity.filter(
      (item) => item.words > 0
    ).length;

    const studyDays = visibleVocabularyRhythmActivity.filter(
      (item) => item.studyEvents > 0
    ).length;

    const overlapDays = visibleVocabularyRhythmActivity.filter(
      (item) => item.words > 0 && item.studyEvents > 0
    ).length;

    const activeVocabularyDays = visibleVocabularyRhythmActivity.filter(
      (item) => item.words > 0 || item.studyEvents > 0
    ).length;

    const wordsSaved = visibleVocabularyRhythmActivity.reduce(
      (sum, item) => sum + item.words,
      0
    );

    const studyEvents = visibleVocabularyRhythmActivity.reduce(
      (sum, item) => sum + item.studyEvents,
      0
    );

    return {
      savedWordDays,
      studyDays,
      overlapDays,
      activeVocabularyDays,
      wordsSaved,
      studyEvents,
    };
  }, [visibleVocabularyRhythmActivity]);

  const vocabularyRhythmWindowLabel = showFullVocabularyRhythm
    ? "Past year"
    : "Recent 90 days";

  const vocabularyTypeMetrics = useMemo(() => {
    const grouped = new Map<string, TypeMetric>();

    for (const item of filteredVocabularyBookMetrics) {
      const key = bookTypeLabel(item.bookType);
      const existing =
        grouped.get(key) ??
        {
          bookType: key,
          pagesRead: 0,
          wordsSaved: 0,
          uniqueWords: 0,
          wordsPerPage: null,
        };

      existing.pagesRead += item.pagesRead;
      existing.wordsSaved += item.wordsSaved;
      existing.uniqueWords += item.uniqueWords;

      grouped.set(key, existing);
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        wordsPerPage:
          item.pagesRead > 0 ? item.wordsSaved / item.pagesRead : null,
      }))
      .sort((a, b) => b.wordsSaved - a.wordsSaved)
      .slice(0, 8);
  }, [filteredVocabularyBookMetrics]);

  const wordsByBookTypePie = useMemo(() => {
    const palette = [
      "#8b5cf6",
      "#ec4899",
      "#38bdf8",
      "#f59e0b",
      "#14b8a6",
      "#f97316",
      "#22c55e",
      "#64748b",
    ];

    return vocabularyTypeMetrics.map((item, index) => ({
      label: item.bookType,
      value: item.wordsSaved,
      color: palette[index % palette.length],
    }));
  }, [vocabularyTypeMetrics]);

  const wordiestBooks = useMemo(() => {
    return [...filteredVocabularyBookMetrics]
      .filter((item) => item.wordsSaved > 0)
      .sort((a, b) => b.wordsSaved - a.wordsSaved)
      .slice(0, 8);
  }, [filteredVocabularyBookMetrics]);

  const densestBooks = useMemo(() => {
    return [...filteredVocabularyBookMetrics]
      .filter((item) => item.wordsPerPage != null && item.pagesRead > 0)
      .sort((a, b) => (b.wordsPerPage ?? 0) - (a.wordsPerPage ?? 0))
      .slice(0, 8);
  }, [filteredVocabularyBookMetrics]);

  const recentWords = useMemo(() => {
    return [...filteredWords]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 12);
  }, [filteredWords]);

  if (loading) {
    return <VocabularyLoadingPanel />;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <VocabularyHeader pageHeaderTone={selectedTheme.pageHeader} />

        <VocabularyErrorBanner message={errorMsg} />

        <VocabularyCategoryPanel
          selectedFilterLabel={selectedFilterLabel}
          tone={selectedTheme.section}
          filters={BOOK_CATEGORY_FILTERS}
          value={bookCategoryFilter}
          onChange={(value) => setBookCategoryFilter(value as BookCategoryFilter)}
          bookCount={filteredVocabularyBookMetrics.length}
        />

        <VocabularyMetricGrid
          wordsSaved={vocabularyTotals.wordsSaved}
          uniqueWords={vocabularyTotals.uniqueWords}
          monthlyWordsSaved={vocabularyTotals.monthlyWordsSaved}
          monthlyUniqueWords={vocabularyTotals.monthlyUniqueWords}
          wordsPerPage={vocabularyTotals.wordsPerPage}
          pagesRead={vocabularyTotals.pagesRead}
          formatDecimal={formatDecimal}
          tone={selectedTheme}
        />

        <VocabularyRhythmPanel
          selectedFilterLabel={selectedFilterLabel}
          vocabularyRhythmWindowLabel={vocabularyRhythmWindowLabel}
          tone={selectedTheme.softSection}
          visibleActivity={visibleVocabularyRhythmActivity}
          summary={vocabularyRhythmSummary}
          studySignals={studySignals}
          showFullVocabularyRhythm={showFullVocabularyRhythm}
          formatPercent={formatPercent}
          onToggleFullVocabularyRhythm={() => setShowFullVocabularyRhythm((prev) => !prev)}
        />

          <VocabularyDistributionPanels
            selectedFilterLabel={selectedFilterLabel}
            sectionTone={selectedTheme.section}
            wordsByBookTypePie={wordsByBookTypePie}
            wordiestBooks={wordiestBooks}
            densestBooks={densestBooks}
            vocabularyTypeMetrics={vocabularyTypeMetrics}
            recentWords={recentWords}
            formatDecimal={formatDecimal}
          />
      </div>
    </main>
  );
}
