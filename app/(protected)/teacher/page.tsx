// Teacher Hub
//

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { countNeededTeacherRatingBooks } from "@/lib/teacher/teacherReviewCompletion";
import { TeacherHubCardGrid } from "./components/TeacherHubCardGrid";
import { TeacherHubHeader } from "./components/TeacherHubHeader";
import { TeacherHubTodaySection } from "./components/TeacherHubTodaySection";

type TeacherHubCard = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
};

type TeacherAlertSummary = {
  title: string;
  href?: string;
  count: number;
  description: string;
  badgeLabel?: string;
  hasToday?: boolean;
  placeholder?: boolean;
  sortDate?: string | null;
};

type GlobalBookRow = {
  title: string | null;
  isbn13: string | null;
  asin: string | null;
  cover_url: string | null;
  book_type: string | null;
  author: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  created_at?: string | null;
  allow_missing_isbn?: boolean | null;
  allow_missing_publisher?: boolean | null;
  missing_info_cleared_at?: string | null;
};

type ReadingFitCountUserBookRow = {
  user_id: string;
  finished_at: string | null;
  dnf_at: string | null;
  reader_level: string | null;
  rating_difficulty: number | null;
  rating_overall: number | null;
  teacher_review_cleared_at: string | null;
};

type TeacherRatingCountUserBookRow = {
  id: string;
  book_id: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  notes: string | null;
  recommended_level: string | null;
  teacher_student_use_rating: number | null;
  teacher_review_cleared_at: string | null;
};

type CreatedAtRow = {
  created_at: string | null;
};

type FlaggedKanjiMapCountRow = {
  vocabulary_cache_id: number | null;
  flagged_at: string | null;
};

type ReadingFitCountProfileRow = {
  id: string;
  level: string | null;
};

