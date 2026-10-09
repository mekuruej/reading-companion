import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveComplimentaryLegacyAccess } from "@/lib/access/complimentaryLegacyAccess";

async function collect<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

// Use a service-role client after authorization. Never return grant metadata.
export async function loadActiveComplimentaryLegacyUserIds(db: SupabaseClient, scopeIds?: string[]) {
  if (scopeIds?.length === 0) return new Set<string>();
  const grants = await collect<{ user_id: string }>((from, to) => {
    let query = db.from("complimentary_legacy_access_grants").select("user_id")
      .is("revoked_at", null).order("user_id").range(from, to);
    if (scopeIds) query = query.in("user_id", scopeIds);
    return query;
  });
  const ids = [...new Set(grants.map(grant => grant.user_id))];
  const activeIds = new Set<string>();
  for (let start = 0; start < ids.length; start += 200) {
    const batch = ids.slice(start, start + 200);
    const { data: profiles, error } = await db.from("profiles")
      .select("id, role, is_super_teacher, app_access_type, app_access_expires_at, app_access_subscription_id, trial_started_at")
      .in("id", batch);
    if (error) throw error;
    const subscriptions = await collect<{ user_id: string; status: string; paid_through: string | null }>((from, to) =>
      db.from("stripe_subscriptions").select("user_id, status, paid_through").in("user_id", batch)
        .order("subscription_id").range(from, to));
    const subscribedIds = new Set(subscriptions.filter(subscription =>
      !["canceled", "incomplete_expired"].includes(subscription.status) ||
      Boolean(subscription.paid_through && Date.parse(subscription.paid_through) > Date.now())
    ).map(subscription => subscription.user_id));
    for (const profile of profiles ?? []) {
      if (hasActiveComplimentaryLegacyAccess(profile, true, subscribedIds.has(profile.id))) activeIds.add(profile.id);
    }
  }
  return activeIds;
}
