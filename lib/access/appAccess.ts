// App Access
//

type AppAccessProfile = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
};

type AppAccessStatus = {
  // Can the user enter the app at all?
  hasAccess: boolean;

  // Can the user use full-access learning features?
  // Free users can enter the app, but this should be false.
  hasFullAccess: boolean;
  accessType: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
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

export function getAppAccessStatus(profile: AppAccessProfile): AppAccessStatus {
  const role = profile.role ?? "";
  const accessType = profile.app_access_type ?? "";
  const trialEndsAt = profile.trial_ends_at ?? null;
  const expiresAt = profile.app_access_expires_at ?? trialEndsAt;

  function status(
    values: Omit<
      AppAccessStatus,
      "accessType" | "trialStartedAt" | "trialEndsAt" | "daysRemaining" | "isTrialActive" | "isTrialExpired"
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
      trialStartedAt: profile.trial_started_at ?? null,
      trialEndsAt,
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

  if (!expiresAt) {
    return status({ hasAccess: true, hasFullAccess: true, reason: "no_expiration" });
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
