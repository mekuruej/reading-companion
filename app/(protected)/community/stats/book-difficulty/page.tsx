// Book Difficulty

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

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

function formatDecimal(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
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
  return `${value} star${value === 1 ? "" : "s"}`;
}

function difficultyLabel(value: number | null | undefined) {
  if (value == null) return "Unrated";

  const labels: Record<number, string> = {
    1: "Very easy",
    2: "Comfortable",
    3: "Manageable",
    4: "Challenging",
    5: "Very hard",
  };

  return labels[value] ?? `${value}`;
}

function teacherUseLabel(value: string | number | null | undefined) {
  if (value == null || value === "") return "Unrated";

  const raw = String(value);

  const labels: Record<string, string> = {
    "1": "Not a fit",
    "2": "Maybe",
    "3": "Good fit",
    "4": "Strong fit",
    "5": "Excellent fit",
    not_fit: "Not a fit",
    maybe: "Maybe",
    good: "Good fit",
    strong: "Strong fit",
    excellent: "Excellent fit",
  };

  return labels[raw] ?? raw.replaceAll("_", " ");
}

function pageCountBucket(pageCount: number | null | undefined) {
  if (!pageCount || pageCount <= 0) return "Unknown pages";
  if (pageCount <= 40) return "Short";
  if (pageCount <= 120) return "Medium";
  if (pageCount <= 250) return "Long";
  return "Big book";
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

export default function BookDifficultyPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState<UserBookRow[]>([]);

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

  const finishedRows = useMemo(
    () => rows.filter((row) => row.finished_at),
    [rows]
  );

  const ratedDifficultyRows = useMemo(
    () => rows.filter((row) => row.rating_difficulty != null),
    [rows]
  );

  const ratedOverallRows = useMemo(
    () => rows.filter((row) => row.rating_overall != null),
    [rows]
  );

  const recommendedRows = useMemo(
    () => rows.filter((row) => row.recommended_level),
    [rows]
  );

  const dnfRows = useMemo(() => rows.filter((row) => row.dnf_at), [rows]);

  const totals = useMemo(() => {
    const difficultyValues = ratedDifficultyRows
      .map((row) => row.rating_difficulty)
      .filter((value): value is number => value != null);

    const overallValues = ratedOverallRows
      .map((row) => row.rating_overall)
      .filter((value): value is number => value != null);

    const recommendValues = rows
      .map((row) => row.rating_recommend)
      .filter((value): value is number => value != null);

    return {
      totalBooks: rows.length,
      finishedBooks: finishedRows.length,
      dnfBooks: dnfRows.length,
      ratedDifficulty: ratedDifficultyRows.length,
      averageDifficulty: average(difficultyValues),
      averageOverall: average(overallValues),
      averageRecommend: average(recommendValues),
      recommendedLevelCount: recommendedRows.length,
    };
  }, [rows, finishedRows, dnfRows, ratedDifficultyRows, ratedOverallRows, recommendedRows]);

  const bookTypeCounts = useMemo(
    () => countByLabel(rows, (row) => bookTypeLabel(row.books?.book_type)),
    [rows]
  );

  const pageBucketCounts = useMemo(
    () => countByLabel(rows, (row) => pageCountBucket(row.books?.page_count)),
    [rows]
  );

  const difficultyCounts = useMemo(
    () => countByLabel(rows, (row) => difficultyLabel(row.rating_difficulty)),
    [rows]
  );

  const overallRatingCounts = useMemo(
    () => countByLabel(rows, (row) => ratingLabel(row.rating_overall)),
    [rows]
  );

  const teacherUseCounts = useMemo(
    () => countByLabel(rows, (row) => teacherUseLabel(row.teacher_student_use_rating)),
    [rows]
  );

  const recommendedLevelCounts = useMemo(
    () =>
      countByLabel(rows, (row) => row.recommended_level ?? "No level yet"),
    [rows]
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

  const recommendedLevelPie = useMemo(
    () =>
      recommendedLevelCounts.map((item, index) => ({
        ...item,
        color: palette[index % palette.length],
      })),
    [recommendedLevelCounts]
  );

  const hardestBooks = useMemo(() => {
    return [...rows]
      .filter((row) => row.rating_difficulty != null)
      .sort((a, b) => (b.rating_difficulty ?? 0) - (a.rating_difficulty ?? 0))
      .slice(0, 8);
  }, [rows]);

  const easiestBooks = useMemo(() => {
    return [...rows]
      .filter((row) => row.rating_difficulty != null)
      .sort((a, b) => (a.rating_difficulty ?? 999) - (b.rating_difficulty ?? 999))
      .slice(0, 8);
  }, [rows]);

  const readerFitRows = useMemo(() => {
    return [...rows]
      .filter(
        (row) =>
          row.rating_difficulty != null ||
          row.rating_overall != null ||
          row.rating_recommend != null ||
          row.recommended_level
      )
      .slice(0, 16);
  }, [rows]);

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

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Book insight
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Book Difficulty
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Difficulty ratings, reader-fit signals, book categories, and the
              patterns that help MEKURU understand what kinds of books fit you.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Books Tracked"
            value={totals.totalBooks}
            hint={`${totals.finishedBooks} finished · ${totals.dnfBooks} DNF`}
            tone="border-indigo-200 bg-indigo-50"
          />

          <StatCard
            label="Avg Difficulty"
            value={formatDecimal(totals.averageDifficulty)}
            hint={`${totals.ratedDifficulty} difficulty ratings`}
            tone="border-amber-200 bg-amber-50"
          />

          <StatCard
            label="Avg Overall"
            value={formatDecimal(totals.averageOverall)}
            hint="Your overall book ratings"
            tone="border-emerald-200 bg-emerald-50"
          />

          <StatCard
            label="Recommended Levels"
            value={totals.recommendedLevelCount}
            hint="Books with reader-level signals"
            tone="border-violet-200 bg-violet-50"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <SectionBand
            eyebrow="Book types"
            title="Library shape"
            description="A count-based view of what kinds of books are currently in this reading life."
            tone="border-slate-200 bg-white"
          >
            <PieChart items={bookTypePie} size={190} />
          </SectionBand>

          <SectionBand
            eyebrow="Difficulty"
            title="Difficulty ratings"
            description="How your books are distributed across your own difficulty ratings."
            tone="border-slate-200 bg-white"
          >
            <PieChart items={difficultyPie} size={190} />
          </SectionBand>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow="Page count"
            title="Book length buckets"
            description="A rough look at whether your library is made of short, medium, long, or big books."
            tone="border-slate-200 bg-white"
          >
            <BarStrip
              items={pageBucketCounts}
              colorClass="bg-sky-500"
              valueSuffix=" books"
            />
          </SectionBand>

          <SectionBand
            eyebrow="Reader fit"
            title="Recommended level spread"
            description="How your books are currently distributed by recommended reading level."
            tone="border-slate-200 bg-white"
          >
            <PieChart items={recommendedLevelPie} size={180} />
          </SectionBand>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow="Hardest"
            title="Books that pushed back"
            description="Books with the highest difficulty ratings."
            tone="border-slate-200 bg-white"
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
            eyebrow="Easiest"
            title="Books that felt comfortable"
            description="Books with the lowest difficulty ratings."
            tone="border-slate-200 bg-white"
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

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow="Ratings"
            title="Overall rating spread"
            description="A simple view of how your overall ratings are distributed."
            tone="border-slate-200 bg-white"
          >
            <BarStrip
              items={overallRatingCounts}
              colorClass="bg-indigo-500"
              valueSuffix=" books"
            />
          </SectionBand>

          <SectionBand
            eyebrow="Teaching / student use"
            title="Teaching-fit ratings"
            description="If you use MEKURU for lessons, this shows how books are rated for student use."
            tone="border-slate-200 bg-white"
          >
            <BarStrip
              items={teacherUseCounts}
              colorClass="bg-violet-500"
              valueSuffix=" books"
            />
          </SectionBand>
        </div>

        <SectionBand
          eyebrow="Reader-fit table"
          title="Book difficulty details"
          description="A compact table of the books that currently have rating or level signals."
          tone="border-slate-200 bg-white"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Book</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Difficulty</th>
                  <th className="px-3 py-2">Overall</th>
                  <th className="px-3 py-2">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {readerFitRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-sm text-slate-500" colSpan={5}>
                      No difficulty or reader-fit data yet.
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
                        {row.rating_difficulty ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.rating_overall ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.recommended_level ?? "—"}
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