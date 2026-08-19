export type LearnerDisplayLabelInput = {
  role?: string | null;
  app_access_type?: string | null;
  linkedToTeacher?: boolean;
};

export function getLearnerAccessLabel(profile: LearnerDisplayLabelInput) {
  if (profile.linkedToTeacher) return "Teacher-linked student";
  if (profile.app_access_type === "trial") return "Trial learner";
  if (profile.app_access_type === "free") return "Free learner";
  if (profile.app_access_type === "reading_access") return "Reading Access";
  if (profile.app_access_type === "lesson_access") return "Lesson Access";
  if (profile.app_access_type === "inactive") return "Inactive";
  if (profile.app_access_type === "student") return "Legacy Japanese Learning";
  if (profile.role === "teacher") return "Teacher";
  return "Learner";
}
