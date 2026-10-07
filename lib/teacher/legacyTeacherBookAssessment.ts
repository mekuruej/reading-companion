export type TeacherAssessmentProfile = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
} | null;

export type LegacyTeacherBookDestination = "owner_book_hub" | "cross_owner_assessment" | "denied";

export function isElevatedTeacherAssessmentProfile(profile: TeacherAssessmentProfile) {
  return profile?.role === "admin" || profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true || profile?.is_super_teacher === "true";
}

export function isTeacherAssessmentProfile(profile: TeacherAssessmentProfile) {
  return profile?.role === "teacher" || isElevatedTeacherAssessmentProfile(profile);
}

export function getLegacyTeacherBookDestination({
  actorId,
  ownerId,
  profile,
}: {
  actorId: string;
  ownerId: string;
  profile: TeacherAssessmentProfile;
}): LegacyTeacherBookDestination {
  if (!isTeacherAssessmentProfile(profile)) return "denied";
  if (actorId === ownerId) return "owner_book_hub";
  return isElevatedTeacherAssessmentProfile(profile) ? "cross_owner_assessment" : "denied";
}

export function buildCrossOwnerAssessmentPatch<TStatus extends string, TDifficulty extends string, TSuitability extends string>({
  status,
  difficulty,
  suitability,
  note,
  isJapaneseBook,
  existingDifficulty,
}: {
  status: TStatus | null;
  difficulty: TDifficulty | null;
  suitability: TSuitability | null;
  note: string;
  isJapaneseBook: boolean;
  existingDifficulty: TDifficulty | null;
}) {
  return {
    teacher_use_status: status,
    teacher_jlpt_difficulty: isJapaneseBook ? difficulty : existingDifficulty,
    teaching_suitability: suitability,
    teacher_use_note: note.trim() || null,
  };
}

export function buildRemoveFromTeacherLibraryPatch(noteDraft: string, existingNote: string | null) {
  return {
    teacher_use_status: "do_not_use" as const,
    teacher_use_note: noteDraft.trim() || existingNote ||
      "Removed from Teacher Library; reader data preserved.",
  };
}
