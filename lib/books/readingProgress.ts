export type ProgressTrackingMethod = "page" | "kindle_location" | "percent";
export type ProgressTotals = { page_count?: number | null; kindle_location_count?: number | null };
export type ProgressRecord = {
  tracking_unit?: ProgressTrackingMethod | null;
  start_position?: number | null;
  end_position?: number | null;
  progress_total?: number | null;
  start_page?: number | null;
  end_page?: number | null;
  minutes_read?: number | null;
  is_filler?: boolean | null;
  session_mode?: string | null;
};
export function progressMethod(value: unknown): ProgressTrackingMethod | null {
  return value === "page" || value === "kindle_location" || value === "percent" ? value : null;
}
export function progressLabels(method: ProgressTrackingMethod | null) {
  if (method === "kindle_location") return { name: "Kindle Location", unit: "Location", plural: "locations", current: "Current location", rate: "locations per hour" };
  if (method === "percent") return { name: "Percentage", unit: "Percent", plural: "percentage points", current: "Current percentage", rate: "percentage points per hour" };
  return { name: "Page number", unit: "Page", plural: "pages", current: "Current page", rate: "pages per hour" };
}
export function matchingTotal(method: ProgressTrackingMethod | null, book: ProgressTotals): number | null {
  const total = method === "percent" ? 100 : method === "kindle_location" ? book.kindle_location_count : method === "page" ? book.page_count : null;
  return total != null && Number.isFinite(total) && total > 0 ? total : null;
}
export function completionPercent(position: number | null | undefined, method: ProgressTrackingMethod | null, book: ProgressTotals) {
  const total = matchingTotal(method, book);
  if (position == null || !Number.isFinite(position) || position < 0 || !total || position > total) return null;
  return Math.round(position / total * 1000) / 10;
}
export function parseProgressPosition(raw: string, method: ProgressTrackingMethod, total: number | null) {
  const text = raw.trim();
  if (!text) return { value: null, error: null };
  const cleaned = method === "percent" ? text.replace(/%$/, "").trim() : method === "page" ? text.replace(/^(?:p(?:age)?\.?\s*)/i, "") : text.replace(/^(?:loc(?:ation)?\.?\s*)/i, "");
  const value = /^\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
  if (!Number.isFinite(value) || value < 0 || (method !== "percent" && !Number.isSafeInteger(value))) {
    return { value: null, error: method === "percent" ? "Enter a percentage between 0 and 100." : `${progressLabels(method).unit} must be a nonnegative whole number.` };
  }
  const limit = method === "percent" ? 100 : total;
  if (limit != null && value > limit) return { value: null, error: `${progressLabels(method).unit} cannot exceed ${limit}. Check this copy’s tracking method and total.` };
  return { value, error: null };
}
export function sessionProgressUnit(session: ProgressRecord): ProgressTrackingMethod | null {
  return progressMethod(session.tracking_unit) ?? (session.start_page != null || session.end_page != null ? "page" : null);
}
export function sessionStart(session: ProgressRecord) { return session.start_position ?? (sessionProgressUnit(session) === "page" ? session.start_page ?? null : null); }
export function sessionEnd(session: ProgressRecord) { return session.end_position ?? (sessionProgressUnit(session) === "page" ? session.end_page ?? null : null); }
export function sessionProgressLabel(session: ProgressRecord) {
  const unit = sessionProgressUnit(session), start = sessionStart(session), end = sessionEnd(session);
  if (!unit || end == null) return "Position not recorded";
  const label = progressLabels(unit).unit;
  const suffix = unit === "percent" ? "%" : "";
  return start == null ? `${label}: ${end}${suffix}` : `${label}: ${start}${suffix} → ${end}${suffix}`;
}
export function sessionDistance(session: ProgressRecord) {
  const start = sessionStart(session), end = sessionEnd(session);
  if (start == null || end == null || end < start) return null;
  return end - start + (sessionProgressUnit(session) === "page" ? 1 : 0);
}
export function progressPayload(method: ProgressTrackingMethod, start: number | null, end: number | null, total: number | null) {
  return { tracking_unit: method, start_position: start, end_position: end, progress_total: total,
    start_page: method === "page" ? start : null, end_page: method === "page" ? end : null };
}
export function progressSummary(sessions: ProgressRecord[], method: ProgressTrackingMethod | null, book: ProgressTotals) {
  const matching = method ? sessions.filter((s) => sessionProgressUnit(s) === method) : [];
  const positions = matching.map(sessionEnd).filter((p): p is number => p != null);
  const position = positions.length ? Math.max(...positions) : null;
  const timed = matching.filter((s) => !s.is_filler && s.session_mode !== "listening" && (s.minutes_read ?? 0) > 0 && sessionDistance(s) != null);
  const distance = timed.reduce((sum, s) => sum + (sessionDistance(s) ?? 0), 0);
  const minutes = timed.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  const total = matchingTotal(method, book);
  const rate = minutes > 0 && distance > 0 ? distance / minutes * 60 : null;
  return { position, total, percent: completionPercent(position, method, book), rate,
    remainingMinutes: position != null && total != null && position <= total && rate ? (total - position) / rate * 60 : null };
}
export function parseProgressRange(startText: string, endText: string, method: ProgressTrackingMethod, total: number | null) {
  const start = parseProgressPosition(startText, method, total), end = parseProgressPosition(endText, method, total);
  const error = start.error || end.error || (start.value != null && end.value == null ? "Enter the ending position." : null) ||
    (start.value != null && end.value != null && end.value < start.value ? "End position cannot be before start position." : null);
  return { error, payload: progressPayload(method, start.value, end.value, total) };
}

export function shouldPromptProgress(row: { progress_tracking_method?: unknown; personal_tracking_status?: string | null; status?: string | null; started_at?: string | null; finished_at?: string | null; dnf_at?: string | null }) {
  if (progressMethod(row.progress_tracking_method)) return false;
  if (row.personal_tracking_status) return row.personal_tracking_status === "reading";
  return !row.finished_at && !row.dnf_at && (row.status === "reading" || !!row.started_at);
}
export function nextProgressStart(position: number | null, method: ProgressTrackingMethod | null, total: number | null) {
  if (position == null) return "";
  const next = method === "page" ? position + 1 : position;
  return String(total == null ? next : Math.min(next, total));
}
