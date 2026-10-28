import { abilityCheckReminderCompleted } from './abilityCheckReminderCompletion';
import { ymdInTimeZone } from '@/lib/timeZone';
import { getWordSkyExplorationReturnPath } from '@/lib/wordSkyExploration';
import { loadDailyReminderReadiness, loadPersonallyHiddenIdentities, ownerHiddenIdentities, type OwnerBoundHiddenIdentities, type DailyReminderReadiness, type DailyStudyContext } from './dailyReminderReadiness';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAppAccessStatus } from '@/lib/access/appAccess';
import { getFeatureAccess } from '@/lib/access/featureAccess';
import { canUseFullAccessFeature } from '@/lib/access/requireFullAccess';
import { loadAllPagedRows } from '@/lib/vocabulary/loadAllPagedRows';
import { computeLibraryStudyColorStatus, type LibraryStudyColorSettings } from '@/lib/libraryStudyColor';

export type DailyLibraryActivity = 'word_sky' | 'ability_check';
export type ReminderStorage = Pick<Storage, 'getItem' | 'setItem'>;
const DISMISS_PREFIX = 'mekuru-library-reminder-hidden:';

export function selectDailyLibraryReminder(input: {
  date: Date; ownLibrary: boolean; enabled: boolean; hidden: boolean;
  canUseWordSky: boolean; wordSkyAvailable: boolean;
  canUseAbilityCheck: boolean; readiness: DailyReminderReadiness; abilityCheckCompleted?: boolean;
}): DailyLibraryActivity | null {
  if (!input.ownLibrary || !input.enabled || input.hidden) return null;
  // Unknown is not evidence of beginner status. Wait for reliable information.
  if (input.readiness.status === 'unknown' || input.readiness.status === 'loading') return null;
  const check = input.canUseAbilityCheck && input.readiness.status === 'ready' && input.readiness.recommendAbilityCheck;
  const sky = input.canUseWordSky && input.wordSkyAvailable;
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short' }).format(input.date);
  const skyDay = ['Mon', 'Wed', 'Fri'].includes(weekday);
  if (input.abilityCheckCompleted && !skyDay) return null;
  if (check && (!skyDay || !sky)) return input.abilityCheckCompleted ? null : 'ability_check';
  return sky ? 'word_sky' : check ? 'ability_check' : null;
}

export function reminderHidden(storage: ReminderStorage, ownerId: string, date = new Date()) {
  try { return storage.getItem(DISMISS_PREFIX + encodeURIComponent(ownerId)) === ymdInTimeZone(date); }
  catch { return false; }
}
export function dismissDailyReminder(storage: ReminderStorage, ownerId: string, date = new Date()) {
  try { storage.setItem(DISMISS_PREFIX + encodeURIComponent(ownerId), ymdInTimeZone(date)); return true; }
  catch { return false; } // The component still hides it in memory for this owner/day.
}

/** Read the unchanged Ability Check scheduler's browser state; never write it.
 * A failed/malformed read is unknown rather than an invented empty seen set.
 */
export function reminderStudyContext(storage: ReminderStorage, ownerId: string, date = new Date()): DailyStudyContext | null {
  try {
    const dayKey = ymdInTimeZone(date);
    const raw = storage.getItem('library-study-seen-by-date');
    if (raw === null) return { ownerId, dayKey, seenTodayIds: new Set() };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const seen = parsed[dayKey] ?? [];
    if (!Array.isArray(seen) || seen.some(value => typeof value !== 'string')) return null;
    return { ownerId, dayKey, seenTodayIds: new Set(seen) };
  } catch { return null; }
}

export function wordSkyReminderHref(path: string, state: {
  search: string; bookType: string; status: string; sort: string; view: string;
}) {
  const returnPath = getWordSkyExplorationReturnPath(path) ?? '/books';
  const url = new URL(returnPath, 'https://mekuru.invalid');
  url.search = new URLSearchParams({ wordSkyReturn: '1', search: state.search, bookType: state.bookType, status: state.status, sort: state.sort, view: state.view }).toString();
  url.hash = '';
  const returnTo = getWordSkyExplorationReturnPath(url.pathname + url.search) ?? '/books';
  return '/library-study/word-sky?' + new URLSearchParams({ explore: '1', returnTo });
}

export type LoadedDailyReminder = { ownerId: string; day: string; libraryPath: string; canUseWordSky: boolean; wordSkyAvailable: boolean; canUseAbilityCheck: boolean; readiness: DailyReminderReadiness; abilityCheckCompleted?: boolean };

/** Read-only invitation data. Fail closed on auth/preferences, and use the exact
 * activity access gates. The reference RPC supplies availability only, never cards.
 */
