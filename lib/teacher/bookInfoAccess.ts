type Profile = { role?: string | null; is_super_teacher?: unknown } | null;

export function canReviewBookInfo(profile: Profile) {
  return profile?.role === "admin" || profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true || profile?.is_super_teacher === "true";
}

// Exact routes only: an admin catalog role does not grant access to student tools.
export function canEnterTeacherRoute(profile: Profile, pathname: string | null) {
  if (profile?.role === "teacher" || profile?.role === "super_teacher" ||
      !!profile?.is_super_teacher) return true;
  return profile?.role === "admin" && [
    "/teacher/admin", "/teacher/books", "/teacher/books/missing-info",
    "/teacher/books/new-review", "/teacher/books/add", "/teacher/needs-attention",
  ].includes(pathname ?? "");
}
