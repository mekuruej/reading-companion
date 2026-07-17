// Teacher Reading Snapshot

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { findMekuruReadingLevel } from "@/components/profile/MekuruReadingLevelGuide";
import TeacherSnapshotActions, {
  type TeacherSnapshotAction,
} from "./components/TeacherSnapshotActions";
import TeacherSnapshotHeader from "./components/TeacherSnapshotHeader";
import TeacherSnapshotSection from "./components/TeacherSnapshotSection";
import TeacherSnapshotShell from "./components/TeacherSnapshotShell";
import TeacherSnapshotCommunityFit, {
  type TeacherSnapshotCommunityAdvice,
} from "./components/TeacherSnapshotCommunityFit";
import TeacherSnapshotStatGrid, {
  type TeacherSnapshotStat,
} from "./components/TeacherSnapshotStatGrid";
import TeacherSnapshotStudentProgress, {
  type TeacherSnapshotStudentSummary,
} from "./components/TeacherSnapshotStudentProgress";
import TeacherSnapshotTeachingFit from "./components/TeacherSnapshotTeachingFit";

type Book = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  page_count: number | null;
};

type UserBook = {
  id: string;
  user_id: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  recommended_level: string | null;
  books: Book | null;
};

type ReadingSession = {
  id: string;
  user_book_id: string;
  read_on: string;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  is_filler: boolean | null;
  created_at: string;
  session_mode: string | null;
};

type TeacherBook = {
  id: string;
  user_book_id: string | null;
  teacher_use_status: string | null;
  teacher_use_note: string | null;
};

type Profile = {
  role: string | null;
  is_super_teacher?: boolean | string | null;
};

type TeacherStudentLink = {
  student_id: string | null;
  archived_at?: string | null;
};

type StudentBookRow = {
  id: string;
  user_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
};

type PublicRecommendationSignal = {
  id: string;
  reader_level: string | null;
  difficulty_rating: number | null;
  entertainment_rating: number | null;
  reader_advice: string | null;
  updated_at: string | null;
};

