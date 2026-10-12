export function canMaintainCatalog(profile: { role?: string | null; is_super_teacher?: boolean | string | null } | null) {
  return profile?.role === "admin" || profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true || profile?.is_super_teacher === "true";
}
