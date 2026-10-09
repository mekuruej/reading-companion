import { getAppAccessStatus } from "./appAccess";

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

// Match billing's real active grant + permanent manual reading-access state.
export function hasActiveComplimentaryLegacyAccess(profile: {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
  app_access_subscription_id?: string | null;
  trial_started_at?: string | null;
}, hasNonRevokedGrant: boolean, hasActiveSubscription: boolean) {
  return Boolean(hasNonRevokedGrant &&
    profile.app_access_type?.trim().toLowerCase() === "reading_access" &&
    !profile.app_access_expires_at && !profile.app_access_subscription_id &&
    !profile.trial_started_at && !hasActiveSubscription &&
    getAppAccessStatus(profile).reason === "active");
}
