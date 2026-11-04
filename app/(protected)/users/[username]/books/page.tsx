// Library
//
"use client";

import { getWordSkyLibraryReturnState } from "@/lib/wordSkyExploration";
import { DEFAULT_PAGE_STYLE } from "@/lib/appearance/defaultAppearance";
import { effectiveProgressMethod, progressSummary, type ProgressTrackingMethod, type ProgressTotals } from "@/lib/books/readingProgress";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import DailyLibraryReminder from "./components/DailyLibraryReminder";
import LibraryGuidePanel from "./components/LibraryGuidePanel";
import LibraryHeader from "./components/LibraryHeader";
import LibraryViewControls from "./components/LibraryViewControls";
import LibraryBookCard from "./components/LibraryBookCard";
import LibraryBookRow from "./components/LibraryBookRow";
import LibrarySection from "./components/LibrarySection";
import LibraryEmptyState from "./components/LibraryEmptyState";
import FloatingAddBookButton from "./components/FloatingAddBookButton";
import LearningTaskCard from "./components/LearningTaskCard";
import LearningTasksPanel from "./components/LearningTasksPanel";
import UserBar from "./components/UserBar";
import {
  LearningTasksErrorBanner,
} from "./components/LibraryStatusBanners";
import {
  formatRelativeDate,
  getLibraryItemStatusLabel,
  sortLibraryItems,
} from "./helpers";
import { resolvePersonalTrackingStatus } from "@/lib/personalTracking";
import { getLibraryRelationshipBadge, type LibraryRelationshipBadge } from "./libraryRelationship";

const DAY_MS = 1000 * 60 * 60 * 24;

type Book = {
  id: string;
  title: string;
  language_code?: string | null;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher: string | null;
  isbn13: string | null;
  cover_url: string | null;
  reader_created?: boolean;
  catalog_reviewed_at?: string | null;
  page_count: number | null;
  kindle_location_count?: number | null;
  audiobook_duration_minutes?: number | null;
  book_type: string | null;
};

type UserBookRow = {
  id: string;
  book_id: string;
  personal_tracking_status?: string | null;
  relationshipBadge?: LibraryRelationshipBadge;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  notify_banner: boolean;
  has_new_vocab: boolean;
  has_new_reading: boolean;
  books: Book | null;
  progress_mode: string | null;
  progress_tracking_method: ProgressTrackingMethod | null;
  show_page_numbers: boolean | null;
  rating_overall?: number | null;
  rating_difficulty?: number | null;
  is_teacher_prep?: boolean | null;
  teacher_prep_kind?: string | null;
  prepared_by?: string | null;
  source_user_book_id?: string | null;
  assigned_from_prep_at?: string | null;
};

type ProfileRole = "teacher" | "super_teacher" | "admin" | "member";

type TrialBannerState = {
  daysRemaining: number | null;
  formattedDate: string;
} | null;

type LearningTaskRow = {
  id: string;
  created_by: string;
  learner_id: string;
  user_book_id: string | null;
  task_type: string;
  title: string;
  instructions: string | null;
  task_payload: Record<string, any> | null;
  status: string;
  due_on: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type ReadingSessionStats = {
  progressPercent: number | null;
  furthestPage: number | null;
  lastEngagedAt: string | null; // ✅ NEW
};

type LibrarySortMode =
  | "status"
  | "title"
  | "last_engaged"
  | "rating_high"
  | "difficulty_low";

function LibraryBooksLoadingState() {
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">
      Loading your Library books...
    </div>
  );
}

function formatTrialEndDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getActiveTrialBannerState(
  appAccessType: string | null | undefined,
  appAccessExpiresAt: string | null | undefined
): TrialBannerState {
  if (appAccessType?.trim().toLowerCase() !== "trial" || !appAccessExpiresAt) {
    return null;
  }

  const expiry = new Date(appAccessExpiresAt);
  const msRemaining = expiry.getTime() - Date.now();
  if (Number.isNaN(expiry.getTime()) || msRemaining <= 0) return null;

  return {
    daysRemaining: msRemaining < DAY_MS ? null : Math.ceil(msRemaining / DAY_MS),
    formattedDate: formatTrialEndDate(expiry),
  };
}

