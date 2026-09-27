export function resolveBookHubMode({ canUseTeachingMode, teachingOnly, requestedMode }: {
  canUseTeachingMode: boolean; teachingOnly: boolean; requestedMode: string | null;
}): "reader" | "teaching" {
  return canUseTeachingMode && (teachingOnly || requestedMode === "teaching") ? "teaching" : "reader";
}
