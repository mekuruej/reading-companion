type ProfileLike = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
};

export type StudentWorkspaceBackContext = {
  href: string;
  label: string;
  studentId: string;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isSuperTeacher(profile: ProfileLike | null | undefined) {
  return (
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

export async function resolveStudentWorkspaceBackContext({
  supabase,
  from,
  requestedStudentId,
  currentUserId,
  profile,
  ownerUserId,
}: {
  supabase: any;
  from: string | null;
  requestedStudentId: string | null;
  currentUserId: string;
  profile: ProfileLike | null | undefined;
  ownerUserId: string | null | undefined;
}): Promise<StudentWorkspaceBackContext | null> {
  if (from !== "student-workspace") return null;
  if (!requestedStudentId || !ownerUserId || requestedStudentId !== ownerUserId) return null;
  if (ownerUserId === currentUserId) return null;

  const isSuper = isSuperTeacher(profile);
  if (!isSuper && profile?.role !== "teacher") return null;

  if (!isSuper) {
    const { data: link, error: linkError } = await supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("teacher_id", currentUserId)
      .eq("student_id", requestedStudentId)
      .is("archived_at", null)
      .maybeSingle();

    if (linkError || !link) return null;
  }

  const { data: studentProfile, error: studentError } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", requestedStudentId)
    .maybeSingle();

  if (studentError) return null;

  const studentName =
    studentProfile?.display_name || studentProfile?.username || "Student";

  return {
    href: `/teacher/students/${encodeURIComponent(requestedStudentId)}/workspace`,
    label: `← Back to ${studentName}'s Workspace`,
    studentId: requestedStudentId,
  };
}
