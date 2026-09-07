import { getOrCreateUserBook, hasValidTeacherOwnedWorkspace } from "@/lib/books/userBookWorkspace";

// Call after authenticating the teacher and authorizing the student workspace.
// Only the catalog book ID crosses from student context into personal ownership.
export async function ensureTeacherBookSupport(supabase: any, teacherId: string, bookId: string) {
  const { userBookId } = await getOrCreateUserBook({
    supabase,
    userId: teacherId,
    bookId,
    initialPersonalTrackingStatus: "not_tracking",
    enablePersonalTracking: false,
  });

  const columns = "id, teacher_use_status, teacher_use_note, user_book_id";
  async function findTeacherBook() {
    const { data, error } = await supabase
      .from("teacher_books")
      .select(columns)
      .eq("teacher_id", teacherId)
      .eq("book_id", bookId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function repairLink(teacherBook: any) {
    if (await hasValidTeacherOwnedWorkspace({
      supabase, teacherId, bookId, userBookId: teacherBook.user_book_id,
    })) return teacherBook;

    // Match Add Book's repair policy, retaining all existing teaching content.
    const { data, error } = await supabase
      .from("teacher_books")
      .update({ user_book_id: userBookId })
      .eq("id", teacherBook.id)
      .eq("teacher_id", teacherId)
      .eq("book_id", bookId)
      .select(columns)
      .single();
    if (error) throw error;
    return data;
  }

  const existing = await findTeacherBook();
  if (existing) return repairLink(existing);

  const { data, error } = await supabase
    .from("teacher_books")
    .insert({
      teacher_id: teacherId,
      book_id: bookId,
      user_book_id: userBookId,
      teacher_use_status: null,
    })
    .select(columns)
    .single();

  if (error?.code === "23505") {
    const raced = await findTeacherBook();
    if (raced) return repairLink(raced);
  }
  if (error) throw error;
  return data;
}
