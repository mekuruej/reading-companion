// Teacher Hub
//

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  reader_level: string | null;
  rating_difficulty: number | null;
  rating_overall: number | null;
  teacher_review_cleared_at: string | null;
};

type TeacherRatingCountUserBookRow = {
  finished_at: string | null;
  notes: string | null;
  recommended_level: string | null;
  teacher_student_use_rating: number | null;
  rating_recommend: number | null;
};

type CreatedAtRow = {
  created_at: string | null;
};

type ReadingFitCountProfileRow = {
  id: string;
  level: string | null;
};

type KanjiCountWordRow = {
  id: string;
  user_book_id: string;
  created_at?: string | null;
  surface: string | null;
  vocabulary_cache_id: number | null;
  ignore_kanji_enrichment?: boolean | null;
};

type KanjiCountMapRow = {
  id: number;
  vocabulary_cache_id: number;
  kanji_position: number;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
  flagged_for_review?: boolean | null;
  excluded_from_kanji_practice?: boolean | null;
};

const KANJI_ENRICHMENT_TEST_START = "2026-04-20T00:00:00";

const teacherHubCards: TeacherHubCard[] = [
  {
    title: "Lesson Prep",
    href: "/teacher/lesson-prep",
    eyebrow: "Prepare",
    description:
      "Open teaching books, assignments, trial prep, clubs, and reusable lesson materials.",
  },
  {
    title: "Needs Attention",
    href: "/teacher/needs-attention",
    eyebrow: "Review",
    description:
      "Review book requests, kanji reports, missing book info, and other cleanup queues.",
  },
  {
    title: "Site Upkeep",
    href: "/teacher/general-upkeep",
    eyebrow: "Maintain",
    description:
      "Open global cleanup tools and admin maintenance areas that do not belong to learner follow-up.",
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
  if (!book.allow_missing_isbn && !String(book.isbn13 ?? "").trim()) missing.push("ISBN-13");
  if (!String(book.cover_url ?? "").trim()) missing.push("cover");
  if (!String(book.book_type ?? "").trim()) missing.push("book type");
  if (!String(book.author ?? "").trim()) missing.push("author");
  if (!book.allow_missing_publisher && !String(book.publisher ?? "").trim()) missing.push("publisher");
  if (!String(book.published_date ?? "").trim()) missing.push("published date");
  if (book.page_count == null) missing.push("page count");
  return missing;
}

function hasKanji(value: string) {
  return /[\p{Script=Han}]/u.test(value);
}

function kanjiChars(value: string) {
  return Array.from(value).filter((ch) => /\p{Script=Han}/u.test(ch));
}

function effectiveKanjiReadingType(
  row: Pick<KanjiCountMapRow, "reading_type" | "base_reading" | "realized_reading">
) {
  if (row.reading_type) return row.reading_type;
  return row.base_reading?.trim() && row.realized_reading?.trim() ? "on" : null;
}

function isActiveKanjiQueueStatus(params: {
  vocabularyCacheId: number | null;
  surface: string;
  mapRows: KanjiCountMapRow[];
  ignored?: boolean | null;
}) {
  const mapRows = params.mapRows;
  const kanjiCount = kanjiChars(params.surface).length;
  const flaggedMapRowCount = mapRows.filter((row) => row.flagged_for_review).length;
  const excludedMapRowCount = mapRows.filter((row) => row.excluded_from_kanji_practice).length;

  if (params.ignored || (mapRows.length > 0 && excludedMapRowCount === mapRows.length)) {
    return false;
  }

  if (!params.vocabularyCacheId || mapRows.length === 0 || flaggedMapRowCount > 0) {
    return true;
  }

  const completePositions = new Set(
    mapRows
      .filter(
        (row) =>
          typeof row.kanji_position === "number" &&
          !!effectiveKanjiReadingType(row) &&
          !!row.base_reading &&
          !!row.realized_reading
      )
      .map((row) => row.kanji_position)
  );

  const incompleteRowCount = mapRows.filter(
    (row) => !effectiveKanjiReadingType(row) || !row.base_reading || !row.realized_reading
  ).length;

  return completePositions.size < kanjiCount || incompleteRowCount > 0;
}

export default function TeacherHubPage() {
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
        setAlertsLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (error || cancelled) {
        setAlertsLoading(false);
        return;
      }

      const hasSuperTeacherAccess =
        profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

      setIsSuperTeacher(hasSuperTeacherAccess);

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
            .select("user_id, finished_at, reader_level, rating_difficulty, rating_overall, teacher_review_cleared_at")
            .in("user_id", studentIds)
            .not("finished_at", "is", null)
            .is("teacher_review_cleared_at", null),
          supabase
            .from("user_books")
            .select("finished_at, notes, recommended_level, teacher_student_use_rating, rating_recommend")
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

        const teacherRatingItems = ((teacherRatingRows ?? []) as TeacherRatingCountUserBookRow[]).filter(
          (item) => {
            const isFinished = !!item.finished_at;
            const hasTeacherReview =
              !!String(item.recommended_level ?? "").trim() ||
              item.teacher_student_use_rating != null ||
              item.rating_recommend != null ||
              !!String(item.notes ?? "").trim();

            return isFinished && !hasTeacherReview;
          }
        );

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
            count: teacherRatingItems.length,
            description: "Finished books waiting for lesson-fit ratings and teacher notes.",
            badgeLabel: "Student",
            hasToday: teacherRatingItems.some((item) => isTodayDate(item.finished_at)),
            sortDate: oldestDate(teacherRatingItems.map((item) => item.finished_at)),
          },
          {
            title: "Lesson Vocabulary Reminder",
            count: 0,
            description: "Future alert for entering words after a student's scheduled lesson day.",
            badgeLabel: "Student",
            placeholder: true,
          },
          {
            title: "Assignment Follow-up",
            count: 0,
            description: "Future alert for assignments that are pending, completed, or waiting on feedback.",
            badgeLabel: "Student",
            placeholder: true,
          },
        ];

        if (hasSuperTeacherAccess) {
          const [
            { data: pendingBookRequests },
            { data: manualBookFlags },
            { data: globalBooks },
            { data: vocabularyFlags },
          ] = await Promise.all([
            supabase
              .from("book_requests")
              .select("created_at")
              .eq("status", "pending"),
            supabase
              .from("user_alerts")
              .select("created_at")
              .eq("user_id", user.id)
              .eq("type", "book_flag"),
            supabase
              .from("books")
              .select(
                "title, isbn13, cover_url, book_type, author, publisher, published_date, page_count, created_at, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at"
              ),
            supabase
              .from("user_book_words")
              .select("created_at")
              .eq("flagged_for_review", true),
          ]);

          const missingBookInfoItems = ((globalBooks ?? []) as GlobalBookRow[]).filter(
            (book) => missingGlobalBookFields(book).length > 0
          );
          const pendingBookRequestRows = (pendingBookRequests ?? []) as CreatedAtRow[];
          const manualBookFlagRows = (manualBookFlags ?? []) as CreatedAtRow[];
          const vocabularyFlagRows = (vocabularyFlags ?? []) as CreatedAtRow[];

          const { data: kanjiUserBooks } = await supabase
            .from("user_books")
            .select("id")
            .in("user_id", studentIds);

          const kanjiUserBookIds = ((kanjiUserBooks ?? []) as { id: string }[])
            .map((book) => book.id)
            .filter(Boolean);

          let activeKanjiQueueCount = 0;
          let activeKanjiQueueDates: string[] = [];

          if (kanjiUserBookIds.length > 0) {
            const { data: kanjiWordRows } = await supabase
              .from("user_book_words")
              .select("id, user_book_id, surface, vocabulary_cache_id, ignore_kanji_enrichment, created_at")
              .in("user_book_id", kanjiUserBookIds)
              .eq("is_manual_override", false)
              .gte("created_at", KANJI_ENRICHMENT_TEST_START)
              .limit(5000);

            const kanjiWords = ((kanjiWordRows ?? []) as KanjiCountWordRow[]).filter((word) =>
              hasKanji(word.surface ?? "")
            );

            const cacheIds = Array.from(
              new Set(
                kanjiWords
                  .map((word) =>
                    word.vocabulary_cache_id == null ? null : Number(word.vocabulary_cache_id)
                  )
                  .filter((id): id is number => Number.isFinite(id))
              )
            );

            const mapRowsByCacheId = new Map<string, KanjiCountMapRow[]>();

            if (cacheIds.length > 0) {
              const chunkSize = 100;

              for (let i = 0; i < cacheIds.length; i += chunkSize) {
                const cacheIdChunk = cacheIds.slice(i, i + chunkSize);

                const { data: mapRows } = await supabase
                  .from("vocabulary_kanji_map")
                  .select(
                    "id, vocabulary_cache_id, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, excluded_from_kanji_practice"
                  )
                  .in("vocabulary_cache_id", cacheIdChunk)
                  .limit(5000);

                for (const row of (mapRows ?? []) as KanjiCountMapRow[]) {
                  const cacheKey = String(row.vocabulary_cache_id);
                  const existing = mapRowsByCacheId.get(cacheKey) ?? [];
                  existing.push(row);
                  mapRowsByCacheId.set(cacheKey, existing);
                }
              }
            }

            const activeKanjiQueueWords = kanjiWords.filter((word) => {
              const surface = String(word.surface ?? "");
              const mapRows =
                word.vocabulary_cache_id != null
                  ? mapRowsByCacheId.get(String(Number(word.vocabulary_cache_id))) ?? []
                  : [];

              return isActiveKanjiQueueStatus({
                vocabularyCacheId: word.vocabulary_cache_id,
                surface,
                mapRows,
                ignored: word.ignore_kanji_enrichment,
              });
            });

            activeKanjiQueueCount = activeKanjiQueueWords.length;
            activeKanjiQueueDates = activeKanjiQueueWords
              .map((word) => word.created_at)
              .filter((value): value is string => !!value);
          }

          const bookFlagAndMissingDates = [
            ...manualBookFlagRows.map((row) => row.created_at),
            ...missingBookInfoItems.map((book) => book.created_at),
          ];

          nextTeacherAlerts.push(
            {
              title: "Pending Book Requests",
              href: "/teacher/books",
              count: pendingBookRequestRows.length,
              description: "Reader book requests waiting for global book entry.",
              hasToday: pendingBookRequestRows.some((row) => isTodayDate(row.created_at)),
              sortDate: oldestDate(pendingBookRequestRows.map((row) => row.created_at)),
            },
            {
              title: "Book Flags / Missing Info",
              href: "/teacher/books",
              count: manualBookFlagRows.length + missingBookInfoItems.length,
              description: "Manual book flags and global books missing core details.",
              hasToday: bookFlagAndMissingDates.some((date) => isTodayDate(date)),
              sortDate: oldestDate(bookFlagAndMissingDates),
            },
            {
              title: "Kanji Queue",
              href: "/teacher/kanji",
              count: activeKanjiQueueCount,
              description: "Kanji reports and enrichment rows waiting for review.",
              hasToday: activeKanjiQueueDates.some((date) => isTodayDate(date)),
              sortDate: oldestDate(activeKanjiQueueDates),
            },
            {
              title: "Vocabulary Flags",
              href: "/teacher/words",
              count: vocabularyFlagRows.length,
              description: "Flagged saved-word input that needs super-teacher/admin review.",
              hasToday: vocabularyFlagRows.some((row) => isTodayDate(row.created_at)),
              sortDate: oldestDate(vocabularyFlagRows.map((row) => row.created_at)),
            },
          );
        }

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <TeacherHubHeader />

      <section className="mt-8">
        <TeacherHubCardGrid cards={teacherHubCards} />
      </section>

      <TeacherHubTodaySection
        alertsLoading={alertsLoading}
        isSuperTeacher={isSuperTeacher}
        alerts={teacherAlerts}
      />
    </main>
  );
}
