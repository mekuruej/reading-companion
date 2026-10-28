/** Read-only foundation; no banner, daily scheduling, dismissal, writes or persistence.
 * Vocabulary comes from the owner's finalized personal view, never the reference pool.
 * The same builders and scheduler are used by the real Ability Check page.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAppAccessStatus } from '@/lib/access/appAccess';
import { getFeatureAccess } from '@/lib/access/featureAccess';
import { canUseFullAccessFeature } from '@/lib/access/requireFullAccess';
import { groupSavedSenseEncounters, senseStudyKey, cardSenseKey } from '@/lib/studySenseIdentity';
import { todayYmdAppTimeZone } from '@/lib/timeZone';
import { loadAllPagedRows } from '@/lib/vocabulary/loadAllPagedRows';
import {
  buildReadingAbilityCheckCards, buildClaimAbilityCheckCards, studyIdentityKey,
  type UserBookWordRow, type LibraryWordClaimRow, type LibraryWordProgressRow,
  type LearningSettingsRow,
} from './abilityCheckCards';
import { isCardAvailableForLibraryCheck } from './abilityCheckScheduler';

export type DailyStudyContext = {
  ownerId: string;
  dayKey: string;
  /** Must be the current Ability Check seen state; absent/failed storage is unknown, not empty. */
  seenTodayIds: ReadonlySet<string>;
};
type KnownResult = {
  status: 'ready' | 'not_ready';
  eligibleIdentityCount: number;
  dueCardCount: number;
  recommendAbilityCheck: boolean;
};
type UnavailableResult = {
  status: 'loading' | 'unknown' | 'ineligible';
  reason: string;
  eligibleIdentityCount: null;
  dueCardCount: null;
  recommendAbilityCheck: false;
};
export type DailyReminderReadiness = KnownResult | UnavailableResult;
function unavailable(status: UnavailableResult['status'], reason: string): UnavailableResult {
  return { status, reason, eligibleIdentityCount: null, dueCardCount: null, recommendAbilityCheck: false };
}
export const DAILY_REMINDER_READINESS_LOADING = unavailable('loading', 'loading');
export type ReadinessSnapshot = {
  status: 'complete';
  ownerId: string;
  canUseAbilityCheck: boolean;
  activityHasBooks: boolean;
  /** Owner-scoped, complete personal_user_book_words rows with the page's language/hidden filters. */
  words: UserBookWordRow[];
  claims: LibraryWordClaimRow[];
  progressRows: LibraryWordProgressRow[];
  settings: LearningSettingsRow;
  personallyHidden: ReadonlySet<string>;
  studyContext: DailyStudyContext | null;
} | { status: 'loading' | 'unknown'; reason?: string };

/** Recommendation-only mirror of public.library_study_identity_key, not the
 * input-oriented kana normalizer used by existing cards. Pinned keys are opaque.
 * SQL parity is tested against the function extracted from migration history.
 */
