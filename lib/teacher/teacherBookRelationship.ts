import type { TeachingDifficulty, TeachingStatus } from "@/lib/teachingStatus";

type SupabaseLike = any;

export type TeacherBookRelationship = {
  id: string;
  teacher_id: string;
  book_id: string;
  user_book_id: string | null;
  teaching_status: TeachingStatus | null;
  teacher_jlpt_difficulty: TeachingDifficulty | null;
  teaching_suitability?: string | null;
  teacher_use_note?: string | null;
};

type ResolveTeacherBookRelationshipInput = {
  supabase: SupabaseLike;
  teacherId: string;
  bookId: string;
  userBookId: string;
};

function chooseTeacherBookRelationship(
  rows: TeacherBookRelationship[],
  userBookId: string
) {
  if (rows.length === 0) return null;
  const linkedToCurrent = rows.filter((row) => row.user_book_id === userBookId);
  if (linkedToCurrent.length === 1) return linkedToCurrent[0];
  if (linkedToCurrent.length > 1) {
    throw new Error("More than one Teacher Book is linked to this Book Hub.");
  }
  if (rows.length === 1) return rows[0];
  throw new Error("More than one Teacher Book matches this book. Please choose one from Teaching Books.");
}

export async function loadTeacherBookRelationship({
  supabase,
  teacherId,
  bookId,
  userBookId,
}: ResolveTeacherBookRelationshipInput) {
  const { data, error } = await supabase
    .from("teacher_books")
    .select(
      "id, teacher_id, book_id, user_book_id, teaching_status, teacher_jlpt_difficulty, teaching_suitability, teacher_use_note"
    )
    .eq("teacher_id", teacherId)
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return chooseTeacherBookRelationship((data ?? []) as TeacherBookRelationship[], userBookId);
}

export async function ensureTeacherBookRelationship({
  supabase,
  teacherId,
  bookId,
  userBookId,
}: ResolveTeacherBookRelationshipInput) {
  const existing = await loadTeacherBookRelationship({
    supabase,
    teacherId,
    bookId,
    userBookId,
  });

  if (existing?.id) {
    if (!existing.user_book_id) {
      const { error } = await supabase
        .from("teacher_books")
        .update({ user_book_id: userBookId })
        .eq("id", existing.id);

      if (error) throw error;
      return { ...existing, user_book_id: userBookId };
    }

    if (existing.user_book_id !== userBookId) {
      throw new Error("This Teacher Book is linked to a different Book Hub.");
    }

    return existing;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("teacher_books")
    .insert({
      teacher_id: teacherId,
      book_id: bookId,
      user_book_id: userBookId,
    })
    .select(
      "id, teacher_id, book_id, user_book_id, teaching_status, teacher_jlpt_difficulty, teaching_suitability, teacher_use_note"
    )
    .single();

  if (insertError?.code === "23505") {
    const raced = await loadTeacherBookRelationship({
      supabase,
      teacherId,
      bookId,
      userBookId,
    });

    if (!raced?.id) throw insertError;
    if (!raced.user_book_id) {
      const { error } = await supabase
        .from("teacher_books")
        .update({ user_book_id: userBookId })
        .eq("id", raced.id);

      if (error) throw error;
      return { ...raced, user_book_id: userBookId };
    }

    return raced;
  }

  if (insertError) throw insertError;
  return inserted as TeacherBookRelationship;
}
