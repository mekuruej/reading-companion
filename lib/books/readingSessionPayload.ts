import { progressMethod, parseProgressRange, matchingTotal, type ProgressTotals } from "./readingProgress";
type SessionInput = { tracking_unit?: string | null; start_position?: number | null; end_position?: number | null; start_page?: number | null; end_page?: number | null; minutes_read?: number | null; read_on?: string | null; session_mode?: string | null };
type ReaderBook = { progress_tracking_method?: string | null; books?: ProgressTotals | ProgressTotals[] | null };
export function normalizeSessionPayload(body: SessionInput, book: ReaderBook, existing?: { tracking_unit?: string | null; progress_total?: number | null }) {
  const method = progressMethod(existing?.tracking_unit) ?? progressMethod(body?.tracking_unit) ??
    (body?.start_page != null || body?.end_page != null ? "page" : progressMethod(book.progress_tracking_method));
  if (existing?.tracking_unit && body?.tracking_unit && existing.tracking_unit !== body.tracking_unit) {
    throw Object.assign(new Error("Existing history must retain its original unit."), { status: 400 });
  }
  if (body?.tracking_unit != null && !progressMethod(body.tracking_unit)) throw Object.assign(new Error("Invalid tracking unit."), { status: 400 });
  if (method !== "page" && (body?.start_page != null || body?.end_page != null)) throw Object.assign(new Error("Non-page progress must not use page columns."), { status: 400 });
  const totals = Array.isArray(book.books) ? book.books[0] : book.books;
  const start = body?.start_position ?? body?.start_page ?? null;
  const end = body?.end_position ?? body?.end_page ?? null;
  if (!method && (start != null || end != null)) throw Object.assign(new Error("Choose a tracking method first."), { status: 400 });
  const parsed = method ? parseProgressRange(start == null ? "" : String(start), end == null ? "" : String(end), method,
    existing ? existing.progress_total ?? null : matchingTotal(method, totals ?? {})) : null;
  if (parsed?.error) throw Object.assign(new Error(parsed.error), { status: 400 });
  const minutes = body?.minutes_read ?? null;
  if (minutes != null && (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0)) throw Object.assign(new Error("Minutes must be positive."), { status: 400 });
  return {
    read_on: typeof body?.read_on === "string" ? body.read_on : null,
    ...(parsed?.payload ?? { tracking_unit: null, start_position: null, end_position: null, progress_total: null, start_page: null, end_page: null }),
    minutes_read: minutes,
    session_mode: ["curiosity", "listening", "fluid"].includes(body?.session_mode ?? "") ? body.session_mode : "fluid",
  };
}
