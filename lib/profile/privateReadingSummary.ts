import { resolvePersonalTrackingStatus } from "@/lib/personalTracking";
import { ymdInTimeZone } from "@/lib/timeZone";

export type ProfileBookStatusRow = {
  id?: string;
  personal_tracking_status?: string | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  dnf_at?: string | null;
  is_teacher_prep?: boolean | null;
};

export type ProfileReadingSessionRow = {
  session_mode?: string | null;
  minutes_read?: number | null;
  is_filler?: boolean | null;
};

export function getProfileBookCounts(rows: ProfileBookStatusRow[]) {
  const trackedBooks = rows.filter(
    (row) => !row.is_teacher_prep && resolvePersonalTrackingStatus(row) !== "not_tracking"
  );

  return {
    currentlyReading: trackedBooks.filter(
      (row) => resolvePersonalTrackingStatus(row) === "reading"
    ).length,
    finished: trackedBooks.filter(
      (row) => resolvePersonalTrackingStatus(row) === "finished"
    ).length,
  };
}

export function getProfileActivityDateBounds(now = new Date()) {
  const today = ymdInTimeZone(now);
  return {
    today,
    monthStart: `${today.slice(0, 7)}-01`,
  };
}

export const PROFILE_READING_SESSION_MODES = ["fluid", "curiosity", "listening"] as const;
const READING_SESSION_MODES = new Set<string>(PROFILE_READING_SESSION_MODES);

export function isProfileReadingActivitySession(row: ProfileReadingSessionRow) {
  return !row.is_filler && READING_SESSION_MODES.has(row.session_mode ?? "");
}

export function isProfileTimedReadingSession(row: ProfileReadingSessionRow) {
  return (
    isProfileReadingActivitySession(row) &&
    typeof row.minutes_read === "number" &&
    Number.isFinite(row.minutes_read) &&
    row.minutes_read > 0
  );
}
