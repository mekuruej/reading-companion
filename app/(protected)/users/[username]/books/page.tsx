// Library
//
"use client";

import { effectiveProgressMethod, progressSummary, type ProgressTrackingMethod, type ProgressTotals } from "@/lib/books/readingProgress";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  getLibraryStudyEncounterStageCounts,
} from "@/lib/libraryStudyColor";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { canUseFullAccessFeature } from "@/lib/access/requireFullAccess";
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
import MobileVersionNotice from "./components/MobileVersionNotice";
import UserBar from "./components/UserBar";
import {
  AbilityCheckReminderBanner,
  LearningTasksErrorBanner,
} from "./components/LibraryStatusBanners";
import {
  formatRelativeDate,
  abilityCheckReminderHiddenToday,
  abilityCheckReminderUnlocked,
  getTodayKey,
  hideAbilityCheckReminderForToday,
  lockAbilityCheckReminder,
  loadAbilityCheckSeenForToday,
  unlockAbilityCheckReminder,
  getLibraryItemStatusLabel,
  sortLibraryItems,
} from "./helpers";
import { resolvePersonalTrackingStatus } from "@/lib/personalTracking";
import { getLibraryRelationshipBadge, type LibraryRelationshipBadge } from "./libraryRelationship";
import {
  isAbilityCheckClaimInDailyPool,
  isAbilityCheckCardInDailyPool,
  type AbilityCheckClaimRow,
  type AbilityCheckProgressRow,
  type AbilityCheckReminderSettings,
  type AbilityCheckSummaryRow,
} from "./abilityCheckHelpers";

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

type AbilityCheckReminderLoadRequest = {
  controller: AbortController;
  queued: { userId: string; canUseAbilityCheck: boolean } | null;
  promise: Promise<void> | null;
};

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

