// Stats
//

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DateRange = "7d" | "30d" | "90d" | "1y" | "all";
type StatsTab = "library" | "life" | "skill" | "vocabulary" | "teacherSupport";
type SessionMode = "fluid" | "curiosity" | "listening" | string;

type BookType =
  | "picture_book"
  | "early_reader"
  | "chapter_book"
  | "middle_grade"
  | "ya"
  | "novel"
  | "short_story"
  | "manga"
  | "nonfiction"
  | "essay"
  | "memoir"
  | "textbook"
  | "other"
  | null;

type AbilityReadingGroup = "image_supported" | "bridge_books" | "text_dense";
type AbilityReadingFilter = "all" | AbilityReadingGroup;

type BookRow = {
  id: string;
  title: string;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher: string | null;
  book_type: BookType;
  page_count: number | null;
  cover_url: string | null;
};

type UserBookRow = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  teacher_student_use_rating: number | null;
  recommended_level: string | null;
  books: BookRow | null;
};

type RawUserBookRow = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  teacher_student_use_rating: number | null;
  recommended_level: string | null;
  books: BookRow | BookRow[] | null;
};

type SessionRow = {
  user_book_id: string;
  read_on: string | null;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  session_mode: SessionMode | null;
  is_filler: boolean | null;
};

type WordRow = {
  user_book_id: string;
  created_at: string;
  surface: string | null;
  meaning: string | null;
};

type GenreRow = {
  book_id: string;
  genre: string | null;
};

type BookMetric = {
  userBookId: string;
  title: string;
  bookType: BookType;
  coverUrl: string | null;
  pageCount: number | null;
  pagesRead: number;
  fluidPages: number;
  curiosityPages: number;
  timedFluidPages: number;
  timedCuriosityPages: number;
  timedReadingPages: number;
  wordsSaved: number;
  uniqueWords: number;
  engagementDays: number;
  curiosityMinutes: number;
  fluidMinutes: number;
  listeningMinutes: number;
  totalMinutes: number;
  averageMinutesPerPage: number | null;
  wordsPerPage: number | null;
  sessions: number;
  relationshipDays: number | null;
};

type TypeMetric = {
  bookType: string;
  pagesRead: number;
  timedPages: number;
  wordsSaved: number;
  totalMinutes: number;
  averageMinutesPerPage: number | null;
  wordsPerPage: number | null;
};

