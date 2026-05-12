// Vocabulary Growth

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

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

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function wordKey(word: WordRow) {
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

function formatDecimal(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function StatCard({
  label,
  value,
  hint,
  tone = "border-slate-200 bg-white",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
      <div className="text-xs font-medium uppercase text-slate-600">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
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
      {items.map((item) => (
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
      ))}
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

export default function VocabularyGrowthPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [words, setWords] = useState<WordRow[]>([]);
  const [bookCategoryFilter, setBookCategoryFilter] =
    useState<BookCategoryFilter>("all");

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
          return;
        }

        const [
          { data: sessionData, error: sessionError },
          { data: wordData, error: wordError },
        ] = await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select(
              "user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler"
            )
            .in("user_book_id", userBookIds),
          supabase
            .from("user_book_words")
            .select("id, user_book_id, created_at, surface, reading, meaning")
            .in("user_book_id", userBookIds),
        ]);

        if (sessionError) throw sessionError;
        if (wordError) throw wordError;

        if (!isMounted) return;

        setRows(loadedRows);
        setSessions(
          ((sessionData ?? []) as SessionRow[]).filter((row) => !row.is_filler)
        );
        setWords((wordData ?? []) as WordRow[]);
      } catch (error: any) {
        console.error("Error loading vocabulary growth:", error);
        if (!isMounted) return;
        setErrorMsg(error?.message ?? "Could not load vocabulary growth.");
        setRows([]);
        setSessions([]);
        setWords([]);
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

  const monthlyWords = useMemo(() => {
    return filteredWords.filter((word) => isThisMonth(word.created_at));
  }, [filteredWords]);

  const selectedFilter = BOOK_CATEGORY_FILTERS.find(
    (option) => option.value === bookCategoryFilter
  );

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

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Vocabulary growth
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Vocabulary Growth
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Saved words, word density, and the books that are stretching your
              Japanese vocabulary.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <SectionBand
          eyebrow="Book category"
          title={selectedFilter?.title ?? "All Reading"}
          description="Choose a broad kind of reading material. This changes the vocabulary totals, charts, and book examples below."
          tone="border-sky-300 bg-white"
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
            hint="All saved vocabulary"
            tone="border-violet-200 bg-violet-50"
          />
          <StatCard
            label="Unique Words"
            value={vocabularyTotals.uniqueWords}
            hint="Surface + reading + meaning"
            tone="border-indigo-200 bg-indigo-50"
          />
          <StatCard
            label="This Month"
            value={vocabularyTotals.monthlyWordsSaved}
            hint={`${vocabularyTotals.monthlyUniqueWords} unique this month`}
            tone="border-emerald-200 bg-emerald-50"
          />
          <StatCard
            label="Words Per Page"
            value={
              vocabularyTotals.wordsPerPage == null
                ? "—"
                : formatDecimal(vocabularyTotals.wordsPerPage)
            }
            hint={`${vocabularyTotals.pagesRead} pages counted`}
            tone="border-amber-200 bg-amber-50"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <SectionBand
            eyebrow="Book type"
            title="Words saved by book type"
            description="A word-weighted view of which kinds of books are adding the most vocabulary to your library."
            tone="border-slate-200 bg-white"
          >
            <PieChart items={wordsByBookTypePie} size={190} />
          </SectionBand>

          <SectionBand
            eyebrow="Word volume"
            title="Vocabulary-heavy books"
            description="These books have contributed the most saved words overall."
            tone="border-slate-200 bg-white"
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
            title="Words per page"
            description="This is often a better difficulty signal than raw word count because it accounts for how much you read."
            tone="border-slate-200 bg-white"
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
                                ...(densestBooks.map(
                                  (book) => book.wordsPerPage ?? 0
                                ))
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
            title="Vocabulary by category"
            description="A table version for comparing book categories without guessing from the chart."
            tone="border-slate-200 bg-white"
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
          title="Recently saved words"
          description="A quick reminder of the newest words entering your reading life."
          tone="border-slate-200 bg-white"
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
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
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