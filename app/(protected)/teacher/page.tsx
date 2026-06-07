// Teacher Hub
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  placeholder?: boolean;
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
};

type ReadingFitCountUserBookRow = {
  user_id: string;
  finished_at: string | null;
  reader_level: string | null;
  rating_difficulty: number | null;
  rating_overall: number | null;
  teacher_review_cleared_at: string | null;
};

type ReadingFitCountProfileRow = {
  id: string;
  level: string | null;
};

type KanjiCountWordRow = {
  id: string;
  user_book_id: string;
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
      "Prepare student lessons, trial prep, reusable materials, and teaching workflows.",
  },
  {
    title: "Needs Attention",
    href: "/teacher/needs-attention",
    eyebrow: "Review",
    description:
      "Review book requests, kanji reports, missing book info, and other cleanup queues.",
  },
  {
    title: "General Upkeep",
    href: "/teacher/general-upkeep",
    eyebrow: "Maintain",
    description:
      "Handle global word data, Word Sky candidates, cleanup, and admin-ish teacher tools.",
  },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function missingGlobalBookFields(book: GlobalBookRow) {
  const missing: string[] = [];
  if (!String(book.title ?? "").trim()) missing.push("title");
  if (!String(book.isbn13 ?? "").trim()) missing.push("ISBN-13");
  if (!String(book.cover_url ?? "").trim()) missing.push("cover");
  if (!String(book.book_type ?? "").trim()) missing.push("book type");
  if (!String(book.author ?? "").trim()) missing.push("author");
  if (!String(book.publisher ?? "").trim()) missing.push("publisher");
  if (!String(book.published_date ?? "").trim()) missing.push("published date");
  if (book.page_count == null) missing.push("page count");
  return missing;
}