function isSuperTeacher(profile: Profile | null) {
  return (
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function readerStatusLabel(row: UserBook | null) {
  if (!row) return "—";
  if (row.dnf_at) return "DNF / stopped";
  if (row.finished_at) return "Finished";
  if (row.started_at) return "Reading";
  return "Not started";
}

function teacherUseStatusLabel(value: string | null | undefined) {
  switch (value) {
    case "want_to_test":
      return "Want to Test";
    case "testing":
      return "Testing";
    case "currently_using":
      return "Currently Using";
    case "approved_for_lesson":
      return "Approved for Lesson";
    case "use_with_caution":
      return "Use with Caution";
    case "do_not_use":
      return "Do Not Use";
    default:
      return "Not set";
  }
}

function formatMinutes(total: number | null) {
  if (!total || total <= 0) return "—";

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function pageCountLabel(currentPage: number | null, pageCount: number | null) {
  if (currentPage == null) return "—";
  if (pageCount && pageCount > 0) return `${currentPage} / ${pageCount}`;
  return `p. ${currentPage}`;
}

function readerLevelDescription(levelValue: string | null | undefined) {
  const level = findMekuruReadingLevel(levelValue);
  if (!level) return null;

  return `${level.plain} · ${level.cefr} · ${level.jlpt}. ${level.feel}`;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverageRating(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function shortReaderAdvice(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return null;
  return cleaned.length > 120 ? `${cleaned.slice(0, 117).trim()}...` : cleaned;
}

function mostCommonReaderLevel(signals: PublicRecommendationSignal[]) {
  const counts = new Map<string, number>();

  for (const signal of signals) {
    const level = signal.reader_level?.trim();
    if (!level) continue;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }

  let topLevel: string | null = null;
  let topCount = 0;

  for (const [level, count] of counts.entries()) {
    if (count > topCount) {
      topLevel = level;
      topCount = count;
    }
  }

  return topLevel;
}

export default function TeacherReadingSnapshotPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;

  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [row, setRow] = useState<UserBook | null>(null);
  const [teacherBook, setTeacherBook] = useState<TeacherBook | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [vocabCount, setVocabCount] = useState<number | null>(null);
  const [communitySignals, setCommunitySignals] = useState<PublicRecommendationSignal[]>([]);
  const [studentSummary, setStudentSummary] =
    useState<TeacherSnapshotStudentSummary>({
      total: 0,
      reading: 0,
      finished: 0,
      stopped: 0,
    });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canMarkForTeaching, setCanMarkForTeaching] = useState(false);
  const [markingForTeaching, setMarkingForTeaching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      if (!userBookId) return;

      setLoading(true);
      setAccessChecked(false);
      setCanAccess(false);
      setMessage("");
      setRow(null);
      setTeacherBook(null);
      setCurrentUserId(null);
      setCanMarkForTeaching(false);
      setSessions([]);
      setVocabCount(null);
      setCommunitySignals([]);
      setStudentSummary({ total: 0, reading: 0, finished: 0, stopped: 0 });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setMessage("Please sign in.");
        setAccessChecked(true);
        setCanAccess(false);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("Error loading snapshot profile:", profileError);
      }

      const profile = (profileData as Profile | null) ?? null;

      const { data: userBookData, error: userBookError } = await supabase
        .from("user_books")
        .select(
          `
            id,
            user_id,
            book_id,
            started_at,
            finished_at,
            dnf_at,
            recommended_level,
            books (
              id,
              title,
              author,
              cover_url,
              page_count
            )
          `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (userBookError || !userBookData) {
        if (userBookError) console.error("Error loading snapshot book:", userBookError);
        setMessage("You do not have access to this book snapshot.");
        setAccessChecked(true);
        setCanAccess(false);
        setLoading(false);
        return;
      }

      const loadedRow = userBookData as unknown as UserBook;
      const superTeacher = isSuperTeacher(profile);
      let allowed = loadedRow.user_id === user.id || superTeacher;
      const teacherCanUseOwnReaderBook =
        loadedRow.user_id === user.id &&
        (profile?.role === "teacher" ||
          profile?.role === "super_teacher" ||
          profile?.is_super_teacher === true ||
          profile?.is_super_teacher === "true");

      if (!allowed && profile?.role === "teacher" && loadedRow.user_id) {
        const { data: teacherStudent, error: teacherStudentError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("student_id", loadedRow.user_id)
          .maybeSingle();

        if (cancelled) return;

        if (teacherStudentError) {
          console.error("Error checking snapshot teacher access:", teacherStudentError);
        }

        allowed = !!teacherStudent;
      }

      if (!allowed) {
        setMessage("You do not have access to this book snapshot.");
        setAccessChecked(true);
        setCanAccess(false);
        setLoading(false);
        return;
      }

      setCanAccess(true);
      setAccessChecked(true);
      setRow(loadedRow);
      setCanMarkForTeaching(teacherCanUseOwnReaderBook);

      const [
        teacherBookResult,
        sessionsResult,
        vocabCountResult,
        communitySignalsResult,
      ] = await Promise.all([
          supabase
            .from("teacher_books")
            .select("id, user_book_id, teacher_use_status, teacher_use_note")
            .eq("user_book_id", userBookId)
            .maybeSingle(),
          supabase
            .from("user_book_reading_sessions")
            .select(
              "id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode"
            )
            .eq("user_book_id", userBookId)
            .order("read_on", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("user_book_words")
            .select("id", { count: "exact", head: true })
            .eq("user_book_id", userBookId),
          supabase
            .from("public_book_recommendation_signals")
            .select(
              "id, reader_level, difficulty_rating, entertainment_rating, reader_advice, updated_at"
            )
            .eq("book_id", loadedRow.book_id)
            .order("updated_at", { ascending: false, nullsFirst: false }),
        ]);

      if (cancelled) return;

      if (teacherBookResult.error) {
        console.error("Error loading linked teacher book:", teacherBookResult.error);
        setTeacherBook(null);
      } else {
        setTeacherBook((teacherBookResult.data as TeacherBook | null) ?? null);
      }

      if (sessionsResult.error) {
        console.error("Error loading snapshot sessions:", sessionsResult.error);
        setSessions([]);
      } else {
        setSessions((sessionsResult.data as ReadingSession[]) ?? []);
      }

      if (vocabCountResult.error) {
        console.error("Error loading snapshot vocab count:", vocabCountResult.error);
        setVocabCount(null);
      } else {
        setVocabCount(vocabCountResult.count ?? 0);
      }

      if (communitySignalsResult.error) {
        console.error(
          "Error loading community reader-fit signals:",
          communitySignalsResult.error
        );
        setCommunitySignals([]);
      } else {
        setCommunitySignals(
          ((communitySignalsResult.data ?? []) as PublicRecommendationSignal[])
        );
      }

      const linkQuery = supabase
        .from("teacher_students")
        .select("student_id, archived_at");

      const { data: linksData, error: linksError } = superTeacher
        ? await linkQuery
        : await linkQuery.eq("teacher_id", user.id);

      if (cancelled) return;

      if (linksError) {
        console.error("Error loading snapshot student links:", linksError);
        setStudentSummary({ total: 0, reading: 0, finished: 0, stopped: 0 });
      } else {
        const studentIds = Array.from(
          new Set(
            ((linksData ?? []) as TeacherStudentLink[])
              .filter((link) => !link.archived_at)
              .map((link) => link.student_id)
              .filter(Boolean) as string[]
          )
        );

        if (studentIds.length === 0) {
          setStudentSummary({ total: 0, reading: 0, finished: 0, stopped: 0 });
        } else {
          const { data: studentBooksData, error: studentBooksError } = await supabase
            .from("user_books")
            .select("id, user_id, started_at, finished_at, dnf_at")
            .eq("book_id", loadedRow.book_id)
            .in("user_id", studentIds);

          if (cancelled) return;

          if (studentBooksError) {
            console.error("Error loading snapshot student books:", studentBooksError);
            setStudentSummary({ total: 0, reading: 0, finished: 0, stopped: 0 });
          } else {
            const studentBooks = (studentBooksData as StudentBookRow[]) ?? [];
            setStudentSummary({
              total: studentBooks.length,
              reading: studentBooks.filter(
                (item) => item.started_at && !item.finished_at && !item.dnf_at
              ).length,
              finished: studentBooks.filter((item) => item.finished_at).length,
              stopped: studentBooks.filter((item) => item.dnf_at).length,
            });
          }
        }
      }

      setLoading(false);
    }

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  async function markReaderBookForTeaching() {
    if (!row || !currentUserId || !canMarkForTeaching) return;

    setMarkingForTeaching(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("teacher_books")
        .upsert(
          {
            teacher_id: currentUserId,
            book_id: row.book_id,
            user_book_id: row.id,
            teacher_use_status: "want_to_test",
          },
          { onConflict: "teacher_id,book_id" }
        )
        .select("id, user_book_id, teacher_use_status, teacher_use_note")
        .single();

      if (error) throw error;

      setTeacherBook((data as TeacherBook) ?? null);
      setMessage(
        "This reader book is now marked for teaching. Your reader history and vocabulary stayed in My Library."
      );
    } catch (error: any) {
      console.error("Error marking reader book for teaching:", error);
      setMessage(error?.message ?? "Could not mark this book for teaching.");
    } finally {
      setMarkingForTeaching(false);
    }
  }

  const book = row?.books ?? null;
  const realSessions = useMemo(
    () => sessions.filter((session) => !session.is_filler),
    [sessions]
  );
  const visualReadingSessions = useMemo(
    () =>
      realSessions.filter(
        (session) =>
          session.session_mode === "curiosity" || session.session_mode === "fluid"
      ),
    [realSessions]
  );
  const pageTrackedSessions = useMemo(
    () =>
      visualReadingSessions.filter(
        (session) => session.start_page != null && session.end_page != null
      ),
    [visualReadingSessions]
  );
  const timedPageTrackedSessions = useMemo(
    () =>
      pageTrackedSessions.filter(
        (session) => session.minutes_read != null && session.minutes_read > 0
      ),
    [pageTrackedSessions]
  );

  const pagesRead = pageTrackedSessions.reduce((sum, session) => {
    if (session.start_page == null || session.end_page == null) return sum;
    return sum + (session.end_page - session.start_page + 1);
  }, 0);
  const furthestPage =
    realSessions.reduce<number | null>((maxPage, session) => {
      if (session.end_page == null) return maxPage;
      if (maxPage == null) return session.end_page;
      return Math.max(maxPage, session.end_page);
    }, null) ?? (row?.finished_at && book?.page_count ? book.page_count : null);
  const daysEngaged =
    realSessions.length > 0
      ? new Set(realSessions.map((session) => session.read_on)).size
      : null;
  const totalMinutes = realSessions.reduce(
    (sum, session) => sum + (session.minutes_read ?? 0),
    0
  );
  const timedPages = timedPageTrackedSessions.reduce((sum, session) => {
    if (session.start_page == null || session.end_page == null) return sum;
    return sum + (session.end_page - session.start_page + 1);
  }, 0);
  const timedPageMinutes = timedPageTrackedSessions.reduce(
    (sum, session) => sum + (session.minutes_read ?? 0),
    0
  );
  const averageMinutesPerPage =
    timedPages > 0 ? timedPageMinutes / timedPages : null;
  const percentComplete =
    row?.finished_at && book?.page_count
      ? 100
      : furthestPage != null && book?.page_count
        ? Math.min(100, Math.round((furthestPage / book.page_count) * 100))
        : null;

  const progressStats: TeacherSnapshotStat[] = [
    { label: "Reader status", value: readerStatusLabel(row) },
    {
      label: "Current page",
      value: pageCountLabel(furthestPage, book?.page_count ?? null),
      note: percentComplete != null ? `${percentComplete}% complete` : undefined,
    },
    { label: "Pages read", value: pagesRead > 0 ? String(pagesRead) : "—" },
    { label: "Days engaged", value: daysEngaged != null ? String(daysEngaged) : "—" },
    { label: "Total time", value: formatMinutes(totalMinutes) },
    {
      label: "Avg min/page",
      value: averageMinutesPerPage != null ? averageMinutesPerPage.toFixed(1) : "—",
      note: "Reading sessions only",
    },
    {
      label: "Reader vocab",
      value: vocabCount != null ? String(vocabCount) : "—",
    },
  ];

  const communityDifficultyRatings = communitySignals
    .map((signal) => signal.difficulty_rating)
    .filter((value): value is number => value != null);
  const communityEntertainmentRatings = communitySignals
    .map((signal) => signal.entertainment_rating)
    .filter((value): value is number => value != null);
  const communityAverageDifficulty =
    communityDifficultyRatings.length >= 2
      ? average(communityDifficultyRatings)
      : null;
  const communityAverageEntertainment =
    communityEntertainmentRatings.length >= 2
      ? average(communityEntertainmentRatings)
      : null;
  const communityMostCommonReaderLevel = mostCommonReaderLevel(communitySignals);
  const hasEnoughCommunityFitData = communitySignals.length >= 2;
  const communityFitStats: TeacherSnapshotStat[] = [
    {
      label: "Community readers",
      value: String(communitySignals.length),
      note: "Anonymous recommendation signals",
    },
    ...(communityAverageDifficulty != null
      ? [
        {
          label: "Avg difficulty",
          value: formatAverageRating(communityAverageDifficulty),
          note: `${communityDifficultyRatings.length} difficulty signals`,
        },
      ]
      : []),
    ...(communityAverageEntertainment != null
      ? [
        {
          label: "Avg entertainment",
          value: formatAverageRating(communityAverageEntertainment),
          note: `${communityEntertainmentRatings.length} entertainment signals`,
        },
      ]
      : []),
    ...(communityMostCommonReaderLevel
      ? [
        {
          label: "Common reader level",
          value: communityMostCommonReaderLevel,
        },
      ]
      : []),
  ];
  const communityAdvice: TeacherSnapshotCommunityAdvice[] = communitySignals
    .map((signal) => ({
      id: signal.id,
      text: shortReaderAdvice(signal.reader_advice),
    }))
    .filter((item): item is TeacherSnapshotCommunityAdvice => Boolean(item.text))
    .slice(0, 3);

  const activeTeacherBook =
    teacherBook?.teacher_use_status === "do_not_use" ? null : teacherBook;
  const teacherBookId = activeTeacherBook?.id ?? null;
  const primaryAction: TeacherSnapshotAction | null = teacherBookId
    ? {
      label: "Open Teacher Workspace",
      href: `/teacher/library/${teacherBookId}/book-workspace`,
    }
    : canMarkForTeaching
      ? {
        label: markingForTeaching ? "Marking for Teaching..." : "Use for Teaching",
        href: "#",
        disabled: markingForTeaching,
        buttonTone: "primary" as const,
        onClick: markReaderBookForTeaching,
      }
      : null;
  const teacherActions: TeacherSnapshotAction[] = teacherBookId
    ? [
      {
        label: "Teacher Follow-Along",
        href: `/teacher/library/${teacherBookId}/follow`,
      },
      {
        label: "Teaching Prep",
        href: `/teacher/library/${teacherBookId}`,
      },
    ]
    : [];
  const readerActions: TeacherSnapshotAction[] = [
    { label: "Add Word", href: `/books/${userBookId}/add-word` },
    { label: "Book Stats", href: `/books/${userBookId}/stats` },
    { label: "Reader Vocab", href: `/books/${userBookId}/words` },
    { label: "Flashcards", href: `/books/${userBookId}/study` },
    { label: "Saved Word Reading", href: `/books/${userBookId}/readalong` },
    {
      label: "Curiosity Reading",
      href: `/books/${userBookId}/curiosity-reading`,
    },
  ];

  if (loading || !accessChecked) {
    return (
      <TeacherSnapshotShell>
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading teacher reading snapshot...
        </div>
      </TeacherSnapshotShell>
    );
  }

  if (!canAccess || !row) {
    return (
      <AccessDeniedMessage
        message={message || "You do not have access to this book snapshot."}
        backHref="/books"
        backLabel="Back to Books"
      />
    );
  }

  return (
    <TeacherSnapshotShell>
      <Link
        href={`/books/${userBookId}`}
        className="inline-flex w-fit text-sm font-bold text-stone-600 transition hover:text-stone-950"
      >
        ← Back to Reader Book Hub
      </Link>

      <TeacherSnapshotHeader
        title={book?.title || "Untitled book"}
        author={book?.author ?? null}
        coverUrl={book?.cover_url ?? null}
        statusLabel={
          activeTeacherBook
            ? teacherUseStatusLabel(activeTeacherBook.teacher_use_status)
            : null
        }
      />

      {message ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 shadow-sm">
          {message}
        </div>
      ) : null}

      <TeacherSnapshotSection
        title="Actions"
      >
        <TeacherSnapshotActions
          primaryAction={primaryAction}
          teacherActions={teacherActions}
          readerActions={readerActions}
        />
      </TeacherSnapshotSection>

      <TeacherSnapshotSection
        title="Community Fit"
        description="Anonymous reader-fit signals shared by readers."
      >
        <TeacherSnapshotCommunityFit
          stats={communityFitStats}
          advice={communityAdvice}
          hasEnoughData={hasEnoughCommunityFitData}
        />
      </TeacherSnapshotSection>

      <TeacherSnapshotSection
        title="Teaching Fit"
        description="Teacher-side use status, note, and the existing recommended level for this reader copy."
      >
        <TeacherSnapshotTeachingFit
          statusLabel={teacherUseStatusLabel(activeTeacherBook?.teacher_use_status)}
          note={activeTeacherBook?.teacher_use_note ?? null}
          recommendedLevel={row.recommended_level}
          recommendedLevelDescription={readerLevelDescription(row.recommended_level)}
          hasTeacherBook={Boolean(activeTeacherBook)}
        />
      </TeacherSnapshotSection>

      <TeacherSnapshotSection
        title="My Progress"
        description="Your own reader history for this book, with listening time included in total time."
      >
        <TeacherSnapshotStatGrid stats={progressStats} compact />
      </TeacherSnapshotSection>

      <TeacherSnapshotSection
        title="Student Progress"
        description="Linked students with their own copy of this same book."
      >
        <TeacherSnapshotStudentProgress summary={studentSummary} />
      </TeacherSnapshotSection>
    </TeacherSnapshotShell>
  );
}
