// Library Study Shared
//
// Shared types, color helpers, and small UI pieces for Library Study routes.
// This file is intentionally not wired into Check or Review yet.

"use client";

import {
  type LibraryStudyColorStatus,
  type LibraryStudyGateStatus,
} from "@/lib/libraryStudyColor";
import { normalizeKanaReading } from "@/lib/kanaInput";
import type { ReactNode } from "react";

export type UserBookJoinRow = {
  id: string;
  books:
  | {
    title: string | null;
    cover_url: string | null;
  }
  | {
    title: string | null;
    cover_url: string | null;
  }[]
  | null;
};

export type UserBookWordRow = {
  id: string;
  user_book_id: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  hidden: boolean | null;
  created_at: string;
};

export type LearningSettingsRow = {
  red_stages: number | null;
  orange_stages: number | null;
  yellow_stages: number | null;
  show_badge_numbers: boolean | null;
  skip_katakana_library_check?: boolean | null;
  library_check_daily_limit?: number | null;
  show_ability_check_reminder?: boolean | null;
};

export type LibraryWordProgressRow = {
  id?: string;
  user_id: string;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  definition_key: string;
  reading_gate_status: LibraryStudyGateStatus;
  meaning_gate_status: LibraryStudyGateStatus;
  held_before_reading_gate: boolean;
  held_before_meaning_gate: boolean;
  mastered: boolean;
  reading_gate_attempts: number;
  meaning_gate_attempts: number;
  reading_gate_passed_at: string | null;
  reading_gate_failed_at: string | null;
  meaning_gate_passed_at: string | null;
  meaning_gate_failed_at: string | null;
  mastered_at: string | null;
  last_studied_at: string | null;
};

export type LibraryWordSummaryRow = {
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  total_encounter_count: number | null;
  check_ready_encounter_count: number | null;
  sample_user_book_word_id: string | null;
  sample_user_book_id: string | null;
  sample_book_title: string | null;
  sample_book_cover_url: string | null;
};

export type LibraryCheckGate = "readiness" | "reading" | "meaning";

export type StudyCard = {
  id: string;
  userBookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  surface: string;
  reading: string;
  meaning: string;
  jlpt: string | null;
  encounterCount: number;
  encounterIds: string[];
  colorStatus: LibraryStudyColorStatus;
  activeGate: LibraryCheckGate;
  studyIdentityKey: string;
  progress: LibraryWordProgressRow | null;
};

export type PracticeColorFilter =
  | "all"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "grey"
  | "katakana";

export const DEFAULT_LEARNING_SETTINGS: LearningSettingsRow = {
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
  skip_katakana_library_check: true,
  library_check_daily_limit: 20,
  show_ability_check_reminder: true,
};

export const LIBRARY_CHECK_WORD_PAGE_SIZE = 1000;
export const LIBRARY_PROGRESS_KEY_BATCH_SIZE = 75;
export const MASTERED_MAINTENANCE_INTERVAL_DAYS = 30;
export const REGULAR_GATE_RECHECK_MIN_DAYS = 4;
export const REGULAR_GATE_RECHECK_WINDOW_DAYS = 6;
export const MISSED_GATE_RECHECK_MIN_DAYS = 7;
export const MISSED_GATE_RECHECK_WINDOW_DAYS = 8;
export const PRE_READING_WAIT_RECHECK_DAYS = 90;

export function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeKana(value: string | null | undefined) {
  return normalizeKanaReading(value ?? "");
}

export function normalizeJlpt(value: string | null | undefined) {
  return (value ?? "NON-JLPT").toUpperCase() || "NON-JLPT";
}

export function cleanDailyCheckLimit(value: number | null | undefined) {
  if (value === 10 || value === 20 || value === 30 || value === 40 || value === 50) {
    return value;
  }

  return 20;
}

export function isKatakanaOnly(value: string | null | undefined) {
  const compact = (value ?? "").trim().replace(/\s+/g, "");
  return compact.length > 0 && /^[ァ-ヶー・･]+$/.test(compact);
}

export function studyIdentityKey(
  surface: string | null | undefined,
  reading: string | null | undefined
) {
  const normalizedSurface = normalizeText(surface);
  const normalizedReading = normalizeKana(reading);
  if (!normalizedSurface) return "";
  return `${normalizedSurface}||${normalizedReading}`;
}

