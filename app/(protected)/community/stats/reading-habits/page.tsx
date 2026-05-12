// Reading Habits

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

type ModeStripItem = {
  label: string;
  value: number;
  width: string;
  color: string;
};

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

function formatDecimal(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatMinutesAsReadableTime(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
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

function ModeStrip({ items }: { items: ModeStripItem[] }) {
  const hasValue = items.some((item) => item.value > 0);

  return (
    <div>
      <div className="flex h-5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {hasValue ? (
          items.map((item) => (
            <div
              key={item.label}
              className={`h-full ${item.color}`}
              style={{ width: item.width }}
              title={`${item.label}: ${formatMinutesAsReadableTime(item.value)}`}
            />
          ))
        ) : (
          <div className="h-full w-full bg-slate-200" />
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="text-xs font-medium text-slate-600">
                {item.label}
              </span>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatMinutesAsReadableTime(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyActivityChart({
  items,
}: {
  items: { label: string; minutes: number; pages: number; sessions: number }[];
}) {
  const maxMinutes = Math.max(1, ...items.map((item) => item.minutes));
  const hasAnyActivity = items.some((item) => item.sessions > 0);

  if (!hasAnyActivity) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        No reading sessions logged this month yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-slate-50 px-4 py-5">
      <div className="flex h-48 min-w-[680px] items-end gap-2">
        {items.map((item) => {
          const height =
            item.sessions === 0
              ? 4
              : item.minutes > 0
                ? Math.max(10, (item.minutes / maxMinutes) * 150)
                : 12;

          return (
            <div
              key={item.label}
              className="flex flex-1 flex-col items-center justify-end gap-2"
              title={`Day ${item.label}: ${item.sessions} session(s), ${item.pages} page(s), ${item.minutes} minute(s)`}
            >
              <div
                className={`w-full max-w-5 rounded-full ${item.sessions > 0 ? "bg-sky-500" : "bg-slate-200"
                  }`}
                style={{ height }}
              />
              <span className="text-[10px] font-medium text-slate-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function readingPersonality({
  fluidMinutes,
  curiosityMinutes,
  listeningMinutes,
  readingSessions,
  listeningSessions,
}: {
  fluidMinutes: number;
  curiosityMinutes: number;
  listeningMinutes: number;
  readingSessions: number;
  listeningSessions: number;
}) {
  const totalMinutes = fluidMinutes + curiosityMinutes + listeningMinutes;
  const totalSessions = readingSessions + listeningSessions;

  if (totalMinutes === 0 && totalSessions === 0) {
    return {
      title: "Fresh-start reader",
      description:
        "No reading pattern yet this month. One tiny session is enough to wake this page up.",
    };
  }

  const modes = [
    {
      title: "Flow reader",
      value: fluidMinutes,
      description:
        "You leaned toward steady reading momentum. Very nice extensive-reading energy.",
    },
    {
      title: "Curious close reader",
      value: curiosityMinutes,
      description:
        "You spent more time reading slowly, noticing words, and letting the text teach you.",
    },
    {
      title: "Ear-training reader",
      value: listeningMinutes,
      description:
        "Listening played the biggest role this month. Your reading life has ears now.",
    },
  ].sort((a, b) => b.value - a.value);

  if (modes[0].value > 0 && modes[1].value > 0) {
    const gap = modes[0].value - modes[1].value;

    if (gap / modes[0].value < 0.2) {
      return {
        title: "Balanced reader",
        description:
          "Your month is nicely mixed across modes. A little reading buffet, but make it Japanese.",
      };
    }
  }

  return {
    title: modes[0].title,
    description: modes[0].description,
  };
}

export default function ReadingHabitsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadReadingHabits() {
      setLoading(true);
      setErrorMsg("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          if (!isMounted) return;
          setSessions([]);
          return;
        }

        const { data: userBooks, error: userBooksError } = await supabase
          .from("user_books")
          .select("id")
          .eq("user_id", user.id);

        if (userBooksError) throw userBooksError;

        const userBookIds = (userBooks ?? [])
          .map((row) => row.id)
          .filter(Boolean);

        if (userBookIds.length === 0) {
          if (!isMounted) return;
          setSessions([]);
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from("user_book_reading_sessions")
          .select(
            "user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler"
          )
          .in("user_book_id", userBookIds);

        if (sessionError) throw sessionError;

        if (!isMounted) return;

        setSessions(
          ((sessionData ?? []) as SessionRow[]).filter((row) => !row.is_filler)
        );
      } catch (error: any) {
        console.error("Error loading reading habits:", error);
        if (!isMounted) return;
        setErrorMsg(error?.message ?? "Could not load reading habits.");
        setSessions([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReadingHabits();

    return () => {
      isMounted = false;
    };
  }, []);

  const monthlySessions = useMemo(() => {
    return sessions.filter((row) => isThisMonth(row.read_on));
  }, [sessions]);

  const habitStats = useMemo(() => {
    let fluidMinutes = 0;
    let curiosityMinutes = 0;
    let listeningMinutes = 0;

    let fluidPages = 0;
    let curiosityPages = 0;

    let readingSessions = 0;
    let listeningSessions = 0;

    let timedFluidPages = 0;
    let timedCuriosityPages = 0;

    const activeDays = new Set<string>();

    for (const row of monthlySessions) {
      if (row.read_on) activeDays.add(row.read_on);

      const minutes = Number(row.minutes_read) || 0;
      const pages = sessionPages(row);

      if (row.session_mode === "curiosity") {
        curiosityMinutes += minutes;
        curiosityPages += pages;
        readingSessions += 1;
        if (minutes > 0) timedCuriosityPages += pages;
      } else if (row.session_mode === "listening") {
        listeningMinutes += minutes;
        listeningSessions += 1;
      } else {
        fluidMinutes += minutes;
        fluidPages += pages;
        readingSessions += 1;
        if (minutes > 0) timedFluidPages += pages;
      }
    }

    const totalMinutes = fluidMinutes + curiosityMinutes + listeningMinutes;
    const readingMinutes = fluidMinutes + curiosityMinutes;
    const pagesRead = fluidPages + curiosityPages;

    return {
      fluidMinutes,
      curiosityMinutes,
      listeningMinutes,
      fluidPages,
      curiosityPages,
      readingSessions,
      listeningSessions,
      activeDays: activeDays.size,
      totalMinutes,
      readingMinutes,
      pagesRead,
      fluidMinutesPerPage:
        timedFluidPages > 0 ? fluidMinutes / timedFluidPages : null,
      curiosityMinutesPerPage:
        timedCuriosityPages > 0 ? curiosityMinutes / timedCuriosityPages : null,
    };
  }, [monthlySessions]);

  const dayMetrics = useMemo(() => {
    const now = new Date();

    const days = Array.from({ length: now.getDate() }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), index + 1);

      return {
        date: ymdLocal(date),
        label: String(index + 1),
        minutes: 0,
        pages: 0,
        sessions: 0,
      };
    });

    const dayMap = new Map(days.map((day) => [day.date, day]));

    for (const row of monthlySessions) {
      if (!row.read_on) continue;

      const metric = dayMap.get(row.read_on);
      if (!metric) continue;

      metric.minutes += Number(row.minutes_read) || 0;
      metric.pages += sessionPages(row);
      metric.sessions += 1;
    }

    return days;
  }, [monthlySessions]);

  const timePie = useMemo(
    () => [
      { label: "Fluid", value: habitStats.fluidMinutes, color: "#34d399" },
      {
        label: "Curiosity",
        value: habitStats.curiosityMinutes,
        color: "#fbbf24",
      },
      {
        label: "Listening",
        value: habitStats.listeningMinutes,
        color: "#60a5fa",
      },
    ],
    [habitStats]
  );

  const pagesPie = useMemo(
    () => [
      { label: "Fluid", value: habitStats.fluidPages, color: "#34d399" },
      {
        label: "Curiosity",
        value: habitStats.curiosityPages,
        color: "#fbbf24",
      },
    ],
    [habitStats]
  );

  const modeStripItems = useMemo(() => {
    const total = Math.max(habitStats.totalMinutes, 1);

    return [
      {
        label: "Fluid reading",
        value: habitStats.fluidMinutes,
        width: `${(habitStats.fluidMinutes / total) * 100}%`,
        color: "bg-emerald-500",
      },
      {
        label: "Curiosity reading",
        value: habitStats.curiosityMinutes,
        width: `${(habitStats.curiosityMinutes / total) * 100}%`,
        color: "bg-amber-500",
      },
      {
        label: "Listening",
        value: habitStats.listeningMinutes,
        width: `${(habitStats.listeningMinutes / total) * 100}%`,
        color: "bg-sky-500",
      },
    ];
  }, [habitStats]);

  const sessionBars = useMemo(
    () => [
      { label: "Reading sessions", value: habitStats.readingSessions },
      { label: "Listening sessions", value: habitStats.listeningSessions },
    ],
    [habitStats]
  );

  const personality = useMemo(
    () =>
      readingPersonality({
        fluidMinutes: habitStats.fluidMinutes,
        curiosityMinutes: habitStats.curiosityMinutes,
        listeningMinutes: habitStats.listeningMinutes,
        readingSessions: habitStats.readingSessions,
        listeningSessions: habitStats.listeningSessions,
      }),
    [habitStats]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-sm text-slate-600">Loading reading habits…</div>
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
              Reading rhythm
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Reading Habits
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              A more visual look at how you are reading this month: modes,
              sessions, pace, and daily rhythm.
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
            label="Active Days"
            value={habitStats.activeDays}
            hint="Days with at least one reading session"
            tone="border-indigo-200 bg-indigo-50"
          />
          <StatCard
            label="Reading Sessions"
            value={habitStats.readingSessions}
            hint="Fluid + curiosity sessions"
            tone="border-emerald-200 bg-emerald-50"
          />
          <StatCard
            label="Listening Sessions"
            value={habitStats.listeningSessions}
            hint="Ear-training sessions"
            tone="border-sky-200 bg-sky-50"
          />
          <StatCard
            label="Pages Read"
            value={habitStats.pagesRead}
            hint="Fluid + curiosity page movement"
            tone="border-amber-200 bg-amber-50"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <SectionBand
            eyebrow="Mode balance"
            title="Time by reading mode"
            description="This uses logged minutes from Fluid, Curiosity, and Listening sessions."
            tone="border-slate-200 bg-white"
          >
            <PieChart items={timePie} size={190} />
          </SectionBand>

          <SectionBand
            eyebrow="Reading flow"
            title="Mode strip"
            description="A quick view of what kind of reading month this is. Longer sections mean more logged time in that mode."
            tone="border-slate-200 bg-white"
          >
            <ModeStrip items={modeStripItems} />

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase text-slate-500">
                Reading personality
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {personality.title}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {personality.description}
              </p>
            </div>
          </SectionBand>
        </div>

        <SectionBand
          eyebrow="Daily rhythm"
          title="Activity by day"
          description="Bars use logged minutes when available. Untimed sessions still get a small marker so the day does not disappear."
          tone="border-slate-200 bg-white"
        >
          <DailyActivityChart items={dayMetrics} />
        </SectionBand>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow="Pages"
            title="Reading pages by mode"
            description="Listening is intentionally not included because it does not always move page progress."
            tone="border-slate-200 bg-white"
          >
            <PieChart items={pagesPie} size={180} />
          </SectionBand>

          <SectionBand
            eyebrow="Sessions"
            title="Session balance"
            description="A simple comparison of reading sessions and listening sessions this month."
            tone="border-slate-200 bg-white"
          >
            <BarStrip
              items={sessionBars}
              colorClass="bg-indigo-500"
              valueSuffix=""
            />
          </SectionBand>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Logged Time"
            value={formatMinutesAsReadableTime(habitStats.totalMinutes)}
            hint="Fluid + curiosity + listening"
            tone="border-slate-200 bg-white"
          />
          <StatCard
            label="Fluid Pace Per Page"
            value={
              habitStats.fluidMinutesPerPage == null
                ? "—"
                : `${formatDecimal(habitStats.fluidMinutesPerPage)} min/page`
            }
            hint="Timed fluid sessions only"
            tone="border-emerald-200 bg-emerald-50"
          />
          <StatCard
            label="Curiosity Pace Per Page"
            value={
              habitStats.curiosityMinutesPerPage == null
                ? "—"
                : `${formatDecimal(
                  habitStats.curiosityMinutesPerPage
                )} min/page`
            }
            hint="Timed curiosity sessions only"
            tone="border-amber-200 bg-amber-50"
          />
        </div>
      </div>
    </main>
  );
}