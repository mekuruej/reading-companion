// Both assessment and experience records use the canonical books.id.
// Assessment storage is adapted in the API; consumers never need teacher_books.id.
export const EXPERIENCE_CONTEXTS = ["Private lesson", "Guided group", "Book club", "Reading together", "Other"] as const;
export const ASSESSMENT_DIFFICULTIES = ["n5", "n4", "n3", "n2", "n1", "above_n1"] as const;
export const ASSESSMENT_SUITABILITIES = ["excellent", "usable", "poor_fit"] as const;
export const ASSESSMENT_STATUSES = [
  ["approved_for_lesson", "Perfect for Lesson"], ["usable", "Usable"], ["do_not_use", "Not for Teaching"],
  ["want_to_test", "Potential"], ["testing", "Testing"], ["currently_using", "Currently Using"],
  ["use_with_caution", "Use with Caution"],
] as const;
export const EXPERIENCE_LEVEL_FITS = [
  ["too_easy", "Too easy"], ["good_fit", "Good fit"],
  ["challenging", "Challenging but workable"], ["too_difficult", "Too difficult"],
] as const;
export const EXPERIENCE_NOTE_LIMIT = 4000;
export type ExperiencePerson = { id: string; display_name: string | null; username: string | null };
export type BookAssessment = {
  assessed_at?: string | null;
  teacher_jlpt_difficulty: string | null;
  teaching_suitability: string | null;
  teacher_use_status: string | null;
  teacher_use_note: string | null;
};
export type ReadingExperience = {
  id: string; book_id: string; teacher_id: string; person_id: string | null;
  experienced_on: string; context: string | null; notes: string; created_at: string;
  reader_level: string | null; level_fit: string | null;
  person: ExperiencePerson | null;
};
export const EMPTY_ASSESSMENT: BookAssessment = {
  teacher_jlpt_difficulty: null, teaching_suitability: null, teacher_use_status: null, teacher_use_note: null,
};
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function isExperienceTeacher(profile: { role?: string | null; is_super_teacher?: boolean | string | null } | null) {
  return !!profile && (["teacher", "admin", "super_teacher"].includes(profile.role ?? "") || profile.is_super_teacher === true || profile.is_super_teacher === "true");
}
export function validateExperience(value: { person_id?: unknown; experienced_on?: unknown; context?: unknown; notes?: unknown; reader_level?: unknown; level_fit?: unknown }) {
  if (!isUuid(value.person_id)) return "Choose a MEKURU user.";
  if (typeof value.experienced_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.experienced_on)) return "Choose a valid date.";
  const date = new Date(value.experienced_on + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.experienced_on) return "Choose a valid date.";
  if (value.context != null && value.context !== "" && !EXPERIENCE_CONTEXTS.includes(value.context as typeof EXPERIENCE_CONTEXTS[number])) return "Choose a valid context.";
  if (value.reader_level != null && (typeof value.reader_level !== "string" || !/^Level (?:[1-9]|10)$/.test(value.reader_level))) return "Select a valid reader level.";
  if (value.level_fit != null && !EXPERIENCE_LEVEL_FITS.some(([key]) => key === value.level_fit)) return "Select a valid level fit.";
  if (typeof value.notes !== "string" || !value.notes.trim()) return "Add a reflection or note.";
  if (value.notes.length > EXPERIENCE_NOTE_LIMIT) return "Keep the reflection within 4,000 characters.";
  return null;
}
export function validateAssessment(value: BookAssessment) {
  if (value.teacher_jlpt_difficulty != null && !ASSESSMENT_DIFFICULTIES.includes(value.teacher_jlpt_difficulty as typeof ASSESSMENT_DIFFICULTIES[number])) return "Choose a valid JLPT difficulty.";
  if (value.teaching_suitability != null && !ASSESSMENT_SUITABILITIES.includes(value.teaching_suitability as typeof ASSESSMENT_SUITABILITIES[number])) return "Choose a valid suitability.";
  if (value.teacher_use_status != null && !ASSESSMENT_STATUSES.some(([key]) => key === value.teacher_use_status)) return "Choose a valid status.";
  // Existing assessment notes may be long; do not impose a new truncation limit.
  if (value.teacher_use_note != null && typeof value.teacher_use_note !== "string") return "Teacher Note must be text.";
  return null;
}
