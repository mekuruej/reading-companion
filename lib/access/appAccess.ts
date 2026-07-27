// App Access
//

type AppAccessProfile = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
};

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
  | "active"
  | "trial";
};

const FULL_ACCESS_TYPES = new Set([
  "student",
  "reading_access",
  "lesson_access",
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

  function status(
    values: Omit<
      AppAccessStatus,
      "accessType" | "daysRemaining" | "isTrialActive" | "isTrialExpired"
    >
  ): AppAccessStatus {
    const expiry = expiresAt ? new Date(expiresAt).getTime() : null;
    const daysRemaining =
      expiry && !Number.isNaN(expiry)
        ? Math.max(0, Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;
    const isTrial = accessType === "trial";

    return {
      ...values,
      accessType,
      daysRemaining,
      isTrialActive: isTrial && values.hasFullAccess,
      isTrialExpired: isTrial && !values.hasFullAccess && values.reason === "expired",
    };
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

  if (accessType === "expired") {
    return status({ hasAccess: true, hasFullAccess: false, reason: "expired" });
  }

  if (accessType === "none" || accessType === "inactive") {
    return status({ hasAccess: false, hasFullAccess: false, reason: accessType });
  }

  if (FULL_ACCESS_TYPES.has(accessType)) {
    return status({ hasAccess: true, hasFullAccess: true, reason: "active" });
  }

  if (!expiresAt) {
    return status({ hasAccess: true, hasFullAccess: false, reason: "no_expiration" });
  }

  const expiry = new Date(expiresAt).getTime();

  if (Number.isNaN(expiry)) {
    return status({ hasAccess: true, hasFullAccess: false, reason: "invalid_expiration" });
  }

  const isActive = expiry >= Date.now();

  return status({
    hasAccess: true,
    hasFullAccess: isActive,
    reason: isActive && accessType === "trial" ? "trial" : isActive ? "active" : "expired",
  });
}
