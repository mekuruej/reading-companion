import { randomBytes } from 'node:crypto';
import { authenticated, BillingError, config, failure, json, rpc } from '@/lib/billing/server';
import { billingStatus } from '@/lib/billing/status';
import { reconcileUser, validatePaymentLink } from '@/lib/billing/reconcile';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const user = await authenticated(request);
    const c = config();
    await reconcileUser(user.id);
    const status = await billingStatus(user.id);
    if (!status.canSubscribe) throw new BillingError('This account cannot start another subscription. Check your access or manage existing billing.', 409);
    await validatePaymentLink();
    const reference = await rpc('begin_stripe_checkout', { p_user: user.id,
      p_reference: randomBytes(32).toString('hex'), p_link: c.link, p_price: c.price });
    const url = new URL(c.paymentUrl);
    url.searchParams.set('client_reference_id', reference);
    return json({ url: url.toString() });
  } catch (error) { return failure(error); }
}
