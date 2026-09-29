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

// Sense accents are presentation only. Never pass review colors or stages here.
const SENSE_ACCENTS = [
  "border-teal-300 bg-teal-50 text-teal-950",
  "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-950",
  "border-indigo-300 bg-indigo-50 text-indigo-950",
  "border-stone-300 bg-stone-100 text-stone-900",
  "border-cyan-300 bg-cyan-50 text-cyan-950",
  "border-rose-300 bg-rose-50 text-rose-950",
] as const;

export function resolveSenseNumber(
  definitionKey?: string | null,
  fallbackSenseNumber?: number | null
): number | null {
  const value = definitionKey?.trim() ? Number(definitionKey) : fallbackSenseNumber;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

export function studyCardSenseClass(senseNumber: number | null) {
  // Higher sense numbers repeat the palette; the visible number is the identifier.
  const senseAccent = senseNumber !== null && Number.isSafeInteger(senseNumber) && senseNumber > 0
    ? SENSE_ACCENTS[(senseNumber - 1) % SENSE_ACCENTS.length]
    : "border-slate-300 bg-slate-50 text-slate-700";
  return `rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm sm:px-3 sm:py-1.5 sm:text-xs ${senseAccent}`;
}

export const STUDY_CARD_INPUT_CLASS = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base";
export const STUDY_CARD_CHECK_BUTTON_CLASS = "rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white";
export const STUDY_CARD_CHECK_LABEL = "Check answer";