const MEKURU_LEVEL_OPTIONS = [
  {
    value: "Level 1",
    title: "Level 1",
    plain: "Absolute Beginner",
    cefr: "Pre-A1",
    jlpt: "Before N5",
    feel: "Hiragana/katakana, survival words, very guided sentences",
  },
  {
    value: "Level 2",
    title: "Level 2",
    plain: "Beginner 1",
    cefr: "A1",
    jlpt: "Early N5",
    feel: "Simple sentences, basic particles, dictionary-form verbs still hard",
  },
  {
    value: "Level 3",
    title: "Level 3",
    plain: "Beginner 2",
    cefr: "A1+",
    jlpt: "Solid N5",
    feel: "Can read graded material slowly with support",
  },
  {
    value: "Level 4",
    title: "Level 4",
    plain: "Upper Beginner",
    cefr: "A2",
    jlpt: "N4 entry",
    feel: "Longer sentences, more verb forms, lots of grammar still foggy",
  },
  {
    value: "Level 5",
    title: "Level 5",
    plain: "Pre-Intermediate",
    cefr: "A2+",
    jlpt: "Solid N4",
    feel: "Can follow simple stories, but unknown vocab blocks flow",
  },
  {
    value: "Level 6",
    title: "Level 6",
    plain: "Intermediate 1",
    cefr: "B1",
    jlpt: "N3 entry",
    feel: "Real Japanese starts becoming possible, but slow and lookup-heavy",
  },
  {
    value: "Level 7",
    title: "Level 7",
    plain: "Intermediate 2",
    cefr: "B1+",
    jlpt: "Solid N3",
    feel: "Can read easier native texts with support; nuance still hard",
  },
  {
    value: "Level 8",
    title: "Level 8",
    plain: "Upper Intermediate",
    cefr: "B2-ish",
    jlpt: "N2 entry",
    feel: "Can handle novels/articles, but kanji/vocab density hurts",
  },
  {
    value: "Level 9",
    title: "Level 9",
    plain: "Advanced",
    cefr: "B2+",
    jlpt: "Solid N2 / N1 entry",
    feel: "Reads real Japanese regularly, still misses style, implication, register",
  },
  {
    value: "Level 10",
    title: "Level 10",
    plain: "Upper Advanced",
    cefr: "C1-ish",
    jlpt: "Solid N1+",
    feel: "Can read widely with nuance, ambiguity, tone, and less hand-holding",
  },
] as const;

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMinutesAsReadableTime(totalMinutes: number) {
  if (!totalMinutes || totalMinutes <= 0) return "—";
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatDecimal(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatRangeLabel(range: DateRange) {
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  if (range === "1y") return "Last year";
  return "All time";
}

function trendBucketLabel(range: DateRange) {
  if (range === "7d" || range === "30d") return "Day";
  if (range === "90d") return "Week";
  return "Month";
}

function bookTypeLabel(bookType: BookType) {
  if (!bookType) return "Other";

  return bookType
    .split("_")
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

const ABILITY_READING_GROUP_OPTIONS: {
  value: AbilityReadingFilter;
  label: string;
  description: string;
}[] = [
    {
      value: "all",
      label: "All Reading",
      description: "Everything together",
    },
    {
      value: "image_supported",
      label: "Image-Supported",
      description: "Manga, picture books, early readers",
    },
    {
      value: "bridge_books",
      label: "Bridge Books",
      description: "Chapter books, middle grade, YA",
    },
    {
      value: "text_dense",
      label: "Text-Dense",
      description: "Novels, essays, nonfiction, textbooks",
    },
  ];

function abilityReadingGroupForBookType(bookType: BookType): AbilityReadingGroup {
  switch (bookType) {
    case "picture_book":
    case "early_reader":
    case "manga":
      return "image_supported";

    case "chapter_book":
    case "middle_grade":
    case "ya":
      return "bridge_books";

    case "novel":
    case "short_story":
    case "nonfiction":
    case "essay":
    case "memoir":
    case "textbook":
    case "other":
    default:
      return "text_dense";
  }
}

function abilityReadingGroupLabel(value: AbilityReadingFilter | AbilityReadingGroup) {
  return (
    ABILITY_READING_GROUP_OPTIONS.find((option) => option.value === value)?.label ??
    "Text-Dense"
  );
}

function genreLabel(value: string | null | undefined) {
  if (!value) return "Other";

  return value
    .split(/[_-]/)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

function difficultyLabel(value: number) {
  if (value === 1) return "Very hard for me";
  if (value === 2) return "Hard, but manageable";
  if (value === 3) return "A stretch, but okay";
  if (value === 4) return "Comfortable overall";
  return "Very comfortable";
}

function teacherUseLabel(value: number) {
  if (value === 1) return "Avoid";
  if (value === 2) return "Probably not";
  if (value === 3) return "Maybe";
  if (value === 4) return "Good fit";
  return "Strong yes";
}

function languageLearningLabel(value: number) {
  if (value === 1) return "Not useful";
  if (value === 2) return "Low potential";
  if (value === 3) return "Some potential";
  if (value === 4) return "Good material";
  return "Excellent material";
}

function recommendedLevelLabel(value: string | null | undefined) {
  const level = MEKURU_LEVEL_OPTIONS.find((option) => option.value === value);
  return level ? `${level.title} · ${level.plain}` : "Unlisted";
}

function sessionPages(row: SessionRow) {
  const start = Number(row.start_page);
  const end = Number(row.end_page);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return end - start + 1;
}

function sessionMinutes(row: SessionRow) {
  const minutes = Number(row.minutes_read);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

function hasTimedMinutes(row: SessionRow) {
  return sessionMinutes(row) > 0;
}

function safeDateDiffInDays(start: string | null, end: string | null) {
  if (!start) return null;

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function wordKey(surface: string | null, meaning: string | null) {
  return `${(surface ?? "").trim()}|||${(meaning ?? "").trim()}`;
}

function buildRangeCutoff(range: DateRange) {
  if (range === "all") return null;

  const today = startOfToday();
  const days =
    range === "7d" ? -6 :
      range === "30d" ? -29 :
        range === "90d" ? -89 :
          -364;
  return addDays(today, days);
}

function rangeDayCount(range: DateRange, sessions: SessionRow[], words: WordRow[]) {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  if (range === "1y") return 365;

  const dateValues: number[] = [];

  for (const session of sessions) {
    if (!session.read_on) continue;
    const time = new Date(session.read_on).getTime();
    if (!Number.isNaN(time)) dateValues.push(time);
  }

  for (const word of words) {
    const time = new Date(word.created_at).getTime();
    if (!Number.isNaN(time)) dateValues.push(time);
  }

  if (dateValues.length === 0) return 30;

  const earliest = new Date(Math.min(...dateValues));
  earliest.setHours(0, 0, 0, 0);
  const today = startOfToday();
  const diff = today.getTime() - earliest.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function statsTabLabel(tab: StatsTab) {
  if (tab === "life") return "Reading Life";
  if (tab === "skill") return "Reading Ability";
  if (tab === "library") return "Library";
  if (tab === "vocabulary") return "Vocabulary";
  return "Teacher Support";
}

function statsTabDescription(tab: StatsTab) {
  if (tab === "life") return "Effort, consistency, rhythm, and reading habits.";
  if (tab === "skill") return "Difficulty and support, separated by book type.";
  if (tab === "library") return "Broad bookish stats like books, authors, types, and monthly reading.";
  if (tab === "vocabulary") return "Words, kanji, repeated lookups, and vocabulary relationships.";
  return "Lesson prep, guided reading support, and teacher/student reading signals.";
}

function inRangeByDateString(dateString: string | null, cutoff: Date | null) {
  if (!cutoff) return true;
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  return date >= cutoff;
}

function paceScore(item: BookMetric) {
  return (item.wordsPerPage ?? 0) * 2 + (item.averageMinutesPerPage ?? 0);
}

function paceLabel(item: BookMetric) {
  const score = paceScore(item);

  if (score <= 0.9) return "Flowing";
  if (score <= 1.9) return "Steady";
  if (score <= 3.2) return "Support-heavy";
  return "Pushes back";
}

function SectionBand({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-4">
        {eyebrow ? <div className="text-[11px] font-semibold uppercase text-slate-500">{eyebrow}</div> : null}
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-600">{hint}</div> : null}
    </div>
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
    <div className={compact ? "space-y-4" : "grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center"}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {paths.map((item) => (
          <path
            key={item.label}
            d={item.d}
            fill={item.color}
            stroke="white"
            strokeWidth="3"
          />
        ))}
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
          <div key={item.label} className={`flex items-center justify-between gap-2 rounded-xl bg-slate-50 ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} shrink-0 rounded-full`}
                style={{ backgroundColor: item.color }}
              />
              <span className={`min-w-0 truncate text-slate-700 ${compact ? "text-xs" : "text-sm"}`} title={item.label}>
                {item.label}
              </span>
            </div>
            <div className={`shrink-0 font-medium text-slate-900 ${compact ? "text-xs" : "text-sm"}`}>
              {item.value} <span className="text-slate-500">({formatDecimal(item.percent)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({
  items,
  bucketLabel = "Month",
}: {
  items: { label: string; books: number; pages: number }[];
  bucketLabel?: string;
}) {
  const displayItems = items.length > 24 ? items.slice(-24) : items;
  const width = 760;
  const height = 320;
  const left = 64;
  const right = 76;
  const top = 26;
  const bottom = 42;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxBooks = Math.max(1, ...displayItems.map((item) => item.books));
  const maxPages = Math.max(1, ...displayItems.map((item) => item.pages));

  const pointFor = (index: number, value: number, max: number) => {
    const x = left + (displayItems.length === 1 ? innerWidth / 2 : (index / (displayItems.length - 1)) * innerWidth);
    const y = top + innerHeight - (value / max) * innerHeight;
    return { x, y };
  };

  const booksPoints = displayItems.map((item, index) => pointFor(index, item.books, maxBooks));
  const pagesPoints = displayItems.map((item, index) => pointFor(index, item.pages, maxPages));
  const totalBooks = items.reduce((sum, item) => sum + item.books, 0);
  const totalPages = items.reduce((sum, item) => sum + item.pages, 0);
  const activeBuckets = items.filter((item) => item.books > 0 || item.pages > 0);
  const peakPagesBucket = [...items].sort((a, b) => b.pages - a.pages)[0] ?? null;
  const labelEvery = displayItems.length <= 8 ? 1 : displayItems.length <= 16 ? 2 : displayItems.length <= 24 ? 4 : 6;
  const tableItems = items.length > 24 ? items.slice(-24) : items;

  const axisTickCount = Math.max(2, maxBooks <= 5 ? maxBooks + 1 : 5);

  const axisTicks = Array.from({ length: axisTickCount }, (_, index) => {
    const ratio = axisTickCount === 1 ? 0 : index / (axisTickCount - 1);

    return {
      ratio,
      y: top + innerHeight - ratio * innerHeight,
      books: Math.round(maxBooks * ratio),
      pages: Math.round(maxPages * ratio),
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="grid gap-3 p-2 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">Active {bucketLabel.toLowerCase()}s</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{activeBuckets.length}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">Books in Motion</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{totalBooks}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">Pages in range</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{totalPages}</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {axisTicks.map((tick) => (
          <g key={`axis-${tick.ratio}`}>
            <line
              x1={left}
              y1={tick.y}
              x2={width - right}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />

            <text
              x={left - 10}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-slate-500 text-[10px]"
            >
              {tick.books}
            </text>

            <text
              x={width - right + 10}
              y={tick.y + 4}
              textAnchor="start"
              className="fill-slate-500 text-[10px]"
            >
              {tick.pages}
            </text>
          </g>
        ))}

        <line
          x1={left}
          y1={top}
          x2={left}
          y2={top + innerHeight}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        <line
          x1={width - right}
          y1={top}
          x2={width - right}
          y2={top + innerHeight}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        <text x={18} y={20} className="fill-slate-500 text-[11px] font-medium">
          Books
        </text>
        <text x={width - 18} y={20} textAnchor="end" className="fill-slate-500 text-[11px] font-medium">
          Pages
        </text>

        <polyline
          fill="none"
          stroke="#60a5fa"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={booksPoints.map((point) => `${point.x},${point.y}`).join(" ")}
        />
        <polyline
          fill="none"
          stroke="#fb7185"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pagesPoints.map((point) => `${point.x},${point.y}`).join(" ")}
        />

        {booksPoints.map((point, index) => (
          <circle key={`book-${displayItems[index].label}`} cx={point.x} cy={point.y} r="4.5" fill="#60a5fa" />
        ))}
        {pagesPoints.map((point, index) => (
          <circle key={`page-${displayItems[index].label}`} cx={point.x} cy={point.y} r="4.5" fill="#fb7185" />
        ))}

        {displayItems.map((item, index) => {
          if (index !== 0 && index !== displayItems.length - 1 && index % labelEvery !== 0) return null;

          const x = left + (displayItems.length === 1 ? innerWidth / 2 : (index / (displayItems.length - 1)) * innerWidth);
          return (
            <text
              key={item.label}
              x={x}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-500 text-[11px]"
            >
              {item.label}
            </text>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="h-3 w-3 rounded-full bg-sky-400" />
          Books engaged with
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          Pages read
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[1fr_90px_90px] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
          <div>{bucketLabel}</div>
          <div className="text-right">Books</div>
          <div className="text-right">Pages</div>
        </div>
        {items.length > tableItems.length ? (
          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Showing the most recent {tableItems.length} {bucketLabel.toLowerCase()}s in the table. Summary totals above include the full selected range.
          </div>
        ) : null}
        {tableItems.map((item) => (
          <div
            key={`row-${item.label}`}
            className="grid grid-cols-[1fr_90px_90px] border-t border-slate-100 px-3 py-2 text-sm text-slate-700"
          >
            <div>{item.label}</div>
            <div className="text-right font-medium text-slate-900">{item.books}</div>
            <div className="text-right font-medium text-slate-900">{item.pages}</div>
          </div>
        ))}
      </div>

      {peakPagesBucket && peakPagesBucket.pages > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-medium uppercase text-slate-500">{bucketLabel} context</div>
          <div className="mt-2 text-sm leading-6 text-slate-700">
            Your biggest page {bucketLabel.toLowerCase()} here is {peakPagesBucket.label} with {peakPagesBucket.pages} pages. The blue line uses a separate books scale, so the table is the reliable place to read the exact numbers.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SpotlightCard({
  label,
  value,
  title,
  tone,
}: {
  label: string;
  value: string;
  title: string | null;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="text-xs font-medium uppercase text-slate-600">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-700">{title ?? "—"}</div>
    </div>
  );
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("30d");
  const [activeTab, setActiveTab] = useState<StatsTab>("library");
  const [abilityBookType, setAbilityBookType] =
    useState<AbilityReadingFilter>("all");
  const [myRole, setMyRole] = useState<string | null>(null);

  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [words, setWords] = useState<WordRow[]>([]);
  const [genres, setGenres] = useState<GenreRow[]>([]);

  async function loadStats() {
    setLoading(true);
    setErrorMsg(null);
    setNeedsSignIn(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        setNeedsSignIn(true);
        setMyRole(null);
        setRows([]);
        setSessions([]);
        setWords([]);
        setGenres([]);
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr) throw profileErr;
      setMyRole(profile?.role ?? null);

      const { data: userBooks, error: userBooksErr } = await supabase
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

      if (userBooksErr) throw userBooksErr;

      const loadedRows: UserBookRow[] = ((userBooks ?? []) as RawUserBookRow[]).map((row) => ({
        id: row.id,
        started_at: row.started_at,
        finished_at: row.finished_at,
        dnf_at: row.dnf_at,
        rating_overall: row.rating_overall,
        rating_recommend: row.rating_recommend,
        rating_difficulty: row.rating_difficulty,
        teacher_student_use_rating: row.teacher_student_use_rating,
        recommended_level: row.recommended_level,
        books: Array.isArray(row.books) ? row.books[0] ?? null : row.books ?? null,
      }));
      setRows(loadedRows);

      const userBookIds = loadedRows.map((row) => row.id).filter(Boolean);

      if (userBookIds.length === 0) {
        setSessions([]);
        setWords([]);
        setGenres([]);
        return;
      }

      const bookIds = Array.from(
        new Set(loadedRows.map((row) => row.books).filter(Boolean).map((book: any) => book.id).filter(Boolean))
      );

      const [
        { data: sessionData, error: sessionErr },
        { data: wordData, error: wordErr },
        genreResult,
      ] =
        await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select("user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler")
            .in("user_book_id", userBookIds),
          supabase
            .from("user_book_words")
            .select("user_book_id, created_at, surface, meaning")
            .in("user_book_id", userBookIds),
          bookIds.length > 0
            ? supabase.from("book_genres").select("book_id, genre").in("book_id", bookIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (sessionErr) throw sessionErr;
      if (wordErr) throw wordErr;
      if (genreResult.error) throw genreResult.error;

      setSessions(
        ((sessionData ?? []) as SessionRow[]).filter((row) => !row.is_filler)
      );
      setWords((wordData ?? []) as WordRow[]);
      setGenres((genreResult.data ?? []) as GenreRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const isTeacher = myRole === "teacher";

  useEffect(() => {
    if (!isTeacher && activeTab === "teacherSupport") {
      setActiveTab("library");
    }
  }, [activeTab, isTeacher]);

  const cutoff = useMemo(() => buildRangeCutoff(range), [range]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((row) => inRangeByDateString(row.read_on, cutoff));
  }, [sessions, cutoff]);

  const filteredWords = useMemo(() => {
    return words.filter((row) => inRangeByDateString(row.created_at, cutoff));
  }, [words, cutoff]);

  const engagementDays = useMemo(() => {
    const days = new Set<string>();

    for (const row of filteredSessions) {
      if (row.read_on) days.add(row.read_on);
    }

    for (const row of filteredWords) {
      days.add(ymdLocal(new Date(row.created_at)));
    }

    return days;
  }, [filteredSessions, filteredWords]);

  const totals = useMemo(() => {
    let pagesRead = 0;
    let fluidPages = 0;
    let curiosityPages = 0;
    let curiosityMinutes = 0;
    let fluidMinutes = 0;
    let listeningMinutes = 0;
    let readingSessions = 0;
    let listeningSessions = 0;

    for (const row of filteredSessions) {
      const pages = sessionPages(row);
      const minutes = Number(row.minutes_read) || 0;

      if (row.session_mode === "curiosity") {
        curiosityPages += pages;
        curiosityMinutes += minutes;
        readingSessions += 1;
      } else if (row.session_mode === "listening") {
        listeningMinutes += minutes;
        listeningSessions += 1;
      } else {
        fluidPages += pages;
        fluidMinutes += minutes;
        readingSessions += 1;
      }
    }

    pagesRead = fluidPages + curiosityPages;
    const totalMinutes = curiosityMinutes + fluidMinutes + listeningMinutes;
    const readingMinutes = curiosityMinutes + fluidMinutes;
    const wordsSaved = filteredWords.length;
    const uniqueWords = new Set(filteredWords.map((row) => wordKey(row.surface, row.meaning))).size;

    return {
      pagesRead,
      fluidPages,
      curiosityPages,
      curiosityMinutes,
      fluidMinutes,
      listeningMinutes,
      totalMinutes,
      readingMinutes,
      wordsSaved,
      uniqueWords,
      readingSessions,
      listeningSessions,
      daysEngaged: engagementDays.size,
      averageMinutesPerPage: pagesRead > 0 ? readingMinutes / pagesRead : null,
      fluidMinutesPerPage: fluidPages > 0 ? fluidMinutes / fluidPages : null,
      curiosityMinutesPerPage: curiosityPages > 0 ? curiosityMinutes / curiosityPages : null,
      averageWordsPerPage: pagesRead > 0 ? wordsSaved / pagesRead : null,
    };
  }, [filteredSessions, filteredWords, engagementDays]);

  const readingRhythmActivity = useMemo(() => {
    const today = startOfToday();
    const dayCount = rangeDayCount(range, sessions, words);
    const start = addDays(today, -(dayCount - 1));
    const buckets = new Map<string, { pages: number; words: number; engaged: boolean }>();

    for (let i = 0; i < dayCount; i++) {
      buckets.set(ymdLocal(addDays(start, i)), { pages: 0, words: 0, engaged: false });
    }

    for (const row of sessions) {
      if (!row.read_on || !buckets.has(row.read_on)) continue;
      const bucket = buckets.get(row.read_on)!;
      if (row.session_mode !== "listening") {
        bucket.pages += sessionPages(row);
      }
      bucket.engaged = true;
    }

    for (const row of words) {
      const day = ymdLocal(new Date(row.created_at));
      if (!buckets.has(day)) continue;
      const bucket = buckets.get(day)!;
      bucket.words += 1;
      bucket.engaged = true;
    }

    return Array.from(buckets.entries()).map(([day, value]) => ({
      day,
      ...value,
    }));
  }, [range, sessions, words]);

  const bookMetrics = useMemo(() => {
    const sessionsByBook = new Map<string, SessionRow[]>();
    const wordsByBook = new Map<string, WordRow[]>();

    for (const row of filteredSessions) {
      const list = sessionsByBook.get(row.user_book_id) ?? [];
      list.push(row);
      sessionsByBook.set(row.user_book_id, list);
    }

    for (const row of filteredWords) {
      const list = wordsByBook.get(row.user_book_id) ?? [];
      list.push(row);
      wordsByBook.set(row.user_book_id, list);
    }

    return rows
      .map((row) => {
        const bookSessions = sessionsByBook.get(row.id) ?? [];
        const bookWords = wordsByBook.get(row.id) ?? [];

        const fluidSessions = bookSessions.filter(
          (session) => session.session_mode === "fluid" || !session.session_mode
        );

        const curiositySessions = bookSessions.filter(
          (session) => session.session_mode === "curiosity"
        );

        const listeningSessionsForBook = bookSessions.filter(
          (session) => session.session_mode === "listening"
        );

        const fluidPages = fluidSessions.reduce(
          (sum, session) => sum + sessionPages(session),
          0
        );

        const curiosityPages = curiositySessions.reduce(
          (sum, session) => sum + sessionPages(session),
          0
        );

        const timedFluidPages = fluidSessions.reduce(
          (sum, session) => sum + (hasTimedMinutes(session) ? sessionPages(session) : 0),
          0
        );

        const timedCuriosityPages = curiositySessions.reduce(
          (sum, session) => sum + (hasTimedMinutes(session) ? sessionPages(session) : 0),
          0
        );

        const pagesRead = fluidPages + curiosityPages;
        const timedReadingPages = timedFluidPages + timedCuriosityPages;

        const curiosityMinutes = curiositySessions.reduce(
          (sum, session) => sum + sessionMinutes(session),
          0
        );

        const fluidMinutes = fluidSessions.reduce(
          (sum, session) => sum + sessionMinutes(session),
          0
        );
        const listeningMinutes = listeningSessionsForBook.reduce(
          (sum, session) => sum + sessionMinutes(session),
          0
        );

        const totalMinutes = curiosityMinutes + fluidMinutes + listeningMinutes;
        const readingMinutes = curiosityMinutes + fluidMinutes;
        const uniqueWords = new Set(bookWords.map((word) => wordKey(word.surface, word.meaning))).size;
        const days = new Set<string>();

        for (const session of bookSessions) {
          if (session.read_on) days.add(session.read_on);
        }

        for (const word of bookWords) {
          days.add(ymdLocal(new Date(word.created_at)));
        }

        return {
          userBookId: row.id,
          title: row.books?.title ?? "Untitled",
          bookType: row.books?.book_type ?? null,
          coverUrl: row.books?.cover_url ?? null,
          pageCount: row.books?.page_count ?? null,
          pagesRead,
          fluidPages,
          curiosityPages,
          timedFluidPages,
          timedCuriosityPages,
          timedReadingPages,
          wordsSaved: bookWords.length,
          uniqueWords,
          engagementDays: days.size,
          curiosityMinutes,
          fluidMinutes,
          listeningMinutes,
          totalMinutes,
          averageMinutesPerPage: timedReadingPages > 0 ? readingMinutes / timedReadingPages : null,
          wordsPerPage: pagesRead > 0 ? bookWords.length / pagesRead : null,
          sessions: bookSessions.length,
          relationshipDays: safeDateDiffInDays(
            row.started_at,
            row.finished_at || row.dnf_at || null
          ),
        } satisfies BookMetric;
      })
      .filter((item) => item.pagesRead > 0 || item.wordsSaved > 0 || item.totalMinutes > 0);
  }, [rows, filteredSessions, filteredWords]);

  const typeMetrics = useMemo(() => {
    const grouped = new Map<string, TypeMetric>();

    for (const item of bookMetrics) {
      const key = bookTypeLabel(item.bookType);
      const existing =
        grouped.get(key) ??
        {
          bookType: key,
          pagesRead: 0,
          wordsSaved: 0,
          timedPages: 0,
          totalMinutes: 0,
          averageMinutesPerPage: null,
          wordsPerPage: null,
        };

      existing.pagesRead += item.pagesRead;
      existing.wordsSaved += item.wordsSaved;
      existing.totalMinutes += item.totalMinutes;
      grouped.set(key, existing);
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        averageMinutesPerPage: item.timedPages > 0 ? item.totalMinutes / item.timedPages : null,
        wordsPerPage: item.pagesRead > 0 ? item.wordsSaved / item.pagesRead : null,
      }))
      .sort((a, b) => b.pagesRead - a.pagesRead)
      .slice(0, 6);
  }, [bookMetrics]);

  const timePie = useMemo(() => {
    return [
      { label: "Fluid", value: totals.fluidMinutes, color: "#34d399" },
      { label: "Curiosity", value: totals.curiosityMinutes, color: "#fbbf24" },
      { label: "Listening", value: totals.listeningMinutes, color: "#60a5fa" },
    ];
  }, [totals]);

  const readingPagesPie = useMemo(() => {
    return [
      { label: "Fluid pages", value: totals.fluidPages, color: "#34d399" },
      { label: "Curiosity pages", value: totals.curiosityPages, color: "#fbbf24" },
    ];
  }, [totals]);

  const bookTypePie = useMemo(() => {
    const palette = ["#8b5cf6", "#ec4899", "#38bdf8", "#f59e0b", "#14b8a6", "#f97316"];
    return typeMetrics.map((item, index) => ({
      label: item.bookType,
      value: item.pagesRead,
      color: palette[index % palette.length],
    }));
  }, [typeMetrics]);

  const abilityBookMetrics = useMemo(() => {
    if (abilityBookType === "all") return bookMetrics;

    return bookMetrics.filter(
      (item) => abilityReadingGroupForBookType(item.bookType) === abilityBookType
    );
  }, [abilityBookType, bookMetrics]);

  const abilityTotals = useMemo(() => {
    const pagesRead = abilityBookMetrics.reduce((sum, item) => sum + item.pagesRead, 0);
    const fluidPages = abilityBookMetrics.reduce((sum, item) => sum + item.fluidPages, 0);
    const curiosityPages = abilityBookMetrics.reduce((sum, item) => sum + item.curiosityPages, 0);
    const wordsSaved = abilityBookMetrics.reduce((sum, item) => sum + item.wordsSaved, 0);
    const fluidMinutes = abilityBookMetrics.reduce((sum, item) => sum + item.fluidMinutes, 0);
    const curiosityMinutes = abilityBookMetrics.reduce((sum, item) => sum + item.curiosityMinutes, 0);
    const timedFluidPages = abilityBookMetrics.reduce((sum, item) => sum + item.timedFluidPages, 0);
    const timedCuriosityPages = abilityBookMetrics.reduce((sum, item) => sum + item.timedCuriosityPages, 0);

    return {
      pagesRead,
      wordsSaved,
      averageWordsPerPage: pagesRead > 0 ? wordsSaved / pagesRead : null,
      fluidMinutesPerPage: timedFluidPages > 0 ? fluidMinutes / timedFluidPages : null,
      curiosityMinutesPerPage: timedCuriosityPages > 0 ? curiosityMinutes / timedCuriosityPages : null,
    };
  }, [abilityBookMetrics]);

  const abilityTypeMetrics = useMemo(() => {
    const grouped = new Map<string, TypeMetric>();

    for (const item of abilityBookMetrics) {
      const key = abilityReadingGroupLabel(
        abilityReadingGroupForBookType(item.bookType)
      );
      const existing =
        grouped.get(key) ??
        {
          bookType: key,
          pagesRead: 0,
          timedPages: 0,
          wordsSaved: 0,
          totalMinutes: 0,
          averageMinutesPerPage: null,
          wordsPerPage: null,
        };

      existing.pagesRead += item.pagesRead;
      existing.timedPages += item.timedReadingPages;
      existing.wordsSaved += item.wordsSaved;
      existing.totalMinutes += item.fluidMinutes + item.curiosityMinutes;
      grouped.set(key, existing);
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        averageMinutesPerPage: item.timedPages > 0 ? item.totalMinutes / item.timedPages : null,
        wordsPerPage: item.pagesRead > 0 ? item.wordsSaved / item.pagesRead : null,
      }))
      .sort((a, b) => b.pagesRead - a.pagesRead)
      .slice(0, 6);
  }, [abilityBookMetrics]);

  const activeUserBookIds = useMemo(() => {
    return new Set(bookMetrics.map((item) => item.userBookId));
  }, [bookMetrics]);

  const activeRows = useMemo(() => {
    return rows.filter((row) => activeUserBookIds.has(row.id));
  }, [rows, activeUserBookIds]);

  const teacherRows = useMemo(() => {
    return rows.filter(
      (row) =>
        row.recommended_level ||
        row.teacher_student_use_rating != null ||
        row.rating_recommend != null
    );
  }, [rows]);

  const genrePie = useMemo(() => {
    const libraryBookIds = new Set(activeRows.map((row) => row.books?.id).filter(Boolean));
    const seenBookGenrePairs = new Set<string>();
    const counts = new Map<string, number>();
    const palette = ["#14b8a6", "#f97316", "#8b5cf6", "#ec4899", "#38bdf8", "#f59e0b"];

    for (const row of genres) {
      if (!row.book_id || !row.genre || !libraryBookIds.has(row.book_id)) continue;

      const key = `${row.book_id}|||${row.genre}`;
      if (seenBookGenrePairs.has(key)) continue;
      seenBookGenrePairs.add(key);

      const label = genreLabel(row.genre);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }));
  }, [activeRows, genres]);

  const ratingPie = useMemo(() => {
    const counts = new Map<string, number>();
    const palette = ["#f87171", "#fb923c", "#fbbf24", "#60a5fa", "#34d399"];

    for (const row of activeRows) {
      if (row.rating_overall == null) continue;
      const rating = Math.max(1, Math.min(5, Math.round(row.rating_overall)));
      const label = `${rating} star${rating === 1 ? "" : "s"}`;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return [1, 2, 3, 4, 5]
      .map((rating, index) => {
        const label = `${rating} star${rating === 1 ? "" : "s"}`;
        return {
          label,
          value: counts.get(label) ?? 0,
          color: palette[index],
        };
      })
      .filter((item) => item.value > 0);
  }, [activeRows]);

  const difficultyPie = useMemo(() => {
    const counts = new Map<number, number>();
    const palette = ["#f87171", "#fb923c", "#fbbf24", "#60a5fa", "#34d399"];

    for (const row of activeRows) {
      if (row.rating_difficulty == null) continue;
      const difficulty = Math.max(1, Math.min(5, Math.round(row.rating_difficulty)));
      counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1);
    }

    return [1, 2, 3, 4, 5]
      .map((difficulty, index) => ({
        label: difficultyLabel(difficulty),
        value: counts.get(difficulty) ?? 0,
        color: palette[index],
      }))
      .filter((item) => item.value > 0);
  }, [activeRows]);

  const teacherUsePie = useMemo(() => {
    const counts = new Map<number, number>();
    const palette = ["#f87171", "#fb923c", "#fbbf24", "#60a5fa", "#34d399"];

    for (const row of teacherRows) {
      if (row.teacher_student_use_rating == null) continue;
      const rating = Math.max(1, Math.min(5, Math.round(row.teacher_student_use_rating)));
      counts.set(rating, (counts.get(rating) ?? 0) + 1);
    }

    return [1, 2, 3, 4, 5]
      .map((rating, index) => ({
        label: teacherUseLabel(rating),
        value: counts.get(rating) ?? 0,
        color: palette[index],
      }))
      .filter((item) => item.value > 0);
  }, [teacherRows]);

  const recommendedLevelPie = useMemo(() => {
    const counts = new Map<string, number>();
    const palette = ["#f59e0b", "#38bdf8", "#8b5cf6", "#14b8a6", "#94a3b8"];

    for (const row of teacherRows) {
      if (!row.recommended_level) continue;
      const label = recommendedLevelLabel(row.recommended_level);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }));
  }, [teacherRows]);

  const languageLearningPie = useMemo(() => {
    const counts = new Map<number, number>();
    const palette = ["#f87171", "#fb923c", "#fbbf24", "#60a5fa", "#34d399"];

    for (const row of teacherRows) {
      if (row.rating_recommend == null) continue;
      const rating = Math.max(1, Math.min(5, Math.round(row.rating_recommend)));
      counts.set(rating, (counts.get(rating) ?? 0) + 1);
    }

    return [1, 2, 3, 4, 5]
      .map((rating, index) => ({
        label: languageLearningLabel(rating),
        value: counts.get(rating) ?? 0,
        color: palette[index],
      }))
      .filter((item) => item.value > 0);
  }, [teacherRows]);

  const booksByRecommendedLevel = useMemo(() => {
    const grouped = new Map<string, { userBookId: string; title: string; rating: number | null }[]>();

    for (const row of teacherRows) {
      if (!row.recommended_level) continue;
      const list = grouped.get(row.recommended_level) ?? [];
      list.push({
        userBookId: row.id,
        title: row.books?.title ?? "Untitled",
        rating: row.teacher_student_use_rating,
      });
      grouped.set(row.recommended_level, list);
    }

    for (const [level, list] of grouped.entries()) {
      grouped.set(
        level,
        [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title))
      );
    }

    return grouped;
  }, [teacherRows]);

  const teacherRatedBooks = useMemo(() => {
    return teacherRows
      .map((row) => ({
        userBookId: row.id,
        title: row.books?.title ?? "Untitled",
        rating: row.teacher_student_use_rating,
      }))
      .filter((item): item is { userBookId: string; title: string; rating: number } => item.rating != null);
  }, [teacherRows]);

  const bestBooksToUse = useMemo(() => {
    return [...teacherRatedBooks]
      .filter((item) => item.rating >= 4)
      .sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title))
      .slice(0, 8);
  }, [teacherRatedBooks]);

  const booksToAvoid = useMemo(() => {
    return [...teacherRatedBooks]
      .filter((item) => item.rating <= 2)
      .sort((a, b) => a.rating - b.rating || a.title.localeCompare(b.title))
      .slice(0, 8);
  }, [teacherRatedBooks]);

  const wordsByBookTypePie = useMemo(() => {
    const typeByUserBookId = new Map(rows.map((row) => [row.id, bookTypeLabel(row.books?.book_type ?? null)]));
    const counts = new Map<string, number>();
    const palette = ["#f59e0b", "#ec4899", "#8b5cf6", "#38bdf8", "#14b8a6", "#f97316"];

    for (const word of filteredWords) {
      const label = typeByUserBookId.get(word.user_book_id) ?? "Other";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }));
  }, [rows, filteredWords]);

  const repeatedAuthors = useMemo(() => {
    const counts = new Map<string, { name: string; books: number; pages: number }>();

    for (const row of activeRows) {
      const author = row.books?.author?.trim();
      if (!author) continue;

      const metric = bookMetrics.find((item) => item.userBookId === row.id);
      const existing = counts.get(author) ?? { name: author, books: 0, pages: 0 };
      existing.books += 1;
      existing.pages += metric?.pagesRead ?? 0;
      counts.set(author, existing);
    }

    return Array.from(counts.values())
      .filter((item) => item.books > 1)
      .sort((a, b) => (b.books === a.books ? b.pages - a.pages : b.books - a.books))
      .slice(0, 6);
  }, [activeRows, bookMetrics]);

  const repeatedPublishers = useMemo(() => {
    const counts = new Map<string, { name: string; books: number; pages: number }>();

    for (const row of activeRows) {
      const publisher = row.books?.publisher?.trim();
      if (!publisher) continue;

      const metric = bookMetrics.find((item) => item.userBookId === row.id);
      const existing = counts.get(publisher) ?? { name: publisher, books: 0, pages: 0 };
      existing.books += 1;
      existing.pages += metric?.pagesRead ?? 0;
      counts.set(publisher, existing);
    }

    return Array.from(counts.values())
      .filter((item) => item.books > 1)
      .sort((a, b) => (b.books === a.books ? b.pages - a.pages : b.books - a.books))
      .slice(0, 6);
  }, [activeRows, bookMetrics]);

  const repeatedTranslators = useMemo(() => {
    const counts = new Map<string, { name: string; books: number; pages: number }>();

    for (const row of activeRows) {
      const translator = row.books?.translator?.trim();
      if (!translator) continue;

      const metric = bookMetrics.find((item) => item.userBookId === row.id);
      const existing = counts.get(translator) ?? { name: translator, books: 0, pages: 0 };
      existing.books += 1;
      existing.pages += metric?.pagesRead ?? 0;
      counts.set(translator, existing);
    }

    return Array.from(counts.values())
      .filter((item) => item.books > 1)
      .sort((a, b) => (b.books === a.books ? b.pages - a.pages : b.books - a.books))
      .slice(0, 6);
  }, [activeRows, bookMetrics]);

  const repeatedIllustrators = useMemo(() => {
    const counts = new Map<string, { name: string; books: number; pages: number }>();

    for (const row of activeRows) {
      const illustrator = row.books?.illustrator?.trim();
      if (!illustrator) continue;

      const metric = bookMetrics.find((item) => item.userBookId === row.id);
      const existing = counts.get(illustrator) ?? { name: illustrator, books: 0, pages: 0 };
      existing.books += 1;
      existing.pages += metric?.pagesRead ?? 0;
      counts.set(illustrator, existing);
    }

    return Array.from(counts.values())
      .filter((item) => item.books > 1)
      .sort((a, b) => (b.books === a.books ? b.pages - a.pages : b.books - a.books))
      .slice(0, 6);
  }, [activeRows, bookMetrics]);

  const repeatedTranslatorsAndIllustrators = useMemo(() => {
    return [
      ...repeatedTranslators.map((item) => ({
        ...item,
        name: `${item.name} (Translator)`,
      })),
      ...repeatedIllustrators.map((item) => ({
        ...item,
        name: `${item.name} (Illustrator)`,
      })),
    ]
      .sort((a, b) => (b.books === a.books ? b.pages - a.pages : b.books - a.books))
      .slice(0, 6);
  }, [repeatedTranslators, repeatedIllustrators]);

  const pacePie = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const item of abilityBookMetrics) {
      if (item.pagesRead <= 0) continue;
      const label = paceLabel(item);
      grouped.set(label, (grouped.get(label) ?? 0) + 1);
    }

    const palette: Record<string, string> = {
      Flowing: "#34d399",
      Steady: "#60a5fa",
      "Support-heavy": "#fbbf24",
      "Pushes back": "#f87171",
    };

    return ["Flowing", "Steady", "Support-heavy", "Pushes back"]
      .map((label) => ({
        label,
        value: grouped.get(label) ?? 0,
        color: palette[label],
      }))
      .filter((item) => item.value > 0);
  }, [abilityBookMetrics]);

  const trendItems = useMemo(() => {
    const today = startOfToday();
    const buckets: { label: string; start: Date; end: Date; books: number; pages: number; seen: Set<string> }[] = [];

    if (range === "7d" || range === "30d") {
      const dayCount = range === "7d" ? 7 : 30;
      const start = addDays(today, -(dayCount - 1));

      for (let i = 0; i < dayCount; i++) {
        const day = addDays(start, i);
        const nextDay = addDays(day, 1);
        buckets.push({
          label: shortDateLabel(day),
          start: day,
          end: nextDay,
          books: 0,
          pages: 0,
          seen: new Set<string>(),
        });
      }
    } else if (range === "90d") {
      const start = addDays(today, -89);

      for (let i = 0; i < 13; i++) {
        const weekStart = addDays(start, i * 7);
        const weekEnd = i === 12 ? addDays(today, 1) : addDays(weekStart, 7);
        buckets.push({
          label: shortDateLabel(weekStart),
          start: weekStart,
          end: weekEnd,
          books: 0,
          pages: 0,
          seen: new Set<string>(),
        });
      }
    } else {
      const dateValues: number[] = [];

      for (const session of sessions) {
        if (!session.read_on) continue;
        const time = new Date(session.read_on).getTime();
        if (!Number.isNaN(time)) dateValues.push(time);
      }

      for (const word of words) {
        const time = new Date(word.created_at).getTime();
        if (!Number.isNaN(time)) dateValues.push(time);
      }

      const firstDate =
        range === "1y" || dateValues.length === 0
          ? new Date(today.getFullYear(), today.getMonth() - 11, 1)
          : new Date(Math.min(...dateValues));
      firstDate.setDate(1);
      firstDate.setHours(0, 0, 0, 0);

      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      for (
        let cursor = new Date(firstDate);
        cursor <= lastMonth;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      ) {
        buckets.push({
          label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          start: new Date(cursor),
          end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
          books: 0,
          pages: 0,
          seen: new Set<string>(),
        });
      }
    }

    function bucketFor(date: Date) {
      return buckets.find((bucket) => date >= bucket.start && date < bucket.end) ?? null;
    }

    for (const session of sessions) {
      if (!session.read_on) continue;
      const date = new Date(session.read_on);
      if (Number.isNaN(date.getTime())) continue;

      const bucket = bucketFor(date);
      if (!bucket) continue;

      if (session.session_mode !== "listening") {
        bucket.pages += sessionPages(session);
      }
      bucket.seen.add(session.user_book_id);
    }

    for (const word of words) {
      const date = new Date(word.created_at);
      if (Number.isNaN(date.getTime())) continue;

      const bucket = bucketFor(date);
      if (!bucket) continue;
      bucket.seen.add(word.user_book_id);
    }

    return buckets.map((bucket) => ({
      label: bucket.label,
      books: bucket.seen.size,
      pages: bucket.pages,
    }));
  }, [range, sessions, words]);

  const spotlights = useMemo(() => {
    const byConsistency = [...abilityBookMetrics]
      .filter((item) => item.engagementDays > 0)
      .sort((a, b) => b.engagementDays - a.engagementDays)[0];

    const byStretch = [...abilityBookMetrics]
      .filter((item) => item.wordsPerPage != null)
      .sort((a, b) => (b.wordsPerPage ?? 0) - (a.wordsPerPage ?? 0))[0];

    const bySmoothest = [...abilityBookMetrics]
      .filter((item) => item.averageMinutesPerPage != null)
      .sort((a, b) => (a.averageMinutesPerPage ?? 999) - (b.averageMinutesPerPage ?? 999))[0];

    const byCuriosity = [...abilityBookMetrics]
      .filter((item) => item.curiosityMinutes > 0)
      .sort((a, b) => b.curiosityMinutes - a.curiosityMinutes)[0];

    const byFluid = [...abilityBookMetrics]
      .filter((item) => item.fluidMinutes > 0)
      .sort((a, b) => b.fluidMinutes - a.fluidMinutes)[0];

    const byRelationship = [...abilityBookMetrics]
      .filter((item) => item.relationshipDays != null)
      .sort((a, b) => (b.relationshipDays ?? 0) - (a.relationshipDays ?? 0))[0];

    return {
      byConsistency,
      byStretch,
      bySmoothest,
      byCuriosity,
      byFluid,
      byRelationship,
    };
  }, [abilityBookMetrics]);

  const supportBars = useMemo(() => {
    const total = Math.max(1, totals.totalMinutes);

    return [
      {
        label: "Fluid reading",
        value: totals.fluidMinutes,
        width: `${(totals.fluidMinutes / total) * 100}%`,
        color: "bg-emerald-500",
      },
      {
        label: "Curiosity reading",
        value: totals.curiosityMinutes,
        width: `${(totals.curiosityMinutes / total) * 100}%`,
        color: "bg-amber-500",
      },
      {
        label: "Listening",
        value: totals.listeningMinutes,
        width: `${(totals.listeningMinutes / total) * 100}%`,
        color: "bg-sky-500",
      },
    ];
  }, [totals]);

  const bookChallengeList = useMemo(() => {
    return [...abilityBookMetrics]
      .filter((item) => item.pagesRead > 0)
      .sort((a, b) => {
        const aScore = (a.wordsPerPage ?? 0) * 2 + (a.averageMinutesPerPage ?? 0);
        const bScore = (b.wordsPerPage ?? 0) * 2 + (b.averageMinutesPerPage ?? 0);
        return bScore - aScore;
      })
      .slice(0, 5);
  }, [abilityBookMetrics]);

  const flowingBooks = useMemo(() => {
    return [...abilityBookMetrics]
      .filter((item) => item.pagesRead > 0)
      .sort((a, b) => {
        const aScore = (a.wordsPerPage ?? 0) * 2 + (a.averageMinutesPerPage ?? 0);
        const bScore = (b.wordsPerPage ?? 0) * 2 + (b.averageMinutesPerPage ?? 0);
        return aScore - bScore;
      })
      .slice(0, 5);
  }, [abilityBookMetrics]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-sm text-slate-600">Loading stats…</div>
        </div>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Stats</h1>
          <p className="mt-3 text-sm text-slate-700">
            Please{" "}
            <Link href="/login" className="font-medium text-sky-700 underline underline-offset-4">
              sign in
            </Link>{" "}
            to see your reading stats.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="sticky top-28 z-20 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase text-slate-500">Rough Draft</div>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">Stats with clearer jobs</h1>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                This draft separates the page into different questions: how much you are showing up,
                what kind of Japanese you can handle, what your library says about you, what words are
                following you, and how teacher support fits into the reading.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white text-sm">
                {(["7d", "30d", "90d", "1y", "all"] as DateRange[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRange(option)}
                    className={`px-4 py-2 ${range === option ? "bg-slate-900 text-white" : "text-slate-700"}`}
                  >
                    {formatRangeLabel(option)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void loadStats()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {errorMsg ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 md:grid-cols-5">
            {(["library", "life", "skill", "vocabulary", ...(isTeacher ? ["teacherSupport" as const] : [])] as StatsTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-3 text-left transition ${activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <div className="text-sm font-semibold">{statsTabLabel(tab)}</div>
                <div className={`mt-1 text-xs leading-5 ${activeTab === tab ? "text-slate-200" : "text-slate-500"}`}>
                  {statsTabDescription(tab)}
                </div>
              </button>
            ))}
          </div>
        </section>

        {activeTab === "life" && (
          <>
            <SectionBand
              eyebrow="Momentum"
              title="Reading rhythm"
              description={`A quick view of how often Japanese showed up in your life for ${formatRangeLabel(range).toLowerCase()}.`}
            >
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-14 xl:grid-cols-28">
                {readingRhythmActivity.map((item) => {
                  const intensity = item.pages + item.words;
                  const colorClass =
                    intensity === 0
                      ? "bg-slate-100"
                      : intensity < 3
                        ? "bg-sky-200"
                        : intensity < 8
                          ? "bg-sky-400"
                          : "bg-sky-600";

                  return (
                    <div key={item.day} className="space-y-1">
                      <div
                        className={`h-14 rounded-xl border border-white/60 ${colorClass}`}
                        title={`${item.day}: ${item.pages} pages, ${item.words} words`}
                      />
                      <div className="text-center text-[10px] text-slate-500">
                        {item.day.slice(8)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">Reading pages</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {totals.pagesRead}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">Reading time</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {formatMinutesAsReadableTime(totals.readingMinutes)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">Listening time</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {formatMinutesAsReadableTime(totals.listeningMinutes)}
                  </div>
                </div>
              </div>
            </SectionBand>

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionBand
                eyebrow="Pages"
                title="Reading pages by mode"
                description="Listening stays separate here. This is only pages you visually read, split by fluid vs curiosity reading."
              >
                <PieChart items={readingPagesPie} size={180} />

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase text-slate-500">Reading relationship</div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    {totals.pagesRead === 0
                      ? "No reading activity in this window yet."
                      : `You read ${totals.fluidPages} fluid pages and ${totals.curiosityPages} curiosity pages. Listening time is still visible, but it does not inflate the page count.`}
                  </div>
                </div>
              </SectionBand>

              <SectionBand
                eyebrow="Color"
                title="Time breakdown"
                description="A brighter view of how fluid, curious, or listening-heavy your reading life has been."
              >
                <PieChart items={timePie} size={180} />

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase text-slate-500">Reading time relationship</div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    {totals.totalMinutes === 0
                      ? "No reading or listening time in this window yet."
                      : `You spent ${formatMinutesAsReadableTime(
                        totals.totalMinutes
                      )} with Japanese books: ${formatMinutesAsReadableTime(
                        totals.fluidMinutes
                      )} fluid reading, ${formatMinutesAsReadableTime(
                        totals.curiosityMinutes
                      )} curiosity reading, and ${formatMinutesAsReadableTime(
                        totals.listeningMinutes
                      )} listening.`}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Reading sessions: {totals.readingSessions}. Listening sessions: {totals.listeningSessions}.
                  </div>
                </div>
              </SectionBand>

              <SectionBand
                eyebrow="Book Types"
                title="Reading pages by book type"
                description="A page-weighted view of what kinds of books made up your reading in this range."
              >
                <PieChart items={bookTypePie} size={180} />
              </SectionBand>
            </div>
          </>
        )}

        {activeTab === "skill" && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-2 md:grid-cols-4">
                {ABILITY_READING_GROUP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAbilityBookType(option.value)}
                    className={`rounded-xl px-4 py-3 text-left transition ${abilityBookType === option.value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div
                      className={`mt-1 text-xs leading-5 ${abilityBookType === option.value ? "text-slate-200" : "text-slate-500"
                        }`}
                    >
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Words Saved Per Page"
                value={
                  abilityTotals.averageWordsPerPage == null
                    ? "—"
                    : `${formatDecimal(abilityTotals.averageWordsPerPage)} words/page`
                }
                hint="Vocabulary density while visually reading"
                tone="border-amber-200 bg-amber-50"
              />
              <StatCard
                label="Fluid Pace Per Page"
                value={
                  abilityTotals.fluidMinutesPerPage == null
                    ? "—"
                    : `${formatDecimal(abilityTotals.fluidMinutesPerPage)} min/page`
                }
                hint="Time per page during fluid reading"
                tone="border-emerald-200 bg-emerald-50"
              />
              <StatCard
                label="Curiosity Pace Per Page"
                value={
                  abilityTotals.curiosityMinutesPerPage == null
                    ? "—"
                    : `${formatDecimal(abilityTotals.curiosityMinutesPerPage)} min/page`
                }
                hint="Time per page during curiosity reading"
                tone="border-rose-200 bg-rose-50"
              />
            </div>

            <SectionBand
              eyebrow="Reminder"
              title="Support vs confidence"
              description="A future Reading Ability view could track when reading starts needing less visible support."
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                Track how often sessions happen with no lookups, or with fewer saved words per page than before. This belongs here because it is about confidence and support, not just effort.
              </div>
            </SectionBand>

            <SectionBand
              eyebrow="Spotlights"
              title="Not just top books"
              description="These labels are meant to feel like reading growth, not consumption trophies."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SpotlightCard
                  label="Most Consistent Book"
                  value={
                    spotlights.byConsistency ? `${spotlights.byConsistency.engagementDays} days` : "—"
                  }
                  title={spotlights.byConsistency?.title ?? null}
                  tone="border-violet-200 bg-violet-50"
                />
                <SpotlightCard
                  label="Biggest Stretch"
                  value={
                    spotlights.byStretch?.wordsPerPage != null
                      ? `${formatDecimal(spotlights.byStretch.wordsPerPage)} words/page`
                      : "—"
                  }
                  title={spotlights.byStretch?.title ?? null}
                  tone="border-amber-200 bg-amber-50"
                />
                <SpotlightCard
                  label="Smoothest Reading"
                  value={
                    spotlights.bySmoothest?.averageMinutesPerPage != null
                      ? `${formatDecimal(spotlights.bySmoothest.averageMinutesPerPage)} min/page`
                      : "—"
                  }
                  title={spotlights.bySmoothest?.title ?? null}
                  tone="border-emerald-200 bg-emerald-50"
                />
                <SpotlightCard
                  label="Most Curious Reading Time"
                  value={
                    spotlights.byCuriosity
                      ? formatMinutesAsReadableTime(spotlights.byCuriosity.curiosityMinutes)
                      : "—"
                  }
                  title={spotlights.byCuriosity?.title ?? null}
                  tone="border-rose-200 bg-rose-50"
                />
                <SpotlightCard
                  label="Most Fluid Reading Time"
                  value={
                    spotlights.byFluid
                      ? formatMinutesAsReadableTime(spotlights.byFluid.fluidMinutes)
                      : "—"
                  }
                  title={spotlights.byFluid?.title ?? null}
                  tone="border-sky-200 bg-sky-50"
                />
                <SpotlightCard
                  label="Longest Reading Relationship"
                  value={
                    spotlights.byRelationship?.relationshipDays != null
                      ? `${spotlights.byRelationship.relationshipDays} days`
                      : "—"
                  }
                  title={spotlights.byRelationship?.title ?? null}
                  tone="border-fuchsia-200 bg-fuchsia-50"
                />
              </div>
            </SectionBand>

            <SectionBand
              eyebrow="Pace"
              title="How your books felt to read"
              description="A pie chart of all the books you touched in this window, grouped by pace: which ones flowed, which stayed steady, and which really pushed back."
            >
              <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr] xl:items-start">
                <PieChart items={pacePie} />

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "Flowing",
                      color: "bg-emerald-400",
                      text: "These books tended to move with less friction and lighter support.",
                    },
                    {
                      label: "Steady",
                      color: "bg-sky-400",
                      text: "Comfortably readable, but still asking for some attention.",
                    },
                    {
                      label: "Support-heavy",
                      color: "bg-amber-400",
                      text: "More lookups or slower pacing showed up here.",
                    },
                    {
                      label: "Pushes back",
                      color: "bg-rose-400",
                      text: "These are the ones that really asked more of you.",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <span className={`h-3 w-3 rounded-full ${item.color}`} />
                        {item.label}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionBand>

            <div className="grid gap-6 xl:grid-cols-2">
              <SectionBand
                eyebrow="By Reading Lane"
                title="Where reading felt smooth or sticky"
                description="This groups books by reading experience instead of exact book type, so the stats have enough data to mean something."
              >
                {abilityTypeMetrics.length > 0 ? (
                  <div className="space-y-5">
                    <BarStrip
                      items={abilityTypeMetrics.map((item) => ({
                        label: item.bookType,
                        value: item.pagesRead,
                      }))}
                      colorClass="bg-gradient-to-r from-sky-400 to-indigo-500"
                      valueSuffix=" p"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      {abilityTypeMetrics.map((item) => (
                        <div key={item.bookType} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm font-medium text-slate-900">{item.bookType}</div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-slate-500">Words/page</div>
                              <div className="mt-1 font-semibold text-slate-900">
                                {formatDecimal(item.wordsPerPage)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Min/page</div>
                              <div className="mt-1 font-semibold text-slate-900">
                                {formatDecimal(item.averageMinutesPerPage)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No book-type stats yet.</div>
                )}
              </SectionBand>

              <SectionBand
                eyebrow="Challenge"
                title="Books that pushed back"
                description="A rough composite of word-save density and time-per-page. This is intentionally learner-centered."
              >
                {bookChallengeList.length > 0 ? (
                  <div className="space-y-4">
                    {bookChallengeList.map((item) => (
                      <div key={item.userBookId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          {item.coverUrl ? (
                            <img src={item.coverUrl} alt="" className="h-16 w-12 rounded object-cover" />
                          ) : (
                            <div className="h-16 w-12 rounded bg-slate-200" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-900">{item.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {abilityReadingGroupLabel(abilityReadingGroupForBookType(item.bookType))} · {bookTypeLabel(item.bookType)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg bg-white px-3 py-2">
                            <div className="text-[11px] text-slate-500">Words/page</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDecimal(item.wordsPerPage)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-white px-3 py-2">
                            <div className="text-[11px] text-slate-500">Min/page</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDecimal(item.averageMinutesPerPage)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-white px-3 py-2">
                            <div className="text-[11px] text-slate-500">Days engaged</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{item.engagementDays}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No challenge profile yet.</div>
                )}
              </SectionBand>
            </div>

            <SectionBand
              eyebrow="Ease"
              title="Books that flowed"
              description="The companion to push-back: books where your pace stayed lighter and support density stayed gentler."
            >
              {flowingBooks.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {flowingBooks.map((item) => (
                    <div key={item.userBookId} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex items-center gap-3">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt="" className="h-16 w-12 rounded object-cover" />
                        ) : (
                          <div className="h-16 w-12 rounded bg-slate-200" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">{item.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {abilityReadingGroupLabel(abilityReadingGroupForBookType(item.bookType))} · {bookTypeLabel(item.bookType)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-white px-3 py-2">
                          <div className="text-[11px] text-slate-500">Words/page</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDecimal(item.wordsPerPage)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white px-3 py-2">
                          <div className="text-[11px] text-slate-500">Min/page</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDecimal(item.averageMinutesPerPage)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white px-3 py-2">
                          <div className="text-[11px] text-slate-500">Pages read</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{item.pagesRead}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No flow profile yet.</div>
              )}
            </SectionBand>
          </>
        )}

        {activeTab === "library" && (
          <>
            <SectionBand
              eyebrow="Over Time"
              title="Books and pages over time"
              description={`This is the more ordinary reading-site view for ${formatRangeLabel(range).toLowerCase()}: what had books in motion, and how much page movement happened.`}
            >
              <TrendChart items={trendItems} bucketLabel={trendBucketLabel(range)} />
            </SectionBand>

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionBand
                eyebrow="Book Types"
                title="Book types in your library"
                description="A page-weighted view of the kinds of books in this reading window."
              >
                <PieChart items={bookTypePie} size={180} />
              </SectionBand>

              <SectionBand
                eyebrow="Ratings"
                title="How you rated books"
                description="Your overall ratings across books with a saved rating."
              >
                <PieChart items={ratingPie} size={180} />
              </SectionBand>

              <SectionBand
                eyebrow="Difficulty"
                title="Difficulty for me"
                description="Your private community answer about how each book felt at your level."
              >
                <PieChart items={difficultyPie} size={180} />
              </SectionBand>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionBand
                eyebrow="Authors"
                title="Authors you keep returning to"
                description="Writers whose books actually keep showing up in your reading life."
              >
                {repeatedAuthors.length > 0 ? (
                  <BarStrip
                    items={repeatedAuthors.map((item) => ({
                      label: item.name,
                      value: item.books,
                    }))}
                    colorClass="bg-gradient-to-r from-fuchsia-400 to-violet-500"
                    valueSuffix=" books"
                  />
                ) : (
                  <div className="text-sm leading-6 text-slate-500">
                    Authors will appear here once the same author shows up across 2+ books in this window.
                  </div>
                )}
              </SectionBand>

              <SectionBand
                eyebrow="Publishers"
                title="Publishers you keep returning to"
                description="Especially useful for Japanese reading, where publisher style and imprint can matter a lot."
              >
                {repeatedPublishers.length > 0 ? (
                  <BarStrip
                    items={repeatedPublishers.map((item) => ({
                      label: item.name,
                      value: item.books,
                    }))}
                    colorClass="bg-gradient-to-r from-sky-400 to-indigo-500"
                    valueSuffix=" books"
                  />
                ) : (
                  <div className="text-sm leading-6 text-slate-500">
                    Publishers will appear here once the same publisher shows up across 2+ books in this window.
                  </div>
                )}
              </SectionBand>

              <SectionBand
                eyebrow="Translators & Illustrators"
                title="Translators and illustrators you keep returning to"
                description="Creative names behind the text and art, shown when they repeat across books."
              >
                {repeatedTranslatorsAndIllustrators.length > 0 ? (
                  <BarStrip
                    items={repeatedTranslatorsAndIllustrators.map((item) => ({
                      label: item.name,
                      value: item.books,
                    }))}
                    colorClass="bg-gradient-to-r from-emerald-400 to-teal-500"
                    valueSuffix=" books"
                  />
                ) : (
                  <div className="text-sm leading-6 text-slate-500">
                    Translators and illustrators will appear here once the same person shows up across 2+ books in this window.
                  </div>
                )}
              </SectionBand>
            </div>
          </>
        )}

        {activeTab === "vocabulary" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Words Saved"
                value={String(totals.wordsSaved)}
                hint={`${totals.uniqueWords} unique words in this window`}
                tone="border-amber-200 bg-amber-50"
              />
              <StatCard
                label="Words Per Page"
                value={totals.averageWordsPerPage == null ? "—" : formatDecimal(totals.averageWordsPerPage)}
                hint="A rough support-density signal"
                tone="border-rose-200 bg-rose-50"
              />
              <StatCard
                label="Books With Words"
                value={String(bookMetrics.filter((item) => item.wordsSaved > 0).length)}
                hint="Books that contributed vocabulary"
                tone="border-violet-200 bg-violet-50"
              />
              <StatCard
                label="Vocabulary Days"
                value={String(new Set(filteredWords.map((word) => ymdLocal(new Date(word.created_at)))).size)}
                hint="Days when words were saved"
                tone="border-emerald-200 bg-emerald-50"
              />
            </div>

            <SectionBand
              eyebrow="Book Type"
              title="Where saved words came from"
              description="This keeps vocabulary tied to reading context: a word saved from manga, a novel, or a textbook can mean different kinds of friction."
            >
              <PieChart items={wordsByBookTypePie} />
            </SectionBand>

            <SectionBand
              eyebrow="Vocabulary Relationship"
              title="Words by book"
              description="A first version of the word tab. Next, this could show repeated lookups, words that follow you across books, kanji readings, and words that moved into known territory."
            >
              {bookMetrics.filter((item) => item.wordsSaved > 0).length > 0 ? (
                <BarStrip
                  items={bookMetrics
                    .filter((item) => item.wordsSaved > 0)
                    .sort((a, b) => b.wordsSaved - a.wordsSaved)
                    .slice(0, 8)
                    .map((item) => ({
                      label: item.title,
                      value: item.wordsSaved,
                    }))}
                  colorClass="bg-gradient-to-r from-amber-400 to-rose-500"
                  valueSuffix=" words"
                />
              ) : (
                <div className="text-sm text-slate-500">No vocabulary stats in this window yet.</div>
              )}
            </SectionBand>

            <SectionBand
              eyebrow="Later"
              title="Language study signals"
              description="This could become a wider language-study or linguistics tab if grammar, collocations, kanji, and flashcard habits grow."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <div className="font-medium text-slate-900">Vocabulary relationship</div>
                  <div className="mt-2">Show recurring saved words across books, revisits, and words that move into known territory.</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <div className="font-medium text-slate-900">Kanji reading pressure</div>
                  <div className="mt-2">Track kanji enrichment, hidden-kanji support, and words known in vocab but still shaky in reading.</div>
                </div>
              </div>
            </SectionBand>
          </>
        )}

        {activeTab === "teacherSupport" && isTeacher && (
          <>
            <div className="grid gap-6 xl:grid-cols-2">
              <SectionBand
                eyebrow="Best Books"
                title="Best books to use"
                description="Books rated 4 or 5 for Use With Students. This is about whether you would actually choose them for students."
              >
                {bestBooksToUse.length > 0 ? (
                  <BarStrip
                    items={bestBooksToUse.map((item) => ({
                      label: item.title,
                      value: item.rating,
                    }))}
                    colorClass="bg-gradient-to-r from-emerald-400 to-teal-500"
                    valueSuffix="/5"
                  />
                ) : (
                  <div className="text-sm leading-6 text-slate-500">
                    Books rated 4 or 5 for student use will appear here.
                  </div>
                )}
              </SectionBand>

              <SectionBand
                eyebrow="Avoid"
                title="Books to avoid"
                description="Books rated 1 or 2 for Use With Students. This is about lesson fit, not book quality or language-learning value."
              >
                {booksToAvoid.length > 0 ? (
                  <BarStrip
                    items={booksToAvoid.map((item) => ({
                      label: item.title,
                      value: item.rating,
                    }))}
                    colorClass="bg-gradient-to-r from-rose-400 to-orange-500"
                    valueSuffix="/5"
                  />
                ) : (
                  <div className="text-sm leading-6 text-slate-500">
                    Books rated 1 or 2 for student use will appear here.
                  </div>
                )}
              </SectionBand>
            </div>

            <SectionBand
              eyebrow="Teacher View"
              title="Teacher-use overview"
              description="Use With Students is whether you would actually use a book with students. Language Learning Potential is about the material inside the book."
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-900">Use With Students ratings</div>
                  <PieChart items={teacherUsePie} size={180} />
                </div>
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-900">Language Learning Potential ratings</div>
                  <PieChart items={languageLearningPie} size={180} />
                </div>
              </div>
            </SectionBand>

            <SectionBand
              eyebrow="Mekuru Levels"
              title="Books by recommended Mekuru level"
              description="Every level stays visible. Books appear under the level a teacher marked on the book page."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {MEKURU_LEVEL_OPTIONS.map((level) => {
                  const levelBooks = booksByRecommendedLevel.get(level.value) ?? [];

                  return (
                    <div key={level.value} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {level.title} · {level.plain}
                      </div>
                      <div className="mt-1 text-xs font-medium text-amber-700">
                        {level.cefr} · {level.jlpt}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">
                        {level.feel}
                      </div>

                      <div className="mt-4 space-y-2">
                        {levelBooks.length > 0 ? (
                          levelBooks.map((book) => (
                            <div key={book.userBookId} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                              <div className="font-medium text-slate-900">{book.title}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                Student use: {book.rating ? `${book.rating}/5` : "not rated"}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs leading-5 text-slate-500">
                            No books listed at this level yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBand>
          </>
        )}

      </div>
    </main>
  );
}
