// Stats
//

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  emptyLibraryStudyColorTotals,
  fetchLibraryStudyColorTotals,
  LIBRARY_STUDY_COLOR_ORDER,
  type LibraryStudyColorTotals,
} from "@/lib/libraryStudyTotals";
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
  page_number: number | null;
};

type GenreRow = {
  book_id: string;
  genre: string | null;
};

type StudyEventRow = {
  id: string;
  user_id: string;
  user_book_id: string | null;
  user_book_word_id: string | null;
  study_mode: string | null;
  card_type: string | null;
  result: "reviewed" | "correct" | "incorrect" | "skipped" | string;
  is_correct: boolean | null;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  created_at: string;
};

type LibraryStudyDisplayColor = "red" | "orange" | "yellow" | "grey" | "green" | "blue" | "purple";

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

function formatRate(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(4);
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

const BOOK_TYPE_DISPLAY_ORDER: BookType[] = [
  "picture_book",
  "early_reader",
  "manga",
  "chapter_book",
  "middle_grade",
  "ya",
  "novel",
  "short_story",
  "essay",
  "memoir",
  "nonfiction",
  "textbook",
  "other",
  null,
];

function bookTypeSortIndex(bookType: BookType) {
  const index = BOOK_TYPE_DISPLAY_ORDER.indexOf(bookType);
  return index === -1 ? 999 : index;
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

function timeRangeTheme(value: DateRange) {
  if (value === "7d") {
    return {
      border: "border-emerald-400",
      buttonActive: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
      buttonInactive: "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100",
      label: "Last 7 days",
    };
  }

  if (value === "30d") {
    return {
      border: "border-sky-400",
      buttonActive: "border-sky-600 bg-sky-600 text-white shadow-sm",
      buttonInactive: "border-sky-200 bg-sky-50/70 text-sky-800 hover:bg-sky-100",
      label: "Last 30 days",
    };
  }

  if (value === "90d") {
    return {
      border: "border-violet-400",
      buttonActive: "border-violet-600 bg-violet-600 text-white shadow-sm",
      buttonInactive: "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100",
      label: "Last 90 days",
    };
  }

  if (value === "1y") {
    return {
      border: "border-amber-400",
      buttonActive: "border-amber-600 bg-amber-500 text-white shadow-sm",
      buttonInactive: "border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100",
      label: "Last year",
    };
  }

  return {
    border: "border-stone-400",
    buttonActive: "border-stone-700 bg-stone-700 text-white shadow-sm",
    buttonInactive: "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100",
    label: "All time",
  };
}

function readingLaneButtonTheme(value: AbilityReadingFilter) {
  if (value === "image_supported") {
    return {
      active: "border-emerald-600 bg-emerald-600 text-white shadow-md",
      inactive:
        "border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100",
      inactiveDescription: "text-emerald-700/80",
    };
  }

  if (value === "bridge_books") {
    return {
      active: "border-violet-600 bg-violet-600 text-white shadow-md",
      inactive:
        "border-violet-200 bg-violet-50/80 text-violet-800 hover:bg-violet-100",
      inactiveDescription: "text-violet-700/80",
    };
  }

  if (value === "text_dense") {
    return {
      active: "border-amber-600 bg-amber-500 text-white shadow-md",
      inactive:
        "border-amber-200 bg-amber-50/90 text-amber-900 hover:bg-amber-100",
      inactiveDescription: "text-amber-800/80",
    };
  }

  return {
    active: "border-sky-600 bg-sky-600 text-white shadow-md",
    inactive:
      "border-sky-200 bg-sky-50/80 text-sky-800 hover:bg-sky-100",
    inactiveDescription: "text-sky-700/80",
  };
}

function readingLaneTheme(value: AbilityReadingFilter) {
  if (value === "image_supported") {
    return {
      background: "bg-emerald-50/70",
      statBackground: "bg-emerald-100/60",
    };
  }

  if (value === "bridge_books") {
    return {
      background: "bg-violet-50/70",
      statBackground: "bg-violet-100/60",
    };
  }

  if (value === "text_dense") {
    return {
      background: "bg-amber-50/70",
      statBackground: "bg-amber-100/60",
    };
  }

  return {
    background: "bg-sky-50/70",
    statBackground: "bg-sky-100/60",
  };
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
  return addDays(today, -(rangeWindowDays(range) - 1));
}

function rangeWindowDays(range: DateRange) {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  if (range === "1y") return 365;
  return null;
}

function previousRangeCutoff(range: DateRange, currentCutoff: Date | null) {
  const days = rangeWindowDays(range);
  if (!days || !currentCutoff) return null;
  return addDays(currentCutoff, -days);
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
  if (tab === "life") return "Effort, consistency, and habits";
  if (tab === "skill") return "Difficulty, pace, and support type";
  if (tab === "library") return "Books, authors, and monthly reading";
  if (tab === "vocabulary") return "Vocab, kanji, and study";
  return "Lesson prep and potential books";
}

function inRangeByDateString(dateString: string | null, cutoff: Date | null) {
  if (!cutoff) return true;
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  return date >= cutoff;
}

function paceScore(item: BookMetric) {
  return item.averageMinutesPerPage;
}

function paceLabel(item: BookMetric) {
  const score = paceScore(item);

  if (score == null) return null;

  if (score <= 2) return "Flowing";
  if (score <= 5) return "Steady";
  if (score <= 10) return "Support-heavy";
  return "Pushes back";
}

function SectionBand({
  title,
  eyebrow,
  description,
  children,
  tone = "border-slate-200 bg-white",
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <section className={`rounded-2xl border-2 px-5 py-5 shadow-sm ${tone}`}>
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
    <div className={`rounded-2xl border-2 p-4 ${tone}`}>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-600">{hint}</div> : null}
    </div>
  );
}

function ReadingLaneFilter({
  value,
  onChange,
}: {
  value: AbilityReadingFilter;
  onChange: (value: AbilityReadingFilter) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Book Category:{" "}
          <span className="normal-case tracking-normal text-slate-900">
            {abilityReadingGroupLabel(value)}
          </span>
        </div>

        <div className="hidden text-[11px] text-slate-500 md:block">
          Changes the stats and book examples below.
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        {ABILITY_READING_GROUP_OPTIONS.map((option) => {
          const optionTheme = readingLaneButtonTheme(option.value);
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-3 py-2 text-left transition ${selected ? optionTheme.active : optionTheme.inactive
                }`}
            >
              <div className="text-sm font-semibold leading-5">
                {option.label}
              </div>

              <div
                className={`hidden sm:block mt-0.5 text-[11px] leading-4 ${selected ? "text-white/75" : optionTheme.inactiveDescription
                  }`}
              >
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
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
        <div className="rounded-xl border border-slate-900/10 bg-white/85 px-4 py-3 shadow-sm">
          <div className="text-xs text-slate-500">Active {bucketLabel.toLowerCase()}s</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{activeBuckets.length}</div>
        </div>
        <div className="rounded-xl border border-slate-900/10 bg-white/85 px-4 py-3 shadow-sm">
          <div className="text-xs text-slate-500">Books in Motion</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{totalBooks}</div>
        </div>
        <div className="rounded-xl border border-slate-900/10 bg-white/85 px-4 py-3 shadow-sm">
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

async function fetchAllUserBookWords(userBookIds: string[]) {
  const pageSize = 1000;
  let from = 0;
  let allRows: WordRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("user_book_words")
      .select("user_book_id, created_at, surface, meaning, page_number")
      .in("user_book_id", userBookIds)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = (data ?? []) as WordRow[];
    allRows = [...allRows, ...rows];

    if (rows.length < pageSize) break;

    from += pageSize;
  }

  return allRows;
}

async function fetchAllStudyEvents(userId: string) {
  const pageSize = 1000;
  let from = 0;
  let allRows: StudyEventRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("user_study_events")
      .select(
        "id, user_id, user_book_id, user_book_word_id, study_mode, card_type, result, is_correct, surface, reading, meaning, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = (data ?? []) as StudyEventRow[];
    allRows = [...allRows, ...rows];

    if (rows.length < pageSize) break;

    from += pageSize;
  }

  return allRows;
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

function libraryStudyColorLabel(color: LibraryStudyDisplayColor) {
  if (color === "grey") return "Support";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function libraryStudyColorDot(color: LibraryStudyDisplayColor) {
  if (color === "red") return "bg-red-500";
  if (color === "orange") return "bg-orange-500";
  if (color === "yellow") return "bg-yellow-300";
  if (color === "green") return "bg-emerald-500";
  if (color === "blue") return "bg-sky-500";
  if (color === "purple") return "bg-violet-500";
  return "bg-slate-500";
}

function ColorTotalDelta({ value }: { value: number | null }) {
  if (value == null) return null;

  if (value === 0) {
    return <span className="text-xs font-semibold text-slate-400">0</span>;
  }

  const isUp = value > 0;

  return (
    <span className={`text-xs font-semibold ${isUp ? "text-emerald-700" : "text-rose-700"}`}>
      {isUp ? "↑" : "↓"} {Math.abs(value)}
    </span>
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [words, setWords] = useState<WordRow[]>([]);
  const [genres, setGenres] = useState<GenreRow[]>([]);
  const [studyEvents, setStudyEvents] = useState<StudyEventRow[]>([]);
  const [libraryStudyColorTotals, setLibraryStudyColorTotals] =
    useState<LibraryStudyColorTotals>(emptyLibraryStudyColorTotals());
  const [previousLibraryStudyColorTotals, setPreviousLibraryStudyColorTotals] =
    useState<LibraryStudyColorTotals | null>(null);

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
        setCurrentUserId(null);
        setRows([]);
        setSessions([]);
        setWords([]);
        setGenres([]);
        setStudyEvents([]);
        setLibraryStudyColorTotals(emptyLibraryStudyColorTotals());
        setPreviousLibraryStudyColorTotals(null);
        return;
      }

      setCurrentUserId(user.id);

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
        setStudyEvents([]);
        return;
      }

      const bookIds = Array.from(
        new Set(loadedRows.map((row) => row.books).filter(Boolean).map((book: any) => book.id).filter(Boolean))
      );

      const [
        { data: sessionData, error: sessionErr },
        wordData,
        studyEventData,
        genreResult,
      ] =
        await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select("user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler")
            .in("user_book_id", userBookIds),
          fetchAllUserBookWords(userBookIds),
          fetchAllStudyEvents(user.id),
          bookIds.length > 0
            ? supabase.from("book_genres").select("book_id, genre").in("book_id", bookIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (sessionErr) throw sessionErr;
      if (genreResult.error) throw genreResult.error;

      setSessions(
        ((sessionData ?? []) as SessionRow[]).filter((row) => !row.is_filler)
      );
      setWords((wordData ?? []) as WordRow[]);
      setGenres((genreResult.data ?? []) as GenreRow[]);
      setStudyEvents((studyEventData ?? []) as StudyEventRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const isTeacher = myRole === "teacher" || myRole === "super_teacher";

  useEffect(() => {
    if (!isTeacher && activeTab === "teacherSupport") {
      setActiveTab("library");
    }
  }, [activeTab, isTeacher]);

  const cutoff = useMemo(() => buildRangeCutoff(range), [range]);
  const previousCutoff = useMemo(() => previousRangeCutoff(range, cutoff), [range, cutoff]);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    async function loadLibraryStudyColorTotals() {
      try {
        const [totals, previousTotals] = await Promise.all([
          fetchLibraryStudyColorTotals(currentUserId!, null, { since: cutoff }),
          previousCutoff && cutoff
            ? fetchLibraryStudyColorTotals(currentUserId!, null, {
                since: previousCutoff,
                before: cutoff,
              })
            : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setLibraryStudyColorTotals(totals);
          setPreviousLibraryStudyColorTotals(previousTotals);
        }
      } catch (error) {
        console.error("Error loading Library Study color totals:", error);
        if (!cancelled) {
          setLibraryStudyColorTotals(emptyLibraryStudyColorTotals());
          setPreviousLibraryStudyColorTotals(null);
        }
      }
    }

    void loadLibraryStudyColorTotals();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, cutoff, previousCutoff]);

  const rangeTheme = useMemo(() => timeRangeTheme(range), [range]);

  const laneTheme = useMemo(
    () => readingLaneTheme(abilityBookType),
    [abilityBookType]
  );

  const plainSectionTone = `${rangeTheme.border} bg-white`;
  const filteredSectionTone = `${rangeTheme.border} ${laneTheme.background}`;
  const filteredStatTone = `${rangeTheme.border} ${laneTheme.statBackground}`;

  const filteredSessions = useMemo(() => {
    return sessions.filter((row) => inRangeByDateString(row.read_on, cutoff));
  }, [sessions, cutoff]);

  const filteredWords = useMemo(() => {
    return words.filter((row) => inRangeByDateString(row.created_at, cutoff));
  }, [words, cutoff]);

  const filteredStudyEvents = useMemo(() => {
    return studyEvents.filter((row) => inRangeByDateString(row.created_at, cutoff));
  }, [studyEvents, cutoff]);

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

  const savedWordRhythmActivity = useMemo(() => {
    const today = startOfToday();
    const dayCount = rangeDayCount(range, sessions, words);
    const start = addDays(today, -(dayCount - 1));
    const buckets = new Map<string, { words: number }>();

    for (let i = 0; i < dayCount; i++) {
      buckets.set(ymdLocal(addDays(start, i)), { words: 0 });
    }

    for (const row of words) {
      const day = ymdLocal(new Date(row.created_at));
      if (!buckets.has(day)) continue;

      const bucket = buckets.get(day)!;
      bucket.words += 1;
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
        const wordPages = new Set(
          bookWords
            .map((word) => Number(word.page_number))
            .filter((page) => Number.isFinite(page) && page > 0)
        );

        const pagesWithSavedWords = wordPages.size;
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
          wordsPerPage: pagesWithSavedWords > 0 ? bookWords.length / pagesWithSavedWords : null,
          sessions: bookSessions.length,
          relationshipDays: safeDateDiffInDays(
            row.started_at,
            row.finished_at || row.dnf_at || null
          ),
        } satisfies BookMetric;
      })
      .filter((item) => item.pagesRead > 0 || item.wordsSaved > 0 || item.totalMinutes > 0);
  }, [rows, filteredSessions, filteredWords]);

  const vocabularyBookMetrics = useMemo(() => {
    if (abilityBookType === "all") return bookMetrics;

    return bookMetrics.filter(
      (item) => abilityReadingGroupForBookType(item.bookType) === abilityBookType
    );
  }, [abilityBookType, bookMetrics]);

  const vocabularyUserBookIds = useMemo(() => {
    return new Set(vocabularyBookMetrics.map((item) => item.userBookId));
  }, [vocabularyBookMetrics]);

  const vocabularyWords = useMemo(() => {
    return filteredWords.filter((word) => vocabularyUserBookIds.has(word.user_book_id));
  }, [filteredWords, vocabularyUserBookIds]);

  const vocabularyTotals = useMemo(() => {
    const pagesRead = vocabularyBookMetrics.reduce((sum, item) => sum + item.pagesRead, 0);
    const wordsSaved = vocabularyWords.length;
    const uniqueWords = new Set(
      vocabularyWords.map((row) => wordKey(row.surface, row.meaning))
    ).size;

    return {
      pagesRead,
      wordsSaved,
      uniqueWords,
      wordsPerPage: pagesRead > 0 ? wordsSaved / pagesRead : null,
      booksWithWords: vocabularyBookMetrics.filter((item) => item.wordsSaved > 0).length,
      vocabularyDays: new Set(
        vocabularyWords.map((word) => ymdLocal(new Date(word.created_at)))
      ).size,
    };
  }, [vocabularyBookMetrics, vocabularyWords]);

  const studyEventsForSelectedBookCategory = useMemo(() => {
    if (abilityBookType === "all") return filteredStudyEvents;

    const bookTypeByUserBookId = new Map(
      rows.map((row) => [row.id, row.books?.book_type ?? null])
    );

    return filteredStudyEvents.filter((event) => {
      if (!event.user_book_id) return false;

      const bookType = bookTypeByUserBookId.get(event.user_book_id) ?? null;
      return abilityReadingGroupForBookType(bookType) === abilityBookType;
    });
  }, [abilityBookType, filteredStudyEvents, rows]);

  const studySignals = useMemo(() => {
    const studyDays = new Set<string>();
    const studiedBooks = new Set<string>();
    const studiedCards = new Set<string>();
    const studiedWords = new Set<string>();

    const byBook = new Map<
      string,
      {
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

    for (const event of studyEventsForSelectedBookCategory) {
      studyDays.add(ymdLocal(new Date(event.created_at)));

      if (event.user_book_id) {
        studiedBooks.add(event.user_book_id);

        const title = bookTitleByUserBookId.get(event.user_book_id) ?? "Untitled";
        const eventTime = new Date(event.created_at).getTime();

        const bookStats =
          byBook.get(event.user_book_id) ?? {
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

        if (event.study_mode === "kanji_reading_flashcards") {
          bookStats.kanji += 1;
        } else {
          bookStats.vocab += 1;
        }

        if (event.result === "correct" || event.is_correct === true) {
          bookStats.correct += 1;
        } else if (event.result === "incorrect" || event.is_correct === false) {
          bookStats.incorrect += 1;
        } else {
          bookStats.shown += 1;
        }

        if (Number.isFinite(eventTime)) {
          bookStats.lastStudiedAt = Math.max(bookStats.lastStudiedAt, eventTime);
        }

        byBook.set(event.user_book_id, bookStats);
      }

      const studyItemKey =
        event.user_book_word_id ??
        `${event.study_mode ?? "study"}|||${event.user_book_id ?? ""}|||${event.surface ?? ""}|||${event.reading ?? ""}|||${event.meaning ?? ""}`;

      if (studyItemKey.trim()) {
        studiedCards.add(studyItemKey);
      }

      const wordStudyKey =
        event.user_book_word_id ??
        `${event.surface ?? ""}|||${event.reading ?? ""}|||${event.meaning ?? ""}`;

      if (wordStudyKey.trim()) {
        studiedWords.add(wordStudyKey);
      }

      if (event.result === "correct" || event.is_correct === true) {
        correct += 1;
      } else if (event.result === "incorrect" || event.is_correct === false) {
        incorrect += 1;
      } else if (event.result === "skipped") {
        skipped += 1;
      } else {
        reviewed += 1;
      }
    }

    const answered = correct + incorrect;
    const accuracyPercent = answered > 0 ? Math.round((correct / answered) * 100) : null;

    const recentBookAnswerItems = Array.from(byBook.values())
      .sort((a, b) => b.lastStudiedAt - a.lastStudiedAt)
      .slice(0, 5)
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
      });

    const answerMixItems = [
      { label: "Correct", value: correct },
      { label: "Still sticky", value: incorrect },
      { label: "Reviewed", value: reviewed },
      { label: "Skipped", value: skipped },
    ].filter((item) => item.value > 0);

    return {
      totalEvents: studyEventsForSelectedBookCategory.length,
      studyDays: studyDays.size,
      studiedBooks: studiedBooks.size,
      studiedCards: studiedCards.size,
      studiedWords: studiedWords.size,
      correct,
      incorrect,
      reviewed,
      skipped,
      accuracyPercent,
      recentBookAnswerItems,
      answerMixItems,
    };
  }, [rows, studyEventsForSelectedBookCategory]);

  const vocabularyRhythmActivity = useMemo(() => {
    const today = startOfToday();

    let dayCount = 30;

    if (range === "7d") {
      dayCount = 7;
    } else if (range === "30d") {
      dayCount = 30;
    } else if (range === "90d") {
      dayCount = 90;
    } else if (range === "1y") {
      dayCount = 365;
    } else {
      const dateValues: number[] = [];

      for (const word of vocabularyWords) {
        const time = new Date(word.created_at).getTime();
        if (!Number.isNaN(time)) dateValues.push(time);
      }

      for (const event of studyEventsForSelectedBookCategory) {
        const time = new Date(event.created_at).getTime();
        if (!Number.isNaN(time)) dateValues.push(time);
      }

      if (dateValues.length > 0) {
        const earliest = new Date(Math.min(...dateValues));
        earliest.setHours(0, 0, 0, 0);

        const diff = today.getTime() - earliest.getTime();
        dayCount = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
      }
    }

    const start = addDays(today, -(dayCount - 1));

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

    for (let i = 0; i < dayCount; i++) {
      buckets.set(ymdLocal(addDays(start, i)), {
        words: 0,
        studyEvents: 0,
        correct: 0,
        incorrect: 0,
        reviewed: 0,
        skipped: 0,
      });
    }

    for (const word of vocabularyWords) {
      const day = ymdLocal(new Date(word.created_at));
      if (!buckets.has(day)) continue;

      const bucket = buckets.get(day)!;
      bucket.words += 1;
    }

    for (const event of studyEventsForSelectedBookCategory) {
      const day = ymdLocal(new Date(event.created_at));
      if (!buckets.has(day)) continue;

      const bucket = buckets.get(day)!;
      bucket.studyEvents += 1;

      if (event.result === "correct" || event.is_correct === true) {
        bucket.correct += 1;
      } else if (event.result === "incorrect" || event.is_correct === false) {
        bucket.incorrect += 1;
      } else if (event.result === "skipped") {
        bucket.skipped += 1;
      } else {
        bucket.reviewed += 1;
      }
    }

    return Array.from(buckets.entries()).map(([day, value]) => ({
      day,
      ...value,
    }));
  }, [range, vocabularyWords, studyEventsForSelectedBookCategory]);

  const vocabularyRhythmSummary = useMemo(() => {
    const savedWordDays = vocabularyRhythmActivity.filter(
      (item) => item.words > 0
    ).length;

    const studyDays = vocabularyRhythmActivity.filter(
      (item) => item.studyEvents > 0
    ).length;

    const overlapDays = vocabularyRhythmActivity.filter(
      (item) => item.words > 0 && item.studyEvents > 0
    ).length;

    const activeVocabularyDays = vocabularyRhythmActivity.filter(
      (item) => item.words > 0 || item.studyEvents > 0
    ).length;

    return {
      savedWordDays,
      studyDays,
      overlapDays,
      activeVocabularyDays,
    };
  }, [vocabularyRhythmActivity]);

  const vocabularyWordsByBookTypePie = useMemo(() => {
    const typeByUserBookId = new Map(
      rows.map((row) => [row.id, bookTypeLabel(row.books?.book_type ?? null)])
    );
    const counts = new Map<string, number>();
    const palette = ["#f59e0b", "#ec4899", "#8b5cf6", "#38bdf8", "#14b8a6", "#f97316"];

    for (const word of vocabularyWords) {
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
  }, [rows, vocabularyWords]);

  const vocabularyComparisonRows = useMemo(() => {
    const grouped = new Map<string, BookMetric[]>();

    for (const item of vocabularyBookMetrics) {
      if (item.pagesRead <= 0 || item.wordsPerPage == null) continue;

      const key = item.bookType ?? "other";
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    }

    return Array.from(grouped.entries())
      .map(([key, items]) => {
        const sortedMostWordsFirst = [...items].sort(
          (a, b) => (b.wordsPerPage ?? -1) - (a.wordsPerPage ?? -1)
        );

        const sortedLeastWordsFirst = [...items].sort(
          (a, b) => (a.wordsPerPage ?? 999) - (b.wordsPerPage ?? 999)
        );

        let moreWords: BookMetric | null = null;
        let fewerWords: BookMetric | null = null;

        if (items.length === 1) {
          const onlyBook = items[0];

          if (onlyBook.wordsSaved > 0) {
            moreWords = onlyBook;
          } else {
            fewerWords = onlyBook;
          }
        } else {
          moreWords = sortedMostWordsFirst[0] ?? null;
          fewerWords =
            sortedLeastWordsFirst.find(
              (item) => item.userBookId !== moreWords?.userBookId
            ) ?? null;
        }

        return {
          bookType: items[0]?.bookType ?? null,
          moreWords,
          fewerWords,
        };
      })
      .sort((a, b) => bookTypeSortIndex(a.bookType) - bookTypeSortIndex(b.bookType));
  }, [vocabularyBookMetrics]);

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
    const sessions = abilityBookMetrics.reduce((sum, item) => sum + item.sessions, 0);

    const timedPages = timedFluidPages + timedCuriosityPages;
    const untimedPages = Math.max(0, pagesRead - timedPages);
    const readingMinutes = fluidMinutes + curiosityMinutes;
    const booksTouched = abilityBookMetrics.filter(
      (item) => item.pagesRead > 0 || item.wordsSaved > 0 || item.totalMinutes > 0
    ).length;

    return {
      pagesRead,
      fluidPages,
      curiosityPages,
      timedPages,
      untimedPages,
      wordsSaved,
      readingMinutes,
      booksTouched,
      sessions,
      timedCoveragePercent: pagesRead > 0 ? (timedPages / pagesRead) * 100 : null,
      averageWordsPerPage: pagesRead > 0 ? wordsSaved / pagesRead : null,
      fluidMinutesPerPage: timedFluidPages > 0 ? fluidMinutes / timedFluidPages : null,
      curiosityMinutesPerPage: timedCuriosityPages > 0 ? curiosityMinutes / timedCuriosityPages : null,
    };
  }, [abilityBookMetrics]);

  const abilityStandouts = useMemo(() => {
    const mostWordsPerPage =
      [...abilityBookMetrics]
        .filter((item) => item.wordsPerPage != null && item.pagesRead > 0)
        .sort((a, b) => (b.wordsPerPage ?? 0) - (a.wordsPerPage ?? 0))[0] ?? null;

    const leastWordsPerPage =
      [...abilityBookMetrics]
        .filter((item) => item.wordsPerPage != null && item.pagesRead > 0)
        .sort((a, b) => (a.wordsPerPage ?? 999) - (b.wordsPerPage ?? 999))[0] ?? null;

    const fluidPaceBooks = abilityBookMetrics
      .map((item) => ({
        ...item,
        fluidMinPerPage:
          item.timedFluidPages > 0 ? item.fluidMinutes / item.timedFluidPages : null,
      }))
      .filter((item) => item.fluidMinPerPage != null);

    const curiosityPaceBooks = abilityBookMetrics
      .map((item) => ({
        ...item,
        curiosityMinPerPage:
          item.timedCuriosityPages > 0
            ? item.curiosityMinutes / item.timedCuriosityPages
            : null,
      }))
      .filter((item) => item.curiosityMinPerPage != null);

    const fastestFluid =
      [...fluidPaceBooks].sort(
        (a, b) => (a.fluidMinPerPage ?? 999) - (b.fluidMinPerPage ?? 999)
      )[0] ?? null;

    const slowestFluid =
      [...fluidPaceBooks].sort(
        (a, b) => (b.fluidMinPerPage ?? 0) - (a.fluidMinPerPage ?? 0)
      )[0] ?? null;

    const fastestCuriosity =
      [...curiosityPaceBooks].sort(
        (a, b) =>
          (a.curiosityMinPerPage ?? 999) - (b.curiosityMinPerPage ?? 999)
      )[0] ?? null;

    const slowestCuriosity =
      [...curiosityPaceBooks].sort(
        (a, b) =>
          (b.curiosityMinPerPage ?? 0) - (a.curiosityMinPerPage ?? 0)
      )[0] ?? null;

    return {
      mostWordsPerPage,
      leastWordsPerPage,
      fastestFluid,
      slowestFluid,
      fastestCuriosity,
      slowestCuriosity,
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

  const bookTypeCountPie = useMemo(() => {
    const counts = new Map<string, number>();
    const palette = ["#8b5cf6", "#ec4899", "#38bdf8", "#f59e0b", "#14b8a6", "#f97316"];

    for (const row of activeRows) {
      const label = bookTypeLabel(row.books?.book_type ?? null);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }));
  }, [activeRows]);

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
      if (item.pagesRead <= 0 || item.averageMinutesPerPage == null) continue;

      const label = paceLabel(item);
      if (!label) continue;

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

  const abilityComparisonRows = useMemo(() => {
    const grouped = new Map<string, BookMetric[]>();

    for (const item of abilityBookMetrics) {
      if (item.pagesRead <= 0 || item.averageMinutesPerPage == null) continue;

      const key = item.bookType ?? "other";
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    }

    return Array.from(grouped.entries())
      .map(([key, items]) => {
        const sortedSlowestFirst = [...items].sort(
          (a, b) =>
            (b.averageMinutesPerPage ?? -1) - (a.averageMinutesPerPage ?? -1)
        );

        const sortedFastestFirst = [...items].sort(
          (a, b) =>
            (a.averageMinutesPerPage ?? 999) - (b.averageMinutesPerPage ?? 999)
        );

        let pushed: BookMetric | null = null;
        let flowed: BookMetric | null = null;

        if (items.length === 1) {
          const onlyBook = items[0];
          const label = paceLabel(onlyBook);

          if (label === "Flowing" || label === "Steady") {
            flowed = onlyBook;
          } else if (label === "Support-heavy" || label === "Pushes back") {
            pushed = onlyBook;
          }
        } else {
          pushed = sortedSlowestFirst[0] ?? null;
          flowed =
            sortedFastestFirst.find(
              (item) => item.userBookId !== pushed?.userBookId
            ) ?? null;
        }

        return {
          bookType: items[0]?.bookType ?? null,
          pushed,
          flowed,
        };
      })
      .sort((a, b) => bookTypeSortIndex(a.bookType) - bookTypeSortIndex(b.bookType));
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
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="max-w-4xl">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Stats
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Stats with clearer jobs
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              A clearer view of your reading life, reading ability, library, vocabulary, and teacher support.
            </p>
          </div>

          {errorMsg ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
        </section>

        <section className={`lg:sticky lg:top-36 z-30 rounded-2xl border-2 ${rangeTheme.border} bg-white/95 p-3 shadow-lg ring-1 ring-slate-900/5 backdrop-blur`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Stats Controls
              </div>
              <div className="text-sm font-medium text-slate-900">
                {statsTabLabel(activeTab)} · {formatRangeLabel(range)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2 text-sm">
                {(["7d", "30d", "90d", "1y", "all"] as DateRange[]).map((option) => {
                  const optionTheme = timeRangeTheme(option);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRange(option)}
                      className={`rounded-xl border px-4 py-2 font-medium transition ${range === option
                        ? optionTheme.buttonActive
                        : optionTheme.buttonInactive
                        }`}
                    >
                      {formatRangeLabel(option)}
                    </button>
                  );
                })}
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

          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="grid gap-2 md:grid-cols-5">
              {(["library", "life", "skill", "vocabulary", ...(isTeacher ? ["teacherSupport" as const] : [])] as StatsTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-4 py-3 text-left transition ${activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-white"
                    }`}
                >
                  <div className="text-sm font-semibold">{statsTabLabel(tab)}</div>
                  <div className={`mt-1 text-xs leading-5 ${activeTab === tab ? "text-slate-200" : "text-slate-500"}`}>
                    {statsTabDescription(tab)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {activeTab === "skill" || activeTab === "vocabulary" ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <ReadingLaneFilter
                value={abilityBookType}
                onChange={setAbilityBookType}
              />
            </div>
          ) : null}
        </section>

        {activeTab === "life" && (
          <>
            <SectionBand
              eyebrow="Momentum"
              title="Reading rhythm"
              description={`A quick view of how often Japanese showed up in your life for ${formatRangeLabel(range).toLowerCase()}.`}
              tone={plainSectionTone}
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
                <div className="rounded-xl border border-slate-900/10 bg-white/85 px-4 py-3 shadow-sm">
                  <div className="text-xs text-slate-500">Reading pages</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {totals.pagesRead}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-900/10 bg-white/85 px-4 py-3 shadow-sm">
                  <div className="text-xs text-slate-500">Reading time</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {formatMinutesAsReadableTime(totals.readingMinutes)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-900/10 bg-white/85 px-4 py-3 shadow-sm">
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
                tone={plainSectionTone}
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
                tone={plainSectionTone}
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
                tone={plainSectionTone}
              >
                <PieChart items={bookTypePie} size={180} />
              </SectionBand>
            </div>
          </>
        )}

        {activeTab === "skill" && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Timed Page Coverage"
                value={
                  abilityTotals.timedCoveragePercent == null
                    ? "—"
                    : `${Math.round(abilityTotals.timedCoveragePercent)}%`
                }
                hint={`${abilityTotals.timedPages} timed pages · ${abilityTotals.untimedPages} untimed pages`}
                tone={filteredStatTone}
              />

              <StatCard
                label="Fluid Pace Per Page"
                value={
                  abilityTotals.fluidMinutesPerPage == null
                    ? "—"
                    : `${formatDecimal(abilityTotals.fluidMinutesPerPage)} min/page`
                }
                hint="Time per page during fluid reading"
                tone={filteredStatTone}
              />

              <StatCard
                label="Curiosity Pace Per Page"
                value={
                  abilityTotals.curiosityMinutesPerPage == null
                    ? "—"
                    : `${formatDecimal(abilityTotals.curiosityMinutesPerPage)} min/page`
                }
                hint="Time per page during curiosity reading"
                tone={filteredStatTone}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={`rounded-2xl border-2 p-4 shadow-sm ${filteredSectionTone}`}>
                <div className="text-xs font-medium uppercase text-slate-600">
                  Fluid Reading Range
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs text-slate-500">Fastest</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {abilityStandouts.fastestFluid?.fluidMinPerPage != null
                        ? `${formatDecimal(abilityStandouts.fastestFluid.fluidMinPerPage)} min/page`
                        : "—"}
                    </div>
                    <div className="truncate text-sm text-slate-700">
                      {abilityStandouts.fastestFluid?.title ?? "No timed fluid reading yet"}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-xs text-slate-500">Slowest</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {abilityStandouts.slowestFluid?.fluidMinPerPage != null
                        ? `${formatDecimal(abilityStandouts.slowestFluid.fluidMinPerPage)} min/page`
                        : "—"}
                    </div>
                    <div className="truncate text-sm text-slate-700">
                      {abilityStandouts.slowestFluid?.title ?? "No timed fluid reading yet"}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border-2 p-4 shadow-sm ${filteredSectionTone}`}>
                <div className="text-xs font-medium uppercase text-slate-600">
                  Curiosity Reading Range
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs text-slate-500">Fastest</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {abilityStandouts.fastestCuriosity?.curiosityMinPerPage != null
                        ? `${formatDecimal(
                          abilityStandouts.fastestCuriosity.curiosityMinPerPage
                        )} min/page`
                        : "—"}
                    </div>
                    <div className="truncate text-sm text-slate-700">
                      {abilityStandouts.fastestCuriosity?.title ??
                        "No timed curiosity reading yet"}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-xs text-slate-500">Slowest</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {abilityStandouts.slowestCuriosity?.curiosityMinPerPage != null
                        ? `${formatDecimal(
                          abilityStandouts.slowestCuriosity.curiosityMinPerPage
                        )} min/page`
                        : "—"}
                    </div>
                    <div className="truncate text-sm text-slate-700">
                      {abilityStandouts.slowestCuriosity?.title ??
                        "No timed curiosity reading yet"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SectionBand
              eyebrow="Pace"
              title="How your books felt to read"
              description="Books are grouped by minutes per page only. Saved-word density has been moved to the Vocabulary tab."
              tone={filteredSectionTone}
            >
              <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr] xl:items-start">
                <PieChart items={pacePie} />

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "Flowing",
                      color: "bg-emerald-400",
                      text: "These books moved quickly page by page.",
                    },
                    {
                      label: "Steady",
                      color: "bg-sky-400",
                      text: "Comfortably readable, but still asking for attention.",
                    },
                    {
                      label: "Support-heavy",
                      color: "bg-amber-400",
                      text: "These books took noticeably more time per page.",
                    },
                    {
                      label: "Pushes back",
                      color: "bg-rose-400",
                      text: "These books were slow enough to feel like real resistance.",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <span className={`h-3 w-3 rounded-full ${item.color}`} />
                        {item.label}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">
                        {item.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionBand>

            <SectionBand
              eyebrow="Challenge vs Ease"
              title="Books that pushed back / books that flowed"
              description="One representative from each book type, using pace only: slowest min/page on the left, fastest min/page on the right."
              tone={filteredSectionTone}
            >
              {abilityComparisonRows.length > 0 ? (
                <div className="space-y-4">
                  {abilityComparisonRows.map((row) => (
                    <div
                      key={row.bookType ?? "other"}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 text-sm font-semibold text-slate-900">
                        {bookTypeLabel(row.bookType)}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-xl border border-rose-200 bg-white p-4">
                          <div className="mb-3 text-xs font-semibold uppercase text-rose-700">
                            Pushed back
                          </div>

                          {row.pushed ? (
                            <>
                              <div className="flex items-center gap-3">
                                {row.pushed.coverUrl ? (
                                  <img
                                    src={row.pushed.coverUrl}
                                    alt=""
                                    className="h-16 w-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-16 w-12 rounded bg-slate-200" />
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-slate-900">
                                    {row.pushed.title}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {abilityReadingGroupLabel(
                                      abilityReadingGroupForBookType(row.pushed.bookType)
                                    )}{" "}
                                    · {bookTypeLabel(row.pushed.bookType)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Min/page</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {formatDecimal(row.pushed.averageMinutesPerPage)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Pages</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.pushed.pagesRead}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Days</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.pushed.engagementDays}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                              No pushed-back book fits here yet. Keep reading!
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-sky-200 bg-white p-4">
                          <div className="mb-3 text-xs font-semibold uppercase text-sky-700">
                            Flowed
                          </div>

                          {row.flowed ? (
                            <>
                              <div className="flex items-center gap-3">
                                {row.flowed.coverUrl ? (
                                  <img
                                    src={row.flowed.coverUrl}
                                    alt=""
                                    className="h-16 w-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-16 w-12 rounded bg-slate-200" />
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-slate-900">
                                    {row.flowed.title}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {abilityReadingGroupLabel(
                                      abilityReadingGroupForBookType(row.flowed.bookType)
                                    )}{" "}
                                    · {bookTypeLabel(row.flowed.bookType)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Min/page</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {formatDecimal(row.flowed.averageMinutesPerPage)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Pages</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.flowed.pagesRead}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Days</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.flowed.engagementDays}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                              No flowing book fits here yet. Keep reading!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No timed reading comparison yet. Add minutes to reading sessions to see pace.
                </div>
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
              tone={plainSectionTone}
            >
              <TrendChart items={trendItems} bucketLabel={trendBucketLabel(range)} />
            </SectionBand>

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionBand
                eyebrow="Book Types"
                title="Book types in your library"
                description="A count of the book types that showed up in this reading window."
                tone={plainSectionTone}
              >
                <PieChart items={bookTypeCountPie} size={180} />
              </SectionBand>

              <SectionBand
                eyebrow="Ratings"
                title="How you rated books"
                description="Your overall ratings across books with a saved rating."
                tone={plainSectionTone}
              >
                <PieChart items={ratingPie} size={180} />
              </SectionBand>

              <SectionBand
                eyebrow="Difficulty"
                title="Difficulty for me"
                description="Your private community answer about how each book felt at your level."
                tone={plainSectionTone}
              >
                <PieChart items={difficultyPie} size={180} />
              </SectionBand>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionBand
                eyebrow="Authors"
                title="Authors you keep returning to"
                description="Writers whose books actually keep showing up in your reading life."
                tone={plainSectionTone}
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
                tone={plainSectionTone}
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
                tone={plainSectionTone}
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
            <SectionBand
              eyebrow="Library Study"
              title="Color totals in this window"
              description="Current color states for words encountered or claimed during the selected time filter. Book type does not affect these stats. Practice review does not move these colors."
              tone={filteredSectionTone}
            >
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
                {LIBRARY_STUDY_COLOR_ORDER.map((color) => {
                  const displayColor = color as LibraryStudyDisplayColor;
                  const delta =
                    previousLibraryStudyColorTotals == null
                      ? null
                      : libraryStudyColorTotals[color] - previousLibraryStudyColorTotals[color];

                  return (
                    <div
                      key={color}
                      className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-3 w-3 rounded-full ${libraryStudyColorDot(displayColor)}`}
                        />
                        <div className="text-xs font-semibold text-slate-600">
                          {libraryStudyColorLabel(displayColor)}
                        </div>
                      </div>

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl font-semibold text-slate-900">
                          {libraryStudyColorTotals[color]}
                        </span>
                        <ColorTotalDelta value={delta} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBand>

            <SectionBand
              eyebrow="Vocabulary Rhythm"
              title="Saved words → study rhythm"
              description={`A combined view of which days you saved vocabulary and which days you came back to study it during ${formatRangeLabel(
                range
              ).toLowerCase()}. This respects the book category filter above.`}
              tone={filteredSectionTone}
            >
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-14 xl:grid-cols-28">
                {vocabularyRhythmActivity.map((item) => {
                  const hasSavedWords = item.words > 0;
                  const hasStudy = item.studyEvents > 0;
                  const intensity = item.words + item.studyEvents;

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
                        className={`h-14 rounded-xl border border-white/60 ${colorClass}`}
                        title={`${item.day}: ${item.words} saved word${item.words === 1 ? "" : "s"
                          }, ${item.studyEvents} study card${item.studyEvents === 1 ? "" : "s"
                          }`}
                      />
                      <div className="text-center text-[10px] text-slate-500">
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
                <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
                  <div className="text-xs text-slate-500">Active vocab days</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {vocabularyRhythmSummary.activeVocabularyDays}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
                  <div className="text-xs text-slate-500">Saved word days</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {vocabularyRhythmSummary.savedWordDays}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
                  <div className="text-xs text-slate-500">Study days</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {vocabularyRhythmSummary.studyDays}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
                  <div className="text-xs text-slate-500">Words saved</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {vocabularyTotals.wordsSaved}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
                  <div className="text-xs text-slate-500">Cards reviewed</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {studySignals.totalEvents}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Study loop
                </div>

                <div className="mt-2 text-sm leading-6 text-slate-600">
                  {vocabularyTotals.wordsSaved === 0 && studySignals.totalEvents === 0
                    ? "No vocabulary activity in this window yet. Save words while reading, then review a few flashcards to start building a rhythm."
                    : studySignals.totalEvents === 0
                      ? `You saved ${vocabularyTotals.wordsSaved} word${vocabularyTotals.wordsSaved === 1 ? "" : "s"
                      } in this window, but haven’t studied them yet.`
                      : vocabularyTotals.wordsSaved === 0
                        ? `You reviewed ${studySignals.totalEvents} card${studySignals.totalEvents === 1 ? "" : "s"
                        }, but did not save new words in this window.`
                        : `You saved ${vocabularyTotals.wordsSaved} word${vocabularyTotals.wordsSaved === 1 ? "" : "s"
                        } and reviewed ${studySignals.totalEvents} card${studySignals.totalEvents === 1 ? "" : "s"
                        }. ${vocabularyRhythmSummary.overlapDays} day${vocabularyRhythmSummary.overlapDays === 1 ? "" : "s"
                        } included both saving and studying.`}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                    <div className="text-[11px] text-slate-500">Unique words studied</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {studySignals.studiedWords}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                    <div className="text-[11px] text-slate-500">Books represented</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {studySignals.studiedBooks}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                    <div className="text-[11px] text-slate-500">Accuracy</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {studySignals.accuracyPercent == null
                        ? "—"
                        : `${studySignals.accuracyPercent}%`}
                    </div>
                  </div>
                </div>

                {studySignals.totalEvents > 0 ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <div className="text-[11px] text-emerald-700">Correct</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {studySignals.correct}
                      </div>
                    </div>

                    <div className="rounded-lg bg-rose-50 px-3 py-2">
                      <div className="text-[11px] text-rose-700">Still sticky</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {studySignals.incorrect}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                      <div className="text-[11px] text-slate-500">Reviewed</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {studySignals.reviewed}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                      <div className="text-[11px] text-slate-500">Skipped</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {studySignals.skipped}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              {studySignals.recentBookAnswerItems.length > 0 ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Last 5 books studied
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Recent book connections from vocab and kanji study.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {studySignals.recentBookAnswerItems.map((book) => (
                      <div
                        key={`${book.title}-${book.lastStudiedAt}`}
                        className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {book.title}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {book.total} card{book.total === 1 ? "" : "s"} studied
                              {book.studyTypeDetail ? ` · ${book.studyTypeDetail}` : ""}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-sm font-semibold text-slate-900">
                              {book.accuracyPercent == null
                                ? "—"
                                : `${book.accuracyPercent}%`}
                            </div>
                            <div className="text-xs text-slate-500">accuracy</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-lg bg-emerald-50 px-3 py-2">
                            <div className="text-[11px] text-emerald-700">Correct</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {book.correct}
                            </div>
                          </div>

                          <div className="rounded-lg bg-rose-50 px-3 py-2">
                            <div className="text-[11px] text-rose-700">Still sticky</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {book.incorrect}
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                            <div className="text-[11px] text-slate-500">Study type</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {book.studyTypeLabel}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : studySignals.totalEvents > 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-slate-500">
                  Study events are being recorded, but no book connection was found yet.
                </div>
              ) : null}
            </SectionBand>
            <SectionBand
              eyebrow="Book Type"
              title="Where saved words came from"
              description="This keeps vocabulary tied to reading context: a word saved from manga, a novel, or a textbook can mean different kinds of friction."
              tone={filteredSectionTone}
            >
              <PieChart items={vocabularyWordsByBookTypePie} />
            </SectionBand>


            <SectionBand
              eyebrow="Vocabulary Friction"
              title="Books with more saved words / fewer saved words"
              description="One representative from each book type. This uses saved-word density, not reading pace."
              tone={filteredSectionTone}
            >
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                Vocabulary density is calculated from saved word page numbers:
                saved words ÷ pages with saved words. Words without page numbers still count
                as saved words, but they cannot be used for words/page density yet.
              </div>
              {vocabularyComparisonRows.length > 0 ? (
                <div className="space-y-4">
                  {vocabularyComparisonRows.map((row) => (
                    <div
                      key={row.bookType ?? "other"}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 text-sm font-semibold text-slate-900">
                        {bookTypeLabel(row.bookType)}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-xl border border-amber-200 bg-white p-4">
                          <div className="mb-3 text-xs font-semibold uppercase text-amber-700">
                            More saved words
                          </div>

                          {row.moreWords ? (
                            <>
                              <div className="flex items-center gap-3">
                                {row.moreWords.coverUrl ? (
                                  <img
                                    src={row.moreWords.coverUrl}
                                    alt=""
                                    className="h-16 w-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-16 w-12 rounded bg-slate-200" />
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-slate-900">
                                    {row.moreWords.title}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {bookTypeLabel(row.moreWords.bookType)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Words/page</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {formatRate(row.moreWords.wordsPerPage)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Saved words</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.moreWords.wordsSaved}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Pages</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.moreWords.pagesRead}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                              No high-vocabulary-friction book fits here yet. Keep reading!
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-sky-200 bg-white p-4">
                          <div className="mb-3 text-xs font-semibold uppercase text-sky-700">
                            Fewer saved words
                          </div>

                          {row.fewerWords ? (
                            <>
                              <div className="flex items-center gap-3">
                                {row.fewerWords.coverUrl ? (
                                  <img
                                    src={row.fewerWords.coverUrl}
                                    alt=""
                                    className="h-16 w-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-16 w-12 rounded bg-slate-200" />
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-slate-900">
                                    {row.fewerWords.title}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {bookTypeLabel(row.fewerWords.bookType)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Words/page</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {formatRate(row.fewerWords.wordsPerPage)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Saved words</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.fewerWords.wordsSaved}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm">
                                  <div className="text-[11px] text-slate-500">Pages</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {row.fewerWords.pagesRead}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                              No low-vocabulary-friction book fits here yet. Keep reading!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No vocabulary density comparison yet. Add page numbers to saved words to calculate words/page.
                </div>
              )}
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
                tone={plainSectionTone}
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
                tone={plainSectionTone}
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
              tone={plainSectionTone}
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    Use With Students ratings
                  </div>
                  <PieChart items={teacherUsePie} size={180} />
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    Language Learning Potential ratings
                  </div>
                  <PieChart items={languageLearningPie} size={180} />
                </div>
              </div>
            </SectionBand>

            <SectionBand
              eyebrow="Mekuru Levels"
              title="Books by recommended Mekuru level"
              description="Every level stays visible. Books appear under the level a teacher marked on the book page."
              tone={plainSectionTone}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {MEKURU_LEVEL_OPTIONS.map((level) => {
                  const levelBooks = booksByRecommendedLevel.get(level.value) ?? [];

                  return (
                    <div
                      key={level.value}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
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
                            <div
                              key={book.userBookId}
                              className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              <div className="font-medium text-slate-900">
                                {book.title}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Student use:{" "}
                                {book.rating ? `${book.rating}/5` : "not rated"}
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
