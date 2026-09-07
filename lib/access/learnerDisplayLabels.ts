import { getAppAccessStatus } from "./appAccess";

export type LearnerDisplayLabelInput = {
  role?: string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
  linkedToTeacher?: boolean;
};

function formatAccessDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getLearnerAccessDisplay(profile: LearnerDisplayLabelInput) {
  if (profile.linkedToTeacher) {
    return {
      label: "Teacher-linked student",
      detail: null,
      effectiveAccessLabel: null,
    };
  }

  const accessStatus = getAppAccessStatus(profile);
  const accessType = (profile.app_access_type ?? "").trim().toLowerCase();
  const expiresDate = formatAccessDate(profile.app_access_expires_at);

  if (accessType === "trial") {
    if (accessStatus.isTrialActive) {
      return {
        label: "Active Trial",
        detail: expiresDate ? `Ends ${expiresDate}` : "End date not set",
        effectiveAccessLabel: null,
      };
    }

    if (accessStatus.isTrialExpired) {
      return {
        label: "Completed Trial",
        detail: expiresDate ? `Ended ${expiresDate}` : "Trial ended",
        effectiveAccessLabel: "Current effective access: Free",
      };
    }

    return {
      label: "Trial",
      detail: expiresDate ? `Ends ${expiresDate}` : "End date not set",
      effectiveAccessLabel: accessStatus.hasFullAccess
        ? null
        : "Current effective access: Free",
    };
  }

  if (accessType === "free") {
    return {
      label: "Free",
      detail: "No completed trial",
      effectiveAccessLabel: null,
    };
  }

  if (accessType === "reading_access") {
    return {
      label: "Reading Access",
      detail: expiresDate ? `Expires ${expiresDate}` : null,
      effectiveAccessLabel: null,
    };
  }

  if (accessType === "lesson_access") {
    return {
      label: "Lesson Access",
      detail: expiresDate ? `Expires ${expiresDate}` : null,
      effectiveAccessLabel: null,
    };
  }

  if (accessType === "inactive") {
    return {
      label: "Inactive",
      detail: null,
      effectiveAccessLabel: null,
    };
  }

  if (accessType === "student") {
    return {
      label: "Legacy Japanese Learning",
      detail: expiresDate ? `Expires ${expiresDate}` : null,
      effectiveAccessLabel: null,
    };
  }

  if (profile.role === "teacher") {
    return {
      label: "Teacher",
      detail: null,
      effectiveAccessLabel: null,
    };
  }

  return {
    label: "Learner",
    detail: null,
    effectiveAccessLabel: null,
  };
}

export function getLearnerAccessLabel(profile: LearnerDisplayLabelInput) {
  return getLearnerAccessDisplay(profile).label;
}
