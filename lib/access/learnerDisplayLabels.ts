export type LearnerDisplayLabelInput = {
  role?: string | null;
  app_access_type?: string | null;
  linkedToTeacher?: boolean;
};

export function getLearnerAccessLabel(profile: LearnerDisplayLabelInput) {
  if (profile.linkedToTeacher) return "Teacher-linked student";
  if (profile.app_access_type === "free") return "Free learner";
  if (profile.app_access_type === "student") return "Self-paid learner";
  if (profile.role === "teacher") return "Teacher";
  return "Learner";
}
