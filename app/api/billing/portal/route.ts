import { authenticated, BillingError, config, db, failure, json, stripe } from '@/lib/billing/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const user = await authenticated(request);
    const body = await request.json().catch(() => ({}));
    if (typeof body.subscriptionId !== 'string') throw new BillingError('Select a subscription.', 400);
    const { data, error } = await db().from('stripe_subscriptions').select('customer_id')
      .eq('user_id', user.id).eq('subscription_id', body.subscriptionId).maybeSingle();
    if (error) throw error;
    if (!data) throw new BillingError('Subscription not found.', 404);
    const portal = await stripe().billingPortal.sessions.create({ customer: data.customer_id,
      return_url: `${config().appUrl}/reading-access` });
    return json({ url: portal.url });
  } catch (error) { return failure(error); }
}
