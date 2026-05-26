// Reading Habits

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import StatCard from "./components/StatCard";
import SectionBand from "./components/SectionBand";
import BarStrip from "./components/BarStrip";
import ModeStrip from "./components/ModeStrip";
import PieChart from "./components/PieChart";

type SessionMode = "fluid" | "curiosity" | "listening" | string;
type HabitTimeRange =
  | "this_month"
  | "past_90_days"
  | "past_6_months"
  | "past_year";

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

const HABIT_TIME_FILTERS: {
  value: HabitTimeRange;
  title: string;
  description: string;
}[] = [
    {
      value: "this_month",
      title: "This Month",
      description: "Your current reading rhythm.",
    },
    {
      value: "past_90_days",
      title: "Past 90 Days",
      description: "A wider view of recent consistency.",
    },
    {
      value: "past_6_months",
      title: "Half Year",
      description: "About six months of reading and listening rhythm.",
    },
    {
      value: "past_year",
      title: "Past Year",
      description: "A long view of reading, listening, and return patterns.",
    },
  ];

const COLLAPSED_READING_RHYTHM_DAY_COUNT = 90;

function readingHabitsTheme(value: HabitTimeRange) {
  if (value === "this_month") {
    return {
      pageHeader: "border-sky-300 bg-white",
      section: "border-sky-300 bg-white",
      softSection: "border-sky-300 bg-sky-50/30",
      statOne: "border-sky-300 bg-sky-50/35",
      statTwo: "border-sky-300 bg-white",
      statThree: "border-sky-300 bg-sky-50/25",
      statFour: "border-sky-300 bg-white",
      plainCard: "border-sky-300 bg-white",
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
      plainCard: "border-emerald-300 bg-white",
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
      plainCard: "border-violet-300 bg-white",
      activeButton: "border-violet-600 bg-violet-600 text-white shadow-md",
      inactiveButton:
        "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
    };
  }

  return {
    pageHeader: "border-amber-300 bg-white",
    section: "border-amber-300 bg-white",
    softSection: "border-amber-300 bg-amber-50/30",
    statOne: "border-amber-300 bg-amber-50/35",
    statTwo: "border-amber-300 bg-white",
    statThree: "border-amber-300 bg-amber-50/25",
    statFour: "border-amber-300 bg-white",
    plainCard: "border-amber-300 bg-white",
    activeButton: "border-amber-600 bg-amber-500 text-white shadow-md",
    inactiveButton:
      "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  };
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
  const [timeRange, setTimeRange] = useState<HabitTimeRange>("this_month");
  const [showFullReadingRhythm, setShowFullReadingRhythm] = useState(false);

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

  const filteredSessions = useMemo(() => {
    return sessions.filter((row) => {
      if (!row.read_on) return false;

      const readDate = new Date(`${row.read_on}T00:00:00`);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      let startDate: Date;

      if (timeRange === "past_90_days") {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 89);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === "past_6_months") {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === "past_year") {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 364);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }

      return readDate >= startDate && readDate <= today;
    });
  }, [sessions, timeRange]);

  const selectedTimeFilter = HABIT_TIME_FILTERS.find(
    (option) => option.value === timeRange
  );

  const selectedTimeLabel = selectedTimeFilter?.title ?? "This Month";
  const selectedTheme = readingHabitsTheme(timeRange);

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

    for (const row of filteredSessions) {
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
  }, [filteredSessions]);

  const readingRhythmActivity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;

    if (timeRange === "past_90_days") {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 89);
    } else if (timeRange === "past_6_months") {
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 6);
    } else if (timeRange === "past_year") {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 364);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    startDate.setHours(0, 0, 0, 0);

    const dayCount =
      Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +
      1;

    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      return {
        day: ymdLocal(date),
        minutes: 0,
        pages: 0,
        sessions: 0,
        fluidSessions: 0,
        curiositySessions: 0,
        listeningSessions: 0,
        fluidMinutes: 0,
        curiosityMinutes: 0,
        listeningMinutes: 0,
      };
    });

    const dayMap = new Map(days.map((day) => [day.day, day]));

    for (const row of filteredSessions) {
      if (!row.read_on) continue;

      const metric = dayMap.get(row.read_on);
      if (!metric) continue;

      const minutes = Number(row.minutes_read) || 0;
      const pages = row.session_mode === "listening" ? 0 : sessionPages(row);

      metric.minutes += minutes;
      metric.pages += pages;
      metric.sessions += 1;

      if (row.session_mode === "curiosity") {
        metric.curiositySessions += 1;
        metric.curiosityMinutes += minutes;
      } else if (row.session_mode === "listening") {
        metric.listeningSessions += 1;
        metric.listeningMinutes += minutes;
      } else {
        metric.fluidSessions += 1;
        metric.fluidMinutes += minutes;
      }
    }

    return days;
  }, [filteredSessions, timeRange]);

  const visibleReadingRhythmActivity = useMemo(() => {
    if (
      showFullReadingRhythm ||
      readingRhythmActivity.length <= COLLAPSED_READING_RHYTHM_DAY_COUNT
    ) {
      return readingRhythmActivity;
    }

    return readingRhythmActivity.slice(-COLLAPSED_READING_RHYTHM_DAY_COUNT);
  }, [readingRhythmActivity, showFullReadingRhythm]);

  const readingRhythmWindowLabel =
    readingRhythmActivity.length <= COLLAPSED_READING_RHYTHM_DAY_COUNT ||
      showFullReadingRhythm
      ? selectedTimeLabel
      : `Recent 90 days of ${selectedTimeLabel.toLowerCase()}`;

  const readingRhythmSummary = useMemo(() => {
    const activeDays = visibleReadingRhythmActivity.filter(
      (item) => item.sessions > 0
    ).length;

    const fluidDays = visibleReadingRhythmActivity.filter(
      (item) => item.fluidSessions > 0
    ).length;

    const curiosityDays = visibleReadingRhythmActivity.filter(
      (item) => item.curiositySessions > 0
    ).length;

    const listeningDays = visibleReadingRhythmActivity.filter(
      (item) => item.listeningSessions > 0
    ).length;

    const mixedDays = visibleReadingRhythmActivity.filter((item) => {
      const activeModes = [
        item.fluidSessions > 0,
        item.curiositySessions > 0,
        item.listeningSessions > 0,
      ].filter(Boolean).length;

      return activeModes >= 2;
    }).length;

    const minutes = visibleReadingRhythmActivity.reduce(
      (sum, item) => sum + item.minutes,
      0
    );

    const sessions = visibleReadingRhythmActivity.reduce(
      (sum, item) => sum + item.sessions,
      0
    );

    const pages = visibleReadingRhythmActivity.reduce(
      (sum, item) => sum + item.pages,
      0
    );

    return {
      activeDays,
      fluidDays,
      curiosityDays,
      listeningDays,
      mixedDays,
      minutes,
      sessions,
      pages,
    };
  }, [visibleReadingRhythmActivity]);

  const dayMetrics = useMemo(() => {
    return visibleReadingRhythmActivity.map((item) => ({
      date: item.day,
      label: item.day.slice(8),
      minutes: item.minutes,
      pages: item.pages,
      sessions: item.sessions,
    }));
  }, [visibleReadingRhythmActivity]);

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

          <div className={`mt-5 rounded-3xl border-2 p-5 shadow-sm ${selectedTheme.pageHeader}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Reading rhythm
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Reading Habits
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              A more visual look at your reading rhythm for {selectedTimeLabel.toLowerCase()}:
              modes, sessions, time, and daily rhythm.
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
          description="Choose the window for your reading rhythm. The stats below update to match this range."
          tone={selectedTheme.section}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {HABIT_TIME_FILTERS.map((option) => {
              const selected = timeRange === option.value;
              const optionTheme = readingHabitsTheme(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTimeRange(option.value);
                    setShowFullReadingRhythm(false);
                  }}
                  className={`rounded-xl border-2 px-3 py-2 text-left transition ${selected ? optionTheme.activeButton : optionTheme.inactiveButton
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
            label="Active Days"
            value={habitStats.activeDays}
            hint="Days with at least one reading session"
            tone={selectedTheme.statOne}
          />
          <StatCard
            label="Reading Sessions"
            value={habitStats.readingSessions}
            hint="Fluid + curiosity sessions"
            tone={selectedTheme.statTwo}
          />
          <StatCard
            label="Listening Sessions"
            value={habitStats.listeningSessions}
            hint="Ear-training sessions"
            tone={selectedTheme.statThree}
          />
          <StatCard
            label="Pages Read"
            value={habitStats.pagesRead}
            hint="Fluid + curiosity page movement"
            tone={selectedTheme.statFour}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <SectionBand
            eyebrow={`Mode balance — ${selectedTimeLabel}`}
            title="Time by reading mode"
            description="This uses logged minutes from Fluid, Curiosity, and Listening sessions."
            tone={selectedTheme.section}
          >
            <PieChart
              items={timePie}
              size={190}
              formatPercent={formatDecimal}
            />
          </SectionBand>

          <SectionBand
            eyebrow={`Reading flow — ${selectedTimeLabel}`}
            title="Mode strip"
            description="A quick view of what kind of reading window this is. Longer sections mean more logged time in that mode."
            tone={selectedTheme.section}
          >
            <ModeStrip
              items={modeStripItems}
              formatValue={formatMinutesAsReadableTime}
            />

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
          eyebrow={`Reading Rhythm — ${selectedTimeLabel}`}
          title="Reading rhythm by day"
          description={`${readingRhythmWindowLabel}: which days you read, listened, or mixed modes. Untimed sessions still count as activity.`}
          tone={selectedTheme.softSection}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-800">
              Showing: {readingRhythmWindowLabel}
            </div>

            {readingRhythmActivity.length > COLLAPSED_READING_RHYTHM_DAY_COUNT ? (
              <button
                type="button"
                onClick={() => setShowFullReadingRhythm((prev) => !prev)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {showFullReadingRhythm
                  ? "Collapse to recent 90 days"
                  : `Show full ${selectedTimeLabel.toLowerCase()}`}
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))] xl:grid-cols-[repeat(28,minmax(0,1fr))]">
            {visibleReadingRhythmActivity.map((item, index) => {
              const hasFluid = item.fluidSessions > 0;
              const hasCuriosity = item.curiositySessions > 0;
              const hasListening = item.listeningSessions > 0;
              const activeModeCount = [hasFluid, hasCuriosity, hasListening].filter(
                Boolean
              ).length;
              const isMixed = activeModeCount >= 2;
              const intensity = item.sessions + Math.floor(item.minutes / 30);

              const colorClass =
                item.sessions === 0
                  ? "bg-slate-100"
                  : isMixed
                    ? intensity < 3
                      ? "bg-violet-300"
                      : intensity < 6
                        ? "bg-violet-500"
                        : "bg-violet-700"
                    : hasListening
                      ? intensity < 3
                        ? "bg-sky-300"
                        : intensity < 6
                          ? "bg-sky-500"
                          : "bg-sky-700"
                      : hasCuriosity
                        ? intensity < 3
                          ? "bg-amber-200"
                          : intensity < 6
                            ? "bg-amber-400"
                            : "bg-amber-600"
                        : intensity < 3
                          ? "bg-emerald-300"
                          : intensity < 6
                            ? "bg-emerald-500"
                            : "bg-emerald-700";

              const previousItem = visibleReadingRhythmActivity[index - 1];
              const startsMonth =
                index === 0 || item.day.slice(0, 7) !== previousItem?.day.slice(0, 7);

              const monthLabel = new Date(`${item.day}T00:00:00`).toLocaleString(
                "en-US",
                {
                  month: "short",
                }
              ).toUpperCase();

              const monthTextClass =
                item.sessions > 0 ? "text-white drop-shadow-sm" : "text-slate-500";

              return (
                <div key={item.day} className="space-y-1">
                  <div
                    className={`relative h-10 rounded-lg border border-white/70 ${colorClass}`}
                    title={`${item.day}: ${item.sessions} session${item.sessions === 1 ? "" : "s"
                      }, ${item.pages} page${item.pages === 1 ? "" : "s"}, ${item.minutes
                      } minute${item.minutes === 1 ? "" : "s"}`}
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
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Fluid
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              Curiosity
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-500" />
              Listening
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-violet-500" />
              Mixed modes
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
              <div className="text-xs text-slate-500">Active days</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {readingRhythmSummary.activeDays}
              </div>
            </div>

            <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
              <div className="text-xs text-slate-500">Fluid days</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {readingRhythmSummary.fluidDays}
              </div>
            </div>

            <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
              <div className="text-xs text-slate-500">Curiosity days</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {readingRhythmSummary.curiosityDays}
              </div>
            </div>

            <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
              <div className="text-xs text-slate-500">Listening days</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {readingRhythmSummary.listeningDays}
              </div>
            </div>

            <div className="rounded-xl border border-slate-900/10 bg-white/90 px-4 py-3">
              <div className="text-xs text-slate-500">Mixed-mode days</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {readingRhythmSummary.mixedDays}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Reading rhythm
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-600">
              {readingRhythmSummary.sessions === 0
                ? "No reading sessions in this window yet. One tiny session is enough to start a rhythm."
                : `You logged ${readingRhythmSummary.sessions} session${readingRhythmSummary.sessions === 1 ? "" : "s"
                }, ${formatMinutesAsReadableTime(readingRhythmSummary.minutes)}, and ${readingRhythmSummary.pages
                } page${readingRhythmSummary.pages === 1 ? "" : "s"} in this window.`}
            </div>
          </div>
        </SectionBand>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBand
            eyebrow={`Pages — ${selectedTimeLabel}`}
            title="Reading pages by mode"
            description="Listening is intentionally not included because it does not always move page progress."
            tone={selectedTheme.section}
          >
            <PieChart
              items={pagesPie}
              size={180}
              formatPercent={formatDecimal}
            />
          </SectionBand>

          <SectionBand
            eyebrow={`Sessions — ${selectedTimeLabel}`}
            title="Session balance"
            description="A simple comparison of reading sessions and listening sessions in this window."
            tone={selectedTheme.section}
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
            tone={selectedTheme.statOne}
          />
          <StatCard
            label="Fluid Pace Per Page"
            value={
              habitStats.fluidMinutesPerPage == null
                ? "—"
                : `${formatDecimal(habitStats.fluidMinutesPerPage)} min/page`
            }
            hint="Timed fluid sessions only"
            tone={selectedTheme.statTwo}
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
            tone={selectedTheme.statThree}
          />
        </div>
      </div>
    </main>
  );
}