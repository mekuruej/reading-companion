// Library
//
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getLessonAlertInfo } from "@/lib/lessonAlerts";
import {
  computeLibraryStudyColorStatus,
  getLibraryStudyEncounterStageCounts,
} from "@/lib/libraryStudyColor";
import {
  emptyLibraryStudyColorTotals,
  emptyLibraryStudyLimboTotals,
  fetchLibraryStudyColorBreakdown,
  type LibraryStudyColorTotals,
  type LibraryStudyLimboTotals,
} from "@/lib/libraryStudyTotals";
import LibraryGuidePanel from "./components/LibraryGuidePanel";
import LibraryHeader from "./components/LibraryHeader";
import LibraryViewControls from "./components/LibraryViewControls";
import LibraryBookCard from "./components/LibraryBookCard";
import LibraryBookRow from "./components/LibraryBookRow";
import LibrarySection from "./components/LibrarySection";
import LibraryEmptyState from "./components/LibraryEmptyState";

type Book = {
  id: string;
  title: string;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher: string | null;
  isbn13: string | null;
  cover_url: string | null;
  page_count: number | null;
  book_type: string | null;
};

type UserBookRow = {
  id: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  notify_banner: boolean;
  has_new_vocab: boolean;
  has_new_reading: boolean;
  books: Book | null;
  format_type: string | null;
  progress_mode: string | null;
  show_page_numbers: boolean | null;
  rating_overall?: number | null;
  rating_difficulty?: number | null;
  is_teacher_prep?: boolean | null;
  teacher_prep_kind?: string | null;
  prepared_by?: string | null;
  source_user_book_id?: string | null;
  assigned_from_prep_at?: string | null;
};

type ProfileRole = "teacher" | "super_teacher" | "member" | "student";

type StudentOption = {
  id: string;
  display_name: string;
  username?: string | null;
  level?: string | null;
  role?: ProfileRole | null;
};

type AlertBoxState = {
  title: string;
  message: string;
  alertKey: string;
  kind: "teacher_prepare" | "student_new_readings" | "student_last_chance";
  showBadge: boolean;
  badgeText: string | null;
} | null;

type TeacherPrepItem = {
  studentId: string;
  studentName: string;
  studentUsername: string | null;
  message: string;
  alertKey: string;
};

type KanjiEnrichmentAlertItem = {
  userBookId: string;
  title: string;
  count: number;
  studentName: string | null;
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
  averageMinutesPerPage: number | null;
  furthestPage: number | null;
  wordsLookedUp: number | null;
  lastEngagedAt: string | null; // ✅ NEW
};

type MonthlyLibraryStats = {
  pagesRead: number;
  daysRead: number;
  totalTimeMinutes: number;
  totalWordsLookedUp: number;
  currentRunDays: number;
  longestRunDays: number;
};

type MonthOption = {
  value: string; // YYYY-MM or "year-YYYY"
  label: string;
};

type UserBarVariant = "full" | "logoutOnly" | "labelOnly";
type LibrarySnapshotView = "monthly" | "colors";
type MekuruColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "grey";
type LibrarySortMode =
  | "status"
  | "title"
  | "last_engaged"
  | "last_read"
  | "rating_high"
  | "rating_low"
  | "difficulty_high"
  | "difficulty_low"
  | "pace_fast"
  | "pace_slow";

function isListeningFormat(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "listening" || normalized === "audiobook" || normalized.includes("audio");
}

type AbilityCheckReminderSettings = {
  red_stages?: number | null;
  orange_stages?: number | null;
  yellow_stages?: number | null;
  skip_katakana_library_check?: boolean | null;
  show_ability_check_reminder?: boolean | null;
};

type AbilityCheckSummaryRow = {
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  total_encounter_count: number | null;
  check_ready_encounter_count: number | null;
  sample_user_book_word_id: string | null;
};

type AbilityCheckProgressRow = {
  study_identity_key: string;
  reading_gate_status: "not_started" | "passed" | "failed" | null;
  meaning_gate_status: "not_started" | "passed" | "failed" | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  mastered: boolean | null;
  mastered_at: string | null;
  reading_gate_failed_at: string | null;
  meaning_gate_failed_at: string | null;
  last_studied_at: string | null;
};

const MEKURU_ENCOUNTER_COLORS: MekuruColor[] = ["red", "orange", "yellow"];
const MEKURU_ABILITY_COLORS: MekuruColor[] = ["green", "blue", "purple"];
const ABILITY_CHECK_SEEN_STORAGE_KEY = "library-study-seen-by-date";
const ABILITY_CHECK_COMPLETED_KEY = "ability-check-completed-date";
const ABILITY_CHECK_REMINDER_HIDE_KEY = "ability-check-reminder-hidden-date";
const SUPER_TEACHER_KANJI_REMINDER_HIDE_KEY =
  "super-teacher-kanji-enrichment-reminder-hidden-date";
const PENDING_BOOK_REQUESTS_ALERT_HIDE_KEY =
  "pending-book-requests-alert-hidden-signature";
const ABILITY_CHECK_REMINDER_MIN_DUE_CARDS = 10;
const REGULAR_GATE_RECHECK_MIN_DAYS = 3;
const REGULAR_GATE_RECHECK_WINDOW_DAYS = 5;
const MISSED_GATE_RECHECK_MIN_DAYS = 7;
const MISSED_GATE_RECHECK_WINDOW_DAYS = 8;
const PRE_READING_SOFT_WAIT_RECHECK_DAYS = 30;
const PRE_READING_WAIT_RECHECK_DAYS = 90;

function ymdInTimeZone(value: string | Date, timeZone: string) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return null;

  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return ymdInTimeZone(new Date(), "Asia/Tokyo") ?? new Date().toISOString().slice(0, 10);
}

function loadAbilityCheckSeenForToday() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(ABILITY_CHECK_SEEN_STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return new Set(parsed[getTodayKey()] ?? []);
  } catch {
    return new Set<string>();
  }
}

function abilityCheckReminderHiddenToday() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ABILITY_CHECK_REMINDER_HIDE_KEY) === getTodayKey();
}

function abilityCheckCompletedToday() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ABILITY_CHECK_COMPLETED_KEY) === getTodayKey();
}

function hideAbilityCheckReminderForToday() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ABILITY_CHECK_REMINDER_HIDE_KEY, getTodayKey());
}

function superTeacherKanjiReminderHiddenToday() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SUPER_TEACHER_KANJI_REMINDER_HIDE_KEY) === getTodayKey();
}

function hideSuperTeacherKanjiReminderForToday() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUPER_TEACHER_KANJI_REMINDER_HIDE_KEY, getTodayKey());
}

function pendingBookRequestsSignature(requests: Array<{ id?: string | null }>) {
  return requests
    .map((request) => request.id)
    .filter(Boolean)
    .sort()
    .join("|");
}

function pendingBookRequestsAlertHidden(signature: string) {
  if (typeof window === "undefined" || !signature) return false;
  return window.localStorage.getItem(PENDING_BOOK_REQUESTS_ALERT_HIDE_KEY) === signature;
}

function hidePendingBookRequestsAlert(signature: string) {
  if (typeof window === "undefined" || !signature) return;
  window.localStorage.setItem(PENDING_BOOK_REQUESTS_ALERT_HIDE_KEY, signature);
}

