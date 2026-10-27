// Extracted from Ability Check without changing card construction or progress semantics.
import { computeLibraryStudyColorStatus, type LibraryStudyGateStatus, type LibraryStudyColorStatus } from '@/lib/libraryStudyColor';
import { normalizeKanaReading } from '@/lib/kanaInput';
import { savedSenseNumber, senseStudyKey } from '@/lib/studySenseIdentity';
import { visibleStudyEncounters } from '@/lib/vocabulary/personalVisibility';

export type UserBookWordRow = {
  study_identity_key?: string | null;
  alternative_surface?: string | null;
  id: string;
  user_book_id: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  meaning_choice_index: number | null;
  jlpt: string | null;
  hidden: boolean | null;
  flashcard_hidden?: boolean;
  created_at: string;
};

export type LearningSettingsRow = {
  red_stages: number | null;
  orange_stages: number | null;
  yellow_stages: number | null;
  show_badge_numbers: boolean | null;
  skip_katakana_library_check?: boolean | null;
};

export type LibraryWordProgressRow = {
  id?: string;
  user_id: string;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  definition_key: string;
  reading_gate_status: LibraryStudyGateStatus;
  meaning_gate_status: LibraryStudyGateStatus;
  held_before_reading_gate: boolean;
  held_before_meaning_gate: boolean;
  mastered: boolean;
  reading_gate_attempts: number;
  meaning_gate_attempts: number;
  reading_gate_passed_at: string | null;
  reading_gate_failed_at: string | null;
  meaning_gate_passed_at: string | null;
  meaning_gate_failed_at: string | null;
  mastered_at: string | null;
  last_studied_at: string | null;
};

