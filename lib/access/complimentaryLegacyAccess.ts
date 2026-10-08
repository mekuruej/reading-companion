export const DEFAULT_COMPLIMENTARY_LEGACY_REASON =
  "Founding/legacy member — permanent complimentary access";

export function isSuperTeacherAccount(profile: {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
} | null | undefined) {
  return profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true";
}

export function canGrantComplimentaryLegacyAccess(
  profile: {
    role?: string | null;
    is_super_teacher?: boolean | string | null;
    app_access_type?: string | null;
    app_access_subscription_id?: string | null;
  } | null | undefined,
  hasActiveSubscription: boolean
) {
  const accessType = (profile?.app_access_type ?? "").trim().toLowerCase();
  const isStaff = profile?.role === "teacher" || profile?.role === "super_teacher" ||
    profile?.role === "admin" || profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true";
  return Boolean(
    profile && !isStaff && !profile.app_access_subscription_id &&
    !hasActiveSubscription && ["free", "trial", "reading_access"].includes(accessType)
  );
}