export default function BooksPage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const routeUsername = params?.username ?? null;

  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [readingStatsByUserBookId, setReadingStatsByUserBookId] = useState<
    Record<string, ReadingSessionStats>
  >({});
  const [libraryBooksLoading, setLibraryBooksLoading] = useState(true);
  const [libraryBooksError, setLibraryBooksError] = useState<string | null>(null);
  const fetchBooksRequestIdRef = useRef(0);

  const [learningTasks, setLearningTasks] = useState<LearningTaskRow[]>([]);
  const [learningTasksLoading, setLearningTasksLoading] = useState(false);
  const [learningTasksError, setLearningTasksError] = useState<string | null>(null);
  const [completingLearningTaskId, setCompletingLearningTaskId] = useState<string | null>(null);

  const [meId, setMeId] = useState<string>("");
  const [meDisplayName, setMeDisplayName] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<ProfileRole>("member");
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [hasFullLearningAccess, setHasFullLearningAccess] = useState(false);
  const [trialBanner, setTrialBanner] = useState<TrialBannerState>(null);
  const [viewingUserLabel, setViewingUserLabel] = useState("Me");
  const [viewingUserId, setViewingUserId] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [bookTypeFilter, setBookTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const isTeacher = myRole === "teacher" || myRole === "super_teacher" || isSuperTeacher;
  const isViewingOwnLibrary =
    !!viewingUserId && !!meId && viewingUserId === meId;
  const hasTeachingLibraryAccess =
    myRole === "teacher" ||
    myRole === "super_teacher" ||
    myRole === "admin" ||
    isSuperTeacher;
  const canSeeOwnTeachingLibraryContext =
    isViewingOwnLibrary && hasTeachingLibraryAccess;

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        !!row.books?.title?.toLocaleLowerCase().includes(normalizedSearch) ||
        !!row.books?.author?.toLocaleLowerCase().includes(normalizedSearch);
      const matchesBookType =
        bookTypeFilter === "all" || row.books?.book_type === bookTypeFilter;

      const personalTrackingStatus = resolvePersonalTrackingStatus(row);
      const matchesStatus =
        statusFilter === "all" || personalTrackingStatus === statusFilter;

      return matchesSearch && matchesBookType && matchesStatus;
    });
  }, [rows, searchQuery, bookTypeFilter, statusFilter]);

  const validRows = useMemo(
    () => filteredRows.filter((r) => !!r.books && !r.is_teacher_prep),
    [filteredRows]
  );
  const usableLibraryBookCount = rows.filter((r) => !!r.books && !r.is_teacher_prep).length;
  const hasLibraryBooks = usableLibraryBookCount > 0;

  const [viewMode, setViewMode] = useState<"cover" | "list">("cover");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("status");

  const restoredWordSkyPreferencesRef = useRef(false);
  useEffect(() => {
    if (restoredWordSkyPreferencesRef.current) return;
    const restored = getWordSkyLibraryReturnState(window.location.search);
    if (!restored) return;
    restoredWordSkyPreferencesRef.current = true;
    setSearchQuery(restored.search);
    setBookTypeFilter(restored.bookType);
    setStatusFilter(restored.status);
    setSortMode(restored.sort as LibrarySortMode);
    setViewMode(restored.view);
    const cleanPath = routeUsername ? `/users/${encodeURIComponent(routeUsername)}/books` : "/books";
    router.replace(cleanPath, { scroll: false });
  }, [routeUsername, router]);

  const viewingLabel =
    viewingUserId && viewingUserId === meId ? "Me" : viewingUserLabel || "Member";

  const isViewingStudentLibrary =
    isTeacher && !!viewingUserId && !!meId && viewingUserId !== meId;

  const showEmptyLibraryJapaneseLearningDiscovery =
    isViewingOwnLibrary && !hasFullLearningAccess && !trialBanner && !isTeacher;
  const libraryOwnerLabel = isViewingStudentLibrary ? `${viewingLabel}’s` : "My";

  const addBookHref =
    viewingUserId && meId && viewingUserId !== meId
      ? `/books/add?destination=student&targetUserId=${encodeURIComponent(viewingUserId)}`
      : "/books/add?destination=my-library";

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setMeDisplayName(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadLearningTasks(userId: string) {
    setLearningTasksLoading(true);
    setLearningTasksError(null);

    try {
      const query = supabase
        .from("learning_tasks")
        .select(
          `
          id,
          created_by,
          learner_id,
          user_book_id,
          task_type,
          title,
          instructions,
          task_payload,
          status,
          due_on,
          cancelled_at,
          created_at
        `
        )
        .eq("learner_id", userId)
        .eq("status", "assigned")
        .is("cancelled_at", null)
        .order("due_on", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(5);

      const { data, error } = await query.returns<LearningTaskRow[]>();

      if (error) throw error;

      setLearningTasks(data ?? []);
    } catch (error) {
      console.error("Error loading learning tasks:", error);
      setLearningTasksError(error instanceof Error ? error.message : "Could not load learning tasks.");
      setLearningTasks([]);
    } finally {
      setLearningTasksLoading(false);
    }
  }

  async function completeLearningTask(taskId: string) {
    if (!meId || viewingUserId !== meId) return;

    setCompletingLearningTaskId(taskId);
    setLearningTasksError(null);

    try {
      const { error } = await supabase
        .from("learning_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("learner_id", meId)
        .eq("status", "assigned");

      if (error) throw error;

      setLearningTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error completing learning task:", error);
      setLearningTasksError(
        error instanceof Error ? error.message : "Could not mark the learning task done."
      );
    } finally {
      setCompletingLearningTaskId(null);
    }
  }

  const logSbError = useCallback((prefix: string, err: any) => {
    console.error(prefix, err?.message, err?.details, err?.hint, err?.code, err);
  }, []);

  const loadReadingStatsForBooks = useCallback(async (
    userBookIds: string[],
    progressByBook: Record<string, {method: ProgressTrackingMethod | null; totals: ProgressTotals}>,
    isCurrentRequest: () => boolean
  ) => {
    if (!isCurrentRequest()) return;

    if (userBookIds.length === 0) {
      setReadingStatsByUserBookId({});
      return;
    }

    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("id, created_at, user_book_id, tracking_unit, start_position, end_position, start_page, end_page, read_on, session_mode")
      .in("user_book_id", userBookIds);

    if (!isCurrentRequest()) return;

    if (error) {
      console.error("Error loading reading stats for library:", error);
      setReadingStatsByUserBookId({});
      return;
    }

    const sessionRows = data ?? [];
    const grouped: Record<
      string,
      {
        furthestPage: number;
        lastEngagedAt: string | null;
        sessions: typeof sessionRows;
      }
    > = {};

    for (const row of sessionRows) {
      const userBookId = row.user_book_id as string;
      const endPage = row.end_page == null ? NaN : Number((row as any).end_page);
      const readOn = (row as any).read_on as string | null;
      if (!grouped[userBookId]) {
        grouped[userBookId] = {
          furthestPage: 0,
          lastEngagedAt: null,
          sessions: [],
        };
      }

      grouped[userBookId].sessions.push(row);

      if (readOn) {
        if (
          !grouped[userBookId].lastEngagedAt ||
          readOn > grouped[userBookId].lastEngagedAt
        ) {
          grouped[userBookId].lastEngagedAt = readOn;
        }
      }

      if (Number.isFinite(endPage)) {
        grouped[userBookId].furthestPage = Math.max(grouped[userBookId].furthestPage, endPage);
      }

    }

    const stats: Record<string, ReadingSessionStats> = {};

    for (const userBookId of userBookIds) {
      const g = grouped[userBookId];

      if (!g) {
        stats[userBookId] = {
          progressPercent: null,
          furthestPage: null,
          lastEngagedAt: null,
        };
        continue;
      }

      const progressPercent = progressSummary(g.sessions, progressByBook[userBookId]?.method ?? null, progressByBook[userBookId]?.totals ?? {}).percent;

      stats[userBookId] = {
        progressPercent,
        furthestPage: g.furthestPage,
        lastEngagedAt: g.lastEngagedAt ?? null,
      };
    }

    if (isCurrentRequest()) setReadingStatsByUserBookId(stats);
  }, []);

  const fetchBooks = useCallback(async (
    userIdToView: string,
    callerUserId: string,
    requestId: number
  ) => {
    const isCurrentRequest = () => requestId === fetchBooksRequestIdRef.current;
    if (!isCurrentRequest()) return;

    if (!callerUserId) {
      setLibraryBooksError("Please sign in to view your Library.");
      setRows([]);
      return;
    }

    setLibraryBooksError(null);

    const targetUserId = isTeacher ? userIdToView : callerUserId;

    const { data, error } = await supabase
      .from("user_books")
      .select(`
        id,
        user_id,
        book_id,
        personal_tracking_status,
        started_at,
        finished_at,
        dnf_at,
        progress_mode,
        progress_tracking_method,
        show_page_numbers,
        rating_overall,
        rating_difficulty,
        is_teacher_prep,
        teacher_prep_kind,
        prepared_by,
        source_user_book_id,
        assigned_from_prep_at,
        books (
          id,
          title,
          language_code,
          author,
          cover_url,
          reader_created,
          catalog_reviewed_at,
          page_count,
          kindle_location_count,
          audiobook_duration_minutes,
          edition_format,
          book_type
        )
      `)
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (!isCurrentRequest()) return;

    if (error) {
      logSbError("Error fetching user_books:", error);
      setLibraryBooksError(error.message ?? "Could not load Library books.");
      setRows([]);
      return;
    }

    const loadedRows = (data as any) || [];

    // Preserve the existing own-teacher-library query scope. Missing or unknown
    // status is not an explicit opt-out from teaching.
    const teachingStatusByUserBookId = new Map<string, string | null>();

    if (hasTeachingLibraryAccess && targetUserId === meId) {
      const { data: teacherBookRows, error: teacherBookError } = await supabase
        .from("teacher_books")
        .select("user_book_id, teaching_status")
        .eq("teacher_id", meId)
        .not("user_book_id", "is", null);

      if (!isCurrentRequest()) return;

      if (teacherBookError) {
        console.error("Error loading teaching book links:", teacherBookError);
      } else {
        for (const item of teacherBookRows ?? []) {
          if (item.user_book_id) {
            teachingStatusByUserBookId.set(item.user_book_id, item.teaching_status);
          }
        }
      }
    }

    const rowsWithTeachingBadges = loadedRows.map((item: UserBookRow) => ({
      ...item,
      relationshipBadge: getLibraryRelationshipBadge(
        resolvePersonalTrackingStatus(item) !== "not_tracking",
        teachingStatusByUserBookId.get(item.id)
      ),
    }));

    if (!isCurrentRequest()) return;

    setLibraryBooksError(null);
    setRows(rowsWithTeachingBadges);
    // Show the books immediately; statistics and alerts can finish afterward.
    setLibraryBooksLoading(false);

    const userBookIds = rowsWithTeachingBadges
      .filter((r: any) => resolvePersonalTrackingStatus(r) !== "not_tracking")
      .map((r: any) => r.id);
    await loadReadingStatsForBooks(
      userBookIds,
      Object.fromEntries(rowsWithTeachingBadges.map(r => [r.id, { method: effectiveProgressMethod(r.progress_tracking_method, r.books ?? {}), totals: r.books ?? {} }])),
      isCurrentRequest
    );
  }, [isTeacher, hasTeachingLibraryAccess, meId, loadReadingStatsForBooks, logSbError]);

  useEffect(() => {
    let cancelled = false;

    (async () => {

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setRows([]);
          setTrialBanner(null);
          setLibraryBooksLoading(false);
          setLibraryBooksError("Please sign in to view your Library.");
        }
        return;
      }

      if (cancelled) return;

      setMeId(user.id);
      setViewingUserLabel("Me");

      const meProfileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, username, display_name, time_zone, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .single();
      let meProfile: any = meProfileResult.data;
      let meProfileErr = meProfileResult.error;

      if (isMissingAppAccessColumnError(meProfileErr)) {
        const fallbackResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher, username, display_name, time_zone")
          .eq("id", user.id)
          .single();

        meProfile = fallbackResult.data;
        meProfileErr = fallbackResult.error;
      }

      if (meProfileErr) {
        logSbError("Error loading my profile role:", meProfileErr);
      }

      if (cancelled) return;

      setMeDisplayName(meProfile?.display_name || "User");

      const role = (meProfile?.role as ProfileRole | null) ?? "member";
      const superTeacherFlag = Boolean((meProfile as any)?.is_super_teacher);

      setMyRole(role);
      setIsSuperTeacher(superTeacherFlag);
      const appAccessStatus = meProfile
        ? getAppAccessStatus(meProfile)
        : { hasFullAccess: false, reason: "free" };
      setHasFullLearningAccess(appAccessStatus.hasFullAccess);
      setTrialBanner(
        getActiveTrialBannerState(
          (meProfile as any)?.app_access_type,
          (meProfile as any)?.app_access_expires_at
        )
      );

      if (routeUsername && routeUsername === meProfile?.username) {
        setViewingUserId(user.id);
        setViewingUserLabel(meProfile?.display_name || "Member");
      } else if (routeUsername) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, display_name")
          .eq("username", routeUsername)
          .single();

        if (profile?.id) {
          setViewingUserId(profile.id);
          setViewingUserLabel(profile.display_name || "Member");
        } else {
          setViewingUserId(user.id);
          setViewingUserLabel("Me");
        }
      } else {
        setViewingUserId(user.id);
        setViewingUserLabel("Me");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeUsername, logSbError]);

  useEffect(() => {
    if (!viewingUserId || !meId) {
      fetchBooksRequestIdRef.current += 1;
      setLibraryBooksLoading(true);
      return;
    }

    const requestId = ++fetchBooksRequestIdRef.current;

    setRows([]);
    setLibraryBooksError(null);
    setLibraryBooksLoading(true);

    void fetchBooks(viewingUserId, meId, requestId).finally(() => {
      if (requestId === fetchBooksRequestIdRef.current) {
        setLibraryBooksLoading(false);
      }
    });

    return () => {
      if (requestId === fetchBooksRequestIdRef.current) {
        fetchBooksRequestIdRef.current += 1;
      }
    };
  }, [viewingUserId, meId, fetchBooks]);

  useEffect(() => {
    if (!viewingUserId || !meId || !isViewingOwnLibrary) {
      setLearningTasks([]);
      setLearningTasksError(null);
      setLearningTasksLoading(false);
      return;
    }

    void loadLearningTasks(viewingUserId);
  }, [viewingUserId, meId, isViewingOwnLibrary]);

  const currentlyReading = validRows.filter(
    (r) => resolvePersonalTrackingStatus(r) === "reading"
  );
  const notStarted = validRows.filter(
    (r) => resolvePersonalTrackingStatus(r) === "want_to_read"
  );
  const finished = validRows.filter((r) => resolvePersonalTrackingStatus(r) === "finished");
  const dnf = validRows.filter((r) => resolvePersonalTrackingStatus(r) === "dnf");
  const notTracking = validRows.filter(
    (r) => resolvePersonalTrackingStatus(r) === "not_tracking"
  );

  const sortedValidRows = useMemo(() => {
    return sortLibraryItems(validRows, sortMode, readingStatsByUserBookId);
  }, [validRows, sortMode, readingStatsByUserBookId]);

  const gridClass =
    "grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  function renderBookCard(row: UserBookRow) {
    const workspaceHref = isViewingStudentLibrary
      ? `/teacher/students/${encodeURIComponent(viewingUserId)}/books/${encodeURIComponent(row.id)}/workspace`
      : null;

    return (
      <LibraryBookCard
        key={row.id}
        row={row}
        stats={readingStatsByUserBookId[row.id]}
        href={`/books/${row.id}`}
        formatRelativeDate={formatRelativeDate}
        secondaryActionHref={workspaceHref}
        secondaryActionLabel="Open Workspace"
      />
    );
  }

  function renderBookRow(row: UserBookRow) {
    const workspaceHref = isViewingStudentLibrary
      ? `/teacher/students/${encodeURIComponent(viewingUserId)}/books/${encodeURIComponent(row.id)}/workspace`
      : null;

    return (
      <LibraryBookRow
        key={row.id}
        row={row}
        status={getLibraryItemStatusLabel(row)}
        onOpen={() => router.push(`/books/${row.id}`)}
        secondaryActionHref={workspaceHref}
        secondaryActionLabel="Open Workspace"
      />
    );
  }

  const showLearningTasks =
    isViewingOwnLibrary &&
    !learningTasksLoading &&
    learningTasks.length > 0;
  const showLearningTasksError =
    isViewingOwnLibrary &&
    !learningTasksLoading &&
    !!learningTasksError;
  const showLibraryBooksLoading = libraryBooksLoading;
  const showLibraryBooksError = !libraryBooksLoading && !!libraryBooksError;
  const showLibraryBookSections = !libraryBooksLoading && !libraryBooksError;
  const showLibraryEmptyState = showLibraryBookSections && !hasLibraryBooks;
  const showLibraryGuide =
    showLibraryBookSections &&
    isViewingOwnLibrary &&
    usableLibraryBookCount >= 1 &&
    usableLibraryBookCount <= 2;
  const showLibraryNoMatches =
    showLibraryBookSections && hasLibraryBooks && validRows.length === 0;

  function learningTaskTypeLabel(taskType: string) {
    if (taskType === "reread_pages") return "Reread pages";
    if (taskType === "review_book_words") return "Study book flashcards";
    if (taskType === "review_recent_words") return "Review recent words";
    if (taskType === "kanji_reading_practice") return "Kanji Reading";
    if (taskType === "study_kana") return "Study Kana";
    if (taskType === "foundations_vocabulary") return "Foundations Vocabulary";
    if (taskType === "listening") return "Listening";
    return "Learning task";
  }

  function learningTaskAction(task: LearningTaskRow) {
    if (task.task_type === "kanji_reading_practice") {
      return { href: "/library-study/characters", label: "Open Character Study" };
    }

    if (task.task_type === "study_kana") {
      return { href: "/library-study/kana", label: "Open Kana Study" };
    }

    if (task.task_type === "foundations_vocabulary") {
      return {
        href: "/library-study/foundation-vocabulary",
        label: "Open Foundations Vocabulary",
      };
    }

    if (!task.user_book_id) return null;

    if (task.task_type === "review_book_words") {
      return { href: `/books/${task.user_book_id}/study`, label: "Open Flashcards" };
    }

    if (task.task_type === "listening") {
      return { href: `/books/${task.user_book_id}/listening`, label: "Open Listening" };
    }

    if (task.task_type !== "reread_pages") return null;

    const mode = String(task.task_payload?.mode ?? "reader_choice");
    const pageStart = task.task_payload?.page_start;
    const pageParam =
      pageStart != null && Number.isFinite(Number(pageStart))
        ? `?page=${encodeURIComponent(String(pageStart))}`
        : "";

    if (mode === "fluid_reading_saved_words") {
      return { href: `/books/${task.user_book_id}/readalong${pageParam}`, label: "Open Reading" };
    }

    if (mode === "curiosity_reading") {
      return { href: `/books/${task.user_book_id}/curiosity-reading`, label: "Open Reading" };
    }

    if (mode === "just_reading") {
      return { href: `/books/${task.user_book_id}/just-reading`, label: "Open Reading" };
    }

    return { href: `/books/${task.user_book_id}`, label: "Open Book Hub" };
  }

  return (
    <main className="min-h-screen px-6 py-8" style={DEFAULT_PAGE_STYLE}>
      <div className="mx-auto max-w-screen-xl">
        <LibraryHeader
          libraryOwnerLabel={libraryOwnerLabel}
        >
          {isViewingStudentLibrary ? (
          <div className="flex flex-col items-end gap-2">
            {isViewingStudentLibrary && meDisplayName ? (
              <span className="text-xs text-slate-500">Logged in as {meDisplayName}</span>
            ) : null}
            <UserBar isTeacher={isTeacher} displayName={meDisplayName} variant="logoutOnly" />
          </div>
          ) : null}
        </LibraryHeader>

        {trialBanner ? (
          <section aria-label="Trial access" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div>
                <span className="font-medium text-emerald-900">
                  Japanese Learning Tools trial active
                </span>
                <p className="mt-1 text-xs">
                  {trialBanner.daysRemaining == null
                    ? "Less than 1 day remaining"
                    : `${trialBanner.daysRemaining} ${trialBanner.daysRemaining === 1 ? "day" : "days"} remaining`}
                  <span className="ml-2">Ends {trialBanner.formattedDate}.</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/reading-access")}
                className="font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-950"
              >
                Subscription &amp; Access
              </button>
            </div>
          </section>
        ) : null}

        {isViewingOwnLibrary && !libraryBooksLoading && !libraryBooksError ? (
          <DailyLibraryReminder
            key={meId}
            ownerId={meId}
            libraryPath={routeUsername ? `/users/${encodeURIComponent(routeUsername)}/books` : "/books"}
            search={searchQuery} bookType={bookTypeFilter} status={statusFilter}
            sort={sortMode} view={viewMode}
          />
        ) : null}

        {showLearningTasks ? (
          <LearningTasksPanel
            taskCount={learningTasks.length}
          >
            {learningTasks.map((task) => {
              const bookTitle =
                rows.find((row) => row.id === task.user_book_id)?.books?.title ?? null;
              const pageStart = task.task_payload?.page_start;
              const pageEnd = task.task_payload?.page_end;
              const taskAction = learningTaskAction(task);
              const chapterNumber = task.task_payload?.chapter_number;
              const savedFrom = task.task_payload?.saved_from;
              const savedTo = task.task_payload?.saved_to;
              const cardCount = task.task_payload?.card_count;
              const pageLabel =
                pageStart && pageEnd
                  ? pageStart === pageEnd
                    ? `p.${pageStart}`
                    : `pp.${pageStart}-${pageEnd}`
                  : null;
              const taskDetails = [
                bookTitle,
                pageLabel,
                chapterNumber ? `Chapter ${chapterNumber}` : null,
                savedFrom || savedTo
                  ? `Saved ${savedFrom || "…"} to ${savedTo || "…"}`
                  : null,
                cardCount ? `${cardCount} cards` : null,
                task.due_on ? `Due ${task.due_on}` : null,
              ].filter(Boolean);

              return (
                <LearningTaskCard
                  key={task.id}
                  title={task.title}
                  typeLabel={learningTaskTypeLabel(task.task_type)}
                  instructions={task.instructions}
                  details={taskDetails as string[]}
                  action={taskAction}
                  canComplete={viewingUserId === meId}
                  isCompleting={completingLearningTaskId === task.id}
                  onOpenAction={(href) => router.push(href)}
                  onComplete={() => void completeLearningTask(task.id)}
                />
              );
            })}
          </LearningTasksPanel>
        ) : null}

        {showLearningTasksError ? (
          <LearningTasksErrorBanner message={learningTasksError} />
        ) : null}

        {showLibraryGuide ? (
          <LibraryGuidePanel
            hasFullAccess={hasFullLearningAccess || isTeacher}
            onNavigate={(path) => router.push(path)}
          />
        ) : null}

        {null}

        {showLibraryBookSections && hasLibraryBooks ? (
          <LibraryViewControls
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            bookTypeFilter={bookTypeFilter}
            onBookTypeFilterChange={setBookTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
          />
        ) : null}

        {showLibraryBooksLoading ? <LibraryBooksLoadingState /> : null}

        {showLibraryBooksError ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
            {libraryBooksError}
          </div>
        ) : null}

        {showLibraryBookSections ? (
          viewMode === "cover" ? (
            sortMode === "status" ? (
              <>
                {null}
                <LibrarySection
                  title="Currently Reading"
                  subtitle="Started but not finished yet"
                  count={currentlyReading.length}
                  gridClassName={gridClass}
                >
                  {currentlyReading.map((row) => renderBookCard(row))}
                </LibrarySection>

                <LibrarySection
                  title="Want to Read"
                  subtitle="Not started yet"
                  count={notStarted.length}
                  gridClassName={gridClass}
                >
                  {notStarted.map((row) => renderBookCard(row))}
                </LibrarySection>

                <LibrarySection
                  title="Finished"
                  subtitle="Completed books"
                  count={finished.length}
                  gridClassName={gridClass}
                >
                  {finished.map((row) => renderBookCard(row))}
                </LibrarySection>

                <LibrarySection
                  title="DNF"
                  subtitle="Did not finish"
                  count={dnf.length}
                  gridClassName={gridClass}
                >
                  {dnf.map((row) => renderBookCard(row))}
                </LibrarySection>

                {canSeeOwnTeachingLibraryContext && notTracking.length > 0 ? (
                  <LibrarySection
                    title="Teaching Only"
                    subtitle="Not counted as personal reading"
                    count={notTracking.length}
                    gridClassName={gridClass}
                  >
                    {notTracking.map((row) => renderBookCard(row))}
                  </LibrarySection>
                ) : null}
              </>
            ) : (
              <ul className={gridClass}>
                {sortedValidRows.map((row) => renderBookCard(row))}
              </ul>
            )
          ) : (
            <>
              {null}

              <ul className="overflow-hidden rounded-xl border bg-white">
                {sortedValidRows.map((row) => renderBookRow(row))}
              </ul>
            </>
          )
        ) : null}

        {showLibraryNoMatches ? (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No books match your search and filters.
          </p>
        ) : null}

        {showLibraryEmptyState ? (
          <LibraryEmptyState
            onAddBook={() => router.push(addBookHref)}
            showJapaneseLearningDiscovery={showEmptyLibraryJapaneseLearningDiscovery}
            onLearnJapaneseLearning={() => router.push("/japanese-learning")}
          />
        ) : null}
        {!showLibraryEmptyState ? (
          isTeacher ? (
            <FloatingAddBookButton onClick={() => router.push(addBookHref)} />
          ) : isViewingOwnLibrary ? (
            <button
              type="button"
              onClick={() => router.push(addBookHref)}
              className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg"
            >
              + Add a Book
            </button>
          ) : null
        ) : null}
      </div>
    </main >
  );
}