export async function loadDailyLibraryReminder(client: SupabaseClient, ownerId: string, storage: ReminderStorage | null, libraryPath = '/books'): Promise<LoadedDailyReminder | null> {
  try {
    const day = ymdInTimeZone();
    const auth = await client.auth.getUser();
    if (auth.error || auth.data.user?.id !== ownerId) return null;
    const [profile, settings] = await Promise.all([
      client.from('profiles').select('id, username, role, is_super_teacher, app_access_type, app_access_expires_at').eq('id', ownerId).maybeSingle(),
      client.from('user_learning_settings').select('show_ability_check_reminder, red_stages, orange_stages, yellow_stages').eq('user_id', ownerId).maybeSingle(),
    ]);
    if (profile.error || !profile.data || profile.data.id !== ownerId || settings.error || settings.data?.show_ability_check_reminder === false) return null;
    const validPath = getWordSkyExplorationReturnPath(libraryPath);
    if (!validPath) return null;
    const pathname = new URL(validPath, 'https://mekuru.invalid').pathname;
    if (pathname !== '/books' && decodeURIComponent(pathname.split('/')[2]) !== profile.data.username) return null;
    const role = profile.data.is_super_teacher ? 'super_teacher' : profile.data.role;
    const access = getAppAccessStatus({ ...profile.data, role });
    const features = getFeatureAccess({ role, hasFullAccess: access.hasFullAccess, isTrialActive: access.reason === 'trial' });
    const canUseAbilityCheck = canUseFullAccessFeature(features, 'ability_check');
    const canUseWordSky = features.canUseAdvancedStudy;
    if (!canUseAbilityCheck && !canUseWordSky) return null;
    let hiddenPromise: Promise<ReadonlySet<string>> | undefined;
    const sharedHidden: OwnerBoundHiddenIdentities = {
      ownerId,
      load: () => hiddenPromise ??= loadPersonallyHiddenIdentities(client),
    };
    const [readiness, wordSkyAvailable] = await Promise.all([
      loadDailyReminderReadiness(client, storage ? reminderStudyContext(storage, ownerId) : null, sharedHidden),
      canUseWordSky ? loadWordSkyReminderAvailability(client, ownerId, settings.data ?? {}, sharedHidden) : Promise.resolve(false),
    ]);
    const finalAuth = await client.auth.getUser();
    if (finalAuth.error || finalAuth.data.user?.id !== ownerId || ymdInTimeZone() !== day) return null;
    return { ownerId, day, libraryPath, canUseWordSky, wordSkyAvailable, canUseAbilityCheck, readiness, abilityCheckCompleted: storage ? abilityCheckReminderCompleted(storage, ownerId) : false };
  } catch { return null; }
}

/** Mirror Word Sky's existing visibility predicates using its shared color engine.
 * Only the reference RPC supplies content. Personal data merely excludes entries.
 * Failed/incomplete visibility reads cannot establish available Word Sky words.
 */
export async function loadWordSkyReminderAvailability(client: SupabaseClient, ownerId: string, settings: LibraryStudyColorSettings, sharedHidden?: OwnerBoundHiddenIdentities): Promise<boolean> {
  try {
    const pool = await client.rpc('get_word_sky_pool', { p_limit: 180 });
    if (pool.error || !Array.isArray(pool.data)) return false;
    const keys: string[] = [...new Set<string>(pool.data.filter((row: {study_identity_key?: string; surface?: string; reading?: string; meaning?: string}) =>
      [row.study_identity_key, row.surface, row.reading, row.meaning].every(value => typeof value === 'string' && value.trim())
    ).map((row: {study_identity_key: string}) => row.study_identity_key))];
    if (!keys.length) return false;
    const [hidden, summaries, progress] = await Promise.all([
      ownerHiddenIdentities(client, ownerId, sharedHidden),
      loadAllPagedRows<{ id: string; study_identity_key: string; total_encounter_count: number }>((from, to) =>
        client.from('user_library_word_summaries').select('id, study_identity_key, total_encounter_count', { count: 'exact' }).eq('user_id', ownerId).in('study_identity_key', keys).order('id').range(from, to)),
      loadAllPagedRows<{ id: string; study_identity_key: string; reading_gate_status: 'not_started' | 'passed'; meaning_gate_status: 'not_started' | 'passed'; held_before_reading_gate: boolean; held_before_meaning_gate: boolean; reading_gate_attempts: number; mastered: boolean }>((from, to) =>
        client.from('user_library_word_progress').select('id, study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, reading_gate_attempts, mastered', { count: 'exact' }).eq('user_id', ownerId).eq('definition_key', '').in('study_identity_key', keys).order('id').range(from, to)),
    ]);
    const hiddenKeys = hidden;
    const progressByKey = new Map(progress.map(row => [row.study_identity_key, row]));
    const excludedColors = new Set<string>();
    for (const row of summaries) {
      const state = progressByKey.get(row.study_identity_key);
      const color = computeLibraryStudyColorStatus({ encounterCount: row.total_encounter_count ?? 0, settings,
        readingGate: state?.reading_gate_status ?? 'not_started', meaningGate: state?.meaning_gate_status ?? 'not_started',
        heldBeforeReadingGate: state?.held_before_reading_gate ?? false, heldBeforeMeaningGate: state?.held_before_meaning_gate ?? false,
        preReadingSupportCycle: state?.held_before_reading_gate ? Math.max(2, (state.reading_gate_attempts ?? 0) + 1) : null,
        mastered: state?.mastered ?? false }).color;
      // Conservative across definitions: never invite on an ambiguously excluded identity.
      if (color === 'green' || color === 'blue' || color === 'purple') excludedColors.add(row.study_identity_key);
    }
    return keys.some(key => !hiddenKeys.has(key) && !excludedColors.has(key));
  } catch { return false; }
}
