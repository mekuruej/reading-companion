type AppAccessProfile = {
  role?: string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
};

export function getAppAccessStatus(profile: AppAccessProfile) {
  const role = profile.role ?? "";
  const accessType = profile.app_access_type ?? "";
  const expiresAt = profile.app_access_expires_at;

  if (role === "teacher" || role === "admin") {
    return { hasAccess: true, reason: "staff" };
  }

  if (accessType === "none" || accessType === "expired") {
    return { hasAccess: false, reason: accessType };
  }

  if (!expiresAt) {
    return { hasAccess: true, reason: "no_expiration" };
  }

  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) {
    return { hasAccess: true, reason: "invalid_expiration" };
  }

  return {
    hasAccess: expiry >= Date.now(),
    reason: expiry >= Date.now() ? "active" : "expired",
  };
}
