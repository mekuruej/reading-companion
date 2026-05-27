// Book Difficulty

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import StatCard from "./components/StatCard";

type DifficultyTimeRange =
  | "all_time"
  | "this_month"
  | "past_90_days"
  | "past_6_months"
  | "past_year";

type RawBook = {
  id: string;
  title: string | null;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher: string | null;
  book_type: string | null;
  page_count: number | null;
  cover_url: string | null;
};

type RawUserBookRow = {
  id: string;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  teacher_student_use_rating: string | number | null;
  recommended_level: string | null;
  books: RawBook | RawBook[] | null;
};

type UserBookRow = {
  id: string;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  teacher_student_use_rating: string | number | null;
  recommended_level: string | null;
  books: RawBook | null;
};

type PieItem = {
  label: string;
  value: number;
  color: string;
};

const DIFFICULTY_TIME_FILTERS: {
  value: DifficultyTimeRange;
  title: string;
  description: string;
}[] = [
    {
      value: "all_time",
      title: "All Time",
      description: "Your full reader-fit library.",
    },
    {
      value: "this_month",
      title: "This Month",
      description: "Books active this month.",
    },
    {
      value: "past_90_days",
      title: "Past 90 Days",
      description: "Recent reader-fit signals.",
    },
    {
      value: "past_6_months",
      title: "Half Year",
      description: "Six months of book fit.",
    },
    {
      value: "past_year",
      title: "Past Year",
      description: "A long reader-fit view.",
    },
  ];