function formatAlertCount(count: number) {
  if (count <= 0) return "None";
  if (count > 99) return "99+";
  return String(count);
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

function TeacherHubCardGrid({ cards }: { cards: TeacherHubCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <div className="h-full rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              {card.eyebrow}
            </p>

            <h2 className="mt-3 text-xl font-black text-stone-900">{card.title}</h2>

            <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>

            <p className="mt-4 text-sm font-semibold text-stone-900">Open →</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TeacherAlertList({
  alerts,
  emptyText,
}: {
  alerts: TeacherAlertSummary[];
  emptyText: string;
}) {
  if (alerts.length === 0) {
    return <p className="mt-3 text-sm leading-6 text-stone-600">{emptyText}</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.title}
          className={`flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${
            alert.href ? "transition hover:-translate-y-0.5 hover:shadow-md" : ""
          }`}
        >
          <div>
            <h4 className="text-sm font-black text-stone-900">{alert.title}</h4>
            <p className="mt-1 text-sm leading-5 text-stone-600">{alert.description}</p>
            {alert.href ? (
              <Link
                href={alert.href}
                className="mt-2 inline-flex text-sm font-semibold text-stone-900 hover:text-stone-600"
              >
                Open →
              </Link>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${
              alert.count > 0
                ? "bg-amber-100 text-amber-900"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {alert.placeholder ? "Soon" : formatAlertCount(alert.count)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TeacherHubPage() {
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [learnerAlerts, setLearnerAlerts] = useState<TeacherAlertSummary[]>([]);
  const [upkeepAlerts, setUpkeepAlerts] = useState<TeacherAlertSummary[]>([]);

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
        ]);

        const readerLevelByUserId = new Map(
          ((readingFitProfiles ?? []) as ReadingFitCountProfileRow[]).map((profile) => [
            profile.id,
            profile.level,
          ])
        );

        const readingFitCount = ((readingFitRows ?? []) as ReadingFitCountUserBookRow[]).filter(
          (item) => {
            const effectiveReaderLevel =
              item.reader_level || readerLevelByUserId.get(item.user_id) || null;
            return (
              !String(effectiveReaderLevel ?? "").trim() ||
              item.rating_difficulty == null ||
              item.rating_overall == null
            );
          }
        ).length;

        const nextLearnerAlerts: TeacherAlertSummary[] = [
          {
            title: "Reading Reflection Reviews",
            href: "/teacher/reading-fit",
            count: readingFitCount ?? 0,
            description: "Finished books waiting for teacher review or reflection cleanup.",
          },
          {
            title: "Lesson Vocabulary Reminder",
            count: 0,
            description: "Future alert for entering words after a student's scheduled lesson day.",
            placeholder: true,
          },
          {
            title: "Assignment Follow-up",
            count: 0,
            description: "Future alert for assignments that are pending, completed, or waiting on feedback.",
            placeholder: true,
          },
        ];

        let nextUpkeepAlerts: TeacherAlertSummary[] = [];

        if (hasSuperTeacherAccess) {
          const [
            { count: pendingBookRequestCount },
            { count: manualBookFlagCount },
            { data: globalBooks },
            { count: vocabularyFlagCount },
          ] = await Promise.all([
            supabase
              .from("book_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
            supabase
              .from("user_alerts")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("type", "book_flag"),
            supabase
              .from("books")
              .select("title, isbn13, cover_url, book_type, author, publisher, published_date, page_count"),
            supabase
              .from("user_book_words")
              .select("id", { count: "exact", head: true })
              .eq("flagged_for_review", true),
          ]);

          const missingBookInfoCount = ((globalBooks ?? []) as GlobalBookRow[]).filter(
            (book) => missingGlobalBookFields(book).length > 0
          ).length;

          const { data: kanjiUserBooks } = await supabase
            .from("user_books")
            .select("id")
            .in("user_id", studentIds);

          const kanjiUserBookIds = ((kanjiUserBooks ?? []) as { id: string }[])
            .map((book) => book.id)
            .filter(Boolean);

          let activeKanjiQueueCount = 0;

          if (kanjiUserBookIds.length > 0) {
            const { data: kanjiWordRows } = await supabase
              .from("user_book_words")
              .select("id, user_book_id, surface, vocabulary_cache_id, ignore_kanji_enrichment")
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

            activeKanjiQueueCount = kanjiWords.filter((word) => {
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
            }).length;
          }

          nextUpkeepAlerts = [
            {
              title: "Pending Book Requests",
              href: "/teacher/books",
              count: pendingBookRequestCount ?? 0,
              description: "Reader book requests waiting for global book entry.",
            },
            {
              title: "Book Flags / Missing Info",
              href: "/teacher/books",
              count: (manualBookFlagCount ?? 0) + missingBookInfoCount,
              description: "Manual book flags and global books missing core details.",
            },
            {
              title: "Kanji Queue",
              href: "/teacher/kanji",
              count: activeKanjiQueueCount,
              description: "Kanji reports and enrichment rows waiting for review.",
            },
            {
              title: "Vocabulary Flags",
              href: "/teacher/words",
              count: vocabularyFlagCount ?? 0,
              description: "Flagged saved-word input that needs super-teacher/admin review.",
            },
          ];
        }

        if (!cancelled) {
          setLearnerAlerts(nextLearnerAlerts);
          setUpkeepAlerts(nextUpkeepAlerts);
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
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Teacher Portal
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
          Teacher Hub
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Start with lesson prep, review what needs attention, or keep global teacher-side data tidy.
        </p>
      </section>

      <section className="mt-8">
        <TeacherHubCardGrid cards={teacherHubCards} />
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">Today</h2>
          <p className="mt-1 text-sm text-stone-500">
            Future alerts should answer two questions: what do my learners need, and what does the app need from me?
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Learner / Lesson Alerts
            </p>
            <h3 className="mt-2 text-xl font-black text-stone-900">
              What do I need to do for my learners?
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              After each lesson, remember to add new words, notes, or prep items while they are still fresh.
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Upcoming lessons, assignment follow-up, and prep reminders can be added here later.
            </p>

            {alertsLoading ? (
              <p className="mt-4 text-sm text-stone-500">Loading learner alerts...</p>
            ) : (
              <TeacherAlertList
                alerts={learnerAlerts}
                emptyText="No learner alerts are shown right now."
              />
            )}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              App / Upkeep Alerts
            </p>
            <h3 className="mt-2 text-xl font-black text-stone-900">
              What does the app or global data need from me?
            </h3>
            {alertsLoading ? (
              <p className="mt-4 text-sm text-stone-500">Loading upkeep alerts...</p>
            ) : isSuperTeacher ? (
              <TeacherAlertList
                alerts={upkeepAlerts}
                emptyText="No app upkeep alerts are waiting right now."
              />
            ) : (
              <p className="mt-2 text-sm leading-6 text-stone-600">
                No app upkeep alerts are shown for your role right now. Learner and lesson follow-up will stay separate from global maintenance work.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