export function getBookMeta(row: UserBookJoinRow) {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return {
    title: book?.title ?? "Untitled",
    cover_url: book?.cover_url ?? null,
  };
}

export function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysSinceIso(value: string | null | undefined, now = new Date()) {
  if (!value) return Number.POSITIVE_INFINITY;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}

export function libraryStudyCardClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  const base =
    "relative flex min-h-[24rem] w-full max-w-3xl items-center justify-center rounded-2xl border bg-white p-6 text-center shadow-2xl transition-colors sm:min-h-[28rem]";

  if (color === "green") return `${base} border-emerald-100`;
  if (color === "blue") return `${base} border-sky-100`;
  if (color === "grey") return `${base} border-slate-200`;
  if (color === "purple") return `${base} border-violet-100`;
  if (color === "red") return `${base} border-rose-100`;
  if (color === "orange") return `${base} border-orange-100`;

  return `${base} border-amber-100`;
}

export function libraryStudyChipClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  const base =
    "rounded-full border px-2 py-1 text-[10px] font-semibold shadow-sm sm:px-3 sm:py-1.5 sm:text-xs";

  if (color === "green") return `${base} border-emerald-100 bg-white/90 text-emerald-900`;
  if (color === "blue") return `${base} border-sky-100 bg-white/90 text-sky-900`;
  if (color === "grey") return `${base} border-slate-100 bg-white/90 text-slate-700`;
  if (color === "purple") return `${base} border-violet-100 bg-white/90 text-violet-900`;
  if (color === "red") return `${base} border-rose-100 bg-white/90 text-rose-900`;
  if (color === "orange") return `${base} border-orange-100 bg-white/90 text-orange-950`;

  return `${base} border-amber-100 bg-white/90 text-amber-950`;
}

export function libraryStudyDotClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";

  if (color === "red") return "bg-red-500";
  if (color === "orange") return "bg-orange-500";
  if (color === "yellow") return "bg-yellow-300";
  if (color === "green") return "bg-emerald-500";
  if (color === "blue") return "bg-sky-500";
  if (color === "purple") return "bg-violet-500";
  if (color === "grey") return "bg-slate-500";
  return "bg-slate-300";
}

export function libraryStudyColorName(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  if (color === "grey") return "Limbo";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

export function pickLibraryCheckGate(
  status: LibraryStudyColorStatus,
  _seed: string,
  _date = new Date()
): LibraryCheckGate {
  if (status.color === "yellow" && status.eligibleForLibraryStudy) return "readiness";
  if (status.nextGate === "reading") return "reading";
  if (status.nextGate === "meaning") return "meaning";
  return "reading";
}

export function includeLibraryCheckCard(status: LibraryStudyColorStatus) {
  return (
    status.eligibleForLibraryStudy ||
    status.nextGate === "reading" ||
    status.nextGate === "meaning"
  );
}

export function isCardAvailableForLibraryPractice(
  card: StudyCard,
  selectedJlpt: string,
  colorFilter: PracticeColorFilter
) {
  const jlptMatch = selectedJlpt === "all" || normalizeJlpt(card.jlpt) === selectedJlpt;
  if (!jlptMatch) return false;

  if (colorFilter === "all") return true;
  if (colorFilter === "katakana") return isKatakanaOnly(card.surface);

  return card.colorStatus.color === colorFilter;
}

export function KatakanaBadge() {
  return (
    <span
      title="Katakana-only word"
      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
    >
      カ
    </span>
  );
}

export function LibraryStudyColorDot({
  status,
  className = "",
}: {
  status: LibraryStudyColorStatus | undefined;
  className?: string;
}) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${libraryStudyDotClass(status)} ${className}`}
    />
  );
}

export function LibraryStudyColorBadge({
  status,
}: {
  status: LibraryStudyColorStatus | undefined;
}) {
  return (
    <div className="rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
      <LibraryStudyColorDot status={status} className="mr-1.5" />
      {libraryStudyColorName(status)}
    </div>
  );
}

export function LibraryStudyMetaChip({
  status,
  children,
}: {
  status: LibraryStudyColorStatus | undefined;
  children: ReactNode;
}) {
  return <div className={libraryStudyChipClass(status)}>{children}</div>;
}
