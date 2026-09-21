export type StudyCardTarget = "reading" | "meaning" | "readiness" | "word";

const QUESTION_TONES: Record<StudyCardTarget, string> = {
  reading: "border-emerald-300 bg-emerald-100 text-emerald-950",
  meaning: "border-sky-300 bg-sky-100 text-sky-950",
  readiness: "border-yellow-300 bg-yellow-100 text-yellow-950",
  word: "border-violet-300 bg-violet-100 text-violet-950",
};

export function studyCardPromptClass(target: StudyCardTarget = "reading") {
  return `motion-safe:animate-pulse rounded-2xl border px-5 py-2.5 text-xl font-black uppercase tracking-[0.12em] shadow-sm sm:rounded-3xl sm:px-9 sm:py-4 sm:text-3xl sm:tracking-[0.16em] ${QUESTION_TONES[target]}`;
}

export function studyCardModeBadgeClass(target?: StudyCardTarget) {
  const tone = target ? QUESTION_TONES[target] : "border-slate-200 bg-white text-slate-700";
  return `rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide shadow-sm sm:px-5 sm:py-2 sm:text-sm ${tone}`;
}

export function studyCardDefinitionClass(color: string | undefined, secondary: boolean) {
  const tones: Record<string, string> = {
    red: "border-red-300 bg-red-100 text-red-950",
    orange: "border-orange-300 bg-orange-100 text-orange-950",
    yellow: QUESTION_TONES.readiness,
    green: QUESTION_TONES.reading,
    blue: QUESTION_TONES.meaning,
    purple: QUESTION_TONES.word,
    grey: "border-slate-300 bg-slate-100 text-slate-700",
  };
  return `rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm sm:px-3 sm:py-1.5 sm:text-xs ${tones[color ?? "grey"] ?? tones.grey}${secondary ? " motion-safe:animate-pulse" : ""}`;
}

export const STUDY_CARD_INPUT_CLASS = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base";
export const STUDY_CARD_CHECK_BUTTON_CLASS = "rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white";
export const STUDY_CARD_CHECK_LABEL = "Check answer";