const teachingCards: TeacherHubCard[] = [
  {
    title: "Students",
    href: "/teacher/students",
    eyebrow: "Learners",
    description:
      "Open student workspaces, libraries, lesson books, and follow-up actions.",
  },
  {
    title: "Teaching Books",
    href: "/teacher/library?from=teacher-hub",
    eyebrow: "Book prep",
    description:
      "Search your professional teaching collection, assess lesson fit, and open book workspaces.",
  },

];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isTodayDate(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function oldestDate(values: Array<string | null | undefined>) {
  const dates = values
    .filter((value): value is string => !!value)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return dates[0] ?? null;
}

function recentKanjiQueueCutoff() {
  const date = new Date();
  date.setDate(date.getDate() - 3);
  return date.toISOString();
}

function sortTeacherAlerts(alerts: TeacherAlertSummary[]) {
  return [...alerts].sort((a, b) => {
    if (!!a.placeholder !== !!b.placeholder) return a.placeholder ? 1 : -1;
    if (!!a.hasToday !== !!b.hasToday) return a.hasToday ? -1 : 1;

    if (a.sortDate && b.sortDate) {
      return new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime();
    }

    if (a.sortDate) return -1;
    if (b.sortDate) return 1;
    return 0;
  });
}

function missingGlobalBookFields(book: GlobalBookRow) {
  if (book.missing_info_cleared_at) return [];

  const missing: string[] = [];
  if (!String(book.title ?? "").trim()) missing.push("title");
  if (!book.allow_missing_isbn && !String(book.isbn13 ?? "").trim() && !String(book.asin ?? "").trim()) {
    missing.push("ISBN-13 or ASIN");
  }
  if (!String(book.cover_url ?? "").trim()) missing.push("cover");
  if (!String(book.book_type ?? "").trim()) missing.push("book type");
  if (!String(book.author ?? "").trim()) missing.push("author");
  if (!book.allow_missing_publisher && !String(book.publisher ?? "").trim()) missing.push("publisher");
  if (!String(book.published_date ?? "").trim()) missing.push("published date");
  if (book.page_count == null) missing.push("page count");
  return missing;
}

export default function TeacherHubPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccessTeacherHub, setCanAccessTeacherHub] = useState(false);
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [teacherAlerts, setTeacherAlerts] = useState<TeacherAlertSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeacherRole() {
      setAlertsLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user || cancelled) {
        setCanAccessTeacherHub(false);
        setAccessChecked(true);
        setAlertsLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (error || cancelled) {
        setCanAccessTeacherHub(false);
        setAccessChecked(true);
        setAlertsLoading(false);
        return;
      }

      const hasSuperTeacherAccess =
        profile?.role === "super_teacher" ||
        profile?.role === "admin" ||
        isSuperTeacherFlag(profile?.is_super_teacher);
      const hasTeacherAccess =
        hasSuperTeacherAccess || profile?.role === "teacher";

      setIsSuperTeacher(hasSuperTeacherAccess);
      setCanAccessTeacherHub(hasTeacherAccess);
      setAccessChecked(true);

      if (!hasTeacherAccess) {
        setAlertsLoading(false);
        return;
      }

      try {
        const { data: teacherLinks } = await supabase
          .from("teacher_students")
          .select("student_id")
          .eq("teacher_id", user.id)
          .is("archived_at", null);

        if (cancelled) return;

        const studentIds = Array.from(
          new Set([
            user.id,
            ...((teacherLinks ?? [])
              .map((row: any) => row.student_id)
              .filter(Boolean) as string[]),
          ])
        );

        const [
          { data: readingFitProfiles },
          { data: readingFitRows },
          { data: teacherRatingRows },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, level")
            .in("id", studentIds),
          supabase
            .from("user_books")
            .select("user_id, finished_at, dnf_at, reader_level, rating_difficulty, rating_overall, teacher_review_cleared_at")
            .in("user_id", studentIds)
            .not("finished_at", "is", null)
            .is("dnf_at", null)
            .is("teacher_review_cleared_at", null),
          supabase
            .from("user_books")
            .select("id, book_id, finished_at, dnf_at, notes, recommended_level, teacher_student_use_rating, teacher_review_cleared_at")
            .in("user_id", studentIds),
        ]);

        const readerLevelByUserId = new Map(
          ((readingFitProfiles ?? []) as ReadingFitCountProfileRow[]).map((profile) => [
            profile.id,
            profile.level,
          ])
        );

        const readingFitItems = ((readingFitRows ?? []) as ReadingFitCountUserBookRow[]).filter(
          (item) => {
            const effectiveReaderLevel =
              item.reader_level || readerLevelByUserId.get(item.user_id) || null;
            return (
              !String(effectiveReaderLevel ?? "").trim() ||
              item.rating_difficulty == null ||
              item.rating_overall == null
            );
          }
        );

        const teacherRatingItems = (teacherRatingRows ?? []) as TeacherRatingCountUserBookRow[];
        const teacherRatingCount = countNeededTeacherRatingBooks(teacherRatingItems);

        const nextTeacherAlerts: TeacherAlertSummary[] = [
          {
            title: "Reading Reflection Reviews",
            href: "/teacher/reading-fit",
            count: readingFitItems.length,
            description: "Finished books waiting for teacher review or reflection cleanup.",
            badgeLabel: "Student",
            hasToday: readingFitItems.some((item) => isTodayDate(item.finished_at)),
            sortDate: oldestDate(readingFitItems.map((item) => item.finished_at)),
          },
          {
            title: "Teacher Ratings Needed",
            href: "/teacher/ratings",
            count: teacherRatingCount,
            description: "Finished books waiting for lesson-fit ratings and teacher notes.",
            badgeLabel: "Student",
            hasToday: teacherRatingItems.some((item) => isTodayDate(item.finished_at)),
            sortDate: oldestDate(teacherRatingItems.map((item) => item.finished_at)),
          },
        ];

        if (!cancelled) {
          setTeacherAlerts(sortTeacherAlerts(nextTeacherAlerts));
        }
      } finally {
        if (!cancelled) setAlertsLoading(false);
      }
    }

    void loadTeacherRole();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!accessChecked) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-stone-500">Loading teacher access...</p>
        </div>
      </main>
    );
  }

  if (!canAccessTeacherHub) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            Teacher access
          </p>
          <h1 className="mt-2 text-2xl font-black text-stone-950">
            Teacher access is required.
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            This area is for teachers and staff only.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <TeacherHubHeader />

      <section className="mt-8">
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Teaching
          </p>
          <h2 className="mt-1 text-2xl font-black text-stone-950">
            Students, lessons, and teaching books
          </h2>
        </div>
        <TeacherHubCardGrid cards={teachingCards} />
      </section>

      <TeacherHubTodaySection
        alertsLoading={alertsLoading}
        isSuperTeacher={isSuperTeacher}
        alerts={teacherAlerts}
      />
    </main>
  );
}
