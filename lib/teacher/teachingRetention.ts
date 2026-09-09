// Server-side only: call with the privileged client after authenticating ownership.
// A positive dependency retains the workspace regardless of teaching status.
export async function requiresTeachingRetention(
  db: any,
  ownerId: string,
  bookId: string,
  userBookId: string
): Promise<boolean> {
  if (!ownerId || !bookId || !userBookId) throw new Error("Missing workspace identity.");

  const checks = [
    () => db.from("teacher_books").select("id").eq("teacher_id", ownerId).eq("book_id", bookId),
    // Include mismatched ownership/catalog links: never destroy their anchor.
    () => db.from("teacher_books").select("id").eq("user_book_id", userBookId),
    () => db.from("teacher_book_prep_items").select("id").eq("teacher_id", ownerId).eq("book_id", bookId),
    () => db.from("teacher_book_prep_items").select("id").eq("prep_user_book_id", userBookId),
    () => db.from("teacher_book_vocabulary").select("id").eq("teacher_id", ownerId).eq("book_id", bookId),
    () => db.from("teacher_notebook_entry_contexts")
      .select("id,teacher_notebook_entries!inner(teacher_id)")
      .eq("teacher_notebook_entries.teacher_id", ownerId).eq("book_id", bookId),
    () => db.from("teacher_notebook_entry_contexts").select("id").eq("user_book_id", userBookId),
    () => db.from("teacher_notebook_word_lists").select("id").eq("teacher_id", ownerId).eq("book_id", bookId),
    () => db.from("teacher_notebook_word_lists").select("id").eq("user_book_id", userBookId),
    // Student copies are separate: resolve their catalog identity through the join.
    // Retain historical as well as active lesson relationships.
    () => db.from("teacher_student_lesson_books").select("id,user_books!inner(book_id)")
      .eq("teacher_id", ownerId).eq("user_books.book_id", bookId),
  ];

  for (const check of checks) {
    const { data, error } = await check().limit(1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Could not determine teaching dependencies.");
    if (data.length > 0) return true;
  }
  return false;
}
