// Vocabulary Growth
// All-time vocabulary growth + saved words → study rhythm.

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import StatCard from "./components/StatCard";
import SmallMetricCard from "./components/SmallMetricCard";

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



function SectionBand({
  eyebrow,
  title,
  description,
  children,
  tone = "border-slate-200 bg-white",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <section className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
      <div className="mb-4">
        <div className="text-xs font-medium uppercase text-slate-600">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function BarStrip({
  items,
  colorClass,
  valueSuffix = "",
}: {
  items: { label: string; value: number }[];
  colorClass: string;
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          No data yet.
        </div>
      ) : (
        items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{item.label}</span>
              <span className="shrink-0 font-medium text-slate-900">
                {item.value}
                {valueSuffix}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${colorClass}`}
                style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PieChart({
  items,
  size = 220,
}: {
  items: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const filtered = items.filter((item) => item.value > 0);
  const total = filtered.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        No data yet
      </div>
    );
  }

  let running = -Math.PI / 2;

  const paths = filtered.map((item) => {
    const angle = (item.value / total) * Math.PI * 2;
    const startAngle = running;
    const endAngle = running + angle;
    running = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return { ...item, d, percent: (item.value / total) * 100 };
  });

  const compact = size <= 180;

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center"
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto"
      >
        {paths.length === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={paths[0].color}
            stroke="white"
            strokeWidth="3"
          />
        ) : (
          paths.map((item) => (
            <path
              key={item.label}
              d={item.d}
              fill={item.color}
              stroke="white"
              strokeWidth="3"
            />
          ))
        )}
        <circle cx={cx} cy={cy} r={radius * 0.48} fill="white" />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-slate-500 text-[11px] font-medium uppercase"
        >
          Total
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className="fill-slate-900 text-[18px] font-semibold"
        >
          {total}
        </text>
      </svg>

      <div className={compact ? "space-y-2" : "space-y-3"}>
        {paths.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between gap-2 rounded-xl bg-slate-50 ${compact ? "px-2.5 py-2" : "px-3 py-2"
              }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"
                  } shrink-0 rounded-full`}
                style={{ backgroundColor: item.color }}
              />
              <span
                className={`min-w-0 truncate text-slate-700 ${compact ? "text-xs" : "text-sm"
                  }`}
                title={item.label}
              >
                {item.label}
              </span>
            </div>
            <div
              className={`shrink-0 font-medium text-slate-900 ${compact ? "text-xs" : "text-sm"
                }`}
            >
              {item.value}{" "}
              <span className="text-slate-500">
                ({formatDecimal(item.percent)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-sm text-slate-600">Loading vocabulary growth…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <Link
            href="/community/stats"
            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← Back to Stats Home
          </Link>

          <div className={`mt-5 rounded-3xl border-2 p-5 shadow-sm ${selectedTheme.pageHeader}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Vocabulary growth
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              All-time Vocabulary Growth
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              An all-time look at the vocabulary you’ve saved while reading
              Japanese: word volume, word density, and which books are feeding
              the stickiest study cards.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <SectionBand
          eyebrow={`Book category — ${selectedFilterLabel}`}
          title={selectedFilterLabel}
          description="Choose a broad kind of reading material. This changes the vocabulary totals, charts, study rhythm, and book examples below."
          tone={selectedTheme.section}
        >
          <div className="grid gap-3 md:grid-cols-4">
            {BOOK_CATEGORY_FILTERS.map((option) => {
              const selected = bookCategoryFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBookCategoryFilter(option.value)}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition ${selected ? option.activeClass : option.inactiveClass
                    }`}
                >
                  <div className="text-base font-black">{option.title}</div>
                  <div
                    className={`mt-1 text-sm leading-5 ${selected ? "text-white/85" : ""
                      }`}
                  >
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {filteredVocabularyBookMetrics.length}
            </span>{" "}
            book{filteredVocabularyBookMetrics.length === 1 ? "" : "s"} with vocabulary
            data included in this category.
          </p>
        </SectionBand>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Words Saved"
            value={vocabularyTotals.wordsSaved}
            hint="All-time saved vocabulary"
            tone={selectedTheme.statOne}
          />
          <StatCard
            label="Unique Words"
            value={vocabularyTotals.uniqueWords}
            hint="Surface + reading + meaning"
            tone={selectedTheme.statTwo}
          />
          <StatCard
            label="This Month"
            value={vocabularyTotals.monthlyWordsSaved}
            hint={`${vocabularyTotals.monthlyUniqueWords} unique this month`}
            tone={selectedTheme.statThree}
          />
          <StatCard
            label="Words Per Page"
            value={
              vocabularyTotals.wordsPerPage == null
                ? "—"
                : formatDecimal(vocabularyTotals.wordsPerPage)
            }
            hint={`${vocabularyTotals.pagesRead} pages counted`}
            tone={selectedTheme.statFour}
          />
        </div>

        <SectionBand
          eyebrow="Vocabulary Rhythm"
          title={`Saved words → study rhythm — ${selectedFilterLabel}`}
          description={`${vocabularyRhythmWindowLabel}: which days you saved vocabulary and which days you came back to study it. This respects the book category filter above.`}
          tone={selectedTheme.softSection}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-800">
              Showing: {vocabularyRhythmWindowLabel}
            </div>

            <button
              type="button"
              onClick={() => setShowFullVocabularyRhythm((prev) => !prev)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {showFullVocabularyRhythm ? "Collapse to recent 90 days" : "Show full past year"}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))] xl:grid-cols-[repeat(28,minmax(0,1fr))]">
            {visibleVocabularyRhythmActivity.map((item, index) => {
              const hasSavedWords = item.words > 0;
              const hasStudy = item.studyEvents > 0;
              const intensity = item.words + item.studyEvents;
              const previousItem = visibleVocabularyRhythmActivity[index - 1];
              const startsMonth =
                index === 0 || item.day.slice(0, 7) !== previousItem?.day.slice(0, 7);

              const monthLabel = new Date(`${item.day}T00:00:00`).toLocaleString("en-US", {
                month: "short",
              }).toUpperCase();

              const monthTextClass =
                hasSavedWords || hasStudy ? "text-white drop-shadow-sm" : "text-slate-500";

              const colorClass =
                !hasSavedWords && !hasStudy
                  ? "bg-slate-100"
                  : hasSavedWords && hasStudy
                    ? intensity < 5
                      ? "bg-violet-300"
                      : intensity < 12
                        ? "bg-violet-500"
                        : "bg-violet-700"
                    : hasStudy
                      ? intensity < 5
                        ? "bg-sky-300"
                        : intensity < 12
                          ? "bg-sky-500"
                          : "bg-sky-700"
                      : intensity < 3
                        ? "bg-amber-200"
                        : intensity < 8
                          ? "bg-amber-400"
                          : "bg-amber-600";

              return (
                <div key={item.day} className="space-y-1">
                  <div
                    className={`relative h-10 rounded-lg border border-white/70 ${colorClass}`}
                    title={`${item.day}: ${item.words} saved word${item.words === 1 ? "" : "s"
                      }, ${item.studyEvents} study card${item.studyEvents === 1 ? "" : "s"
                      }`}
                  >
                    {startsMonth ? (
                      <span
                        className={`absolute left-1 top-1 text-[8px] font-black tracking-wide ${monthTextClass}`}
                      >
                        {monthLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-center text-[9px] text-slate-500">
                    {item.day.slice(8)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              Saved words
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500" />
              Studied
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-violet-500" />
              Saved + studied
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SmallMetricCard
              label="Active vocab days"
              value={vocabularyRhythmSummary.activeVocabularyDays}
              hint="Saved or studied"
            />
            <SmallMetricCard
              label="Saved word days"
              value={vocabularyRhythmSummary.savedWordDays}
              hint="Words entered the system"
            />
            <SmallMetricCard
              label="Study days"
              value={vocabularyRhythmSummary.studyDays}
              hint="Book Study or Kanji practice"
            />
            <SmallMetricCard
              label="Words saved"
              value={vocabularyRhythmSummary.wordsSaved}
              hint={vocabularyRhythmWindowLabel}
            />
            <SmallMetricCard
              label="Cards reviewed"
              value={vocabularyRhythmSummary.studyEvents}
              hint={vocabularyRhythmWindowLabel}
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Study rhythm
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-600">
              {vocabularyRhythmSummary.wordsSaved === 0 &&
                vocabularyRhythmSummary.studyEvents === 0
                ? "No vocabulary activity in this window yet. Save words while reading, then review a few cards to start building a rhythm."
                : vocabularyRhythmSummary.studyEvents === 0
                  ? `You saved ${vocabularyRhythmSummary.wordsSaved} word${vocabularyRhythmSummary.wordsSaved === 1 ? "" : "s"
                  } in this window, but haven’t studied them yet.`
                  : vocabularyRhythmSummary.wordsSaved === 0
                    ? `You reviewed ${vocabularyRhythmSummary.studyEvents} card${vocabularyRhythmSummary.studyEvents === 1 ? "" : "s"
                    } in this window, but did not save new words.`
                    : `You saved ${vocabularyRhythmSummary.wordsSaved} word${vocabularyRhythmSummary.wordsSaved === 1 ? "" : "s"
                    } and reviewed ${vocabularyRhythmSummary.studyEvents} card${vocabularyRhythmSummary.studyEvents === 1 ? "" : "s"
                    } in this window. ${vocabularyRhythmSummary.overlapDays} day${vocabularyRhythmSummary.overlapDays === 1 ? "" : "s"
                    } included both saving and studying.`}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SmallMetricCard
                label="Unique words studied"
                value={studySignals.studiedWords}
              />
              <SmallMetricCard
                label="Books represented"
                value={studySignals.studiedBooks}
              />
              <SmallMetricCard
                label="Study accuracy"
                value={formatPercent(studySignals.accuracyPercent)}
                hint="Correct ÷ answered"
              />
            </div>

            {studySignals.answerMixItems.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {studySignals.answerMixItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.colorClass}`} />
                      <div className="text-[11px] text-slate-500">{item.label}</div>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Books with sticky study words
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Books rise here when their study cards have more missed answers.
              This is about vocabulary/kanji friction by source book, not color movement.
            </p>

            {studySignals.bookStudyItems.length === 0 ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No book-linked study cards yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {studySignals.bookStudyItems.map((book) => {
                  const answered = book.correct + book.incorrect;
                  const stickyPercent =
                    answered > 0 ? Math.round((book.incorrect / answered) * 100) : null;

                  return (
                    <div
                      key={book.userBookId}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-950">
                            {book.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {book.studyTypeLabel}
                            {book.studyTypeDetail ? ` · ${book.studyTypeDetail}` : ""}
                          </div>
                        </div>

                        <div className="text-right text-xs text-slate-500">
                          <div>
                            Accuracy:{" "}
                            <span className="font-semibold text-slate-900">
                              {formatPercent(book.accuracyPercent)}
                            </span>
                          </div>
                          <div>
                            Still sticky:{" "}
                            <span className="font-semibold text-slate-900">
                              {book.incorrect}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <SmallMetricCard label="Cards" value={book.total} />
                        <SmallMetricCard label="Correct" value={book.correct} />
                        <SmallMetricCard label="Sticky" value={book.incorrect} />
                        <SmallMetricCard
                          label="Sticky rate"
                          value={stickyPercent == null ? "—" : `${stickyPercent}%`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionBand>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <SectionBand
            eyebrow="Book type"
            title={`All-time words saved by book type — ${selectedFilterLabel}`}
            description="A word-weighted view of which kinds of books are adding the most vocabulary to your library."
            tone={selectedTheme.section}
          >
            <PieChart items={wordsByBookTypePie} size={190} />
          </SectionBand>

          <SectionBand
            eyebrow="Word volume"
            title={`Vocabulary-heavy books — ${selectedFilterLabel}`}
            description="These books have contributed the most saved words overall."
            tone={selectedTheme.section}
          >
            <BarStrip
              items={wordiestBooks.map((item) => ({
                label: item.title,
                value: item.wordsSaved,
              }))}
              colorClass="bg-violet-500"
              valueSuffix=" words"
            />
          </SectionBand>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow="Density"
            title={`Words per page — ${selectedFilterLabel}`}
            description="This is often a better difficulty signal than raw word count because it accounts for how much you read."
            tone={selectedTheme.section}
          >
            <div className="space-y-3">
              {densestBooks.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  No word-density data yet.
                </div>
              ) : (
                densestBooks.map((item) => (
                  <div key={item.userBookId}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-700">
                        {item.title}
                      </span>
                      <span className="shrink-0 font-medium text-slate-900">
                        {formatDecimal(item.wordsPerPage)} / page
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${Math.max(
                            6,
                            ((item.wordsPerPage ?? 0) /
                              Math.max(
                                1,
                                ...densestBooks.map(
                                  (book) => book.wordsPerPage ?? 0
                                )
                              )) *
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionBand>

          <SectionBand
            eyebrow="Book type table"
            title={`Vocabulary by category — ${selectedFilterLabel}`}
            description="A table version for comparing book categories without guessing from the chart."
            tone={selectedTheme.section}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Words</th>
                    <th className="px-3 py-2">Pages</th>
                    <th className="px-3 py-2">Words/page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {vocabularyTypeMetrics.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-4 text-sm text-slate-500"
                        colSpan={4}
                      >
                        No vocabulary data yet.
                      </td>
                    </tr>
                  ) : (
                    vocabularyTypeMetrics.map((item) => (
                      <tr key={item.bookType}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {item.bookType}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.wordsSaved}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.pagesRead}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatDecimal(item.wordsPerPage)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionBand>
        </div>

        <SectionBand
          eyebrow="Recent saves"
          title={`Recently saved words — ${selectedFilterLabel}`}
          description="A quick reminder of the newest words entering your reading life."
          tone={selectedTheme.section}
        >
          {recentWords.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              No saved words yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentWords.map((word) => (
                <div
                  key={word.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="text-base font-semibold text-slate-950">
                    {word.surface || "—"}
                  </div>
                  {word.reading ? (
                    <div className="mt-0.5 text-xs text-slate-500">
                      {word.reading}
                    </div>
                  ) : null}
                  <div className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
                    {word.meaning || "No meaning saved"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionBand>
      </div>
    </main>
  );
}
