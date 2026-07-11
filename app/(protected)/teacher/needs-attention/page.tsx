// Teacher Needs Attention
//

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  NeedsAttentionCardGrid,
  type AttentionCounts,
  type NeedsAttentionCard,
} from "./components/NeedsAttentionCardGrid";
import { NeedsAttentionHeader } from "./components/NeedsAttentionHeader";
import {
  NeedsAttentionAccessPanel,
  NeedsAttentionLoadingPanel,
} from "./components/NeedsAttentionStatePanels";

type GlobalBookRow = {
  title: string | null;
  isbn13: string | null;
  cover_url: string | null;
  book_type: string | null;
  author: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
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

type ReadingFitCountProfileRow = {
  id: string;
  level: string | null;
};

type TeacherRatingCountUserBookRow = {
  finished_at: string | null;
  notes: string | null;
  recommended_level: string | null;
  teacher_student_use_rating: number | null;
  rating_recommend: number | null;
};

const attentionCards: NeedsAttentionCard[] = [
  {
    title: "Books",
    eyebrow: "Books",
    description: "Review book requests, book flags, and global books missing core information.",
    countKey: "books",
    actions: [
      {
        label: "Book Requests",
        href: "/teacher/books/requests?from=needs-attention",
        countKey: "bookRequests",
      },
      {
        label: "Book Flags",
        href: "/teacher/books/flags?from=needs-attention",
        countKey: "bookFlags",
      },
      {
        label: "Missing Info",
        href: "/teacher/books/missing-info?from=needs-attention",
        countKey: "missingBooks",
      },
    ],
  },
  {
    title: "Vocabulary Flags",
    href: "/teacher/words?from=needs-attention",
    eyebrow: "Vocabulary",
    description: "Review flagged saved-word cards, readings, meanings, and vocabulary support issues.",
    countKey: "wordReports",
  },
  {
    title: "Kanji Flags",
    href: "/teacher/kanji?from=needs-attention",
    eyebrow: "Kanji",
    description: "Review kanji reports and flagged kanji readings.",
  },
  {
    title: "Grammar DB",
    href: "/teacher/needs-attention/grammar?from=needs-attention",
    eyebrow: "Grammar",
    description: "Review shared grammar points, meanings, constructions, aliases, examples, and source notes.",
    countKey: "grammar",
  },
  {
    title: "Rating Flags",
    eyebrow: "Ratings",
    description: "Review finished books that need learner reflection details or teacher lesson-fit ratings.",
    countKey: "ratingFlags",
    actions: [
      {
        label: "Teacher Ratings",
        href: "/teacher/ratings?from=needs-attention",
        countKey: "teacherRatings",
      },
      {
        label: "Student Ratings",
        href: "/teacher/reading-fit?from=needs-attention",
        countKey: "readingFit",
      },
    ],
  },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
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

export default function TeacherNeedsAttentionPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [countsLoading, setCountsLoading] = useState(true);
  const [attentionCounts, setAttentionCounts] = useState<AttentionCounts>({
    books: 0,
    bookRequests: 0,
    bookFlags: 0,
    missingBooks: 0,
    kanji: 0,
    grammar: 0,
    ratingFlags: 0,
    readingFit: 0,
    wordReports: 0,
    teacherRatings: 0,
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

        const [
          { data: readingFitProfiles },
          { data: readingFitRows },
          { data: teacherRatingRows },
          { count: grammarReviewCount },
        ] = await Promise.all([
          supabase.from("profiles").select("id, level").in("id", studentIds),
          supabase
            .from("user_books")
            .select(
              "user_id, finished_at, reader_level, rating_difficulty, rating_overall, teacher_review_cleared_at"
            )
            .in("user_id", studentIds)
            .not("finished_at", "is", null)
            .is("teacher_review_cleared_at", null),
          supabase
            .from("user_books")
            .select("finished_at, notes, recommended_level, teacher_student_use_rating, rating_recommend")
            .in("user_id", studentIds),
          supabase
            .from("grammar_points")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .in("status", ["needs_review", "in_progress"]),
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

        const teacherRatingCount = ((teacherRatingRows ?? []) as TeacherRatingCountUserBookRow[]).filter(
          (item) => {
            const isFinished = !!item.finished_at;
            const hasTeacherReview =
              !!String(item.recommended_level ?? "").trim() ||
              item.teacher_student_use_rating != null ||
              item.rating_recommend != null ||
              !!String(item.notes ?? "").trim();

            return isFinished && !hasTeacherReview;
          }
        ).length;

        let nextCounts: AttentionCounts = {
          books: 0,
          bookRequests: 0,
          bookFlags: 0,
          missingBooks: 0,
          kanji: 0,
          wordReports: 0,
          grammar: grammarReviewCount ?? 0,
          readingFit: readingFitCount,
          teacherRatings: teacherRatingCount,
          ratingFlags: readingFitCount + teacherRatingCount,
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
                "title, isbn13, cover_url, book_type, author, publisher, published_date, page_count, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at"
              ),
            supabase
              .from("user_book_words")
              .select("id", { count: "exact", head: true })
              .eq("flagged_for_review", true),
          ]);

          const missingBookInfoCount = ((globalBooks ?? []) as GlobalBookRow[]).filter(
            (book) => missingGlobalBookFields(book).length > 0
          ).length;

          nextCounts = {
            ...nextCounts,
            books:
              (pendingBookRequestCount ?? 0) +
              (manualBookFlagCount ?? 0) +
              missingBookInfoCount,
            bookRequests: pendingBookRequestCount ?? 0,
            bookFlags: manualBookFlagCount ?? 0,
            missingBooks: missingBookInfoCount,
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
    return <NeedsAttentionLoadingPanel />;
  }

  if (!canAccess) {
    return <NeedsAttentionAccessPanel message={message} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <NeedsAttentionHeader />

        <section className="mt-6">
          <NeedsAttentionCardGrid
            cards={attentionCards}
            counts={attentionCounts}
            countsLoading={countsLoading}
          />
        </section>
      </div>
    </main>
  );
}
