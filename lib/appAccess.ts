export type AppAccessType = "student" | "trial" | "inactive";

export type AppAccessProfile = {
  role?: string | null;
  app_access_type?: AppAccessType | null;
  app_access_expires_at?: string | null;
};

export function getAppAccessStatus(profile: AppAccessProfile | null) {
  if (!profile) {
    return {
      hasAccess: false,
      isExpired: false,
      daysLeft: 0,
    };
  }

  // Teachers should always be able to enter
  if (profile.role === "teacher" || profile.role === "super_teacher") {
    return {
      hasAccess: true,
      isExpired: false,
      daysLeft: null as number | null,
    };
  }

  if (profile.app_access_type === "student") {
    return {
      hasAccess: true,
      isExpired: false,
      daysLeft: null as number | null,
    };
  }

  if (profile.app_access_type === "trial") {
    if (!profile.app_access_expires_at) {
      return {
        hasAccess: false,
        isExpired: true,
        daysLeft: 0,
      };
    }

    const expiresAt = new Date(profile.app_access_expires_at).getTime();
    const now = Date.now();
    const msLeft = expiresAt - now;

    if (msLeft <= 0) {
      return {
        hasAccess: false,
        isExpired: true,
        daysLeft: 0,
      };
    }

    return {
      hasAccess: true,
      isExpired: false,
      daysLeft: Math.ceil(msLeft / (1000 * 60 * 60 * 24)),
    };
  }

  return {
    hasAccess: false,
    isExpired: false,
    daysLeft: 0,
  };
}