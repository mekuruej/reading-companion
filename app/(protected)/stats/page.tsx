"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DateRange = "30d" | "90d" | "all";
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

type BookRow = {
  title: string;
  author: string | null;
  book_type: BookType;
  page_count: number | null;
  cover_url: string | null;
};

type UserBookRow = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  books: BookRow | null;
};

type RawUserBookRow = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  books: BookRow | BookRow[] | null;
};

type SessionRow = {
  user_book_id: string;
  read_on: string | null;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  session_mode: SessionMode | null;
};

type WordRow = {
  user_book_id: string;
  created_at: string;
  surface: string | null;
  meaning: string | null;
};

type BookMetric = {
  userBookId: string;
  title: string;
  bookType: BookType;
  coverUrl: string | null;
  pageCount: number | null;
  pagesRead: number;
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
  wordsSaved: number;
  totalMinutes: number;
  averageMinutesPerPage: number | null;
  wordsPerPage: number | null;
};

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
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  return "All time";
}

function bookTypeLabel(bookType: BookType) {
  if (!bookType) return "Other";

  return bookType
    .split("_")
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

function sessionPages(row: SessionRow) {
  const start = Number(row.start_page);
  const end = Number(row.end_page);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return end - start + 1;
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
  const days = range === "30d" ? -29 : -89;
  return addDays(today, days);
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

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
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

      <div className="space-y-3">
        {paths.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-sm text-slate-700">{item.label}</span>
            </div>
            <div className="shrink-0 text-sm font-medium text-slate-900">
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
}: {
  items: { label: string; books: number; pages: number }[];
}) {
  const width = 760;
  const height = 320;
  const left = 52;
  const right = 52;
  const top = 26;
  const bottom = 42;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxBooks = Math.max(1, ...items.map((item) => item.books));
  const maxPages = Math.max(1, ...items.map((item) => item.pages));

  const pointFor = (index: number, value: number, max: number) => {
    const x = left + (items.length === 1 ? innerWidth / 2 : (index / (items.length - 1)) * innerWidth);
    const y = top + innerHeight - (value / max) * innerHeight;
    return { x, y };
  };

  const booksPoints = items.map((item, index) => pointFor(index, item.books, maxBooks));
  const pagesPoints = items.map((item, index) => pointFor(index, item.pages, maxPages));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {[0, 1, 2, 3, 4].map((line) => {
          const y = top + (innerHeight / 4) * line;
          return (
            <line
              key={line}
              x1={left}
              y1={y}
              x2={width - right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

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
          <circle key={`book-${items[index].label}`} cx={point.x} cy={point.y} r="4.5" fill="#60a5fa" />
        ))}
        {pagesPoints.map((point, index) => (
          <circle key={`page-${items[index].label}`} cx={point.x} cy={point.y} r="4.5" fill="#fb7185" />
        ))}

        {items.map((item, index) => {
          const x = left + (items.length === 1 ? innerWidth / 2 : (index / (items.length - 1)) * innerWidth);
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

  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [words, setWords] = useState<WordRow[]>([]);

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
        setRows([]);
        setSessions([]);
        setWords([]);
        return;
      }

      const { data: userBooks, error: userBooksErr } = await supabase
        .from("user_books")
        .select(
          `
            id,
            started_at,
            finished_at,
            dnf_at,
            books:book_id (
              title,
              author,
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
        books: Array.isArray(row.books) ? row.books[0] ?? null : row.books ?? null,
      }));
      setRows(loadedRows);

      const userBookIds = loadedRows.map((row) => row.id).filter(Boolean);

      if (userBookIds.length === 0) {
        setSessions([]);
        setWords([]);
        return;
      }

      const [{ data: sessionData, error: sessionErr }, { data: wordData, error: wordErr }] =
        await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select("user_book_id, read_on, start_page, end_page, minutes_read, session_mode")
            .in("user_book_id", userBookIds),
          supabase
            .from("user_book_words")
            .select("user_book_id, created_at, surface, meaning")
            .in("user_book_id", userBookIds),
        ]);

      if (sessionErr) throw sessionErr;
      if (wordErr) throw wordErr;

      setSessions((sessionData ?? []) as SessionRow[]);
      setWords((wordData ?? []) as WordRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

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
    let curiosityMinutes = 0;
    let fluidMinutes = 0;
    let listeningMinutes = 0;

    for (const row of filteredSessions) {
      const pages = sessionPages(row);
      const minutes = Number(row.minutes_read) || 0;
      pagesRead += pages;

      if (row.session_mode === "curiosity") curiosityMinutes += minutes;
      else if (row.session_mode === "listening") listeningMinutes += minutes;
      else fluidMinutes += minutes;
    }

    const totalMinutes = curiosityMinutes + fluidMinutes + listeningMinutes;
    const wordsSaved = filteredWords.length;
    const uniqueWords = new Set(filteredWords.map((row) => wordKey(row.surface, row.meaning))).size;

    return {
      pagesRead,
      curiosityMinutes,
      fluidMinutes,
      listeningMinutes,
      totalMinutes,
      wordsSaved,
      uniqueWords,
      daysEngaged: engagementDays.size,
      averageMinutesPerPage: pagesRead > 0 ? totalMinutes / pagesRead : null,
      averageWordsPerPage: pagesRead > 0 ? wordsSaved / pagesRead : null,
    };
  }, [filteredSessions, filteredWords, engagementDays]);

  const recent28DayActivity = useMemo(() => {
    const today = startOfToday();
    const start = addDays(today, -27);
    const buckets = new Map<string, { pages: number; words: number; engaged: boolean }>();

    for (let i = 0; i < 28; i++) {
      buckets.set(ymdLocal(addDays(start, i)), { pages: 0, words: 0, engaged: false });
    }

    for (const row of sessions) {
      if (!row.read_on || !buckets.has(row.read_on)) continue;
      const bucket = buckets.get(row.read_on)!;
      bucket.pages += sessionPages(row);
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
  }, [sessions, words]);

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

        const pagesRead = bookSessions.reduce((sum, session) => sum + sessionPages(session), 0);
        const curiosityMinutes = bookSessions.reduce(
          (sum, session) => sum + (session.session_mode === "curiosity" ? Number(session.minutes_read) || 0 : 0),
          0
        );
        const fluidMinutes = bookSessions.reduce(
          (sum, session) => sum + ((session.session_mode === "fluid" || !session.session_mode) ? Number(session.minutes_read) || 0 : 0),
          0
        );
        const listeningMinutes = bookSessions.reduce(
          (sum, session) => sum + (session.session_mode === "listening" ? Number(session.minutes_read) || 0 : 0),
          0
        );

        const totalMinutes = curiosityMinutes + fluidMinutes + listeningMinutes;
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
          wordsSaved: bookWords.length,
          uniqueWords,
          engagementDays: days.size,
          curiosityMinutes,
          fluidMinutes,
          listeningMinutes,
          totalMinutes,
          averageMinutesPerPage: pagesRead > 0 ? totalMinutes / pagesRead : null,
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
        averageMinutesPerPage: item.pagesRead > 0 ? item.totalMinutes / item.pagesRead : null,
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

  const bookTypePie = useMemo(() => {
    const palette = ["#8b5cf6", "#ec4899", "#38bdf8", "#f59e0b", "#14b8a6", "#f97316"];
    return typeMetrics.map((item, index) => ({
      label: item.bookType,
      value: item.pagesRead,
      color: palette[index % palette.length],
    }));
  }, [typeMetrics]);

  const repeatedAuthors = useMemo(() => {
    const counts = new Map<string, { author: string; books: number; pages: number }>();

    for (const row of rows) {
      const author = row.books?.author?.trim();
      if (!author) continue;

      const metric = bookMetrics.find((item) => item.userBookId === row.id);
      const existing = counts.get(author) ?? { author, books: 0, pages: 0 };
      existing.books += 1;
      existing.pages += metric?.pagesRead ?? 0;
      counts.set(author, existing);
    }

    return Array.from(counts.values())
      .sort((a, b) => (b.books === a.books ? b.pages - a.pages : b.books - a.books))
      .slice(0, 6);
  }, [rows, bookMetrics]);

  const pacePie = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const item of bookMetrics) {
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
  }, [bookMetrics]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const buckets = labels.map((label) => ({
      label,
      books: 0,
      pages: 0,
      seen: new Set<string>(),
    }));

    for (const session of sessions) {
      if (!session.read_on) continue;
      const date = new Date(session.read_on);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) continue;
      const month = date.getMonth();
      buckets[month].pages += sessionPages(session);
      buckets[month].seen.add(session.user_book_id);
    }

    for (const word of words) {
      const date = new Date(word.created_at);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) continue;
      const month = date.getMonth();
      buckets[month].seen.add(word.user_book_id);
    }

    return buckets.map((bucket) => ({
      label: bucket.label,
      books: bucket.seen.size,
      pages: bucket.pages,
    }));
  }, [sessions, words]);

  const spotlights = useMemo(() => {
    const byConsistency = [...bookMetrics]
      .filter((item) => item.engagementDays > 0)
      .sort((a, b) => b.engagementDays - a.engagementDays)[0];

    const byStretch = [...bookMetrics]
      .filter((item) => item.wordsPerPage != null)
      .sort((a, b) => (b.wordsPerPage ?? 0) - (a.wordsPerPage ?? 0))[0];

    const bySmoothest = [...bookMetrics]
      .filter((item) => item.averageMinutesPerPage != null)
      .sort((a, b) => (a.averageMinutesPerPage ?? 999) - (b.averageMinutesPerPage ?? 999))[0];

    const byCuriosity = [...bookMetrics]
      .filter((item) => item.curiosityMinutes > 0)
      .sort((a, b) => b.curiosityMinutes - a.curiosityMinutes)[0];

    const byFluid = [...bookMetrics]
      .filter((item) => item.fluidMinutes > 0)
      .sort((a, b) => b.fluidMinutes - a.fluidMinutes)[0];

    const byRelationship = [...bookMetrics]
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
  }, [bookMetrics]);

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
    return [...bookMetrics]
      .filter((item) => item.pagesRead > 0)
      .sort((a, b) => {
        const aScore = (a.wordsPerPage ?? 0) * 2 + (a.averageMinutesPerPage ?? 0);
        const bScore = (b.wordsPerPage ?? 0) * 2 + (b.averageMinutesPerPage ?? 0);
        return bScore - aScore;
      })
      .slice(0, 5);
  }, [bookMetrics]);

  const flowingBooks = useMemo(() => {
    return [...bookMetrics]
      .filter((item) => item.pagesRead > 0)
      .sort((a, b) => {
        const aScore = (a.wordsPerPage ?? 0) * 2 + (a.averageMinutesPerPage ?? 0);
        const bScore = (b.wordsPerPage ?? 0) * 2 + (b.averageMinutesPerPage ?? 0);
        return aScore - bScore;
      })
      .slice(0, 5);
  }, [bookMetrics]);

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
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase text-slate-500">Rough Draft</div>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">What kind of Japanese reader am I?</h1>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                This page is trying to hold both sides of MEKURU at once: study habits, reading support, and
                vocabulary friction, but also a little ordinary bookish life. So it can talk about what pushes
                back, what flows, what kinds of books you read, and how your reading rhythm changes over time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white text-sm">
                {(["30d", "90d", "all"] as DateRange[]).map((option) => (
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Days Engaged"
            value={String(totals.daysEngaged)}
            hint={`${formatRangeLabel(range)} across reading or word-saving days`}
            tone="border-violet-200 bg-violet-50"
          />
          <StatCard
            label="Pages Read"
            value={String(totals.pagesRead)}
            hint="Coverage from fluid, curiosity, and listening sessions"
            tone="border-sky-200 bg-sky-50"
          />
          <StatCard
            label="Words Saved"
            value={String(totals.wordsSaved)}
            hint={`${totals.uniqueWords} unique words met`}
            tone="border-amber-200 bg-amber-50"
          />
          <StatCard
            label="Average Support"
            value={
              totals.averageWordsPerPage == null
                ? "—"
                : `${formatDecimal(totals.averageWordsPerPage)} words/page`
            }
            hint={
              totals.averageMinutesPerPage == null
                ? "No page timing yet"
                : `${formatDecimal(totals.averageMinutesPerPage)} min/page`
            }
            tone="border-emerald-200 bg-emerald-50"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <SectionBand
            eyebrow="Momentum"
            title="Reading rhythm"
            description="A quick view of how often Japanese showed up in your life over the last 28 days."
          >
            <div className="grid grid-cols-7 gap-2 sm:grid-cols-14 xl:grid-cols-28">
              {recent28DayActivity.map((item) => {
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
                <div className="text-xs text-slate-500">Total time in Japanese books</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {formatMinutesAsReadableTime(totals.totalMinutes)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">Average session support</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {totals.averageWordsPerPage == null ? "—" : `${formatDecimal(totals.averageWordsPerPage)} words/page`}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">Average pace</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {totals.averageMinutesPerPage == null ? "—" : `${formatDecimal(totals.averageMinutesPerPage)} min/page`}
                </div>
              </div>
            </div>
          </SectionBand>

          <SectionBand
            eyebrow="Support"
            title="How support showed up"
            description="Still very MEKURU: not just how much time you spent, but what kind of help your reading leaned on."
          >
            <div className="space-y-4">
              {supportBars.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="font-medium text-slate-900">{formatMinutesAsReadableTime(item.value)}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase text-slate-500">Reading relationship</div>
              <div className="mt-2 text-sm leading-6 text-slate-700">
                {totals.wordsSaved === 0 && totals.pagesRead === 0
                  ? "No reading activity in this window yet."
                  : `You spent ${formatMinutesAsReadableTime(
                    totals.fluidMinutes
                  )} in fluid reading, ${formatMinutesAsReadableTime(
                    totals.curiosityMinutes
                  )} in curiosity reading, and ${formatMinutesAsReadableTime(
                    totals.listeningMinutes
                  )} listening. That mix says a lot more about your reader-self than a plain monthly book count.`}
              </div>
            </div>
          </SectionBand>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <SectionBand
            eyebrow="Over Time"
            title="Books and pages this year"
            description="A more ordinary reading-life chart, but still useful. It shows how many books you were actively touching and how many pages you moved through each month."
          >
            <TrendChart items={monthlyTrend} />
          </SectionBand>

          <SectionBand
            eyebrow="Color"
            title="Time breakdown"
            description="A brighter view of how fluid, curious, or listening-heavy your reading life has been."
          >
            <PieChart items={timePie} />
          </SectionBand>
        </div>

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

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionBand
            eyebrow="Bookish"
            title="What kinds of books filled your time"
            description="A little more classic bookshelf energy, but measured by pages so the chart reflects actual reading weight."
          >
            <PieChart items={bookTypePie} />
          </SectionBand>

          <SectionBand
            eyebrow="Pace"
            title="How your books felt to read"
            description="A pie chart of all the books you touched in this window, grouped by pace: which ones flowed, which stayed steady, and which really pushed back."
          >
            <PieChart items={pacePie} />
          </SectionBand>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionBand
            eyebrow="Authors"
            title="Authors you keep returning to"
            description="Not just favorites in theory. These are the writers whose books actually keep showing up in your reading life."
          >
            {repeatedAuthors.length > 0 ? (
              <BarStrip
                items={repeatedAuthors.map((item) => ({
                  label: item.author,
                  value: item.books,
                }))}
                colorClass="bg-gradient-to-r from-fuchsia-400 to-violet-500"
                valueSuffix=" books"
              />
            ) : (
              <div className="text-sm text-slate-500">No repeated authors yet.</div>
            )}
          </SectionBand>

          <SectionBand
            eyebrow="Legend"
            title="What the pace slices mean"
            description="This is a rough learner-centered read on the books, not a judgment about their literary value."
          >
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
          </SectionBand>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionBand
            eyebrow="By Book Type"
            title="Where reading felt smooth or sticky"
            description="This starts to answer which kinds of books ask for more support from you."
          >
            {typeMetrics.length > 0 ? (
              <div className="space-y-5">
                <BarStrip
                  items={typeMetrics.map((item) => ({
                    label: bookTypeLabel(item.bookType as BookType),
                    value: item.pagesRead,
                  }))}
                  colorClass="bg-gradient-to-r from-sky-400 to-indigo-500"
                  valueSuffix=" p"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  {typeMetrics.map((item) => (
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
                        <div className="mt-1 text-xs text-slate-500">{bookTypeLabel(item.bookType)}</div>
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
                      <div className="mt-1 text-xs text-slate-500">{bookTypeLabel(item.bookType)}</div>
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

        <SectionBand
          eyebrow="Direction"
          title="How this could evolve"
          description="This is just a rough draft. The next step would be deciding which parts deserve to become canonical MEKURU language."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Support vs confidence</div>
              <div className="mt-2">Track how often sessions happen with no lookups, or with fewer words/page than before.</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Vocabulary relationship</div>
              <div className="mt-2">Show recurring saved words across books, revisits, and words that move into “known” territory.</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Kanji reading pressure</div>
              <div className="mt-2">Add stats around kanji enrichment, hidden-kanji support, and words known in vocab but shaky in reading.</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Consistency first</div>
              <div className="mt-2">Move the library snapshot toward calm “days engaged” language and let this page hold the richer charts.</div>
            </div>
          </div>
        </SectionBand>
      </div>
    </main>
  );
}
