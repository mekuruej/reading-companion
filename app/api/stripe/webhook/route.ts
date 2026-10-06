import { BillingError, config, failure, json, stripe } from '@/lib/billing/server';
import { processEvent } from '@/lib/billing/reconcile';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    config();
    const signature = request.headers.get('stripe-signature');
    if (!signature) throw new BillingError('Missing signature.', 400);
    let event;
    try { event = stripe().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!); }
    catch { throw new BillingError('Invalid Stripe signature.', 400); }
    await processEvent(event);
    return json({ received: true });
  } catch (error) { return failure(error); }
}
