export type TeacherReviewCompletionFields = {
  id?: string | null;
  book_id?: string | null;
  finished_at?: string | null;
  dnf_at?: string | null;
  recommended_level?: string | null;
  teacher_student_use_rating?: number | null;
  teacher_review_cleared_at?: string | null;
};

export function isTeacherReviewComplete(item: TeacherReviewCompletionFields) {
  return (
    !!String(item.recommended_level ?? "").trim() &&
    item.teacher_student_use_rating != null
  );
}

export function needsTeacherReviewRating(item: TeacherReviewCompletionFields) {
  return (
    !!item.finished_at &&
    !item.dnf_at &&
    !item.teacher_review_cleared_at &&
    !isTeacherReviewComplete(item)
  );
}

export function teacherReviewQueueKey(item: TeacherReviewCompletionFields) {
  return item.book_id ?? `user-book:${item.id ?? ""}`;
}

export function countNeededTeacherRatingBooks(items: TeacherReviewCompletionFields[]) {
  const bookIds = new Set<string>();

  for (const item of items) {
    if (needsTeacherReviewRating(item)) {
      bookIds.add(teacherReviewQueueKey(item));
    }
  }

  return bookIds.size;
}
