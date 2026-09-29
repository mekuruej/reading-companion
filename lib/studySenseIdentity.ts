/** Saved sense identity, independent of review stage and lexical identity.
 * The legacy blank key is retained for Definition 1 only; secondary senses
 * must never inherit its progress or word-level Word Sky claims.
 */
export function savedSenseNumber(index?: number | null): number {
  return typeof index === "number" && Number.isSafeInteger(index) && index >= 0
    ? index + 1 : 1;
}

export function senseDefinitionKey(senseNumber?: number | null): string {
  return senseNumber != null && Number.isSafeInteger(senseNumber) && senseNumber > 1
    ? String(senseNumber) : "";
}

export function senseStudyKey(wordKey: string, definitionKey = ""): string {
  return JSON.stringify([wordKey, definitionKey === "1" ? "" : definitionKey]);
}

export function cardSenseKey(card: { studyIdentityKey: string; definitionNumber?: number | null }): string {
  return senseStudyKey(card.studyIdentityKey, senseDefinitionKey(card.definitionNumber));
}

export function groupSavedSenseEncounters<T extends {
  surface?: string | null;
  reading?: string | null;
  meaning?: string | null;
  meaning_choice_index?: number | null;
}>(rows: T[], wordIdentity: (surface?: string | null, reading?: string | null) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.surface?.trim() || !row.reading?.trim() || !row.meaning?.trim()) continue;
    const wordKey = wordIdentity(row.surface, row.reading);
    if (!wordKey) continue;
    const senseKey = senseStudyKey(wordKey, senseDefinitionKey(savedSenseNumber(row.meaning_choice_index)));
    const group = groups.get(senseKey) ?? [];
    group.push(row);
    groups.set(senseKey, group);
  }
  return groups;
}
