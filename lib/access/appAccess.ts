// App Access
//

type AppAccessProfile = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
};

export type CanonicalAppAccessType =
  | "free"
  | "trial"
  | "reading_access"
  | "lesson_access"
  | "inactive";

export type LegacyAppAccessAlias =
  | "student"
  | "paid"
  | "full_access"
  | "book_club"
  | "expired"
  | "none";

type AppAccessStatus = {
  // Can the user enter the app at all?
  hasAccess: boolean;

  // Can the user use full-access learning features?
  // Free users can enter the app, but this should be false.
  hasFullAccess: boolean;
  accessType: string;
  daysRemaining: number | null;
  isTrialActive: boolean;
  isTrialExpired: boolean;

  reason:
  | "staff"
  | "free"
  | "inactive"
  | "none"
  | "expired"
  | "no_expiration"
  | "invalid_expiration"
  | "unknown"
  | "active"
  | "trial";
};

const CANONICAL_FULL_ACCESS_TYPES = new Set<CanonicalAppAccessType>([
  "reading_access",
  "lesson_access",
]);

// Temporary read aliases for rows that predate the canonical entitlement
// vocabulary. New database writes should use CanonicalAppAccessType only.
const LEGACY_FULL_ACCESS_ALIASES = new Set<LegacyAppAccessAlias>([
  "student",
  "paid",
  "book_club",
  "full_access",
]);

export function isMissingAppAccessColumnError(error: any) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export function getAppAccessStatus(profile: AppAccessProfile): AppAccessStatus {
  const role = profile.role ?? "";
  const accessType = (profile.app_access_type ?? "").trim().toLowerCase();
  const expiresAt = profile.app_access_expires_at ?? null;
  const expiry = expiresAt ? new Date(expiresAt).getTime() : null;
  const hasExpiry = Boolean(expiresAt);
  const hasValidExpiry = expiry != null && !Number.isNaN(expiry);
  const expiryIsActive = hasValidExpiry && expiry >= Date.now();

  function status(
    values: Omit<
      AppAccessStatus,
      "accessType" | "daysRemaining" | "isTrialActive" | "isTrialExpired"
    >
  ): AppAccessStatus {
    const daysRemaining =
      hasValidExpiry
        ? Math.max(0, Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;
    const isTrial = accessType === "trial";

    return {
      ...values,
      accessType,
      daysRemaining,
      isTrialActive: isTrial && values.hasFullAccess,
      isTrialExpired:
        isTrial && !values.hasFullAccess && hasValidExpiry && !expiryIsActive,
    };
  }

  function expiringFullAccessStatus() {
    if (!hasExpiry) {
      return status({ hasAccess: true, hasFullAccess: true, reason: "active" });
    }

    if (!hasValidExpiry) {
      return status({
        hasAccess: true,
        hasFullAccess: false,
        reason: "invalid_expiration",
      });
    }

    return status({
      hasAccess: true,
      hasFullAccess: expiryIsActive,
      reason: expiryIsActive ? "active" : "expired",
    });
  }

  if (
    role === "teacher" ||
    role === "super_teacher" ||
    role === "admin" ||
    profile.is_super_teacher === true ||
    profile.is_super_teacher === "true"
  ) {
    return status({ hasAccess: true, hasFullAccess: true, reason: "staff" });
  }

  if (accessType === "free") {
    return status({ hasAccess: true, hasFullAccess: false, reason: "free" });
  }

  if (accessType === "trial") {
    if (!hasExpiry) {
      return status({
        hasAccess: true,
        hasFullAccess: false,
        reason: "no_expiration",
      });
    }

    if (!hasValidExpiry) {
      return status({
        hasAccess: true,
        hasFullAccess: false,
        reason: "invalid_expiration",
      });
    }

    return status({
      hasAccess: true,
      hasFullAccess: expiryIsActive,
      reason: expiryIsActive ? "trial" : "expired",
    });
  }

  if (accessType === "expired") {
    return status({ hasAccess: true, hasFullAccess: false, reason: "expired" });
  }

  if (accessType === "none" || accessType === "inactive") {
    return status({ hasAccess: false, hasFullAccess: false, reason: accessType });
  }

  if (
    CANONICAL_FULL_ACCESS_TYPES.has(accessType as CanonicalAppAccessType) ||
    LEGACY_FULL_ACCESS_ALIASES.has(accessType as LegacyAppAccessAlias)
  ) {
    return expiringFullAccessStatus();
  }

  if (!expiresAt) {
    return status({ hasAccess: true, hasFullAccess: false, reason: "no_expiration" });
  }

  if (!hasValidExpiry) {
    return status({ hasAccess: true, hasFullAccess: false, reason: "invalid_expiration" });
  }

  return status({
    hasAccess: true,
    hasFullAccess: false,
    reason: "unknown",
  });
}
