export const PERSONAL_TRACKING_STATUSES = [
  "not_tracking",
  "want_to_read",
  "reading",
  "finished",
  "dnf",
] as const;

export type PersonalTrackingStatus = (typeof PERSONAL_TRACKING_STATUSES)[number];

type LegacyReadingState = {
  personal_tracking_status?: string | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  dnf_at?: string | null;
};

export function isPersonalTrackingStatus(value: unknown): value is PersonalTrackingStatus {
  return (
    typeof value === "string" &&
    PERSONAL_TRACKING_STATUSES.includes(value as PersonalTrackingStatus)
  );
}

export function resolvePersonalTrackingStatus(
  row: LegacyReadingState | null | undefined
): PersonalTrackingStatus {
  if (isPersonalTrackingStatus(row?.personal_tracking_status)) {
    return row.personal_tracking_status;
  }

  if (row?.dnf_at || row?.status === "did_not_finish") return "dnf";
  if (row?.finished_at || row?.status === "finished") return "finished";
  if (row?.status === "reading" || row?.started_at) return "reading";
  if (row?.status === "what_to_read") return "want_to_read";

  return "want_to_read";
}

export function personalTrackingStatusLabel(status: PersonalTrackingStatus) {
  switch (status) {
    case "not_tracking":
      return "Not Personally Tracking";
    case "want_to_read":
      return "Want to Read";
    case "reading":
      return "Currently Reading";
    case "finished":
      return "Finished";
    case "dnf":
      return "DNF";
  }
}

export function legacyUserBookStatusForPersonalTracking(status: PersonalTrackingStatus) {
  switch (status) {
    case "dnf":
      return "did_not_finish";
    case "finished":
      return "finished";
    case "reading":
      return "reading";
    case "not_tracking":
    case "want_to_read":
      return "what_to_read";
  }
}

export function personalTrackingStatusFromDates({
  startedAt,
  finishedAt,
  dnfAt,
}: {
  startedAt?: string | null;
  finishedAt?: string | null;
  dnfAt?: string | null;
}): PersonalTrackingStatus {
  if (dnfAt) return "dnf";
  if (finishedAt) return "finished";
  if (startedAt) return "reading";
  return "want_to_read";
}

export function isPersonalReadingTracked(row: LegacyReadingState | null | undefined) {
  return resolvePersonalTrackingStatus(row) !== "not_tracking";
}
