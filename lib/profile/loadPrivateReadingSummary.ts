import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAllPagedRows } from "@/lib/vocabulary/loadAllPagedRows";
import { getProfileActivityDateBounds, getProfileBookCounts, PROFILE_READING_SESSION_MODES, type ProfileBookStatusRow } from "./privateReadingSummary";

export async function loadPrivateReadingSummary(client: SupabaseClient, ownerId: string, now = new Date()) {
  const books = await loadAllPagedRows<ProfileBookStatusRow & { id: string }>((from, to) => client
    .from("user_books")
    .select("id, personal_tracking_status, status, started_at, finished_at, dnf_at, is_teacher_prep", { count: "exact" })
    .eq("user_id", ownerId).order("id", { ascending: true }).range(from, to));
  const { today, monthStart } = getProfileActivityDateBounds(now);
  const querySessions = () => client.from("user_book_reading_sessions")
    .select("id,user_books!inner(user_id)", { count: "exact", head: true })
    .eq("user_books.user_id", ownerId)
    .or("personal_tracking_status.is.null,personal_tracking_status.neq.not_tracking", { foreignTable: "user_books" })
    .or("is_teacher_prep.is.null,is_teacher_prep.eq.false", { foreignTable: "user_books" })
    .or("is_filler.is.null,is_filler.eq.false")
    .in("session_mode", [...PROFILE_READING_SESSION_MODES]);
  const [todayResult, monthResult] = await Promise.all([
    querySessions().eq("read_on", today),
    querySessions().gte("read_on", monthStart).lte("read_on", today).gt("minutes_read", 0),
  ]);
  for (const result of [todayResult, monthResult]) {
    if (result.error) throw result.error;
    if (!Number.isSafeInteger(result.count) || result.count! < 0) throw new Error("Reading activity count unavailable.");
  }
  const counts = getProfileBookCounts(books);
  return { readToday: todayResult.count! > 0, currentlyReading: counts.currentlyReading, sessionsWithTimeLoggedThisMonth: monthResult.count!, booksFinished: counts.finished };
}