function difficultyTheme(value: DifficultyTimeRange) {
  if (value === "this_month") {
    return {
      pageHeader: "border-sky-300 bg-white",
      section: "border-sky-300 bg-white",
      softSection: "border-sky-300 bg-sky-50/30",
      statOne: "border-sky-300 bg-sky-50/35",
      statTwo: "border-sky-300 bg-white",
      statThree: "border-sky-300 bg-sky-50/25",
      statFour: "border-sky-300 bg-white",
      activeButton: "border-sky-600 bg-sky-600 text-white shadow-md",
      inactiveButton: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    };
  }

  if (value === "past_90_days") {
    return {
      pageHeader: "border-emerald-300 bg-white",
      section: "border-emerald-300 bg-white",
      softSection: "border-emerald-300 bg-emerald-50/30",
      statOne: "border-emerald-300 bg-emerald-50/35",
      statTwo: "border-emerald-300 bg-white",
      statThree: "border-emerald-300 bg-emerald-50/25",
      statFour: "border-emerald-300 bg-white",
      activeButton: "border-emerald-600 bg-emerald-600 text-white shadow-md",
      inactiveButton:
        "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    };
  }

  if (value === "past_6_months") {
    return {
      pageHeader: "border-violet-300 bg-white",
      section: "border-violet-300 bg-white",
      softSection: "border-violet-300 bg-violet-50/30",
      statOne: "border-violet-300 bg-violet-50/35",
      statTwo: "border-violet-300 bg-white",
      statThree: "border-violet-300 bg-violet-50/25",
      statFour: "border-violet-300 bg-white",
      activeButton: "border-violet-600 bg-violet-600 text-white shadow-md",
      inactiveButton:
        "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
    };
  }

  if (value === "past_year") {
    return {
      pageHeader: "border-amber-300 bg-white",
      section: "border-amber-300 bg-white",
      softSection: "border-amber-300 bg-amber-50/30",
      statOne: "border-amber-300 bg-amber-50/35",
      statTwo: "border-amber-300 bg-white",
      statThree: "border-amber-300 bg-amber-50/25",
      statFour: "border-amber-300 bg-white",
      activeButton: "border-amber-600 bg-amber-500 text-white shadow-md",
      inactiveButton:
        "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    };
  }

  return {
    pageHeader: "border-fuchsia-300 bg-white",
    section: "border-fuchsia-300 bg-white",
    softSection: "border-fuchsia-300 bg-fuchsia-50/30",
    statOne: "border-fuchsia-300 bg-fuchsia-50/35",
    statTwo: "border-fuchsia-300 bg-white",
    statThree: "border-fuchsia-300 bg-fuchsia-50/25",
    statFour: "border-fuchsia-300 bg-white",
    activeButton: "border-fuchsia-600 bg-fuchsia-600 text-white shadow-md",
    inactiveButton:
      "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100",
  };
}

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startDateForRange(value: DifficultyTimeRange) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (value === "this_month") {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  if (value === "past_90_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return start;
  }

  if (value === "past_6_months") {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 6);
    return start;
  }

  if (value === "past_year") {
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    return start;
  }

  return null;
}

function readerFitDate(row: UserBookRow) {
  return row.finished_at ?? row.dnf_at ?? row.started_at ?? row.created_at;
}

function isInTimeRange(row: UserBookRow, range: DifficultyTimeRange) {
  if (range === "all_time") return true;

  const start = startDateForRange(range);
  const dateString = readerFitDate(row);

  if (!start || !dateString) return false;

  const date = new Date(`${dateString.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return date >= start && date <= today;
}

function formatDecimal(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatRating(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";

  return Number(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/0$/, "");
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
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function ratingLabel(value: number | null | undefined) {
  if (value == null) return "Unrated";

  const formatted = formatRating(value);
  return `${formatted} star${value === 1 ? "" : "s"}`;
}

function difficultyLabel(value: number | null | undefined) {
  if (value == null) return "Unrated";

  const labels: Record<number, string> = {
    1: "1 · Very easy",
    1.5: "1.5 · Easy",
    2: "2 · Comfortable",
    2.5: "2.5 · Mostly manageable",
    3: "3 · Manageable",
    3.5: "3.5 · A real stretch",
    4: "4 · Challenging",
    4.5: "4.5 · Very hard",
    5: "5 · Extremely difficult",
  };

  return labels[value] ?? `${formatRating(value)} · Difficulty rating`;
}

function pageCountBucket(pageCount: number | null | undefined) {
  if (!pageCount || pageCount <= 0) return "Unknown pages";
  if (pageCount <= 40) return "Short read";
  if (pageCount <= 120) return "Medium read";
  if (pageCount <= 250) return "Long read";
  return "Big book";
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        No data yet.
      </div>
    );
  }

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

function PieChart({ items, size = 220 }: { items: PieItem[]; size?: number }) {
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

function countByLabel<T>(
  rows: T[],
  labelGetter: (row: T) => string
): { label: string; value: number }[] {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    const label = labelGetter(row);
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }

  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function balancedBookTypeRows(
  rows: UserBookRow[],
  sortRows: (a: UserBookRow, b: UserBookRow) => number,
  limit = 8,
  maxPerType = 2
) {
  const sorted = [...rows].sort(sortRows);
  const selected: UserBookRow[] = [];
  const countsByType = new Map<string, number>();

  for (const row of sorted) {
    const type = bookTypeLabel(row.books?.book_type);
    const currentCount = countsByType.get(type) ?? 0;

    if (currentCount >= maxPerType) continue;

    selected.push(row);
    countsByType.set(type, currentCount + 1);

    if (selected.length >= limit) return selected;
  }

  // If the balanced pass did not fill the list, fill the rest with the best remaining books.
  for (const row of sorted) {
    if (selected.some((selectedRow) => selectedRow.id === row.id)) continue;

    selected.push(row);

    if (selected.length >= limit) break;
  }

  return selected;
}

export default function BookDifficultyPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [timeRange, setTimeRange] =
    useState<DifficultyTimeRange>("all_time");

  useEffect(() => {
    let isMounted = true;

    async function loadBookDifficulty() {
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
          return;
        }

        const { data: userBooks, error: userBooksError } = await supabase
          .from("user_books")
          .select(
            `
              id,
              created_at,
              started_at,
              finished_at,
              dnf_at,
              rating_overall,
              rating_recommend,
              rating_difficulty,
              teacher_student_use_rating,
              recommended_level,
              books:book_id (
                id,
                title,
                author,
                translator,
                illustrator,
                publisher,
                book_type,
                page_count,
                cover_url
              )
            `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (userBooksError) throw userBooksError;

        const loadedRows: UserBookRow[] = ((userBooks ?? []) as RawUserBookRow[]).map(
          (row) => ({
            id: row.id,
            created_at: row.created_at,
            started_at: row.started_at,
            finished_at: row.finished_at,
            dnf_at: row.dnf_at,
            rating_overall: row.rating_overall,
            rating_recommend: row.rating_recommend,
            rating_difficulty: row.rating_difficulty,
            teacher_student_use_rating: row.teacher_student_use_rating,
            recommended_level: row.recommended_level,
            books: Array.isArray(row.books)
              ? row.books[0] ?? null
              : row.books ?? null,
          })
        );

        if (!isMounted) return;

        setRows(loadedRows);
      } catch (error: any) {
        console.error("Error loading book difficulty:", error);
        if (!isMounted) return;
        setErrorMsg(error?.message ?? "Could not load book difficulty.");
        setRows([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBookDifficulty();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTimeFilter = DIFFICULTY_TIME_FILTERS.find(
    (option) => option.value === timeRange
  );

  const selectedTimeLabel = selectedTimeFilter?.title ?? "All Time";
  const selectedTheme = difficultyTheme(timeRange);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => isInTimeRange(row, timeRange));
  }, [rows, timeRange]);

  const finishedRows = useMemo(
    () => filteredRows.filter((row) => row.finished_at),
    [filteredRows]
  );

  const ratedDifficultyRows = useMemo(
    () =>
      filteredRows.filter(
        (row) => row.finished_at && row.rating_difficulty != null
      ),
    [filteredRows]
  );

  const ratedOverallRows = useMemo(
    () =>
      filteredRows.filter(
        (row) => row.finished_at && row.rating_overall != null
      ),
    [filteredRows]
  );

  const ratedBooks = useMemo(
    () =>
      filteredRows.filter(
        (row) =>
          row.finished_at &&
          (row.rating_difficulty != null || row.rating_overall != null)
      ),
    [filteredRows]
  );

  const dnfRows = useMemo(
    () => filteredRows.filter((row) => row.dnf_at),
    [filteredRows]
  );

  const totals = useMemo(() => {
    const difficultyValues = ratedDifficultyRows
      .map((row) => row.rating_difficulty)
      .filter((value): value is number => value != null);

    const overallValues = ratedOverallRows
      .map((row) => row.rating_overall)
      .filter((value): value is number => value != null);

    const recommendValues = filteredRows
      .map((row) => row.rating_recommend)
      .filter((value): value is number => value != null);

    return {
      totalBooks: filteredRows.length,
      finishedBooks: finishedRows.length,
      dnfBooks: dnfRows.length,
      ratedDifficulty: ratedDifficultyRows.length,
      averageDifficulty: average(difficultyValues),
      averageOverall: average(overallValues),
      averageRecommend: average(recommendValues),
      ratedBooks: ratedBooks.length,
    };
  }, [
    filteredRows,
    finishedRows,
    dnfRows,
    ratedDifficultyRows,
    ratedOverallRows,
    ratedBooks,
  ]);

  const bookTypeCounts = useMemo(
    () => countByLabel(filteredRows, (row) => bookTypeLabel(row.books?.book_type)),
    [filteredRows]
  );

  const pageBucketCounts = useMemo(
    () => countByLabel(filteredRows, (row) => pageCountBucket(row.books?.page_count)),
    [filteredRows]
  );

  const difficultyCounts = useMemo(
    () =>
      countByLabel(ratedDifficultyRows, (row) =>
        difficultyLabel(row.rating_difficulty)
      ),
    [ratedDifficultyRows]
  );

  const overallRatingCounts = useMemo(
    () => countByLabel(ratedOverallRows, (row) => ratingLabel(row.rating_overall)),
    [ratedOverallRows]
  );

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

  const bookTypePie = useMemo(
    () =>
      bookTypeCounts.map((item, index) => ({
        ...item,
        color: palette[index % palette.length],
      })),
    [bookTypeCounts]
  );

  const difficultyPie = useMemo(
    () =>
      difficultyCounts.map((item, index) => ({
        ...item,
        color: palette[index % palette.length],
      })),
    [difficultyCounts]
  );

  const finishedRatedDifficultyRows = useMemo(
    () =>
      filteredRows.filter(
        (row) => row.finished_at && row.rating_difficulty != null
      ),
    [filteredRows]
  );

  const hardestBooks = useMemo(() => {
    const pushedBackRows = finishedRatedDifficultyRows.filter(
      (row) => row.rating_difficulty === 5
    );

    return balancedBookTypeRows(
      pushedBackRows,
      (a, b) => (a.books?.title ?? "").localeCompare(b.books?.title ?? ""),
      8,
      2
    );
  }, [finishedRatedDifficultyRows]);

  const easiestBooks = useMemo(() => {
    const comfortableRows = finishedRatedDifficultyRows.filter(
      (row) => row.rating_difficulty === 1
    );

    return balancedBookTypeRows(
      comfortableRows,
      (a, b) => (a.books?.title ?? "").localeCompare(b.books?.title ?? ""),
      8,
      2
    );
  }, [finishedRatedDifficultyRows]);

  const readerFitRows = useMemo(() => {
    const ratedRows = filteredRows.filter(
      (row) =>
        row.finished_at &&
        (row.rating_difficulty != null ||
          row.rating_overall != null ||
          row.rating_recommend != null)
    );

    return balancedBookTypeRows(
      ratedRows,
      (a, b) => {
        const entertainmentDiff =
          (b.rating_overall ?? -1) - (a.rating_overall ?? -1);

        if (entertainmentDiff !== 0) return entertainmentDiff;

        // Lower ease rating means harder, so this puts harder books first as a tie-breaker.
        return (a.rating_difficulty ?? 999) - (b.rating_difficulty ?? 999);
      },
      16,
      3
    );
  }, [filteredRows]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-sm text-slate-600">Loading book difficulty…</div>
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

          <div
            className={`mt-5 rounded-3xl border-2 p-5 shadow-sm ${selectedTheme.pageHeader}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Reader fit
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Book Difficulty
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              A reader-fit view of your books for {selectedTimeLabel.toLowerCase()}:
              what felt comfortable, what pushed back, what you enjoyed, and how
              those signals compare across different book types.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <SectionBand
          eyebrow={`Time range — ${selectedTimeLabel}`}
          title={selectedTimeLabel}
          description="Choose the reader-fit window. Time ranges use a book’s finished date when available, then DNF, started, or added date."
          tone={selectedTheme.section}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {DIFFICULTY_TIME_FILTERS.map((option) => {
              const selected = timeRange === option.value;
              const optionTheme = difficultyTheme(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeRange(option.value)}
                  className={`rounded-xl border-2 px-3 py-2 text-left transition ${selected
                    ? optionTheme.activeButton
                    : optionTheme.inactiveButton
                    }`}
                >
                  <div className="text-sm font-black">{option.title}</div>
                  <div
                    className={`mt-0.5 text-xs leading-4 ${selected ? "text-white/85" : ""
                      }`}
                  >
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </SectionBand>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Books Tracked"
            value={totals.totalBooks}
            hint={`${totals.finishedBooks} finished · ${totals.dnfBooks} DNF`}
            tone={selectedTheme.statOne}
          />

          <StatCard
            label="Avg Difficulty"
            value={formatDecimal(totals.averageDifficulty)}
            hint={`${totals.ratedDifficulty} finished ratings · 1 easy / 5 hard`}
            tone={selectedTheme.statTwo}
          />

          <StatCard
            label="Avg Entertainment"
            value={formatDecimal(totals.averageOverall)}
            hint="Finished-book entertainment ratings"
            tone={selectedTheme.statThree}
          />

          <StatCard
            label="Rated Books"
            value={totals.ratedBooks}
            hint="Finished books with ease or entertainment ratings"
            tone={selectedTheme.statFour}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <SectionBand
            eyebrow={`Book types — ${selectedTimeLabel}`}
            title="Book types in your difficulty data"
            description="A count-based view of the kinds of books included in this reader-fit picture."
            tone={selectedTheme.section}
          >
            <PieChart items={bookTypePie} size={190} />
          </SectionBand>

          <SectionBand
            eyebrow={`Difficulty — ${selectedTimeLabel}`}
            title="Difficulty ratings"
            description="How your finished books are distributed across your own ratings. Here, 1 means easiest and 5 means hardest."
            tone={selectedTheme.softSection}
          >
            <PieChart items={difficultyPie} size={190} />
          </SectionBand>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow={`Page count — ${selectedTimeLabel}`}
            title="Book length"
            description="A simple look at which length of book you prefer."
            tone={selectedTheme.section}
          >
            <BarStrip
              items={pageBucketCounts}
              colorClass="bg-sky-500"
              valueSuffix=" books"
            />
          </SectionBand>

          <SectionBand
            eyebrow={`Entertainment — ${selectedTimeLabel}`}
            title="Entertainment rating spread"
            description="A simple view of how your enjoyment ratings are distributed."
            tone={selectedTheme.section}
          >
            <BarStrip
              items={overallRatingCounts}
              colorClass="bg-indigo-500"
              valueSuffix=" books"
            />
          </SectionBand>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow={`Hardest — ${selectedTimeLabel}`}
            title="Books that pushed back"
            description="A representative mix of finished books rated 5 for difficulty. These are the books that pushed back most, relative to their book types."
            tone={selectedTheme.section}
          >
            <BarStrip
              items={hardestBooks.map((row) => ({
                label: row.books?.title ?? "Untitled book",
                value: row.rating_difficulty ?? 0,
              }))}
              colorClass="bg-red-500"
              valueSuffix=""
            />
          </SectionBand>

          <SectionBand
            eyebrow={`Easiest — ${selectedTimeLabel}`}
            title="Books that felt comfortable"
            description="A representative mix of finished books rated 1 for difficulty. These are the books that felt most comfortable, relative to their book types."
            tone={selectedTheme.section}
          >
            <BarStrip
              items={easiestBooks.map((row) => ({
                label: row.books?.title ?? "Untitled book",
                value: row.rating_difficulty ?? 0,
              }))}
              colorClass="bg-emerald-500"
              valueSuffix=""
            />
          </SectionBand>
        </div>

        <SectionBand
          eyebrow={`Reader-fit table — ${selectedTimeLabel}`}
          title="Reader-fit details"
          description="A compact table of finished books with ease and entertainment ratings. Keep in mind these ratings are most useful relative to each book’s type."
          tone={selectedTheme.section}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Book</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Ease rating</th>
                  <th className="px-3 py-2">Entertainment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {readerFitRows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-4 text-sm text-slate-500"
                      colSpan={4}
                    >
                      No difficulty or reader-fit data in this window yet.
                    </td>
                  </tr>
                ) : (
                  readerFitRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.books?.title ?? "Untitled book"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {bookTypeLabel(row.books?.book_type)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatRating(row.rating_difficulty)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatRating(row.rating_overall)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionBand>
      </div>
    </main>
  );
}
