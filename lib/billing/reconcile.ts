import 'server-only';
import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { BillingError, config, db, objectId, rpc, stripe } from './server';

const iso = (seconds: number | null | undefined) => seconds ? new Date(seconds * 1000).toISOString() : null;
export async function validatePaymentLink() {
  const c = config(), api = stripe();
  const [link, price, lines] = await Promise.all([
    api.paymentLinks.retrieve(c.link), api.prices.retrieve(c.price), api.paymentLinks.listLineItems(c.link, { limit: 10 }),
  ]);
  if (!link.active || link.livemode !== c.live || link.url !== c.paymentUrl || price.livemode !== c.live ||
    !price.active || price.currency !== 'jpy' || price.unit_amount !== 500 ||
    price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
    lines.has_more || lines.data.length !== 1 || objectId(lines.data[0].price) !== c.price || lines.data[0].quantity !== 1) {
    throw new BillingError('Subscription configuration needs review.');
  }
}
export async function bindCheckout(session: Stripe.Checkout.Session) {
  const c = config();
  const subscription = objectId(session.subscription), customer = objectId(session.customer);
  if (session.livemode !== c.live || objectId(session.payment_link) !== c.link || session.mode !== 'subscription' ||
    session.status !== 'complete' || !subscription || !customer ||
    !session.client_reference_id || !/^[a-f0-9]{64}$/.test(session.client_reference_id)) {
    throw new BillingError('Checkout association requires review.', 409, true);
  }
  const lines = await stripe().checkout.sessions.listLineItems(session.id, { limit: 10 });
  if (lines.has_more || lines.data.length !== 1 || objectId(lines.data[0].price) !== c.price || lines.data[0].quantity !== 1) {
    throw new BillingError('Unexpected checkout price.', 409, true);
  }
  return await rpc('bind_stripe_checkout', { p_reference: session.client_reference_id, p_session: session.id,
    p_subscription: subscription, p_customer: customer, p_link: c.link, p_price: c.price, p_created: iso(session.created) }) as string;
}
export async function userForSubscription(id: string) {
  const result = await db().from('stripe_subscriptions').select('user_id').eq('subscription_id', id).maybeSingle();
  if (result.error) throw result.error;
  if (result.data) return result.data.user_id as string;
  // Invoice/subscription events may arrive before checkout.session.completed.
  const sessions = await stripe().checkout.sessions.list({ subscription: id, limit: 10 });
  const session = sessions.data.find(s => s.status === 'complete' && objectId(s.payment_link) === config().link);
  if (!session) throw new BillingError('Waiting for checkout association.', 503);
  return bindCheckout(session);
}

export async function subscriptionSnapshot(id: string, customer: string) {
  const api = stripe(), c = config();
  const sub = await api.subscriptions.retrieve(id);
  if (sub.livemode !== c.live || objectId(sub.customer) !== customer) throw new BillingError('Subscription ownership mismatch.', 409, true);
  const item = sub.items.data.find(i => i.price.id === c.price);
  const valid = sub.items.data.length === 1 && !sub.items.has_more && item?.quantity === 1 &&
    item.price.currency === 'jpy' && item.price.unit_amount === 500 && item.price.recurring?.interval === 'month' &&
    item.price.recurring.interval_count === 1;
  let paidThrough: number | null = null;
  // Read paid invoices, never infer payment from status or an advancing billing period.
  // Most recent qualifying monthly invoice is sufficient for this single fixed-price product.
  if (valid) {
    let inspected = 0;
    for await (const invoice of api.invoices.list({ subscription: id, status: 'paid', limit: 20 })) {
      if (++inspected > 100) throw new BillingError('Invoice history needs review.', 409, true);
      if (invoice.livemode !== c.live || objectId(invoice.customer) !== customer ||
        invoice.currency !== 'jpy' || invoice.amount_paid < 500) continue;
      for await (const line of api.invoices.listLineItems(invoice.id, { limit: 100 })) {
        if (objectId(line.pricing?.price_details?.price) === c.price &&
          objectId(line.parent?.subscription_item_details?.subscription) === id &&
          !line.parent?.subscription_item_details?.proration && line.amount >= 500) {
          paidThrough = Math.max(paidThrough ?? 0, line.period.end);
        }
      }
      if (paidThrough) break;
    }
  }
  return { subscription_id: id, status: sub.status, cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: iso(item?.current_period_end), paid_through: iso(paidThrough), ended_at: iso(sub.ended_at),
    review_reason: valid ? null : 'unexpected_subscription_price' };
}
export async function reconcileUser(userId: string) {
  const token = randomUUID();
  if (!await rpc('acquire_billing_sync', { p_user: userId, p_token: token })) throw new BillingError('Billing update in progress. Please retry.', 503);
  try {
    const { data, error } = await db().from('stripe_subscriptions').select('subscription_id,customer_id').eq('user_id', userId);
    if (error) throw error;
    const snapshots = [];
    for (const row of data ?? []) snapshots.push(await subscriptionSnapshot(row.subscription_id, row.customer_id));
    await rpc('apply_stripe_snapshot', { p_user: userId, p_token: token, p_snapshots: snapshots });
  } finally {
    await rpc('release_billing_sync', { p_user: userId, p_token: token });
  }
}

export const WEBHOOK_EVENTS = new Set([
  'checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed',
  'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted',
  'customer.subscription.paused','customer.subscription.resumed',
  'invoice.paid','invoice.payment_failed','invoice.payment_action_required',
]);
export async function processEvent(event: Stripe.Event) {
  if (!WEBHOOK_EVENTS.has(event.type)) return;
  if (event.livemode !== config().live) throw new BillingError('Wrong Stripe mode.', 400, true);
  const client = db();
  const inserted = await client.from('stripe_webhook_events').upsert({ event_id: event.id, event_type: event.type },
    { onConflict: 'event_id', ignoreDuplicates: true });
  if (inserted.error) throw inserted.error;
  const existing = await client.from('stripe_webhook_events').select('status,attempts').eq('event_id', event.id).single();
  if (existing.error) throw existing.error;
  if (existing.data.status !== 'pending') return;
  let status = 'processed', errorMessage: string | null = null;
  try {
    if (!("id" in event.data.object)) throw new BillingError("Unexpected Stripe object.", 409, true);
    const id = event.data.object.id;
    let user: string;
    if (event.type.startsWith('checkout.')) {
      // Retrieve the current session instead of trusting stale webhook snapshots.
      user = await bindCheckout(await stripe().checkout.sessions.retrieve(id));
    } else if (event.type.startsWith('customer.subscription.')) {
      user = await userForSubscription(id);
    } else {
      const invoice = await stripe().invoices.retrieve(id);
      const subId = objectId(invoice.parent?.subscription_details?.subscription);
      if (!subId) return; // Unrelated invoice; recorded below by finally.
      user = await userForSubscription(subId);
    }
    await reconcileUser(user);
  } catch (error) {
    if (error instanceof BillingError && error.review) {
      status = 'review'; errorMessage = error.message;
      console.error('Stripe event requires review', event.id, errorMessage);
    } else {
      status = 'pending'; errorMessage = 'Processing failed; retry required';
      throw error;
    }
  } finally {
    const result = await client.from('stripe_webhook_events').update({ status, last_error: errorMessage,
      attempts: existing.data.attempts + 1, last_attempt_at: new Date().toISOString(), processed_at: status === 'pending' ? null : new Date().toISOString() })
      .eq('event_id', event.id).eq('status', 'pending');
    if (result.error) throw result.error;
  }
}
