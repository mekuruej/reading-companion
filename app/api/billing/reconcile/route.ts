import { timingSafeEqual } from 'node:crypto';
import { BillingError, config, db, failure, json, stripe } from '@/lib/billing/server';
import { bindCheckout, processEvent, reconcileUser } from '@/lib/billing/reconcile';
export const runtime = 'nodejs';
export const maxDuration = 60;
// Invoke from a trusted scheduler every five minutes. Never callable with a user session.
export async function POST(request: Request) {
  try {
    const secret = process.env.BILLING_RECONCILE_SECRET;
    const supplied = request.headers.get('authorization') ?? '';
    const expected = `Bearer ${secret}`;
    if (!secret || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new BillingError('Unauthorized.', 401);
    }
    const c = config(), client = db();
    let failed = 0, processed = 0;
    const deadline = Date.now() + 40000;
    const events = await client.from('stripe_webhook_events').select('event_id').eq('status', 'pending')
      .order('last_attempt_at', { ascending: true, nullsFirst: true }).limit(10);
    if (events.error) throw events.error;
    for (const row of events.data ?? []) {
      if (Date.now() > deadline) break;
      try { await processEvent(await stripe().events.retrieve(row.event_id)); processed++; }
      catch { failed++; }
    }
    // Recover first payments even when the webhook never arrived. Re-scan a bounded
    // window; historical recovery can be done with Stripe event resend.
    for await (const session of stripe().checkout.sessions.list({ payment_link: c.link, status: 'complete',
      created: { gte: Math.floor(Date.now()/1000) - 7*86400 }, limit: 100 })) {
      if (Date.now() > deadline) break;
      if (!session.client_reference_id) continue;
      const bound = await client.from('stripe_subscriptions').select('subscription_id')
        .eq('subscription_id', typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? '').maybeSingle();
      if (bound.error) throw bound.error;
      if (bound.data) continue;
      try { await bindCheckout(session); }
      catch { failed++; console.error('Checkout reconciliation requires review', session.id); }
    }
    const rows = await client.from('stripe_subscriptions').select('user_id')
      .order('synced_at', { ascending: true, nullsFirst: true }).limit(25);
    if (rows.error) throw rows.error;
    for (const id of new Set((rows.data ?? []).map(s => s.user_id as string))) {
      if (Date.now() > deadline) break;
      try { await reconcileUser(id); processed++; } catch { failed++; }
    }
    return json({ processed, failed }, failed ? 503 : 200);
  } catch (error) { return failure(error); }
}