export type LibraryWordClaimRow = {
  id: string;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  claimed_color: "green" | string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LibraryCheckGate = "readiness" | "reading" | "meaning";

export type StudyCard = {
  alternative_surface?: string | null;
  id: string;
  userBookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  surface: string;
  reading: string;
  meaning: string;
  jlpt: string | null;
  encounterCount: number;
  encounterIds: string[];
  colorStatus: LibraryStudyColorStatus;
  activeGate: LibraryCheckGate;
  studyIdentityKey: string;
  progress: LibraryWordProgressRow | null;
  definitionNumber: number | null;
  lastEncounteredAt: string | null;
};

function normalizeText(value: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
function normalizeKana(value: string) {
  return normalizeKanaReading(value ?? "");
}

export function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
  const normalizedSurface = normalizeText(surface ?? "");
  const normalizedReading = normalizeKana(reading ?? "");
  if (!normalizedSurface) return "";
  return `${normalizedSurface}||${normalizedReading}`;
}

export function latestWordCreatedAt(words: UserBookWordRow[]) {
  return words.reduce<string | null>((latest, word) => {
    if (!word.created_at) return latest;
    if (!latest) return word.created_at;

    const latestTime = new Date(latest).getTime();
    const wordTime = new Date(word.created_at).getTime();

    if (Number.isNaN(wordTime)) return latest;
    if (Number.isNaN(latestTime)) return word.created_at;

    return wordTime > latestTime ? word.created_at : latest;
  }, null);
}

export function definitionNumberFromIndex(index: number | null | undefined) {
  return savedSenseNumber(index);
}

export function progressWithWordSkyClaim(
  userId: string,
  key: string,
  surface: string,
  reading: string,
  progress: LibraryWordProgressRow | null,
  claim: LibraryWordClaimRow | null | undefined
): LibraryWordProgressRow | null {
  if (!claim || claim.claimed_color !== "green") return progress;

  const hasExistingGateHistory =
    progress &&
    (
      progress.reading_gate_status !== "not_started" ||
      progress.meaning_gate_status !== "not_started" ||
      progress.held_before_reading_gate ||
      progress.held_before_meaning_gate ||
      progress.mastered
    );

  if (hasExistingGateHistory) return progress;

  return {
    id: progress?.id,
    user_id: userId,
    study_identity_key: key,
    surface,
    reading,
    definition_key: "",
    reading_gate_status: "not_started",
    meaning_gate_status: "not_started",
    held_before_reading_gate: false,
    held_before_meaning_gate: false,
    mastered: false,
    reading_gate_attempts: progress?.reading_gate_attempts ?? 0,
    meaning_gate_attempts: progress?.meaning_gate_attempts ?? 0,
    reading_gate_passed_at: progress?.reading_gate_passed_at ?? null,
    reading_gate_failed_at: progress?.reading_gate_failed_at ?? null,
    meaning_gate_passed_at: progress?.meaning_gate_passed_at ?? null,
    meaning_gate_failed_at: progress?.meaning_gate_failed_at ?? null,
    mastered_at: progress?.mastered_at ?? null,
    last_studied_at: progress?.last_studied_at ?? null,
  };
}

export function isReadyForReadingGateProgress(progress: LibraryWordProgressRow | null | undefined) {
  return Boolean(
    progress?.id &&
    progress.reading_gate_status === "not_started" &&
    progress.meaning_gate_status === "not_started" &&
    !progress.held_before_reading_gate &&
    !progress.held_before_meaning_gate &&
    !progress.mastered
  );
}

export function preReadingSupportCycle(progress: LibraryWordProgressRow | null | undefined) {
  if (!progress?.held_before_reading_gate) return null;
  return Math.max(2, (progress.reading_gate_attempts ?? 0) + 1);
}

export function makeClaimStudyCard(
  userId: string,
  claim: LibraryWordClaimRow,
  colorSettings: LearningSettingsRow,
  progressByKey: Map<string, LibraryWordProgressRow>
): StudyCard | null {
  const key = claim.study_identity_key;
  const surface = (claim.surface ?? "").trim();
  const reading = (claim.reading ?? "").trim();
  const meaning = (claim.meaning ?? "").trim();

  if (!key || !surface || !reading || !meaning) return null;

  const progress = progressWithWordSkyClaim(
    userId,
    key,
    surface,
    reading,
    progressByKey.get(senseStudyKey(key)) ?? null,
    claim
  );

  const colorStatus = computeLibraryStudyColorStatus({
    encounterCount: 0,
    claimedGreen: claim.claimed_color === "green",
    settings: colorSettings,
    readingGate: progress?.reading_gate_status ?? "not_started",
    meaningGate: progress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
    readyForReadingGate: isReadyForReadingGateProgress(progress),
    preReadingSupportCycle: preReadingSupportCycle(progress),
    mastered: progress?.mastered ?? false,
  });

  return {
    id: `claim:${key}`,
    userBookId: "",
    bookTitle: "Word Sky",
    bookCoverUrl: null,
    surface,
    reading,
    meaning,
    jlpt: null,
    encounterCount: 0,
    encounterIds: [],
    colorStatus,
    activeGate: pickLibraryCheckGate(colorStatus, key, surface),
    studyIdentityKey: key,
    progress,
    definitionNumber: 1,
    lastEncounteredAt: claim.updated_at ?? claim.created_at ?? null,
  };
}

export function pickLibraryCheckGate(
  status: LibraryStudyColorStatus,
  _seed: string,
  surface?: string | null
): LibraryCheckGate {
  if (status.color === "red" && status.eligibleForLibraryStudy) return "readiness";
  if (status.color === "yellow" && status.eligibleForLibraryStudy) return "readiness";
  if (isKanaOnly(surface)) return "meaning";
  if (status.nextGate === "reading") return "reading";
  if (status.nextGate === "meaning") return "meaning";
  return "reading";
}

export function isKanaOnly(value: string | null | undefined) {
  const compact = (value ?? "").trim().replace(/[\sー・･]/g, "");
  return compact.length > 0 && /^[\u3041-\u3096\u30A1-\u30FA]+$/.test(compact);
}

export type ReadingCardInput = {userId:string; groupedWords:Map<string,UserBookWordRow[]>; claimByKey:Map<string,LibraryWordClaimRow>; progressByKey:Map<string,LibraryWordProgressRow>; colorSettings:LearningSettingsRow; metaById:Map<string,{title:string;cover_url:string|null}>};
export function buildReadingAbilityCheckCards(input:ReadingCardInput):StudyCard[]{
const {userId,groupedWords,claimByKey,progressByKey,colorSettings,metaById}=input;
return Array.from(groupedWords.entries())
          .map<StudyCard | null>(([senseKey, group]) => {
            const key = (group[0].study_identity_key || studyIdentityKey(group[0].surface, group[0].reading));
            const primarySense = savedSenseNumber(group[0].meaning_choice_index) === 1;
            const activeGroup = visibleStudyEncounters(group);
            if (!activeGroup.length) return null;
            const representative = activeGroup[0];
            const meta = metaById.get(representative.user_book_id);
            const surface = representative.surface!.trim();
            const reading = representative.reading!.trim();
            const lastEncounteredAt = latestWordCreatedAt(group);
            const progress = progressWithWordSkyClaim(
              userId,
              key,
              surface,
              reading,
              progressByKey.get(senseKey) ?? null,
              (primarySense ? claimByKey.get(key) : undefined)
            );

            const colorStatus = computeLibraryStudyColorStatus({
              encounterCount: group.length,
              claimedGreen: (primarySense ? claimByKey.get(key) : undefined)?.claimed_color === "green",
              settings: colorSettings,
              readingGate: progress?.reading_gate_status ?? "not_started",
              meaningGate: progress?.meaning_gate_status ?? "not_started",
              heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
              heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
              readyForReadingGate: isReadyForReadingGateProgress(progress),
              preReadingSupportCycle: preReadingSupportCycle(progress),
              mastered: progress?.mastered ?? false,
            });

            return {
              id: representative.id,
              userBookId: representative.user_book_id,
              bookTitle: meta?.title ?? "Untitled",
              bookCoverUrl: meta?.cover_url ?? null,
              surface,
              reading,
              meaning: representative.meaning!.trim(),
              alternative_surface: representative.alternative_surface,
              jlpt: representative.jlpt ?? null,
              encounterCount: group.length,
              encounterIds: activeGroup.map((word) => word.id),
              colorStatus,
              activeGate: pickLibraryCheckGate(colorStatus, key, surface),
              studyIdentityKey: key,
              progress,
              definitionNumber: definitionNumberFromIndex(representative.meaning_choice_index),
              lastEncounteredAt,
            };
          })
          .filter((card): card is StudyCard => Boolean(card));
}

export function buildClaimAbilityCheckCards(input:Pick<ReadingCardInput,'userId'|'groupedWords'|'progressByKey'|'colorSettings'> & {claimRows:LibraryWordClaimRow[];personallyHidden:ReadonlySet<string>}):StudyCard[]{
const {userId,groupedWords,progressByKey,colorSettings,claimRows,personallyHidden}=input;
return claimRows
          .filter((claim) => !personallyHidden.has(claim.study_identity_key) && !groupedWords.has(senseStudyKey(claim.study_identity_key)))
          .map((claim) => makeClaimStudyCard(userId, claim, colorSettings, progressByKey))
          .filter((card): card is StudyCard => Boolean(card));
}
