export const TEACHING_DIFFICULTY_OPTIONS = [
  { value: 1, label: "Very easy" },
  { value: 2, label: "Easy" },
  { value: 3, label: "Manageable" },
  { value: 4, label: "Challenging" },
  { value: 5, label: "Very difficult" },
] as const;
export type TeachingReflection = {
  book_id: string;
  teacher_id: string;
  student_level: string;
  student_difficulty: number;
  teaching_difficulty: number;
  difficulties: string;
  comments: string;
};
export const REFLECTION_TEXT_LIMIT = 2000;
export function validateTeachingReflection(value: TeachingReflection): string | null {
  if (!/^Level (?:[1-9]|10)$/.test(value.student_level)) return "Choose a MEKURU level.";
  for (const rating of [value.student_difficulty, value.teaching_difficulty]) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "Choose both difficulty ratings.";
  }
  if (value.difficulties.length > REFLECTION_TEXT_LIMIT || value.comments.length > REFLECTION_TEXT_LIMIT) return "Keep each written answer within 2,000 characters.";
  return null;
}