const ABILITY_CHECK_REMINDER_MIN_DUE_CARDS = 10;

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

  const validRows = filteredRows.filter((r) => !!r.books && !r.is_teacher_prep);
  const hasLibraryBooks = rows.some((r) => !!r.books && !r.is_teacher_prep);

  const [viewMode, setViewMode] = useState<"cover" | "list">("cover");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("status");

  const [abilityCheckReminderEnabled, setAbilityCheckReminderEnabled] = useState(true);
  const [abilityCheckReminderCount, setAbilityCheckReminderCount] = useState(0);
  const [abilityCheckReminderLoading, setAbilityCheckReminderLoading] = useState(false);
  const [abilityCheckReminderHidden, setAbilityCheckReminderHidden] = useState(false);
  const [abilityCheckReminderHasUnlocked, setAbilityCheckReminderHasUnlocked] = useState(false);
  const [canUseAbilityCheckReminder, setCanUseAbilityCheckReminder] = useState(false);
  const [abilityCheckReminderDayKey, setAbilityCheckReminderDayKey] = useState(getTodayKey());
  const abilityCheckReminderLoadRef = useRef<AbilityCheckReminderLoadRequest | null>(null);
  const abilityCheckReminderLoadFunctionRef = useRef<((userId: string, canUseAbilityCheck: boolean) => Promise<void>) | null>(null);
  const abilityCheckReminderMountedRef = useRef(false);
  const abilityCheckReminderForegroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const viewingLabel =
    viewingUserId && viewingUserId === meId ? "Me" : viewingUserLabel || "Member";

  const isViewingStudentLibrary =
    isTeacher && !!viewingUserId && !!meId && viewingUserId !== meId;

  const showEmptyLibraryJapaneseLearningDiscovery =
    isViewingOwnLibrary && !hasFullLearningAccess && !trialBanner && !isTeacher;
  const libraryOwnerLabel = isViewingStudentLibrary ? `${viewingLabel}’s` : "My";

  const libraryContextLabel = isViewingStudentLibrary
    ? `Student Library · ${viewingLabel}`
    : null;

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

  const cancelAbilityCheckReminderLoad = useCallback(() => {
    const activeRequest = abilityCheckReminderLoadRef.current;
    if (activeRequest) {
      activeRequest.queued = null;
      activeRequest.controller.abort();
    }
    setAbilityCheckReminderLoading(false);
  }, []);

  const loadAbilityCheckReminder = useCallback((userId: string, canUseAbilityCheck: boolean): Promise<void> => {
    if (!canUseAbilityCheck) {
      cancelAbilityCheckReminderLoad();
      setAbilityCheckReminderCount(0);
      setAbilityCheckReminderHasUnlocked(false);
      lockAbilityCheckReminder();
      return Promise.resolve();
    }

    const activeRequest = abilityCheckReminderLoadRef.current;
    if (activeRequest) {
      activeRequest.queued = { userId, canUseAbilityCheck };
      activeRequest.controller.abort();
      setAbilityCheckReminderLoading(true);
      return activeRequest.promise ?? Promise.resolve();
    }

    const request: AbilityCheckReminderLoadRequest = {
      controller: new AbortController(),
      queued: null,
      promise: null,
    };
    abilityCheckReminderLoadRef.current = request;
    const isCurrentRequest = () =>
      abilityCheckReminderMountedRef.current &&
      abilityCheckReminderLoadRef.current === request &&
      !request.controller.signal.aborted;

    setAbilityCheckReminderLoading(true);

    const run = async () => {
      try {
        let settings: AbilityCheckReminderSettings | null = null;
        const { data: settingsWithReminder, error: settingsError } = await supabase
          .from("user_learning_settings")
          .select(
            "red_stages, orange_stages, yellow_stages, skip_katakana_library_check, show_ability_check_reminder"
          )
          .eq("user_id", userId)
          .abortSignal(request.controller.signal)
          .maybeSingle<AbilityCheckReminderSettings>();

        if (!isCurrentRequest()) return;

        if (settingsError) {
          const { data: fallbackSettings, error: fallbackError } = await supabase
            .from("user_learning_settings")
            .select("red_stages, orange_stages, yellow_stages, skip_katakana_library_check")
            .eq("user_id", userId)
            .abortSignal(request.controller.signal)
            .maybeSingle<AbilityCheckReminderSettings>();

          if (!isCurrentRequest()) return;
          if (fallbackError) throw fallbackError;
          settings = fallbackSettings;
        } else {
          settings = settingsWithReminder;
        }

        const resolvedSettings = {
          red_stages: settings?.red_stages ?? 1,
          orange_stages: settings?.orange_stages ?? 1,
          yellow_stages: settings?.yellow_stages ?? 1,
          skip_katakana_library_check: settings?.skip_katakana_library_check ?? true,
          show_ability_check_reminder: settings?.show_ability_check_reminder ?? true,
        };

        setAbilityCheckReminderEnabled(resolvedSettings.show_ability_check_reminder);

        if (!resolvedSettings.show_ability_check_reminder) {
          setAbilityCheckReminderCount(0);
          return;
        }

        const encounterThreshold = getLibraryStudyEncounterStageCounts(resolvedSettings).total;

        const [summaryResult, claimResult] = await Promise.all([
          supabase
            .from("user_library_word_summaries")
            .select(
              "study_identity_key, surface, reading, meaning, total_encounter_count, last_seen_at, sample_user_book_word_id"
            )
            .eq("user_id", userId)
            .gt("check_ready_encounter_count", 0)
            .gte("total_encounter_count", encounterThreshold)
            .order("total_encounter_count", { ascending: false })
            .limit(500)
            .abortSignal(request.controller.signal)
            .returns<AbilityCheckSummaryRow[]>(),
          supabase
            .from("user_library_word_claims")
            .select("study_identity_key, surface, reading, meaning, claimed_color")
            .eq("user_id", userId)
            .eq("claimed_color", "green")
            .order("updated_at", { ascending: false })
            .limit(500)
            .abortSignal(request.controller.signal)
            .returns<AbilityCheckClaimRow[]>(),
        ]);

        if (!isCurrentRequest()) return;

        const { data: summaryRows, error: summaryError } = summaryResult;
        if (summaryError) throw summaryError;

        const summaries = summaryRows ?? [];
        const { data: claimRows, error: claimError } = claimResult;

        if (claimError) {
          console.warn("Word Sky claims did not load for Ability Check reminder:", claimError);
        }

        const claims = claimError ? [] : claimRows ?? [];
        const claimByKey = new Map<string, AbilityCheckClaimRow>();
        for (const claim of claims) {
          if (claim.study_identity_key) claimByKey.set(claim.study_identity_key, claim);
        }

        if (summaries.length === 0 && claims.length === 0) {
          setAbilityCheckReminderCount(0);
          return;
        }

        const keys = Array.from(
          new Set([
            ...summaries.map((row) => row.study_identity_key).filter(Boolean),
            ...claims.map((row) => row.study_identity_key).filter(Boolean),
          ])
        );
        const progressByKey = new Map<string, AbilityCheckProgressRow>();
        const progressChunks: string[][] = [];

        for (let i = 0; i < keys.length; i += 75) {
          progressChunks.push(keys.slice(i, i + 75));
        }

        for (let i = 0; i < progressChunks.length; i += 3) {
          const batch = progressChunks.slice(i, i + 3);
          const batchResults = await Promise.all(batch.map((chunk) =>
            supabase
              .from("user_library_word_progress")
              .select(
                "id, study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, mastered, reading_gate_failed_at, meaning_gate_failed_at, last_studied_at"
              )
              .eq("definition_key", "")
              .eq("user_id", userId)
              .in("study_identity_key", chunk)
              .abortSignal(request.controller.signal)
              .returns<AbilityCheckProgressRow[]>()
          ));

          if (!isCurrentRequest()) return;

          for (const { data: progressRows, error: progressError } of batchResults) {
            if (progressError) throw progressError;
            for (const row of progressRows ?? []) {
              progressByKey.set(row.study_identity_key, row);
            }
          }
        }

        const seenTodayIds = loadAbilityCheckSeenForToday();
        const availableSummaryCount = summaries.filter((summary) =>
          isAbilityCheckCardInDailyPool(
            summary,
            progressByKey.get(summary.study_identity_key) ?? null,
            resolvedSettings,
            seenTodayIds,
            new Date(),
            claimByKey.get(summary.study_identity_key) ?? null
          )
        ).length;
        const summaryKeys = new Set(summaries.map((summary) => summary.study_identity_key));
        const availableClaimCount = claims
          .filter((claim) => !summaryKeys.has(claim.study_identity_key))
          .filter((claim) =>
            isAbilityCheckClaimInDailyPool(
              claim,
              progressByKey.get(claim.study_identity_key) ?? null,
              resolvedSettings,
              seenTodayIds
            )
          ).length;
        const availableCount = availableSummaryCount + availableClaimCount;

        if (availableCount >= ABILITY_CHECK_REMINDER_MIN_DUE_CARDS) {
          unlockAbilityCheckReminder();
          setAbilityCheckReminderHasUnlocked(true);
        }

        setAbilityCheckReminderCount(availableCount);
      } catch (error) {
        if (isCurrentRequest()) {
          console.error("Error loading Ability Check reminder:", error);
          setAbilityCheckReminderCount(0);
        }
      } finally {
        if (isCurrentRequest()) setAbilityCheckReminderLoading(false);
      }
    };

    request.promise = run().finally(() => {
      if (abilityCheckReminderLoadRef.current !== request) return;
      const queued = request.queued;
      abilityCheckReminderLoadRef.current = null;
      if (queued && abilityCheckReminderMountedRef.current) {
        void abilityCheckReminderLoadFunctionRef.current?.(queued.userId, queued.canUseAbilityCheck);
      }
    });

    return request.promise;
  }, [cancelAbilityCheckReminderLoad]);

  async function loadLearningTasks(userId: string, options: { createdBy?: string | null } = {}) {
    setLearningTasksLoading(true);
    setLearningTasksError(null);

    try {
      let query = supabase
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

      if (options.createdBy) {
        query = query.eq("created_by", options.createdBy);
      }

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

  function logSbError(prefix: string, err: any) {
    console.error(prefix, err?.message, err?.details, err?.hint, err?.code, err);
  }

  async function fetchBooks(userIdToView: string, callerUserId: string) {
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
          page_count,
          kindle_location_count,
          audiobook_duration_minutes,
          edition_format,
          book_type
        )
      `)
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

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

    setLibraryBooksError(null);
    setRows(rowsWithTeachingBadges);
    // Show the books immediately; statistics and alerts can finish afterward.
    setLibraryBooksLoading(false);

    const userBookIds = rowsWithTeachingBadges
      .filter((r: any) => resolvePersonalTrackingStatus(r) !== "not_tracking")
      .map((r: any) => r.id);
    await loadReadingStatsForBooks(userBookIds, Object.fromEntries(rowsWithTeachingBadges.map(r => [r.id, { method: effectiveProgressMethod(r.progress_tracking_method, r.books ?? {}), totals: r.books ?? {} }])));
  }

  async function loadReadingStatsForBooks(
    userBookIds: string[],
    progressByBook: Record<string, {method: ProgressTrackingMethod | null; totals: ProgressTotals}>
  ) {
    if (userBookIds.length === 0) {
      setReadingStatsByUserBookId({});
      return;
    }

    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("id, created_at, user_book_id, tracking_unit, start_position, end_position, progress_total, start_page, end_page, read_on, session_mode")
      .in("user_book_id", userBookIds);

    if (error) {
      console.error("Error loading reading stats for library:", error);
      setReadingStatsByUserBookId({});
      return;
    }

    const grouped: Record<
      string,
      {
        furthestPage: number;
        lastEngagedAt: string | null;
      }
    > = {};

    for (const row of data ?? []) {
      const userBookId = row.user_book_id as string;
      const endPage = row.end_page == null ? NaN : Number((row as any).end_page);
      const readOn = (row as any).read_on as string | null;
      if (!grouped[userBookId]) {
        grouped[userBookId] = {
          furthestPage: 0,
          lastEngagedAt: null,
        };
      }

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

      const progressPercent = progressSummary((data ?? []).filter(s => s.user_book_id === userBookId), progressByBook[userBookId]?.method ?? null, progressByBook[userBookId]?.totals ?? {}).percent;

      stats[userBookId] = {
        progressPercent,
        furthestPage: g.furthestPage,
        lastEngagedAt: g.lastEngagedAt ?? null,
      };
    }

    setReadingStatsByUserBookId(stats);
  }

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
      const featureAccess = getFeatureAccess({
        role: superTeacherFlag ? "super_teacher" : role,
        isSuperTeacher: superTeacherFlag,
        hasFullAccess: appAccessStatus.hasFullAccess,
        isTrialActive: appAccessStatus.reason === "trial",
      });
      setCanUseAbilityCheckReminder(
        canUseFullAccessFeature(featureAccess, "ability_check")
      );
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
  }, [routeUsername]);

  useEffect(() => {
    if (!viewingUserId || !meId) {
      setLibraryBooksLoading(true);
      return;
    }

    let cancelled = false;

    setRows([]);
    setLibraryBooksError(null);
    setLibraryBooksLoading(true);

    fetchBooks(viewingUserId, meId).finally(() => {
      if (!cancelled) {
        setLibraryBooksLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [viewingUserId, meId, myRole, isSuperTeacher]);

  useEffect(() => {
    const canViewLearningTasks =
      viewingUserId === meId || (isTeacher && viewingUserId !== meId);

    if (!viewingUserId || !meId || !canViewLearningTasks) {
      setLearningTasks([]);
      setLearningTasksError(null);
      return;
    }

    loadLearningTasks(viewingUserId, {
      createdBy: isViewingStudentLibrary ? meId : null,
    });
  }, [viewingUserId, meId, isTeacher]);

  useEffect(() => {
    abilityCheckReminderLoadFunctionRef.current = loadAbilityCheckReminder;
    abilityCheckReminderMountedRef.current = true;

    return () => {
      abilityCheckReminderMountedRef.current = false;
      if (abilityCheckReminderForegroundTimerRef.current) {
        clearTimeout(abilityCheckReminderForegroundTimerRef.current);
        abilityCheckReminderForegroundTimerRef.current = null;
      }

      const activeRequest = abilityCheckReminderLoadRef.current;
      if (activeRequest) {
        activeRequest.queued = null;
        activeRequest.controller.abort();
      }
    };
  }, [loadAbilityCheckReminder]);

  useEffect(() => {
    const hiddenToday = abilityCheckReminderHiddenToday();

    setAbilityCheckReminderHidden(hiddenToday);
    if (canUseAbilityCheckReminder) {
      setAbilityCheckReminderHasUnlocked(abilityCheckReminderUnlocked());
    } else {
      setAbilityCheckReminderHasUnlocked(false);
      lockAbilityCheckReminder();
    }

    if (
      !viewingUserId ||
      !meId ||
      viewingUserId !== meId ||
      hiddenToday
    ) {
      cancelAbilityCheckReminderLoad();
      setAbilityCheckReminderCount(0);
      return;
    }

    if (libraryBooksLoading) {
      cancelAbilityCheckReminderLoad();
      return;
    }

    void loadAbilityCheckReminder(viewingUserId, canUseAbilityCheckReminder);
  }, [viewingUserId, meId, abilityCheckReminderDayKey, canUseAbilityCheckReminder, libraryBooksLoading, loadAbilityCheckReminder, cancelAbilityCheckReminderLoad]);

  useEffect(() => {
    function refreshAbilityCheckReminderDay(refreshCount = false) {
      const todayKey = getTodayKey();
      const hiddenToday = abilityCheckReminderHiddenToday();

      setAbilityCheckReminderDayKey((previous) =>
        previous === todayKey ? previous : todayKey
      );

      setAbilityCheckReminderHidden(hiddenToday);
      if (canUseAbilityCheckReminder) {
        setAbilityCheckReminderHasUnlocked(abilityCheckReminderUnlocked());
      } else {
        setAbilityCheckReminderHasUnlocked(false);
        lockAbilityCheckReminder();
      }

      if (hiddenToday) {
        cancelAbilityCheckReminderLoad();
        setAbilityCheckReminderCount(0);
        return;
      }

      if (
        refreshCount &&
        todayKey === abilityCheckReminderDayKey &&
        !libraryBooksLoading &&
        viewingUserId &&
        meId &&
        viewingUserId === meId
      ) {
        void loadAbilityCheckReminder(viewingUserId, canUseAbilityCheckReminder);
      }
    }

    refreshAbilityCheckReminderDay();

    function flushForegroundRefresh() {
      abilityCheckReminderForegroundTimerRef.current = null;
      refreshAbilityCheckReminderDay(true);
    }

    function queueForegroundRefresh() {
      if (abilityCheckReminderForegroundTimerRef.current) {
        clearTimeout(abilityCheckReminderForegroundTimerRef.current);
      }
      abilityCheckReminderForegroundTimerRef.current = setTimeout(flushForegroundRefresh, 150);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") queueForegroundRefresh();
    }

    window.addEventListener("focus", queueForegroundRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", queueForegroundRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (abilityCheckReminderForegroundTimerRef.current) {
        clearTimeout(abilityCheckReminderForegroundTimerRef.current);
        abilityCheckReminderForegroundTimerRef.current = null;
      }
    };
  }, [viewingUserId, meId, canUseAbilityCheckReminder, abilityCheckReminderDayKey, libraryBooksLoading, loadAbilityCheckReminder, cancelAbilityCheckReminderLoad]);

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

  const showAbilityCheckReminder =
    viewingUserId === meId &&
    !trialBanner &&
    abilityCheckReminderEnabled &&
    canUseAbilityCheckReminder &&
    abilityCheckReminderHasUnlocked &&
    !abilityCheckReminderLoading &&
    !abilityCheckReminderHidden;
  const showLearningTasks =
    (viewingUserId === meId || isViewingStudentLibrary) &&
    !learningTasksLoading &&
    learningTasks.length > 0;
  const showLearningTasksError =
    (viewingUserId === meId || isViewingStudentLibrary) &&
    !learningTasksLoading &&
    !!learningTasksError;
  const showLibraryBooksLoading = libraryBooksLoading;
  const showLibraryBooksError = !libraryBooksLoading && !!libraryBooksError;
  const showLibraryBookSections = !libraryBooksLoading && !libraryBooksError;
  const showLibraryEmptyState = showLibraryBookSections && !hasLibraryBooks;
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
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-screen-xl">
        <LibraryHeader
          libraryOwnerLabel={libraryOwnerLabel}
          libraryContextLabel={libraryContextLabel}
        >
          <UserBar isTeacher={isTeacher} displayName={meDisplayName} variant="logoutOnly" />
        </LibraryHeader>

        <MobileVersionNotice />

        {trialBanner ? (
          <section aria-label="Trial access" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p>
                <span className="font-medium text-emerald-900">
                  {trialBanner.daysRemaining == null
                    ? "Your trial has less than 1 day left"
                    : `Your trial has ${trialBanner.daysRemaining} ${trialBanner.daysRemaining === 1 ? "day" : "days"} left`}
                </span>
                <span className="ml-2 text-xs">Ends {trialBanner.formattedDate}.</span>
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer rounded text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                  After your trial
                </summary>
                <div className="mt-2 max-w-md leading-5">
                  <p>Continue Japanese Learning for ¥500/month, including vocabulary, flashcards, Follow-Along, and reading tracking.</p>
                  <p className="mt-1">After you join on Ko-fi, your MEKURU access will be updated manually.</p>
                  <button type="button" onClick={() => router.push("/reading-access")} className="mt-2 font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-950">Explore Japanese Learning</button>
                </div>
              </details>
            </div>
          </section>
        ) : null}

        {showAbilityCheckReminder && (hasFullLearningAccess || isTeacher) ? (
          <AbilityCheckReminderBanner
            abilityCheckReminderCount={abilityCheckReminderCount}
            minDueCards={ABILITY_CHECK_REMINDER_MIN_DUE_CARDS}
            onStart={() => router.push("/library-study/check?start=1")}
            onHide={() => {
              hideAbilityCheckReminderForToday();
              setAbilityCheckReminderHidden(true);
            }}
          />
        ) : null}

        {showLearningTasks ? (
          <LearningTasksPanel
            title={
              isViewingStudentLibrary
                ? `${viewingLabel}’s learning tasks`
                : "Learning tasks from your teacher"
            }
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

        <LibraryGuidePanel
          hasFullAccess={hasFullLearningAccess || isTeacher}
          onNavigate={(path) => {
            if (path === "/books/add") {
              router.push(addBookHref);
              return;
            }

            router.push(path);
          }}
        />

        <UserBar isTeacher={isTeacher} displayName={meDisplayName} variant="labelOnly" />

        {null}

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

        <p className="mb-6 text-sm text-gray-600">
          All reading/study tools live inside each book. Click a cover to open its Book Hub.
        </p>

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
        {isTeacher ? (
          <>
            <FloatingAddBookButton onClick={() => router.push(addBookHref)} />
          </>
        ) : (
          <>
            {isViewingOwnLibrary ? (
              <button
                type="button"
                onClick={() => router.push(addBookHref)}
                className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg"
              >
                + Add a Book
              </button>
            ) : null}
          </>
        )}
      </div>
    </main >
  );
}
