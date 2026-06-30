export const WORD_SKY_ALLOWED_JLPT_LEVELS = ["N5", "N4", "N3"] as const;

export type WordSkyAllowedJlptLevel = (typeof WORD_SKY_ALLOWED_JLPT_LEVELS)[number];

export function isWordSkyAllowedJlptLevel(
  value: string | null | undefined
): value is WordSkyAllowedJlptLevel {
  return WORD_SKY_ALLOWED_JLPT_LEVELS.includes(
    (value ?? "").trim().toUpperCase() as WordSkyAllowedJlptLevel
  );
}
