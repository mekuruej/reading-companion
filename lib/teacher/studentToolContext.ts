import type { SupabaseClient } from "@supabase/supabase-js";
import { canTeachTargetUser } from "@/lib/teacher/targetUserAccess";

export class StudentContextError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}

// Resolve the exact copy, never the first copy for a catalog book. No relationships are created.
export async function validateStudentToolContext(db: SupabaseClient, actorId: string, context: {
  studentId: string; userBookId: string; sourceUserBookId?: string; bookId?: string;
}) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(context.studentId) || !uuid.test(context.userBookId)) {
    throw new StudentContextError("A valid student and exact student book are required.", 400);
  }
  const [actor, copy, person] = await Promise.all([
    db.from("profiles").select("role, is_super_teacher").eq("id", actorId).maybeSingle(),
    db.from("user_books").select("id, user_id, book_id").eq("id", context.userBookId).maybeSingle(),
    db.from("profiles").select("id, display_name, username").eq("id", context.studentId).maybeSingle(),
  ]);
  for (const result of [actor, copy, person]) if (result.error) throw result.error;
  if (!copy.data || copy.data.user_id !== context.studentId || !person.data || actorId === context.studentId ||
      !await canTeachTargetUser({ supabase: db, actorId, targetUserId: context.studentId, actorProfile: actor.data, allowSelf: false })) {
    throw new StudentContextError("You do not have access to this student's book.");
  }
  if (context.bookId && copy.data.book_id !== context.bookId) throw new StudentContextError("The student book does not match this book.");
  if (context.sourceUserBookId) {
    const source = await db.from("user_books").select("user_id, book_id").eq("id", context.sourceUserBookId).maybeSingle();
    if (source.error) throw source.error;
    if (!source.data || source.data.user_id !== actorId || source.data.book_id !== copy.data.book_id) {
      throw new StudentContextError("The student book does not match the teacher's source book.");
    }
  }
  return { studentId: context.studentId, studentUserBookId: copy.data.id, bookId: copy.data.book_id,
    studentName: person.data.display_name || person.data.username || "Student", person: person.data };
}
