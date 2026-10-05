import type { PersonalTrackingStatus } from "@/lib/personalTracking";
import type { TeachingStatus } from "@/lib/teachingStatus";

export type BookUse = "both" | "personal_only" | "teaching_only";

export function getBookUse(personalStatus: PersonalTrackingStatus, teachingStatus: TeachingStatus | null): BookUse | "neither" {
  if (personalStatus === "not_tracking") {
    return teachingStatus === "not_for_teaching" ? "neither" : "teaching_only";
  }
  return teachingStatus === "not_for_teaching" ? "personal_only" : "both";
}

// Keep each intermediate state valid. No assessment fields or existing reading
// statuses are changed unless the requested use requires it.
export async function changeBookUse({ nextUse, personalStatus, teachingStatus, savePersonal, saveTeaching }: {
  nextUse: BookUse;
  personalStatus: PersonalTrackingStatus;
  teachingStatus: TeachingStatus | null;
  savePersonal: (status: PersonalTrackingStatus) => Promise<boolean>;
  saveTeaching: (status: TeachingStatus | null) => Promise<boolean>;
}): Promise<boolean> {
  if (nextUse === "teaching_only") {
    if (teachingStatus === "not_for_teaching" && !await saveTeaching(null)) return false;
    return personalStatus !== "not_tracking" ? savePersonal("not_tracking") : true;
  }
  if (personalStatus === "not_tracking" && !await savePersonal("want_to_read")) return false;
  if (nextUse === "personal_only") {
    return teachingStatus !== "not_for_teaching" ? saveTeaching("not_for_teaching") : true;
  }
  return teachingStatus === "not_for_teaching" ? saveTeaching(null) : true;
}
