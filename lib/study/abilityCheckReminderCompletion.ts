import { ymdInTimeZone } from '@/lib/timeZone';

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
const PREFIX = 'mekuru-library-reminder-completed-check:';
/** Completion hides the Ability Check invitation only; Hide for today still covers both. */
export function abilityCheckReminderCompleted(storage: StorageAccess, ownerId: string, date = new Date()) {
  try { return storage.getItem(PREFIX + encodeURIComponent(ownerId)) === ymdInTimeZone(date); }
  catch { return false; }
}
export function dismissCompletedAbilityCheckReminder(storage: StorageAccess, ownerId: string, session: {
  planDay: string; cardIds: readonly string[]; seenIds: ReadonlySet<string>;
  reachedEnd: boolean; endedEarly: boolean;
}, date = new Date()) {
  const today = ymdInTimeZone(date);
  if (!ownerId || session.planDay !== today || !session.reachedEnd || session.endedEarly ||
      session.cardIds.length !== 10 || new Set(session.cardIds).size !== 10 ||
      session.cardIds.some(id => !id || !session.seenIds.has(id))) return false;
  try { storage.setItem(PREFIX + encodeURIComponent(ownerId), today); return true; }
  catch { return false; }
}
