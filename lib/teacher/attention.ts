import type { SupabaseClient } from "@supabase/supabase-js";
import { canUseStudentsIndex, type StudentsActor } from "./studentsIndex";
import { isAllUserTeacher } from "./targetUserAccess";

// Shared with the canonical Student Workspace detail queries.
export const REVIEW_ATTENTION_STATUSES = ["reviewing", "deferred"];
export const PENDING_BOOK_REQUEST_FILTER = "status.eq.pending,status.is.null";
export type TeacherAttention = { total: number; byStudent: Record<string, number> };

async function collect(query: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>) {
  const rows: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export async function loadTeacherAttention(db: SupabaseClient, actorId: string, actor: StudentsActor | null): Promise<TeacherAttention> {
  const result: TeacherAttention = { total: 0, byStudent: {} };
  if (!canUseStudentsIndex(actor)) return result;
  const links = await collect((from, to) => {
    let query = db.from("teacher_students").select("teacher_id, student_id")
      .is("archived_at", null).order("teacher_id").order("student_id").range(from, to);
    if (!isAllUserTeacher(actor)) query = query.eq("teacher_id", actorId);
    return query;
  });
  const ids = [...new Set<string>(links.map(link => link.student_id))].filter(id => id !== actorId);
  // Bounded IN lists and paginated identity-only results, never one query per student.
  for (let start = 0; start < ids.length; start += 200) {
    const batch = ids.slice(start, start + 200);
    const [reviews, requests] = await Promise.all([
      collect((from, to) => db.from("live_lesson_capture_sessions").select("id, student_id")
        .eq("teacher_id", actorId).in("student_id", batch).in("status", REVIEW_ATTENTION_STATUSES)
        .order("id").range(from, to)),
      collect((from, to) => db.from("book_requests").select("id, user_id")
        .in("user_id", batch).or(PENDING_BOOK_REQUEST_FILTER).order("id").range(from, to)),
    ]);
    for (const row of [...reviews.map(row => ({ studentId: row.student_id })), ...requests.map(row => ({ studentId: row.user_id }))]) {
      result.byStudent[row.studentId] = (result.byStudent[row.studentId] ?? 0) + 1;
      result.total += 1;
    }
  }
  return result;
}
