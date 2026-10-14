export type VisibilityFeature = "follow_along" | "flashcard";
export type PersonalVisibility = { follow_along_hidden?: boolean; flashcard_hidden?: boolean };
export function visibleStudyEncounters<T extends PersonalVisibility>(rows: T[]): T[] {
  return rows.filter((row) => !row.flashcard_hidden);
}
export function isPersonallyHidden(row: PersonalVisibility): boolean {
  return Boolean(row.follow_along_hidden || row.flashcard_hidden);
}

// A study card can represent several saved entries. Hiding one entry must not
// suspend a different encounter (even one with the same spelling and meaning).
export function changeGroupedCardVisibility<T extends { id: string; visibilityEntries?: T[] }>(
  cards: T[], entry: T, hidden: boolean, sameGroup: (a: T, b: T) => boolean,
): T[] {
  const index = cards.findIndex(card => hidden
    ? (card.visibilityEntries ?? [card]).some(item => item.id === entry.id)
    : sameGroup(card, entry));
  if (index < 0) return hidden ? cards : [...cards, { ...entry, visibilityEntries: [entry] }];
  const card = cards[index];
  const entries = (card.visibilityEntries ?? [card]).filter(item => item.id !== entry.id);
  if (!hidden) entries.unshift(entry);
  if (!entries.length) return cards.filter((_, i) => i !== index);
  return cards.map((item, i) => i === index ? { ...card, ...entries[0], visibilityEntries: entries } : item);
}
