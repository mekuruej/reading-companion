import { getAppAccessStatus } from "@/lib/access/appAccess";
import { isAllUserTeacher } from "./targetUserAccess";

export type StudentsCategory = "trial" | "current" | "other" | "past";
export type StudentsActor = { role?: string | null; is_super_teacher?: boolean | string | null };

export function canUseStudentsIndex(profile: StudentsActor | null) {
  return profile?.role === "teacher" || isAllUserTeacher(profile);
}

export function canUseStudentsCategory(profile: StudentsActor | null, category: StudentsCategory) {
  if (!canUseStudentsIndex(profile)) return false;
  if (isAllUserTeacher(profile)) return category === "trial" || category === "current" || category === "other";
  return category === "current" || category === "past";
}

export function isActiveStudentRelationship(link: { archived_at?: string | null }) {
  // Match the existing target-user authorization rule, not account entitlement or role.
  return link.archived_at == null;
}

export function isActiveTrialParticipant(profile: Parameters<typeof getAppAccessStatus>[0]) {
  return getAppAccessStatus(profile).reason === "trial";
}