export function recommendationIdentity(word: Pick<UserBookWordRow, 'study_identity_key' | 'surface' | 'reading'>): string {
  if (word.study_identity_key != null) return word.study_identity_key;
  const trimSpaces = (value: string) => value.replace(/^ +| +$/g, '');
  const surface = trimSpaces(word.surface ?? '');
  if (!surface) return '';
  const katakana = 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヶ';
  const hiragana = 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゖ';
  const reading = trimSpaces(word.reading ?? '').replace(/[\u0009-\u000d \u0085\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+/g, '');
  return surface.replace(/[\u0009-\u000d \u0085\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+/g, ' ').toLowerCase() + '||' +
    [...reading].map(char => { const index = katakana.indexOf(char); return index < 0 ? char : hiragana[index]; }).join('').toLowerCase();
}

export function calculateDailyReminderReadiness(snapshot: ReadinessSnapshot): DailyReminderReadiness {
  if (snapshot.status !== 'complete') return unavailable(snapshot.status, snapshot.reason ?? snapshot.status);
  if (!snapshot.canUseAbilityCheck) return unavailable('ineligible', 'ability_check_access');
  const context = snapshot.studyContext;
  if (!context || !context.seenTodayIds || context.ownerId !== snapshot.ownerId || context.dayKey !== todayYmdAppTimeZone()) {
    return unavailable('unknown', 'study_context');
  }
  // The unchanged page loads at most 500 claims. Do not recommend on cards it cannot load.
  if (snapshot.claims.length > 500) return unavailable('unknown', 'ability_check_claim_cap');
  const claims = snapshot.claims.filter(c => c.claimed_color === 'green');
  // The current page returns before loading claims when the owner has no books.
  if (!snapshot.activityHasBooks && claims.length) return unavailable('unknown', 'ability_check_empty_library');
  const words = snapshot.words.filter(w => w.hidden !== true);
  const groupedWords = groupSavedSenseEncounters(words, studyIdentityKey);
  // Book batches are separately ordered. Restore the page's representative order
  // within each same-identity/sense group: pinned key first, newest encounter, UUID.
  for (const group of groupedWords.values()) group.sort((a, b) => {
    const pinnedOrder = Number(a.study_identity_key == null) - Number(b.study_identity_key == null);
    if (pinnedOrder) return pinnedOrder;
    // PostgreSQL DESC defaults to NULLS FIRST. Keep microseconds when JS Date ties.
    const nullDateOrder = Number(b.created_at == null) - Number(a.created_at == null);
    if (nullDateOrder) return nullDateOrder;
    const dateOrder = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (dateOrder) return dateOrder;
    const fraction = (value: string) => (value?.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0');
    const aFraction = fraction(a.created_at), bFraction = fraction(b.created_at);
    if (aFraction !== bFraction) return bFraction < aFraction ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const progressByKey = new Map(snapshot.progressRows.map(p => [senseStudyKey(p.study_identity_key, p.definition_key), p]));
  const claimByKey = new Map(claims.map(c => [c.study_identity_key, c]));
  const common = { userId: snapshot.ownerId, groupedWords, progressByKey, colorSettings: snapshot.settings };
  const readingCards = buildReadingAbilityCheckCards({ ...common, claimByKey, metaById: new Map() });
  const claimCards = buildClaimAbilityCheckCards({ ...common, claimRows: claims, personallyHidden: snapshot.personallyHidden });
  const uniqueCards = new Map([...readingCards, ...claimCards].map(c => [cardSenseKey(c), c]));
  const cards = [...uniqueCards.values()].filter(c => c.studyIdentityKey.trim().length > 0);
  // Only tally sources represented by usable activity cards. Do not rewrite cards,
  // progress keys or claims to reconcile their older fallback normalization.
  const readingById = new Map(words.map(word => [word.id, word]));
  const eligibleIdentityCount = new Set(cards.flatMap(card => {
    if (!readingById.has(card.id)) return [card.studyIdentityKey];
    // A legacy activity group can collapse distinct canonical reading forms.
    // Count each usable occurrence's effective identity, not only its representative.
    return card.encounterIds.map(id => recommendationIdentity(readingById.get(id)!));
  }).filter(key => key.trim().length > 0)).size;
  const seenToday = new Set(context.seenTodayIds);
  const dueCardCount = cards.filter(c => isCardAvailableForLibraryCheck(c, 'all', seenToday)).length;
  return {
    status: eligibleIdentityCount >= 100 && dueCardCount >= 10 ? 'ready' : 'not_ready',
    eligibleIdentityCount, dueCardCount,
    recommendAbilityCheck: eligibleIdentityCount >= 100 && dueCardCount >= 10,
  };
}

class IncompleteActivitySource extends Error {
  constructor(readonly reason: string) { super(reason); }
}
function completeActivityRows<T extends { id: string }>(result: {
  data: T[] | null; error: unknown; count: number | null;
}, reason: string): T[] {
  if (result.error) throw result.error;
  const rows = result.data;
  if (!Number.isSafeInteger(result.count) || result.count === null || result.count < 0 ||
      !Array.isArray(rows) || rows.length !== result.count ||
      rows.some(row => !row.id) || new Set(rows.map(row => row.id)).size !== rows.length) {
    throw new IncompleteActivitySource(reason);
  }
  return rows;
}
const DEFAULT_SETTINGS: LearningSettingsRow = {
  red_stages: 1, orange_stages: 1, yellow_stages: 1,
  show_badge_numbers: true, skip_katakana_library_check: true,
};
/** Inject the existing signed-in client. Never creates a privileged client or accepts an arbitrary owner. */
export async function loadDailyReminderReadiness(
  client: SupabaseClient,
  studyContext: DailyStudyContext | null,
): Promise<DailyReminderReadiness> {
  try {
    const auth = await client.auth.getUser();
    if (auth.error) return unavailable('unknown', 'authentication_lookup');
    const ownerId = auth.data.user?.id;
    if (!ownerId) return unavailable('ineligible', 'signed_out');
    const profile = await client.from('profiles')
      .select('id, role, is_super_teacher, app_access_type, app_access_expires_at').eq('id', ownerId).maybeSingle();
    if (profile.error || !profile.data || profile.data.id !== ownerId) return unavailable('unknown', 'profile_lookup');
    const appAccess = getAppAccessStatus(profile.data);
    const features = getFeatureAccess({
      role: profile.data.is_super_teacher ? 'super_teacher' : profile.data.role ?? null,
      hasFullAccess: appAccess.hasFullAccess, isTrialActive: appAccess.reason === 'trial',
    });
    if (!canUseFullAccessFeature(features, 'ability_check')) return unavailable('ineligible', 'ability_check_access');
    if (!studyContext || !studyContext.seenTodayIds || studyContext.ownerId !== ownerId || studyContext.dayKey !== todayYmdAppTimeZone()) {
      return unavailable('unknown', 'study_context');
    }
    const settings = await client.from('user_learning_settings')
      .select('red_stages, orange_stages, yellow_stages, show_badge_numbers, skip_katakana_library_check')
      .eq('user_id', ownerId).maybeSingle();
    if (settings.error) return unavailable('unknown', 'settings_lookup');
    // Verify the same uncapped request used by the page is actually complete.
    const books = completeActivityRows<{ id: string; user_id: string }>(await
      client.from('user_books').select('id, user_id', { count: 'exact' }).eq('user_id', ownerId).order('id'),
      'ability_check_book_cap');
    if (books.some(b => b.user_id !== ownerId)) return unavailable('unknown', 'owner_mismatch');
    const bookIds = new Set(books.map(b => b.id));
    const words: UserBookWordRow[] = [];
    let expectedWordCount = 0;
    if (books.length) {
      // The current page requests 1000 rows. Detect a lower server cap before
      // the safer 500-row pagination could hide that activity compatibility gap.
      const probe = await client.from('personal_user_book_words')
        .select('id', { count: 'exact' }).in('user_book_id', [...bookIds])
        .not('hidden', 'is', true).or('target_language_code.is.null,target_language_code.eq.ja')
        .order('study_identity_key', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }).order('id').range(0, 999);
      if (probe.error) throw probe.error;
      if (!Number.isSafeInteger(probe.count) || probe.count === null || probe.count < 0 ||
          !Array.isArray(probe.data) || probe.data.length !== Math.min(1000, probe.count)) {
        return unavailable('unknown', 'ability_check_word_page_cap');
      }
      expectedWordCount = probe.count;
    }

    for (let i = 0; i < books.length; i += 75) {
      const batch = books.slice(i, i + 75).map(b => b.id);
      words.push(...await loadAllPagedRows<UserBookWordRow>((from, to) =>
        client.from('personal_user_book_words')
          .select('id, user_book_id, surface, alternative_surface, study_identity_key, reading, meaning, meaning_choice_index, jlpt, hidden, flashcard_hidden, created_at', { count: 'exact' })
          .in('user_book_id', batch).not('hidden', 'is', true)
          .or('target_language_code.is.null,target_language_code.eq.ja')
          .order('study_identity_key', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }).order('id').range(from, to)));
    }
    if (words.length !== expectedWordCount) return unavailable('unknown', 'vocabulary_changed');
    if (words.some(w => !bookIds.has(w.user_book_id))) return unavailable('unknown', 'owner_mismatch');
    const claims = completeActivityRows<LibraryWordClaimRow & { user_id: string }>(await
      client.from('user_library_word_claims')
        .select('id, user_id, study_identity_key, surface, reading, meaning, claimed_color, created_at, updated_at', { count: 'exact' })
        .eq('user_id', ownerId).eq('claimed_color', 'green')
        .order('updated_at', { ascending: false }).order('id').limit(500), 'ability_check_claim_cap');
    if (claims.some(c => c.user_id !== ownerId)) return unavailable('unknown', 'owner_mismatch');
    const hidden = await loadAllPagedRows<{ id: string; study_identity_key: string | null }>(async (from, to) => {
      const result = await client.from('personally_hidden_study_identities')
        .select('study_identity_key', { count: 'exact' }).order('study_identity_key').range(from, to);
      return { ...result, data: result.data?.map(r => ({ ...r, id: JSON.stringify(r.study_identity_key) })) ?? null };
    });
    const keys = [...new Set([...words.map(w => w.study_identity_key || studyIdentityKey(w.surface, w.reading)),
      ...claims.map(c => c.study_identity_key)].filter(Boolean))];
    // Independent 75-key reads need not accumulate one round trip per batch.
    // Four workers bound database load; keep batch order independent of arrival
    // order, and drain in-flight reads before returning any failure as unknown.
    const progressBatches: LibraryWordProgressRow[][] = new Array(Math.ceil(keys.length / 75));
    let nextBatch = 0;
    let failed = false;
    let failure: unknown;
    async function loadProgressBatches() {
      while (!failed && nextBatch < progressBatches.length) {
        const batchIndex = nextBatch++;
        try {
          const batch = completeActivityRows<LibraryWordProgressRow & { id: string }>(await
            client.from('user_library_word_progress').select('id, user_id, study_identity_key, surface, reading, definition_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, mastered, reading_gate_attempts, meaning_gate_attempts, reading_gate_passed_at, reading_gate_failed_at, meaning_gate_passed_at, meaning_gate_failed_at, mastered_at, last_studied_at', { count: 'exact' }).eq('user_id', ownerId)
              .in('study_identity_key', keys.slice(batchIndex * 75, (batchIndex + 1) * 75)).order('id'), 'ability_check_progress_cap');
          if (batch.some(p => p.user_id !== ownerId)) throw new IncompleteActivitySource('owner_mismatch');
          progressBatches[batchIndex] = batch;
        } catch (error) {
          if (!failed) { failed = true; failure = error; }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, progressBatches.length) }, () => loadProgressBatches()));
    if (failed) throw failure;
    const progressRows = progressBatches.flat();
    const finalAuth = await client.auth.getUser();
    if (finalAuth.error || finalAuth.data.user?.id !== ownerId) return unavailable('unknown', 'session_changed');
    return calculateDailyReminderReadiness({
      status: 'complete', ownerId, canUseAbilityCheck: true, activityHasBooks: books.length > 0, words, claims, progressRows,
      settings: { ...DEFAULT_SETTINGS, ...(settings.data ?? {}) },
      personallyHidden: new Set(hidden.map(h => h.study_identity_key).filter((k): k is string => Boolean(k))),
      studyContext,
    });
  } catch (error) {
    if (error instanceof IncompleteActivitySource) return unavailable('unknown', error.reason);
    // No raw errors or private record data are exposed, and no failure becomes a zero-word recommendation.
    return unavailable('unknown', 'incomplete_or_failed_query');
  }
}
