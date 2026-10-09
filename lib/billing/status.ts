import 'server-only';
import { hasActiveComplimentaryLegacyAccess } from '@/lib/access/complimentaryLegacyAccess';
import { getAppAccessStatus } from '@/lib/access/appAccess';
import { BillingError, config, db } from './server';

export async function billingStatus(userId: string) {
  const client = db();
  const profileResult = await client.from('profiles').select('app_access_type,app_access_expires_at,app_access_subscription_id,trial_started_at,role,is_super_teacher')
    .eq('id', userId).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  const profile = profileResult.data;
  if (!profile) throw new BillingError('Complete your MEKURU profile first.', 409);
  const { data: rows, error } = await client.from('stripe_subscriptions')
    .select('subscription_id,status,cancel_at_period_end,paid_through,review_reason,created_at')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  const { data: legacyGrant, error: legacyGrantError } = await client
    .from('complimentary_legacy_access_grants')
    .select('user_id')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();
  if (legacyGrantError) throw legacyGrantError;
  const access = getAppAccessStatus(profile);
  const subscriptions = rows ?? [];
  const existing = subscriptions.some(s => !['canceled','incomplete_expired'].includes(s.status) ||
    (s.paid_through && Date.parse(s.paid_through) > Date.now()));
  const isComplimentaryLegacy = hasActiveComplimentaryLegacyAccess(profile, Boolean(legacyGrant), existing);
  let configured = true;
  try { config(); } catch { configured = false; }
  const reason = profile.app_access_type === 'inactive' ? 'inactive'
    : access.reason === 'staff' ? 'staff'
    : profile.app_access_type === 'lesson_access' ? 'lessons'
    : profile.app_access_type === 'reading_access' && !profile.app_access_subscription_id ? 'manual'
    : existing ? 'subscription' : 'eligible';
  return { reason, canSubscribe: configured && reason === 'eligible', configured, isComplimentaryLegacy,
    hasAccess: access.hasFullAccess, accessType: profile.app_access_type, expiresAt: profile.app_access_expires_at,
    subscriptions: subscriptions.map(s => ({ id: s.subscription_id, status: s.status,
      cancelAtPeriodEnd: s.cancel_at_period_end, paidThrough: s.paid_through, needsReview: Boolean(s.review_reason) })) };
}