function isKatakanaOnly(value: string | null | undefined) {
  const text = (value ?? "").trim();
  return text.length > 0 && /^[ァ-ヶー・･]+$/.test(text);
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function daysSinceIso(value: string | null | undefined, now = new Date()) {
  if (!value) return Number.POSITIVE_INFINITY;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}

function appDayNumber(now = new Date()) {
  const today = ymdInTimeZone(now, "Asia/Tokyo") ?? new Date().toISOString().slice(0, 10);
  const [year, month, day] = today.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function regularGateRecheckDays(studyIdentityKey: string) {
  return (
    REGULAR_GATE_RECHECK_MIN_DAYS +
    (hashString(`${studyIdentityKey}::regular-gate`) % REGULAR_GATE_RECHECK_WINDOW_DAYS)
  );
}

function isInitialGateSlotDue(studyIdentityKey: string, now = new Date()) {
  const recheckDays = regularGateRecheckDays(studyIdentityKey);
  const releaseOffset =
    hashString(`${studyIdentityKey}::initial-gate-slot`) % recheckDays;

  return appDayNumber(now) % recheckDays === releaseOffset;
}

function isReadyForReadingGateProgress(progress: AbilityCheckProgressRow | null | undefined) {
  return Boolean(
    progress &&
    progress.reading_gate_status === "not_started" &&
    progress.meaning_gate_status === "not_started" &&
    !progress.held_before_reading_gate &&
    !progress.held_before_meaning_gate &&
    !progress.mastered
  );
}

function isAbilityCheckCardInDailyPool(
  summary: AbilityCheckSummaryRow,
  progress: AbilityCheckProgressRow | null,
  settings: Required<AbilityCheckReminderSettings>,
  seenTodayIds: Set<string>,
  now = new Date()
) {
  const surface = (summary.surface ?? "").trim();
  const reading = (summary.reading ?? "").trim();
  const meaning = (summary.meaning ?? "").trim();
  const sampleId = summary.sample_user_book_word_id ?? "";

  if (!surface || !reading || !meaning || !sampleId) return false;
  if (seenTodayIds.has(sampleId)) return false;
  if (settings.skip_katakana_library_check && isKatakanaOnly(surface)) return false;

  const colorStatus = computeLibraryStudyColorStatus({
    encounterCount: summary.total_encounter_count ?? 0,
    settings,
    readingGate: progress?.reading_gate_status ?? "not_started",
    meaningGate: progress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
    readyForReadingGate: isReadyForReadingGateProgress(progress),
    mastered: progress?.mastered ?? false,
  });

  const included =
    colorStatus.eligibleForLibraryStudy ||
    colorStatus.nextGate === "reading" ||
    colorStatus.nextGate === "meaning";

  if (!included) return false;

  if (
    colorStatus.color === "red" &&
    progress?.held_before_reading_gate &&
    progress?.held_before_meaning_gate
  ) {
    return daysSinceIso(progress?.last_studied_at, now) >= PRE_READING_WAIT_RECHECK_DAYS;
  }

  if (colorStatus.color === "grey") {
    if (colorStatus.greyReason === "pre_reading_support") {
      const waitDays = progress?.held_before_meaning_gate
        ? PRE_READING_WAIT_RECHECK_DAYS
        : PRE_READING_SOFT_WAIT_RECHECK_DAYS;
      return daysSinceIso(progress?.last_studied_at, now) >= waitDays;
    }

    const recheckDays =
      MISSED_GATE_RECHECK_MIN_DAYS +
      (hashString(`${summary.study_identity_key}::missed-gate`) %
        MISSED_GATE_RECHECK_WINDOW_DAYS);

    if (colorStatus.greyReason === "reading_gate_support") {
      return daysSinceIso(progress?.reading_gate_failed_at, now) >= recheckDays;
    }

    if (colorStatus.greyReason === "meaning_gate_support") {
      return daysSinceIso(progress?.meaning_gate_failed_at, now) >= recheckDays;
    }

    return true;
  }

  if (!progress?.last_studied_at) {
    return isInitialGateSlotDue(summary.study_identity_key, now);
  }

  return (
    daysSinceIso(progress.last_studied_at, now) >=
    regularGateRecheckDays(summary.study_identity_key)
  );
}

function ymdToDayNumber(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function getMonthOptions(count = 12): MonthOption[] {
  const opts: MonthOption[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long" });
    opts.push({ value, label });
  }

  return opts;
}

function getMonthRange(monthValue: string) {
  if (monthValue.startsWith("year-")) {
    const year = Number(monthValue.replace("year-", ""));
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const startStr = `${start.getFullYear()}-01-01`;
    const endStr = `${end.getFullYear()}-01-01`;

    return { startStr, endStr };
  }

  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-01`;

  return { startStr, endStr };
}

function formatMinutesAsReadableTime(totalMinutes: number) {
  if (!totalMinutes || totalMinutes <= 0) return "—";

  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatRelativeDate(dateStr: string) {
  const dateKey =
    /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : ymdInTimeZone(dateStr, "Asia/Tokyo");
  const todayKey = ymdInTimeZone(new Date(), "Asia/Tokyo");

  if (!dateKey || !todayKey) return dateStr;

  const diffDays = ymdToDayNumber(todayKey) - ymdToDayNumber(dateKey);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return dateKey;
}

function UserBar({
  isTeacher,
  variant = "full",
}: {
  isTeacher: boolean;
  variant?: UserBarVariant;
}) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loading = false;

    const loadUser = async () => {
      if (loading) return;
      loading = true;

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userErr || !user) {
          setLabel(null);
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (profErr) {
          console.warn("UserBar: could not load profile display_name:", profErr);
        }

        setLabel(prof?.display_name || "User");
      } catch (err) {
        if (!cancelled) {
          console.error("UserBar loadUser error:", err);
          setLabel(null);
        }
      } finally {
        loading = false;
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  if (!label && variant !== "logoutOnly") return null;

  if (variant === "logoutOnly") {
    return (
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    );
  }

  if (variant === "labelOnly") {
    if (!isTeacher) return null;
    return (
      <div className="mb-4 text-sm text-gray-700">
        <span>Logged in as: {label}</span>
      </div>
    );
  }

  return isTeacher ? (
    <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
      <span>Logged in as: {label}</span>
      <button
        onClick={handleLogout}
        className="rounded-md border px-2 py-1 hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  ) : (
    <div className="mr-3 flex justify-end sm:mr-6">
      <button
        onClick={handleLogout}
        className="rounded-md border px-2 py-1 hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  );
}

function normalizeBookPart(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeIsbn(isbn: string | null | undefined) {
  return (isbn ?? "").replace(/[^0-9X]/gi, "");
}

function makeBookKey(title: string, author?: string | null) {
  return [normalizeBookPart(title), normalizeBookPart(author)].join("|");
}

function mekuruColorLabel(color: MekuruColor) {
  if (color === "grey") return "Limbo";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function mekuruColorDotClass(color: MekuruColor) {
  if (color === "red") return "bg-red-500";
  if (color === "orange") return "bg-orange-500";
  if (color === "yellow") return "bg-yellow-300";
  if (color === "green") return "bg-emerald-500";
  if (color === "blue") return "bg-sky-500";
  if (color === "purple") return "bg-violet-500";
  return "bg-slate-500";
}

function MekuruColorRowLabel({ label }: { label: string }) {
  return (
    <div className="mb-1.5">
      <div className="h-px w-full bg-slate-400/70" />
      <div className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </div>
    </div>
  );
}

function MekuruColorDelta({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-xs font-semibold text-slate-400">0</span>;
  }

  const isUp = value > 0;

  return (
    <span className={`text-xs font-semibold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
      {isUp ? "↑" : "↓"} {Math.abs(value)}
    </span>
  );
}

function dateFromYmd(value: string) {
  return new Date(`${value}T00:00:00`);
}

export default function BooksPage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const routeUsername = params?.username ?? null;

  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [readingStatsByUserBookId, setReadingStatsByUserBookId] = useState<
    Record<string, ReadingSessionStats>
  >({});

  const [alertBox, setAlertBox] = useState<AlertBoxState>(null);
  const [teacherPrepAlerts, setTeacherPrepAlerts] = useState<TeacherPrepItem[]>([]);
  const [kanjiEnrichmentAlerts, setKanjiEnrichmentAlerts] = useState<KanjiEnrichmentAlertItem[]>([]);
  const [learningTasks, setLearningTasks] = useState<LearningTaskRow[]>([]);
  const [learningTasksLoading, setLearningTasksLoading] = useState(false);
  const [learningTasksError, setLearningTasksError] = useState<string | null>(null);
  const [completingLearningTaskId, setCompletingLearningTaskId] = useState<string | null>(null);

  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");

  const [meId, setMeId] = useState<string>("");
  const [myUsername, setMyUsername] = useState<string>("");
  const [myRole, setMyRole] = useState<ProfileRole>("member");
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string>("");
  const [myTimeZone, setMyTimeZone] = useState("Asia/Tokyo");

  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [newBookIsbn, setNewBookIsbn] = useState("");
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);

  const [bookRequests, setBookRequests] = useState<any[]>([]);
  const [dismissedPendingBookRequestsSignature, setDismissedPendingBookRequestsSignature] =
    useState("");
  const [requestBookTitle, setRequestBookTitle] = useState("");
  const [requestBookAuthor, setRequestBookAuthor] = useState("");
  const [requestBookIsbn, setRequestBookIsbn] = useState("");
  const [isSavingRequest, setIsSavingRequest] = useState(false);
  const [showRequestBook, setShowRequestBook] = useState(false);

  const [bookTypeFilter, setBookTypeFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const isTeacher = myRole === "teacher" || myRole === "super_teacher" || isSuperTeacher;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesBookType =
        bookTypeFilter === "all" || row.books?.book_type === bookTypeFilter;

      const matchesFormat =
        formatFilter === "all" || row.format_type === formatFilter;

      return matchesBookType && matchesFormat;
    });
  }, [rows, bookTypeFilter, formatFilter]);

  const pendingBookRequestsAlertSignature = useMemo(
    () => pendingBookRequestsSignature(bookRequests),
    [bookRequests]
  );
  const showPendingBookRequestsAlert =
    bookRequests.length > 0 &&
    dismissedPendingBookRequestsSignature !== pendingBookRequestsAlertSignature &&
    !pendingBookRequestsAlertHidden(pendingBookRequestsAlertSignature);

  const allValidRows = filteredRows.filter((r) => !!r.books);
  const validRows = allValidRows.filter((r) => !r.is_teacher_prep);

  const [viewMode, setViewMode] = useState<"cover" | "list">("cover");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("status");

  const [librarySnapshotView, setLibrarySnapshotView] =
    useState<LibrarySnapshotView>("monthly");
  const monthOptions = getMonthOptions(12);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    monthOptions[0]?.value ?? ""
  );

  const [monthlyStats, setMonthlyStats] = useState<MonthlyLibraryStats>({
    pagesRead: 0,
    daysRead: 0,
    totalTimeMinutes: 0,
    totalWordsLookedUp: 0,
    currentRunDays: 0,
    longestRunDays: 0,
  });

  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(false);
  const [mekuruColorTotals, setMekuruColorTotals] =
    useState<LibraryStudyColorTotals>(emptyLibraryStudyColorTotals());
  const [mekuruLimboTotals, setMekuruLimboTotals] =
    useState<LibraryStudyLimboTotals>(emptyLibraryStudyLimboTotals());
  const [mekuruColorMovementTotals, setMekuruColorMovementTotals] =
    useState<LibraryStudyColorTotals>(emptyLibraryStudyColorTotals());
  const [previousMekuruColorMovementTotals, setPreviousMekuruColorMovementTotals] =
    useState<LibraryStudyColorTotals>(emptyLibraryStudyColorTotals());
  const [mekuruLimboMovementTotals, setMekuruLimboMovementTotals] =
    useState<LibraryStudyLimboTotals>(emptyLibraryStudyLimboTotals());
  const [previousMekuruLimboMovementTotals, setPreviousMekuruLimboMovementTotals] =
    useState<LibraryStudyLimboTotals>(emptyLibraryStudyLimboTotals());
  const [mekuruColorCountsLoading, setMekuruColorCountsLoading] = useState(false);
  const [abilityCheckReminderEnabled, setAbilityCheckReminderEnabled] = useState(true);
  const [abilityCheckReminderCount, setAbilityCheckReminderCount] = useState(0);
  const [abilityCheckReminderLoading, setAbilityCheckReminderLoading] = useState(false);
  const [abilityCheckReminderHidden, setAbilityCheckReminderHidden] = useState(false);
  const [abilityCheckReminderCompleted, setAbilityCheckReminderCompleted] = useState(false);
  const [abilityCheckReminderDayKey, setAbilityCheckReminderDayKey] = useState(getTodayKey());
  const [superTeacherKanjiReminderHidden, setSuperTeacherKanjiReminderHidden] =
    useState(false);

  const viewingLabel =
    viewingUserId && viewingUserId === meId
      ? "Me"
      : students.find((s) => s.id === viewingUserId)?.display_name || "Member";

  const isViewingStudentLibrary =
    isTeacher && !!viewingUserId && !!meId && viewingUserId !== meId;

  const isViewingOwnLibrary =
    !!viewingUserId && !!meId && viewingUserId === meId;

  const libraryOwnerLabel = isViewingStudentLibrary ? `${viewingLabel}’s` : "My";

  const libraryContextLabel = isViewingStudentLibrary
    ? `Student Library · ${viewingLabel}`
    : null;

  async function loadMonthlyLibraryStats(
    userId: string,
    monthValue: string,
    timeZone = "Asia/Tokyo"
  ) {
    setMonthlyStatsLoading(true);

    try {
      const { startStr, endStr } = getMonthRange(monthValue);

      const { data: allUserBooksRows, error: userBooksErr } = await supabase
        .from("user_books")
        .select(`
        id,
        finished_at,
        dnf_at,
        books:book_id (
          title,
          book_type
        )
      `)
        .eq("user_id", userId);

      if (userBooksErr) {
        console.error("Error loading user_books for monthly stats:", userBooksErr);
        setMonthlyStats({
          pagesRead: 0,
          daysRead: 0,
          totalTimeMinutes: 0,
          totalWordsLookedUp: 0,
          currentRunDays: 0,
          longestRunDays: 0,
        });
        return;
      }

      const userBookIds = (allUserBooksRows ?? []).map((r: any) => r.id).filter(Boolean);

      if (userBookIds.length === 0) {
        setMonthlyStats({
          pagesRead: 0,
          daysRead: 0,
          totalTimeMinutes: 0,
          totalWordsLookedUp: 0,
          currentRunDays: 0,
          longestRunDays: 0,
        });
        return;
      }

      const [
        { data: sessionRows, error: sessionErr },
        { data: wordRows, error: wordErr },
      ] = await Promise.all([
        supabase
          .from("user_book_reading_sessions")
          .select("user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler")
          .in("user_book_id", userBookIds)
          .gte("read_on", startStr)
          .lt("read_on", endStr),

        supabase
          .from("user_book_words")
          .select("user_book_id, created_at, surface, meaning")
          .in("user_book_id", userBookIds)
          .gte("created_at", `${startStr}T00:00:00`)
          .lt("created_at", `${endStr}T00:00:00`),
      ]);

      if (sessionErr) {
        console.error("Error loading reading sessions for monthly stats:", sessionErr);
      }

      if (wordErr) {
        console.error("Error loading words for monthly stats:", wordErr);
      }

      const sessions = ((sessionRows ?? []) as any[]).filter((s) => !s.is_filler);
      const words = wordRows ?? [];

      const uniqueWordSet = new Set<string>();
      const engagedDays = new Set<string>();

      for (const w of words as any[]) {
        const surface = (w.surface ?? "").trim();
        const meaning = (w.meaning ?? "").trim();
        if (!surface && !meaning) continue;

        uniqueWordSet.add(`${surface}|||${meaning}`);
        const createdAt = (w.created_at as string | null) ?? "";
        if (createdAt) {
          const localCreatedDay = ymdInTimeZone(createdAt, timeZone);
          if (localCreatedDay) {
            engagedDays.add(localCreatedDay);
          }
        }
      }

      const totalWordsLookedUp = uniqueWordSet.size;

      let pagesRead = 0;
      let totalTimeMinutes = 0;

      for (const s of sessions as any[]) {
        if (s.read_on) engagedDays.add(s.read_on);

        const startPage = Number(s.start_page);
        const endPage = Number(s.end_page);
        const minutes = s.minutes_read == null ? null : Number(s.minutes_read);

        if (minutes != null && Number.isFinite(minutes) && minutes > 0) {
          totalTimeMinutes += minutes;
        }

        if (Number.isFinite(startPage) && Number.isFinite(endPage) && endPage >= startPage) {
          pagesRead += endPage - startPage + 1;
        }
      }

      const sortedEngagedDays = Array.from(engagedDays).sort((a, b) =>
        a.localeCompare(b)
      );

      let longestRunDays = 0;
      let runBeingCounted = 0;
      let previousDayValue: number | null = null;

      for (const day of sortedEngagedDays) {
        const dayValue = ymdToDayNumber(day);

        if (previousDayValue != null && dayValue === previousDayValue + 1) {
          runBeingCounted += 1;
        } else {
          runBeingCounted = 1;
        }

        if (runBeingCounted > longestRunDays) {
          longestRunDays = runBeingCounted;
        }

        previousDayValue = dayValue;
      }

      let currentRunDays = 0;
      const todayInTimeZone = ymdInTimeZone(new Date(), timeZone);

      if (todayInTimeZone) {
        let cursor = ymdToDayNumber(todayInTimeZone);

        while (engagedDays.has(new Date(cursor * 86400000).toISOString().slice(0, 10))) {
          currentRunDays += 1;
          cursor -= 1;
        }
      }

      setMonthlyStats({
        pagesRead,
        daysRead: engagedDays.size,
        totalTimeMinutes,
        totalWordsLookedUp,
        currentRunDays,
        longestRunDays,
      });
    } finally {
      setMonthlyStatsLoading(false);
    }
  }

  async function loadMekuruColorCounts(userId: string) {
    setMekuruColorCountsLoading(true);

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonth = `${previousMonthDate.getFullYear()}-${String(
        previousMonthDate.getMonth() + 1
      ).padStart(2, "0")}`;

      const currentRange = getMonthRange(currentMonth);
      const previousRange = getMonthRange(previousMonth);

      const [breakdown, currentMovement, previousMovement] = await Promise.all([
        fetchLibraryStudyColorBreakdown(userId),
        fetchLibraryStudyColorBreakdown(userId, null, {
          since: dateFromYmd(currentRange.startStr),
          before: dateFromYmd(currentRange.endStr),
        }),
        fetchLibraryStudyColorBreakdown(userId, null, {
          since: dateFromYmd(previousRange.startStr),
          before: dateFromYmd(previousRange.endStr),
        }),
      ]);

      setMekuruColorTotals(breakdown.colorTotals);
      setMekuruLimboTotals(breakdown.limboTotals);
      setMekuruColorMovementTotals(currentMovement.colorTotals);
      setPreviousMekuruColorMovementTotals(previousMovement.colorTotals);
      setMekuruLimboMovementTotals(currentMovement.limboTotals);
      setPreviousMekuruLimboMovementTotals(previousMovement.limboTotals);
    } catch (error) {
      console.error("Error loading Mekuru color counts:", error);
      setMekuruColorTotals(emptyLibraryStudyColorTotals());
      setMekuruLimboTotals(emptyLibraryStudyLimboTotals());
      setMekuruColorMovementTotals(emptyLibraryStudyColorTotals());
      setPreviousMekuruColorMovementTotals(emptyLibraryStudyColorTotals());
      setMekuruLimboMovementTotals(emptyLibraryStudyLimboTotals());
      setPreviousMekuruLimboMovementTotals(emptyLibraryStudyLimboTotals());
    } finally {
      setMekuruColorCountsLoading(false);
    }
  }

  async function loadAbilityCheckReminder(userId: string) {
    setAbilityCheckReminderLoading(true);

    try {
      let settings: AbilityCheckReminderSettings | null = null;
      const { data: settingsWithReminder, error: settingsError } = await supabase
        .from("user_learning_settings")
        .select(
          "red_stages, orange_stages, yellow_stages, skip_katakana_library_check, show_ability_check_reminder"
        )
        .eq("user_id", userId)
        .maybeSingle<AbilityCheckReminderSettings>();

      if (settingsError) {
        const { data: fallbackSettings, error: fallbackError } = await supabase
          .from("user_learning_settings")
          .select("red_stages, orange_stages, yellow_stages, skip_katakana_library_check")
          .eq("user_id", userId)
          .maybeSingle<AbilityCheckReminderSettings>();

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

      const completedToday = abilityCheckCompletedToday();
      setAbilityCheckReminderCompleted(completedToday);

      if (!resolvedSettings.show_ability_check_reminder || completedToday) {
        setAbilityCheckReminderCount(0);
        return;
      }

      const encounterThreshold = getLibraryStudyEncounterStageCounts(resolvedSettings).total;

      const { data: summaryRows, error: summaryError } = await supabase
        .from("user_library_word_summaries")
        .select(
          "study_identity_key, surface, reading, meaning, total_encounter_count, check_ready_encounter_count, sample_user_book_word_id"
        )
        .eq("user_id", userId)
        .gt("check_ready_encounter_count", 0)
        .gte("total_encounter_count", encounterThreshold)
        .order("total_encounter_count", { ascending: false })
        .limit(500)
        .returns<AbilityCheckSummaryRow[]>();

      if (summaryError) throw summaryError;

      const summaries = summaryRows ?? [];
      if (summaries.length === 0) {
        setAbilityCheckReminderCount(0);
        return;
      }

      const keys = summaries.map((row) => row.study_identity_key).filter(Boolean);
      const progressByKey = new Map<string, AbilityCheckProgressRow>();

      for (let i = 0; i < keys.length; i += 75) {
        const chunk = keys.slice(i, i + 75);
        const { data: progressRows, error: progressError } = await supabase
          .from("user_library_word_progress")
          .select(
            "study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, mastered, mastered_at, reading_gate_failed_at, meaning_gate_failed_at, last_studied_at"
          )
          .eq("user_id", userId)
          .in("study_identity_key", chunk)
          .returns<AbilityCheckProgressRow[]>();

        if (progressError) throw progressError;

        for (const row of progressRows ?? []) {
          progressByKey.set(row.study_identity_key, row);
        }
      }

      const seenTodayIds = loadAbilityCheckSeenForToday();
      const availableCount = summaries.filter((summary) =>
        isAbilityCheckCardInDailyPool(
          summary,
          progressByKey.get(summary.study_identity_key) ?? null,
          resolvedSettings,
          seenTodayIds
        )
      ).length;

      setAbilityCheckReminderCount(availableCount);
    } catch (error) {
      console.error("Error loading Ability Check reminder:", error);
      setAbilityCheckReminderCount(0);
    } finally {
      setAbilityCheckReminderLoading(false);
    }
  }

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

  async function fetchBooks(userIdToView: string) {
    setMessage("");
    setMessageType("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please sign in to see books.");
      setMessageType("error");
      setRows([]);
      return;
    }

    const targetUserId = isTeacher ? userIdToView : user.id;

    const { data, error } = await supabase
      .from("user_books")
      .select(`
        id,
        user_id,
        started_at,
        finished_at,
        dnf_at,
        format_type,
        progress_mode,
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
          author,
          cover_url,
          page_count,
          book_type
        )
      `)
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      logSbError("Error fetching user_books:", error);
      setMessage("Error loading books. (If viewing a student: confirm link + RLS policies.)");
      setMessageType("error");
      setRows([]);
      return;
    }

    const loadedRows = (data as any) || [];
    setRows(loadedRows);

    const userBookIds = loadedRows.map((r: any) => r.id);
    const pageCountByUserBookId: Record<string, number | null> = {};
    const formatTypeByUserBookId: Record<string, string | null> = {};

    for (const r of loadedRows) {
      pageCountByUserBookId[r.id] = r.books?.page_count ?? null;
      formatTypeByUserBookId[r.id] = r.format_type ?? null;
    }

    await loadReadingStatsForBooks(userBookIds, pageCountByUserBookId, formatTypeByUserBookId);

    if (isTeacher && targetUserId === meId) {
      const studentAlertUserIds = isSuperTeacher
        ? students.filter((s) => s.id).map((s) => s.id)
        : students
          .filter((s) => s.id && (s.role === "member" || s.role === "student"))
          .map((s) => s.id);

      const alertUserIds = Array.from(
        new Set([meId, ...studentAlertUserIds].filter(Boolean))
      ) as string[];

      await loadKanjiEnrichmentAlerts(alertUserIds);
    } else {
      setKanjiEnrichmentAlerts([]);
    }
  }

  async function handleAddBook(options: { asTrialPrep?: boolean } = {}) {
    const asTrialPrep = options.asTrialPrep === true;

    if (!isTeacher) {
      alert("Only teachers can add books right now.");
      return;
    }

    if (!meId) {
      alert("You need to be signed in to add a book.");
      return;
    }

    const cleanTitle = newBookTitle.trim();
    const cleanAuthor = newBookAuthor.trim();
    const cleanIsbn = normalizeIsbn(newBookIsbn);

    if (!cleanTitle) {
      alert("Please enter a title.");
      return;
    }

    const targetUserId = asTrialPrep ? meId : viewingUserId || meId;

    if (!asTrialPrep && !isSuperTeacher && targetUserId !== meId) {
      const allowedStudentIds = students
        .filter((s) => (s.role === "member" || s.role === "student") && s.id !== meId)
        .map((s) => s.id);

      if (!allowedStudentIds.includes(targetUserId)) {
        alert("You can only add books for yourself or your own students.");
        return;
      }
    }

    setIsSavingBook(true);

    try {
      const bookKey = makeBookKey(cleanTitle, cleanAuthor || null);
      let bookId: string | null = null;

      if (cleanIsbn) {
        const { data: byIsbn, error: isbnLookupError } = await supabase
          .from("books")
          .select("id")
          .eq("isbn13", cleanIsbn)
          .maybeSingle();

        if (isbnLookupError) throw isbnLookupError;
        if (byIsbn) bookId = byIsbn.id;
      }

      if (!bookId) {
        const { data: byKey, error: keyLookupError } = await supabase
          .from("books")
          .select("id")
          .eq("book_key", bookKey)
          .maybeSingle();

        if (keyLookupError) throw keyLookupError;
        if (byKey) bookId = byKey.id;
      }

      if (!bookId) {
        const { data: insertedBook, error: insertBookError } = await supabase
          .from("books")
          .insert({
            title: cleanTitle,
            author: cleanAuthor || null,
            isbn13: cleanIsbn || null,
            book_key: bookKey,
          })
          .select("id")
          .single();

        if (insertBookError) throw insertBookError;
        bookId = insertedBook.id;
      }

      const { error: userBookError } = await supabase.from("user_books").insert({
        user_id: targetUserId,
        book_id: bookId,
        is_teacher_prep: asTrialPrep,
        teacher_prep_kind: asTrialPrep ? "trial" : null,
        prepared_by: asTrialPrep ? meId : null,
      });

      if (userBookError) {
        if (userBookError.code === "23505") {
          alert("This user already has this book.");
          return;
        }
        throw userBookError;
      }

      setNewBookTitle("");
      setNewBookAuthor("");
      setNewBookIsbn("");
      setShowAddBook(false);
      await fetchBooks(viewingUserId || meId);

      alert(asTrialPrep ? "Trial prep book added!" : "Book added!");
    } catch (err) {
      console.error("ADD BOOK ERROR:", err);
      alert("Could not add book.");
    } finally {
      setIsSavingBook(false);
    }
  }

  async function loadPendingBookRequests() {
    const { data, error } = await supabase
      .from("book_requests")
      .select(`
        id,
        title,
        author,
        isbn13,
        status,
        created_at,
        user_id,
        profiles:user_id (
          display_name,
          username
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      logSbError("Error loading book requests:", error);
      setBookRequests([]);
      return;
    }

    setBookRequests((data as any[]) ?? []);
  }

  async function handleRequestBook() {
    if (!meId) {
      alert("You need to be signed in to request a book.");
      return;
    }

    const cleanTitle = requestBookTitle.trim();
    const cleanAuthor = requestBookAuthor.trim();
    const cleanIsbn = normalizeIsbn(requestBookIsbn);

    if (!cleanTitle) {
      alert("Please enter a title.");
      return;
    }

    setIsSavingRequest(true);

    try {
      const { error } = await supabase.from("book_requests").insert({
        user_id: meId,
        title: cleanTitle,
        author: cleanAuthor || null,
        isbn13: cleanIsbn || null,
        status: "pending",
      });

      if (error) throw error;

      setRequestBookTitle("");
      setRequestBookAuthor("");
      setRequestBookIsbn("");
      setShowRequestBook(false);

      alert("Book request sent!");
    } catch (err) {
      console.error("REQUEST BOOK ERROR:", err);
      alert("Could not send book request.");
    } finally {
      setIsSavingRequest(false);
    }
  }

  async function handleApproveRequest(requestId: string) {
    try {
      const { error } = await supabase.rpc("approve_book_request", {
        request_id_input: requestId,
      });

      if (error) {
        console.error("Approve request error:", error);
        alert("Could not approve request.");
        return;
      }

      alert("Book added to library!");
      await loadPendingBookRequests();
      await fetchBooks(viewingUserId || meId);
    } catch (err) {
      console.error("Approve request error:", err);
      alert("Something went wrong.");
    }
  }

  async function handleRejectBookRequest(requestId: string) {
    const confirmed = window.confirm(
      "Reject this book request? It will leave the pending list, but the request history will stay in Mekuru."
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("book_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) {
        console.error("Reject request error:", error);
        alert("Could not reject request.");
        return;
      }

      alert("Book request rejected.");
      await loadPendingBookRequests();
    } catch (err) {
      console.error("Reject request error:", err);
      alert("Something went wrong.");
    }
  }

  async function loadKanjiEnrichmentAlerts(userIdsToView: string[]) {
    if (userIdsToView.length === 0) {
      setKanjiEnrichmentAlerts([]);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIdsToView);

    if (profilesError) {
      console.error("Error loading profiles for kanji alerts:", profilesError);
      setKanjiEnrichmentAlerts([]);
      return;
    }

    const displayNameByUserId = new Map<string, string>();
    for (const profile of profiles ?? []) {
      displayNameByUserId.set((profile as any).id, (profile as any).display_name ?? "Student");
    }

    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select(`
      id,
      user_id,
      books (
        title
      )
    `)
      .in("user_id", userIdsToView);

    if (userBooksError) {
      console.error("Error loading user books for kanji alerts:", userBooksError);
      setKanjiEnrichmentAlerts([]);
      return;
    }

    const userBookIds = (userBooks ?? []).map((r: any) => r.id).filter(Boolean);

    if (userBookIds.length === 0) {
      setKanjiEnrichmentAlerts([]);
      return;
    }

    const KANJI_ENRICHMENT_TEST_START = "2026-04-20T00:00:00";

    const { data: wordRows, error: wordError } = await supabase
      .from("user_book_words")
      .select("user_book_id, vocabulary_cache_id, surface, reading, is_manual_override, created_at")
      .in("user_book_id", userBookIds)
      .eq("is_manual_override", false)
      .gte("created_at", KANJI_ENRICHMENT_TEST_START);

    if (wordError) {
      console.error("Error loading user_book_words for kanji alerts:", wordError);
      setKanjiEnrichmentAlerts([]);
      return;
    }

    const cacheIds = Array.from(
      new Set(
        (wordRows ?? [])
          .map((r: any) => r.vocabulary_cache_id)
          .filter((id: number | null) => id != null)
      )
    );

    const mapStatusByCacheId = new Map<
      number,
      { completePositions: Set<number>; hasIncomplete: boolean }
    >();

    if (cacheIds.length > 0) {
      const { data: mapRows, error: mapError } = await supabase
        .from("vocabulary_kanji_map")
        .select("vocabulary_cache_id, kanji_position, reading_type, base_reading, realized_reading")
        .in("vocabulary_cache_id", cacheIds);

      if (mapError) {
        console.error("Error loading kanji map rows for alerts:", mapError);
        setKanjiEnrichmentAlerts([]);
        return;
      }

      for (const row of mapRows ?? []) {
        const cacheId = (row as any).vocabulary_cache_id as number;
        const hasReadingType =
          !!(row as any).reading_type ||
          (!!(row as any).base_reading && !!(row as any).realized_reading);
        const existing = mapStatusByCacheId.get(cacheId) ?? {
          completePositions: new Set<number>(),
          hasIncomplete: false,
        };

        if (
          !hasReadingType ||
          !(row as any).base_reading ||
          !(row as any).realized_reading
        ) {
          existing.hasIncomplete = true;
        } else if (typeof (row as any).kanji_position === "number") {
          existing.completePositions.add((row as any).kanji_position);
        }

        mapStatusByCacheId.set(cacheId, existing);
      }
    }

    const metaByUserBookId = new Map<string, { title: string; studentName: string | null }>();
    for (const row of userBooks ?? []) {
      const bookTitle = Array.isArray((row as any).books)
        ? (row as any).books[0]?.title ?? "Untitled"
        : (row as any).books?.title ?? "Untitled";

      metaByUserBookId.set(row.id, {
        title: bookTitle,
        studentName: displayNameByUserId.get((row as any).user_id) ?? null,
      });
    }

    function kanjiCountForSurface(surface: string) {
      return Array.from(surface).filter((ch) => /\p{Script=Han}/u.test(ch)).length;
    }

    function kanjiQueueKey(surface: string, reading: string) {
      return `${surface.trim()}|||${reading.trim()}`;
    }

    function isMapCompleteForSurface(
      mapStatus: { completePositions: Set<number>; hasIncomplete: boolean } | null | undefined,
      surface: string
    ) {
      const kanjiCount = kanjiCountForSurface(surface);

      // A word should count as enriched if every kanji position has at least one complete row.
      // Extra incomplete placeholder rows should not keep the Library alert alive.
      return Boolean(mapStatus && mapStatus.completePositions.size >= kanjiCount);
    }

    const completeExactKeysByUserBookId = new Map<string, Set<string>>();

    for (const row of wordRows ?? []) {
      const surface = String((row as any).surface ?? "");
      const reading = String((row as any).reading ?? "");
      if (!/[\p{Script=Han}]/u.test(surface)) continue;

      const cacheId = (row as any).vocabulary_cache_id as number | null;
      if (cacheId == null) continue;

      const mapStatus = mapStatusByCacheId.get(cacheId);
      if (!isMapCompleteForSurface(mapStatus, surface)) continue;

      const userBookId = (row as any).user_book_id as string;
      const exactKeys = completeExactKeysByUserBookId.get(userBookId) ?? new Set<string>();
      exactKeys.add(kanjiQueueKey(surface, reading));
      completeExactKeysByUserBookId.set(userBookId, exactKeys);
    }

    const neededKeysByUserBookId = new Map<string, Set<string>>();

    for (const row of wordRows ?? []) {
      const surface = String((row as any).surface ?? "");
      const reading = String((row as any).reading ?? "");
      const hasKanji = /[\p{Script=Han}]/u.test(surface);
      if (!hasKanji) continue;

      const userBookId = (row as any).user_book_id as string;
      const completeExactKeys = completeExactKeysByUserBookId.get(userBookId);
      if (completeExactKeys?.has(kanjiQueueKey(surface, reading))) continue;

      const cacheId = (row as any).vocabulary_cache_id as number | null;
      const mapStatus = cacheId != null ? mapStatusByCacheId.get(cacheId) : null;

      const needsEnrichment =
        cacheId == null ||
        !isMapCompleteForSurface(mapStatus, surface);

      if (needsEnrichment) {
        const neededKeys = neededKeysByUserBookId.get(userBookId) ?? new Set<string>();
        neededKeys.add(cacheId == null ? `missing:${surface}::${reading}` : `cache:${cacheId}`);
        neededKeysByUserBookId.set(userBookId, neededKeys);
      }
    }

    const alerts = Array.from(neededKeysByUserBookId.entries())
      .map(([userBookId, neededKeys]) => ({
        userBookId,
        title: metaByUserBookId.get(userBookId)?.title ?? "Untitled",
        count: neededKeys.size,
        studentName: metaByUserBookId.get(userBookId)?.studentName ?? null,
        isMyBook: (userBooks ?? []).some(
          (row: any) => row.id === userBookId && row.user_id === meId
        ),
      }))
      .sort((a, b) => {
        if (a.isMyBook !== b.isMyBook) {
          return a.isMyBook ? 1 : -1;
        }

        return b.count - a.count;
      });

    setKanjiEnrichmentAlerts(alerts);
  }

  async function loadReadingStatsForBooks(
    userBookIds: string[],
    pageCountByUserBookId: Record<string, number | null>,
    formatTypeByUserBookId: Record<string, string | null>
  ) {
    if (userBookIds.length === 0) {
      setReadingStatsByUserBookId({});
      return;
    }

    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("user_book_id, start_page, end_page, minutes_read, read_on, session_mode")
      .in("user_book_id", userBookIds);

    if (error) {
      console.error("Error loading reading stats for library:", error);
      setReadingStatsByUserBookId({});
      return;
    }

    const { data: wordRows, error: wordErr } = await supabase
      .from("user_book_words")
      .select("user_book_id, surface, meaning, meaning_choice_index")
      .in("user_book_id", userBookIds);

    if (wordErr) {
      console.error("Error loading lookup stats for library:", wordErr);
    }

    const grouped: Record<
      string,
      {
        furthestPage: number;
        totalTimedPages: number;
        totalTimedMinutes: number;
        lastEngagedAt: string | null;
      }
    > = {};

    for (const row of data ?? []) {
      const userBookId = row.user_book_id as string;
      const startPage = Number((row as any).start_page);
      const endPage = Number((row as any).end_page);
      const rawMinutes = (row as any).minutes_read;
      const readOn = (row as any).read_on as string | null;
      const sessionMode = (row as any).session_mode as string | null;
      const hasPageRange =
        Number.isFinite(startPage) && Number.isFinite(endPage) && endPage >= startPage;
      const countsForVisualPace =
        hasPageRange &&
        !isListeningFormat(sessionMode) &&
        !isListeningFormat(formatTypeByUserBookId[userBookId]);

      if (!grouped[userBookId]) {
        grouped[userBookId] = {
          furthestPage: 0,
          totalTimedPages: 0,
          totalTimedMinutes: 0,
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
      const minutesRead = rawMinutes == null ? null : Number(rawMinutes);

      if (Number.isFinite(endPage)) {
        grouped[userBookId].furthestPage = Math.max(grouped[userBookId].furthestPage, endPage);
      }

      if (
        countsForVisualPace &&
        minutesRead != null &&
        Number.isFinite(minutesRead) &&
        minutesRead > 0
      ) {
        grouped[userBookId].totalTimedPages += endPage - startPage + 1;
        grouped[userBookId].totalTimedMinutes += minutesRead;
      }
    }

    const lookupSetsByUserBookId: Record<string, Set<string>> = {};

    if (wordRows) {
      for (const row of wordRows as any[]) {
        const userBookId = row.user_book_id as string;
        if (!userBookId) continue;

        const surface = (row.surface ?? "").trim();
        const meaning = (row.meaning ?? "").trim();
        if (!surface && !meaning) continue;

        if (!lookupSetsByUserBookId[userBookId]) {
          lookupSetsByUserBookId[userBookId] = new Set<string>();
        }

        lookupSetsByUserBookId[userBookId].add(`${surface}|||${meaning}`);
      }
    }

    const lookupCountsByUserBookId: Record<string, number> = {};

    for (const userBookId of Object.keys(lookupSetsByUserBookId)) {
      lookupCountsByUserBookId[userBookId] =
        lookupSetsByUserBookId[userBookId].size;
    }

    const stats: Record<string, ReadingSessionStats> = {};

    for (const userBookId of userBookIds) {
      const pageCount = pageCountByUserBookId[userBookId];
      const g = grouped[userBookId];

      if (!g) {
        stats[userBookId] = {
          progressPercent: null,
          averageMinutesPerPage: null,
          furthestPage: null,
          wordsLookedUp: lookupCountsByUserBookId[userBookId] ?? 0,
          lastEngagedAt: null,
        };
        continue;
      }

      const progressPercent =
        pageCount && pageCount > 0
          ? Math.min(100, Math.round((g.furthestPage / pageCount) * 100))
          : null;

      const averageMinutesPerPage =
        g.totalTimedPages > 0 ? g.totalTimedMinutes / g.totalTimedPages : null;

      stats[userBookId] = {
        progressPercent,
        averageMinutesPerPage,
        furthestPage: g.furthestPage,
        wordsLookedUp: lookupCountsByUserBookId[userBookId] ?? 0,
        lastEngagedAt: g.lastEngagedAt ?? null,
      };
    }

    setReadingStatsByUserBookId(stats);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMessage("");
      setMessageType("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setMessage("Please sign in to see your books.");
          setMessageType("error");
          setRows([]);
        }
        return;
      }

      if (cancelled) return;

      setMeId(user.id);

      const { data: meProfile, error: meProfileErr } = await supabase
        .from("profiles")
        .select("role, is_super_teacher, username, time_zone")
        .eq("id", user.id)
        .single();

      if (meProfileErr) {
        logSbError("Error loading my profile role:", meProfileErr);
      }

      if (cancelled) return;

      setMyUsername((meProfile as any)?.username ?? "");
      setMyTimeZone((meProfile as any)?.time_zone || "Asia/Tokyo");

      const role = (meProfile?.role as ProfileRole | null) ?? "member";
      const superTeacherFlag = Boolean((meProfile as any)?.is_super_teacher);

      setMyRole(role);
      setIsSuperTeacher(superTeacherFlag);
      setSuperTeacherKanjiReminderHidden(superTeacherKanjiReminderHiddenToday());

      if (role === "super_teacher" || superTeacherFlag) {
        await loadPendingBookRequests();
      }

      if (routeUsername) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", routeUsername)
          .single();

        if (profile?.id) {
          setViewingUserId(profile.id);
        } else {
          setViewingUserId(user.id);
        }
      } else {
        setViewingUserId(user.id);
      }

      if (role !== "teacher") {
        setStudents([]);
        return;
      }

      if (superTeacherFlag) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id, display_name, username, level, role")
          .order("display_name", { ascending: true });

        if (profErr) {
          logSbError("Error loading all profiles:", profErr);
          if (!cancelled) setStudents([]);
          return;
        }

        if (cancelled) return;

        setStudents(
          (profs ?? []).map((p: any) => ({
            id: p.id,
            display_name: p.display_name || "User",
            username: p.username ?? null,
            level: p.level ?? null,
            role: p.role ?? null,
          }))
        );

        return;
      }

      const { data: rels, error: relErr } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id)
        .is("archived_at", null);

      if (relErr) {
        logSbError("Error loading teacher_students:", relErr);
        if (!cancelled) setStudents([]);
        return;
      }

      const studentIds = (rels ?? []).map((r: any) => r.student_id).filter(Boolean);

      if (studentIds.length === 0) {
        if (!cancelled) setStudents([]);
        return;
      }

      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, username, level, role")
        .in("id", studentIds)
        .order("display_name", { ascending: true });

      if (profErr) {
        logSbError("Error loading student profiles:", profErr);
        if (!cancelled) setStudents([]);
        return;
      }

      if (cancelled) return;

      const meOption: StudentOption = {
        id: user.id,
        display_name: "Me",
        username: (meProfile as any)?.username ?? null,
        level: null,
        role: "teacher",
      };

      const studentOptions: StudentOption[] = (profs ?? [])
        .filter((p: any) => p.id !== user.id && (p.role === "member" || p.role === "student"))
        .map((p: any) => ({
          id: p.id,
          display_name: p.display_name,
          username: p.username ?? null,
          level: p.level ?? null,
          role: p.role,
        }));

      const teacherOptions: StudentOption[] = (profs ?? [])
        .filter((p: any) => p.id !== user.id && p.role === "teacher")
        .map((p: any) => ({
          id: p.id,
          display_name: p.display_name,
          username: p.username ?? null,
          level: p.level ?? null,
          role: p.role,
        }));

      setStudents([meOption, ...studentOptions, ...teacherOptions]);
    })();

    return () => {
      cancelled = true;
    };
  }, [routeUsername]);

  useEffect(() => {
    if (!viewingUserId || !meId) return;

    setRows([]);
    fetchBooks(viewingUserId);
  }, [viewingUserId, meId, myRole]);

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
    if (!viewingUserId || !meId || !selectedMonth) return;

    // Regular members should only load their own private monthly stats.
    // Teachers can load the viewed learner's stats when RLS allows it.
    const targetUserId = isTeacher ? viewingUserId : meId;

    loadMonthlyLibraryStats(targetUserId, selectedMonth, myTimeZone);
  }, [viewingUserId, meId, isTeacher, selectedMonth, myTimeZone]);

  useEffect(() => {
    if (!viewingUserId || !meId) return;

    // Keep color totals aligned with the same effective user as the library query.
    const targetUserId = isTeacher ? viewingUserId : meId;

    loadMekuruColorCounts(targetUserId);
  }, [viewingUserId, meId, isTeacher]);

  useEffect(() => {
    setAbilityCheckReminderHidden(abilityCheckReminderHiddenToday());
    setAbilityCheckReminderCompleted(abilityCheckCompletedToday());

    if (!viewingUserId || !meId || viewingUserId !== meId) {
      setAbilityCheckReminderCount(0);
      return;
    }

    loadAbilityCheckReminder(viewingUserId);
  }, [viewingUserId, meId, abilityCheckReminderDayKey]);

  useEffect(() => {
    function refreshAbilityCheckReminderDay(options: { refreshCount?: boolean } = {}) {
      const todayKey = getTodayKey();
      setAbilityCheckReminderDayKey((previous) =>
        previous === todayKey ? previous : todayKey
      );
      setAbilityCheckReminderHidden(abilityCheckReminderHiddenToday());
      setAbilityCheckReminderCompleted(abilityCheckCompletedToday());
      setSuperTeacherKanjiReminderHidden(superTeacherKanjiReminderHiddenToday());

      if (options.refreshCount && viewingUserId && meId && viewingUserId === meId) {
        void loadAbilityCheckReminder(viewingUserId);
      }
    }

    function refreshAfterReturn() {
      if (document.visibilityState === "hidden") return;
      refreshAbilityCheckReminderDay({ refreshCount: true });
    }

    refreshAbilityCheckReminderDay({ refreshCount: true });

    const interval = window.setInterval(() => refreshAbilityCheckReminderDay(), 60_000);

    window.addEventListener("focus", refreshAfterReturn);
    document.addEventListener("visibilitychange", refreshAfterReturn);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshAfterReturn);
      document.removeEventListener("visibilitychange", refreshAfterReturn);
    };
  }, [viewingUserId, meId]);

  useEffect(() => {
    const loadAlerts = async () => {
      if (!viewingUserId || !meId) {
        setAlertBox(null);
        setTeacherPrepAlerts([]);
        return;
      }

      if (isTeacher && viewingUserId === meId) {
        const studentIds = students
          .filter((s) => (s.role === "member" || s.role === "student") && s.id !== meId)
          .map((s) => s.id);

        if (studentIds.length === 0) {
          setTeacherPrepAlerts([]);
          setAlertBox(null);
          return;
        }

        const { data: completedRows, error: completedErr } = await supabase
          .from("teacher_alert_completions")
          .select("student_id, alert_key")
          .eq("teacher_id", meId);

        if (completedErr) {
          logSbError("Error loading completed teacher alerts:", completedErr);
        }

        const completedSet = new Set(
          (completedRows ?? []).map((r: any) => `${r.student_id}__${r.alert_key}`)
        );

        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, display_name, username, lesson_day")
          .in("id", studentIds);

        if (error) {
          logSbError("Error loading student profiles for teacher alerts:", error);
          setTeacherPrepAlerts([]);
          setAlertBox(null);
          return;
        }

        const prepAlerts: TeacherPrepItem[] = (profiles ?? [])
          .map((p: any) => {
            const info = getLessonAlertInfo({
              lessonDay: p.lesson_day ?? null,
              isTeacherView: true,
              studentName: p.display_name ?? null,
            });

            if (!info || info.kind !== "teacher_prepare") return null;

            const key = `${p.id}__${info.alertKey}`;
            if (completedSet.has(key)) return null;

            return {
              studentId: p.id,
              studentName: p.display_name || "Member",
              studentUsername: p.username ?? null,
              message: info.message,
              alertKey: info.alertKey,
            };
          })
          .filter(Boolean) as TeacherPrepItem[];

        setTeacherPrepAlerts(prepAlerts);
        setAlertBox(null);
        return;
      }

      if (!isTeacher || viewingUserId !== meId) {
        const { data: viewedProfile, error } = await supabase
          .from("profiles")
          .select("id, display_name, lesson_day")
          .eq("id", viewingUserId)
          .single();

        if (error) {
          logSbError("Error loading viewed profile for alerts:", error);
          setAlertBox(null);
          setTeacherPrepAlerts([]);
          return;
        }

        const nextAlert = getLessonAlertInfo({
          lessonDay: viewedProfile?.lesson_day ?? null,
          isTeacherView: false,
          studentName: viewedProfile?.display_name ?? null,
        });

        const allowedAlert = !isTeacher && viewingUserId === meId ? nextAlert : null;

        setAlertBox((allowedAlert as AlertBoxState) ?? null);
        setTeacherPrepAlerts([]);
        return;
      }

      setAlertBox(null);
      setTeacherPrepAlerts([]);
    };

    loadAlerts();
  }, [viewingUserId, meId, isTeacher, students]);

  const currentlyReading = validRows.filter(
    (r) => !!r.started_at && !r.finished_at && !r.dnf_at
  );
  const notStarted = validRows.filter(
    (r) => !r.started_at && !r.finished_at && !r.dnf_at
  );
  const finished = validRows.filter((r) => !!r.finished_at && !r.dnf_at);
  const dnf = validRows.filter((r) => !!r.dnf_at);

  const sortedValidRows = useMemo(() => {
    return sortLibraryItems(validRows);
  }, [validRows, sortMode, readingStatsByUserBookId]);

  const gridClass =
    "grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";



  function getStatusOrder(row: UserBookRow) {
    if (row.started_at && !row.finished_at && !row.dnf_at) return 0;
    if (!row.started_at && !row.finished_at && !row.dnf_at) return 1;
    if (row.finished_at && !row.dnf_at) return 2;
    if (row.dnf_at) return 3;
    return 4;
  }

  function getStatusLabel(row: UserBookRow) {
    if (row.finished_at && !row.dnf_at) return "Finished";
    if (row.dnf_at) return "DNF";
    if (row.started_at) return "In progress";
    return "Not started";
  }

  function compareNullableNumber(
    aValue: number | null | undefined,
    bValue: number | null | undefined,
    direction: "asc" | "desc"
  ) {
    const aHasValue = typeof aValue === "number" && Number.isFinite(aValue);
    const bHasValue = typeof bValue === "number" && Number.isFinite(bValue);

    if (!aHasValue && !bHasValue) return 0;
    if (!aHasValue) return 1;
    if (!bHasValue) return -1;

    return direction === "asc" ? aValue - bValue : bValue - aValue;
  }

  function sortLibraryItems(items: UserBookRow[]) {
    const copy = [...items];

    copy.sort((a, b) => {
      const aBook = a.books;
      const bBook = b.books;
      if (!aBook || !bBook) return 0;

      if (sortMode === "title") {
        return aBook.title.localeCompare(bBook.title);
      }

      if (sortMode === "last_engaged") {
        const aDate = readingStatsByUserBookId[a.id]?.lastEngagedAt
          ? new Date(readingStatsByUserBookId[a.id].lastEngagedAt!).getTime()
          : 0;

        const bDate = readingStatsByUserBookId[b.id]?.lastEngagedAt
          ? new Date(readingStatsByUserBookId[b.id].lastEngagedAt!).getTime()
          : 0;

        return bDate - aDate;
      }

      if (sortMode === "last_read") {
        const aDate = a.finished_at ? new Date(a.finished_at).getTime() : 0;
        const bDate = b.finished_at ? new Date(b.finished_at).getTime() : 0;
        return bDate - aDate;
      }

      if (sortMode === "rating_high") {
        return compareNullableNumber(a.rating_overall, b.rating_overall, "desc");
      }

      if (sortMode === "rating_low") {
        return compareNullableNumber(a.rating_overall, b.rating_overall, "asc");
      }

      if (sortMode === "difficulty_high") {
        return compareNullableNumber(a.rating_difficulty, b.rating_difficulty, "desc");
      }

      if (sortMode === "difficulty_low") {
        return compareNullableNumber(a.rating_difficulty, b.rating_difficulty, "asc");
      }

      if (sortMode === "pace_fast") {
        return compareNullableNumber(
          readingStatsByUserBookId[a.id]?.averageMinutesPerPage,
          readingStatsByUserBookId[b.id]?.averageMinutesPerPage,
          "asc"
        );
      }

      if (sortMode === "pace_slow") {
        return compareNullableNumber(
          readingStatsByUserBookId[a.id]?.averageMinutesPerPage,
          readingStatsByUserBookId[b.id]?.averageMinutesPerPage,
          "desc"
        );
      }

      return getStatusOrder(a) - getStatusOrder(b);
    });

    return copy;
  }

  function renderBookCard(row: UserBookRow) {
    return (
      <LibraryBookCard
        key={row.id}
        row={row}
        stats={readingStatsByUserBookId[row.id]}
        href={`/books/${row.id}`}
        formatRelativeDate={formatRelativeDate}
      />
    );
  }

  function renderBookRow(row: UserBookRow) {
    return (
      <LibraryBookRow
        key={row.id}
        row={row}
        status={getStatusLabel(row)}
        onOpen={() => router.push(`/books/${row.id}`)}
      />
    );
  }

  const showAbilityCheckReminder =
    viewingUserId === meId &&
    abilityCheckReminderEnabled &&
    abilityCheckReminderCount >= ABILITY_CHECK_REMINDER_MIN_DUE_CARDS &&
    !abilityCheckReminderLoading &&
    !abilityCheckReminderHidden &&
    !abilityCheckReminderCompleted;
  const showSuperTeacherKanjiReminder =
    viewingUserId === meId &&
    (myRole === "super_teacher" || isSuperTeacher) &&
    !superTeacherKanjiReminderHidden;
  const showLearningTasks =
    (viewingUserId === meId || isViewingStudentLibrary) &&
    !learningTasksLoading &&
    learningTasks.length > 0;
  const showLearningTasksError =
    (viewingUserId === meId || isViewingStudentLibrary) &&
    !learningTasksLoading &&
    !!learningTasksError;

  function learningTaskTypeLabel(taskType: string) {
    if (taskType === "reread_pages") return "Reread pages";
    if (taskType === "review_book_words") return "Study book flashcards";
    if (taskType === "review_recent_words") return "Review recent words";
    if (taskType === "kanji_reading_practice") return "Kanji Reading";
    if (taskType === "listening") return "Listening";
    return "Learning task";
  }

  function learningTaskAction(task: LearningTaskRow) {
    if (task.task_type === "kanji_reading_practice") {
      return { href: "/library-study/kanji", label: "Open Kanji Reading" };
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
          <UserBar isTeacher={isTeacher} variant="logoutOnly" />
        </LibraryHeader>

        {showAbilityCheckReminder ? (
          <div className="mb-5 rounded-3xl border border-sky-200 bg-sky-50 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-sky-950">
                  Ability Check is ready today
                </div>
                {abilityCheckReminderCount > 0 ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    You have {abilityCheckReminderCount} due card
                    {abilityCheckReminderCount === 1 ? "" : "s"}. Ability Check is intentionally
                    small and spaced. For more study, use Library Review, Word Sky, or book
                    flashcards.
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    No Ability Check cards are due today. That is normal, especially in the beginning!
                    Ability Check only shows spaced cards when they are ready.
                    <br />
                    For extra study, use Library Review or Book Flashcards. To boost words in your
                    Ability Check, try Word Sky or read and add more words!
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {abilityCheckReminderCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => router.push("/library-study/check")}
                    className="rounded-xl bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
                  >
                    Start Ability Check
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    hideAbilityCheckReminderForToday();
                    setAbilityCheckReminderHidden(true);
                  }}
                  className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
                >
                  {abilityCheckReminderCount > 0 ? "Hide today" : "Hide"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSuperTeacherKanjiReminder ? (
          <div className="mb-5 rounded-3xl border border-violet-200 bg-violet-50 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-violet-950">
                  Kanji enrichment reminder
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  A little kanji cleanup keeps the shared Kanji Reading Study bank healthier.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    hideSuperTeacherKanjiReminderForToday();
                    setSuperTeacherKanjiReminderHidden(true);
                    router.push("/teacher/kanji");
                  }}
                  className="rounded-xl bg-violet-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
                >
                  Open Kanji Queue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hideSuperTeacherKanjiReminderForToday();
                    setSuperTeacherKanjiReminderHidden(true);
                  }}
                  className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"
                >
                  Hide today
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showLearningTasks ? (
          <div className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-950">
                  {isViewingStudentLibrary
                    ? `${viewingLabel}’s learning tasks`
                    : "Learning tasks from your teacher"}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  These are small study directions for your next reading or review session.
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
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
                  <div
                    key={task.id}
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-left shadow-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {task.title}
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          {learningTaskTypeLabel(task.task_type)}
                        </div>
                        {task.instructions ? (
                          <div className="mt-1 text-xs leading-5 text-slate-600">
                            {task.instructions}
                          </div>
                        ) : null}
                      </div>

                      <div className="text-xs font-semibold text-emerald-700">
                        {taskDetails.join(" · ")}
                      </div>
                    </div>

                    {taskAction || viewingUserId === meId ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {taskAction ? (
                          <button
                            type="button"
                            onClick={() => router.push(taskAction.href)}
                            className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-900"
                          >
                            {taskAction.label}
                          </button>
                        ) : null}

                        {viewingUserId === meId ? (
                          <button
                            type="button"
                            onClick={() => completeLearningTask(task.id)}
                            disabled={completingLearningTaskId === task.id}
                            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {completingLearningTaskId === task.id ? "Marking..." : "Mark done"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {showLearningTasksError ? (
          <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm">
            Learning tasks could not load: {learningTasksError}
          </div>
        ) : null}

        <LibraryGuidePanel onNavigate={(path) => router.push(path)} />

        {false && isTeacher && viewingUserId === meId && kanjiEnrichmentAlerts.length > 0 ? (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-amber-900">
              Kanji Enrichment Needed
            </h2>
            <p className="mt-1 text-xs text-amber-800">
              Books with saved kanji words that still need enrichment
            </p>

            <div className="mt-3 space-y-2">
              {kanjiEnrichmentAlerts.map((alert) => (
                <button
                  key={alert.userBookId}
                  type="button"
                  onClick={() => router.push(`/teacher/books/${alert.userBookId}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-white px-3 py-3 text-left hover:bg-amber-100"
                >
                  <div>
                    {alert.studentName ? (
                      <div className="text-[11px] uppercase tracking-wide text-amber-800">
                        {alert.studentName}
                      </div>
                    ) : null}
                    <div className="text-sm font-medium text-stone-900">
                      {alert.title}
                    </div>
                  </div>
                  <div className="text-xs text-amber-900">
                    {alert.count} need{alert.count === 1 ? "s" : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isSuperTeacher && showPendingBookRequestsAlert ? (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-amber-900">Pending Book Requests</h2>
                <p className="mt-1 text-xs text-amber-800">
                  {bookRequests.length} pending{" "}
                  {bookRequests.length === 1 ? "request" : "requests"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  hidePendingBookRequestsAlert(pendingBookRequestsAlertSignature);
                  setDismissedPendingBookRequestsSignature(pendingBookRequestsAlertSignature);
                }}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Dismiss
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {bookRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-amber-200 bg-white px-3 py-3"
                >
                  <div className="text-sm font-medium text-stone-900">
                    {req.title || "Untitled"}
                  </div>

                  <div className="mt-1 text-xs text-stone-600">
                    {req.author ? `Author: ${req.author}` : "Author: —"}
                  </div>

                  <div className="mt-1 text-xs text-stone-600">
                    {req.isbn13 ? `ISBN: ${req.isbn13}` : "ISBN: —"}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApproveRequest(req.id)}
                      className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                    >
                      Add to Library
                    </button>
                    <button
                      onClick={() => handleRejectBookRequest(req.id)}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Reject
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-stone-500">
                    Requested by{" "}
                    <span className="font-medium text-stone-700">
                      {req.profiles?.display_name || req.profiles?.username || "User"}
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-stone-400">
                    {req.created_at ? new Date(req.created_at).toLocaleDateString() : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <UserBar isTeacher={isTeacher} variant="labelOnly" />

        {null}

        <LibraryViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          bookTypeFilter={bookTypeFilter}
          onBookTypeFilterChange={setBookTypeFilter}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />

        <p className="mb-6 text-sm text-gray-600">
          All reading/study tools live inside each book. Click a cover to open its Book Hub.
        </p>

        {viewMode === "cover" ? (
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
        )}

        {allValidRows.length === 0 ? <LibraryEmptyState /> : null}

        {isTeacher ? (
          <>
            <button
              type="button"
              onClick={() => router.push("/books/add")}
              className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg"
            >
              + Add a Book
            </button>

            {false && showAddBook ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Add Book {viewingLabel ? `for ${viewingLabel}` : ""}
                      </h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Add Book goes to{" "}
                        <span className="font-medium text-stone-700">{viewingLabel}</span>.
                        Trial Prep goes to your teacher prep shelf.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddBook(false)}
                      className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={newBookTitle}
                        onChange={(e) => setNewBookTitle(e.target.value)}
                        placeholder="Enter book title"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Author</label>
                      <input
                        type="text"
                        value={newBookAuthor}
                        onChange={(e) => setNewBookAuthor(e.target.value)}
                        placeholder="Enter author name"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">ISBN-13</label>
                      <input
                        type="text"
                        value={newBookIsbn}
                        onChange={(e) => setNewBookIsbn(e.target.value)}
                        placeholder="978..."
                        className="w-full rounded-xl border px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-stone-500">
                        Hyphens and spaces are okay. They will be removed automatically.
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddBook(false)}
                        className="rounded-xl border px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAddBook()}
                        disabled={isSavingBook}
                        className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {isSavingBook ? "Saving..." : "Add Book"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAddBook({ asTrialPrep: true })}
                        disabled={isSavingBook}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50"
                      >
                        {isSavingBook ? "Saving..." : "Add as Trial Prep"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {isViewingOwnLibrary ? (
              <button
                type="button"
                onClick={() => router.push("/books/add")}
                className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg"
              >
                + Add a Book
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
