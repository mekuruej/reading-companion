// Teacher Needs Attention
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AttentionCard = {
  title: string;
  href?: string;
  eyebrow: string;
  description: string;
  countKey?: AttentionCountKey;
  disabled?: boolean;
};

type AttentionCountKey =
  | "books"
  | "missingBooks"
  | "kanji"
  | "readingFit"
  | "wordReports";

type AttentionCounts = Record<AttentionCountKey, number>;

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

const attentionCards: AttentionCard[] = [
  {
    title: "Book Requests / Book Review",
    href: "/teacher/books",
    eyebrow: "Books",
    description: "Review pending book requests, book flags, and global books missing core information.",
    countKey: "books",
  },
  {
    title: "Missing Book Info",
    href: "/teacher/books",
    eyebrow: "Book cleanup",
    description: "Find books that need covers, authors, reading metadata, ISBN cleanup, or other global book details.",
    countKey: "missingBooks",
  },
  {
    title: "Kanji Reports / Errors",
    href: "/teacher/kanji",
    eyebrow: "Kanji",
    description: "Review kanji reports, flagged kanji readings, and enrichment queues.",
    countKey: "kanji",
  },
  {
    title: "Word Reports / Vocab Fixes",
    href: "/teacher/words",
    eyebrow: "Vocabulary",
    description: "Review flagged saved-word cards, readings, meanings, and vocabulary support issues.",
    countKey: "wordReports",
  },
  {
    title: "Reading Fit Review",
    href: "/teacher/reading-fit",
    eyebrow: "Reading fit",
    description: "Review finished books missing learner reflection or placement signals.",
    countKey: "readingFit",
  },
  {
    title: "Student Follow-up",
    eyebrow: "Learners",
    description: "Placeholder for assigned work, student task follow-up, and prep reminders when that workflow is ready.",
    disabled: true,
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

function AttentionCardGrid({
  cards,
  counts,
  countsLoading,
}: {
  cards: AttentionCard[];
  counts: AttentionCounts;
  countsLoading: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const count = card.countKey ? counts[card.countKey] : null;
        const cardContent = (
          <div
            className={`h-full rounded-3xl border p-5 shadow-sm transition ${card.disabled
              ? "border-stone-200 bg-stone-50 text-stone-500"
              : "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                {card.eyebrow}
              </p>
              {card.countKey ? (
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-black text-stone-900">
                  {countsLoading ? "..." : count}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-black text-stone-900">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>
            <p className="mt-4 text-sm font-semibold text-stone-900">
              {card.disabled ? "Placeholder" : "Open →"}
            </p>
          </div>
        );

        if (!card.href || card.disabled) {
          return <div key={card.title}>{cardContent}</div>;
        }

        return (
          <Link key={card.title} href={card.href}>
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}

export default function TeacherNeedsAttentionPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [countsLoading, setCountsLoading] = useState(true);
  const [attentionCounts, setAttentionCounts] = useState<AttentionCounts>({
    books: 0,
    missingBooks: 0,
    kanji: 0,
    readingFit: 0,
    wordReports: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkTeacherAccess() {
      setAccessChecked(false);
      setCanAccess(false);
      setCountsLoading(true);
      setMessage("");

      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (cancelled) return;

      if (authError || !user) {
        setMessage("Please sign in to use Needs Attention.");
        setAccessChecked(true);
        setCountsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setMessage(profileError.message ?? "Could not load teacher profile.");
        setAccessChecked(true);
        setCountsLoading(false);
        return;
      }

      const isTeacher =
        profile?.role === "teacher" ||
        profile?.role === "super_teacher" ||
        isSuperTeacherFlag(profile?.is_super_teacher);

      const isSuperTeacher =
        profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

      setCanAccess(isTeacher);
      setMessage(isTeacher ? "" : "Teacher access is required.");
      setAccessChecked(true);

      if (!isTeacher) {
        setCountsLoading(false);
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

        const [{ data: readingFitProfiles }, { data: readingFitRows }] = await Promise.all([
          supabase.from("profiles").select("id, level").in("id", studentIds),
          supabase
            .from("user_books")
            .select(
              "user_id, finished_at, reader_level, rating_difficulty, rating_overall, teacher_review_cleared_at"
            )
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

        let nextCounts: AttentionCounts = {
          books: 0,
          missingBooks: 0,
          kanji: 0,
          wordReports: 0,
          readingFit: readingFitCount,
        };

        if (isSuperTeacher) {
          const [
            { count: pendingBookRequestCount },
            { count: manualBookFlagCount },
            { data: globalBooks },
            { count: flaggedWordReportCount },
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
              .select(
                "title, isbn13, cover_url, book_type, author, publisher, published_date, page_count"
              ),
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

          nextCounts = {
            ...nextCounts,
            books: (pendingBookRequestCount ?? 0) + (manualBookFlagCount ?? 0),
            missingBooks: missingBookInfoCount,
            kanji: activeKanjiQueueCount,
            wordReports: flaggedWordReportCount ?? 0,
          };
        }

        if (!cancelled) {
          setAttentionCounts(nextCounts);
        }
      } catch (error: any) {
        console.error("Error loading Needs Attention counts:", error);
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    }

    void checkTeacherAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-gray-500">Loading teacher access...</p>
        </div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher access
          </p>
          <h1 className="mt-2 text-2xl font-black text-stone-900">Needs Attention</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "Teacher access is required."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            ← Teacher Hub
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Review workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            Needs Attention
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Review queues and learner follow-up areas with work waiting on teacher attention.
          </p>
        </section>

        <section className="mt-6">
          <AttentionCardGrid
            cards={attentionCards}
            counts={attentionCounts}
            countsLoading={countsLoading}
          />
        </section>
      </div>
    </main>
  );
}
