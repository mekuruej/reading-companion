import type { SupabaseClient } from "@supabase/supabase-js";

export type TeacherProfileForLessonBook = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
} | null;

export type StudentLessonBookResult = {
  relationshipId: string;
  userBookId: string;
};

export class StudentLessonBookError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StudentLessonBookError";
    this.status = status;
  }
}

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isSuperTeacher(profile: TeacherProfileForLessonBook) {
  return (
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

export async function canTeacherAccessStudent({
  supabase,
  teacherId,
  studentId,
  teacherProfile,
}: {
  supabase: SupabaseClient;
  teacherId: string;
  studentId: string;
  teacherProfile: TeacherProfileForLessonBook;
}) {
  if (isSuperTeacher(teacherProfile)) return true;
  if (teacherProfile?.role !== "teacher") return false;

  const { data, error } = await supabase
    .from("teacher_students")
    .select("teacher_id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function ensureStudentLessonBook({
  supabase,
  teacherId,
  studentId,
  userBookId,
  teacherProfile,
}: {
  supabase: SupabaseClient;
  teacherId: string;
  studentId: string;
  userBookId: string;
  teacherProfile: TeacherProfileForLessonBook;
}): Promise<StudentLessonBookResult> {
  const canAccess = await canTeacherAccessStudent({
    supabase,
    teacherId,
    studentId,
    teacherProfile,
  });

  if (!canAccess) {
    throw new StudentLessonBookError(
      "You do not have permission to add lesson books for that student.",
      403
    );
  }

  const { data: userBook, error: userBookError } = await supabase
    .from("user_books")
    .select("id, user_id")
    .eq("id", userBookId)
    .maybeSingle();

  if (userBookError) throw userBookError;

  if (!userBook || (userBook as any).user_id !== studentId) {
    throw new StudentLessonBookError("This book does not belong to that student.", 403);
  }

  const { data, error } = await supabase
    .from("teacher_student_lesson_books")
    .upsert(
      {
        teacher_id: teacherId,
        student_id: studentId,
        user_book_id: userBookId,
        status: "active",
        added_at: new Date().toISOString(),
        removed_at: null,
      },
      { onConflict: "teacher_id,student_id,user_book_id" }
    )
    .select("id")
    .single();

  if (error) throw error;

  return {
    relationshipId: data.id as string,
    userBookId,
  };
}
