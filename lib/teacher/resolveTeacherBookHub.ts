import { hasValidTeacherOwnedWorkspace } from "@/lib/books/userBookWorkspace";
import { ensureTeacherBookSupport } from "@/lib/teacher/ensureTeacherBookSupport";
import type { supabase } from "@/lib/supabaseClient";

type SupabaseLike = typeof supabase;

function isTeacherProfile(profile: Record<string, unknown> | null) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

/** Resolve an owned Teacher Book to its canonical Book Hub, creating a teaching-only workspace when needed. */
export async function resolveTeacherBookHubUserBookId(
  supabase: SupabaseLike,
  teacherBookId: string
): Promise<string> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user) throw new Error("Please sign in.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_super_teacher")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!isTeacherProfile(profile)) throw new Error("Teacher access is required.");

  const { data: teacherBook, error: teacherBookError } = await supabase
    .from("teacher_books")
    .select("id, teacher_id, book_id, user_book_id")
    .eq("id", teacherBookId)
    .maybeSingle();
  if (teacherBookError) throw teacherBookError;
  if (!teacherBook) throw new Error("This Teacher Book could not be found.");
  if (teacherBook.teacher_id !== user.id) {
    throw new Error("Only the owner can open this Teacher Book in their Book Hub.");
  }

  let userBookId = teacherBook.user_book_id as string | null;
  const linkedWorkspaceIsValid = await hasValidTeacherOwnedWorkspace({
    supabase,
    teacherId: user.id,
    bookId: teacherBook.book_id,
    userBookId,
  });

  if (!linkedWorkspaceIsValid) {
    const repaired = await ensureTeacherBookSupport(supabase, user.id, teacherBook.book_id);
    if (repaired.id !== teacherBook.id) {
      throw new Error("More than one Teacher Book matches this book.");
    }
    userBookId = repaired.user_book_id;
  }

  const isValid = await hasValidTeacherOwnedWorkspace({
    supabase,
    teacherId: user.id,
    bookId: teacherBook.book_id,
    userBookId,
  });
  if (!isValid || !userBookId) {
    throw new Error("Could not resolve this Teacher Book to your Book Hub.");
  }

  return userBookId;
}
