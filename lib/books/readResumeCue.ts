import {
  formatAudioTime,
  progressSummary,
  type ProgressRecord,
  type ProgressTotals,
  type ProgressTrackingMethod,
} from "./readingProgress";

type ResumeWord = {
  page_number?: number | null;
  created_at?: string | null;
};

export function readResumeCue(
  sessions: ProgressRecord[],
  method: ProgressTrackingMethod | null,
  totals: ProgressTotals,
  currentLocation: string | null,
  words: ResumeWord[] = []
) {
  if (!method) return null;

  // Listening can share page/location tracking with reading, but it must not
  // move a reading resume position. Audiobook-time copies resume from Listen.
  const resumeSessions = method === "audiobook_time"
    ? sessions
    : sessions.filter((session) => session.session_mode !== "listening");
  const position = progressSummary(resumeSessions, method, totals).position ??
    (method === "page"
      ? [...words]
          .filter((word) => word.page_number != null)
          .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0]
          ?.page_number ?? null
      : null);

  if (position != null) {
    if (method === "page") return `Resume from page ${position}`;
    if (method === "kindle_location") return `Resume from location ${position}`;
    if (method === "percent") return `Resume from ${position}%`;
    return `Resume from ${formatAudioTime(position)}`;
  }

  if (method === "audiobook_time" && currentLocation?.trim()) {
    return `Resume from ${currentLocation.trim()}`;
  }

  return null;
}
