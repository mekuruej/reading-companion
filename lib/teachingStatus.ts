export const TEACHING_STATUSES = [
  "considering",
  "currently_teaching",
  "previously_taught",
  "not_for_teaching",
] as const;

export type TeachingStatus = (typeof TEACHING_STATUSES)[number];

export const TEACHING_DIFFICULTIES = [
  "n5",
  "n4",
  "n3",
  "n2",
  "n1",
  "above_n1",
] as const;

export type TeachingDifficulty = (typeof TEACHING_DIFFICULTIES)[number];

export function isTeachingStatus(value: string | null | undefined): value is TeachingStatus {
  return TEACHING_STATUSES.includes(value as TeachingStatus);
}

export function isTeachingDifficulty(
  value: string | null | undefined
): value is TeachingDifficulty {
  return TEACHING_DIFFICULTIES.includes(value as TeachingDifficulty);
}

export function teachingStatusLabel(value: TeachingStatus | null | undefined) {
  switch (value) {
    case "considering":
      return "Potential";
    case "currently_teaching":
      return "Currently Teaching";
    case "previously_taught":
      return "Previously Taught";
    case "not_for_teaching":
      return "Not for Teaching";
    default:
      return "Not Assessed";
  }
}

export function teachingDifficultyLabel(value: TeachingDifficulty | null | undefined) {
  switch (value) {
    case "n5":
      return "N5";
    case "n4":
      return "N4";
    case "n3":
      return "N3";
    case "n2":
      return "N2";
    case "n1":
      return "N1";
    case "above_n1":
      return "Above N1";
    default:
      return "Not Assessed";
  }
}

export function teachingStatusFromLegacy(
  value: string | null | undefined
): TeachingStatus | null {
  switch (value) {
    case "want_to_test":
      return "considering";
    case "testing":
    case "currently_using":
      return "currently_teaching";
    case "do_not_use":
      return "not_for_teaching";
    default:
      return null;
  }
}
