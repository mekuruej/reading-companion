// App Access
//

type AppAccessProfile = {
  role?: string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
};

type AppAccessStatus = {
  // Can the user enter the app at all?
  hasAccess: boolean;

  // Can the user use full-access learning features?
  // Free users can enter the app, but this should be false.
  hasFullAccess: boolean;

  reason:
    | "staff"
    | "free"
    | "inactive"
    | "none"
    | "expired"
    | "no_expiration"
    | "invalid_expiration"
    | "active";
};

export function getAppAccessStatus(profile: AppAccessProfile): AppAccessStatus {
  const role = profile.role ?? "";
  const accessType = profile.app_access_type ?? "";
  const expiresAt = profile.app_access_expires_at;

  if (role === "teacher" || role === "super_teacher" || role === "admin") {
    return { hasAccess: true, hasFullAccess: true, reason: "staff" };
  }

  if (accessType === "free") {
    return { hasAccess: true, hasFullAccess: false, reason: "free" };
  }

  if (accessType === "none" || accessType === "expired" || accessType === "inactive") {
    return { hasAccess: false, hasFullAccess: false, reason: accessType };
  }

  if (!expiresAt) {
    return { hasAccess: true, hasFullAccess: true, reason: "no_expiration" };
  }

  const expiry = new Date(expiresAt).getTime();

  if (Number.isNaN(expiry)) {
    return { hasAccess: true, hasFullAccess: true, reason: "invalid_expiration" };
  }

  const isActive = expiry >= Date.now();

  return {
    hasAccess: isActive,
    hasFullAccess: isActive,
    reason: isActive ? "active" : "expired",
  };
}