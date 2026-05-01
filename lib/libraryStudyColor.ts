// Library Study Color
//
// Pure color-status helper for the cross-book Library Study system.
// This file should stay UI-free and database-free.

export type LibraryStudyColor =
  | "none"
  | "red"
  | "orange"
  | "yellow"
  | "grey"
  | "green"
  | "blue"
  | "purple";

export type LibraryStudyGateStatus = "not_started" | "passed" | "failed";

export type LibraryStudyNextGate = "reading" | "meaning" | "mastery" | null;

export type LibraryStudyGreyReason =
  | "pre_reading_support"
  | "reading_gate_support"
  | "meaning_gate_support"
  | null;

export type LibraryStudyColorSettings = {
  red_stages?: number | null;
  orange_stages?: number | null;
  yellow_stages?: number | null;
};

export type ComputeLibraryStudyColorInput = {
  encounterCount: number;
  settings?: LibraryStudyColorSettings | null;
  readingGate?: LibraryStudyGateStatus | null;
  meaningGate?: LibraryStudyGateStatus | null;
  heldBeforeReadingGate?: boolean | null;
  heldBeforeMeaningGate?: boolean | null;
  mastered?: boolean | null;
};

export type LibraryStudyColorStatus = {
  color: LibraryStudyColor;
  stageNumber: number | null;
  stageCount: number | null;
  encounterStep: number;
  totalEncounterSteps: number;
  eligibleForLibraryStudy: boolean;
  nextGate: LibraryStudyNextGate;
  greyReason: LibraryStudyGreyReason;
  reason: string;
};

function cleanStageCount(value: number | null | undefined) {
  if (!Number.isFinite(value ?? 0)) return 1;
  return Math.max(1, Math.floor(value ?? 1));
}

export function getLibraryStudyEncounterStageCounts(
  settings?: LibraryStudyColorSettings | null
) {
  const red = cleanStageCount(settings?.red_stages);
  const orange = cleanStageCount(settings?.orange_stages);
  const yellow = cleanStageCount(settings?.yellow_stages);

  return {
    red,
    orange,
    yellow,
    total: red + orange + yellow,
  };
}

function computeEncounterColor(
  encounterCount: number,
  settings?: LibraryStudyColorSettings | null
): Pick<
  LibraryStudyColorStatus,
  "color" | "stageNumber" | "stageCount" | "encounterStep" | "totalEncounterSteps"
> {
  const stages = getLibraryStudyEncounterStageCounts(settings);
  const safeEncounterCount = Math.max(0, Math.floor(encounterCount || 0));

  if (safeEncounterCount <= 0) {
    return {
      color: "none",
      stageNumber: null,
      stageCount: null,
      encounterStep: 0,
      totalEncounterSteps: stages.total,
    };
  }

  const encounterStep = Math.min(safeEncounterCount, stages.total);

  if (encounterStep <= stages.red) {
    return {
      color: "red",
      stageNumber: encounterStep,
      stageCount: stages.red,
      encounterStep,
      totalEncounterSteps: stages.total,
    };
  }

  if (encounterStep <= stages.red + stages.orange) {
    return {
      color: "orange",
      stageNumber: encounterStep - stages.red,
      stageCount: stages.orange,
      encounterStep,
      totalEncounterSteps: stages.total,
    };
  }

  return {
    color: "yellow",
    stageNumber: encounterStep - stages.red - stages.orange,
    stageCount: stages.yellow,
    encounterStep,
    totalEncounterSteps: stages.total,
  };
}

export function computeLibraryStudyColorStatus(
  input: ComputeLibraryStudyColorInput
): LibraryStudyColorStatus {
  const encounter = computeEncounterColor(input.encounterCount, input.settings);
  const readingGate = input.readingGate ?? "not_started";
  const meaningGate = input.meaningGate ?? "not_started";

  if (input.mastered) {
    return {
      ...encounter,
      color: "purple",
      stageNumber: null,
      stageCount: null,
      eligibleForLibraryStudy: false,
      nextGate: null,
      greyReason: null,
      reason: "Mastered.",
    };
  }

  if (meaningGate === "passed") {
    return {
      ...encounter,
      color: "blue",
      stageNumber: null,
      stageCount: null,
      eligibleForLibraryStudy: true,
      nextGate: "mastery",
      greyReason: null,
      reason: "Meaning gate passed.",
    };
  }

  if (readingGate === "passed") {
    if (meaningGate === "failed" || input.heldBeforeMeaningGate) {
      return {
        ...encounter,
        color: "grey",
        stageNumber: null,
        stageCount: null,
        eligibleForLibraryStudy: true,
        nextGate: "meaning",
        greyReason: "meaning_gate_support",
        reason: "Held for support before the meaning gate.",
      };
    }

    return {
      ...encounter,
      color: "green",
      stageNumber: null,
      stageCount: null,
      eligibleForLibraryStudy: true,
      nextGate: "meaning",
      greyReason: null,
      reason: "Reading gate passed.",
    };
  }

  if (readingGate === "failed") {
    return {
      ...encounter,
      color: "grey",
      stageNumber: null,
      stageCount: null,
      eligibleForLibraryStudy: true,
      nextGate: "reading",
      greyReason: "reading_gate_support",
      reason: "Held for support after the reading gate was missed.",
    };
  }

  const hasEnoughEncounters = encounter.encounterStep >= encounter.totalEncounterSteps;

  if (hasEnoughEncounters && input.heldBeforeReadingGate) {
    return {
      ...encounter,
      color: "grey",
      stageNumber: null,
      stageCount: null,
      eligibleForLibraryStudy: true,
      nextGate: "reading",
      greyReason: "pre_reading_support",
      reason: "Held for support before the reading gate.",
    };
  }

  return {
    ...encounter,
    eligibleForLibraryStudy: hasEnoughEncounters && encounter.color === "yellow",
    nextGate: hasEnoughEncounters && encounter.color === "yellow" ? "reading" : null,
    greyReason: null,
    reason:
      hasEnoughEncounters && encounter.color === "yellow"
        ? "Ready for the reading gate."
        : "Building encounter support.",
  };
}
