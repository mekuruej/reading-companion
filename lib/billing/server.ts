import 'server-only';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const STRIPE_API_VERSION = '2026-09-30.endive' as const;
export class BillingError extends Error {
  constructor(message: string, public status = 503, public review = false) { super(message); }
}
export function config() {
  const required = ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_ID','STRIPE_PAYMENT_LINK_ID',
    'STRIPE_PAYMENT_LINK_URL','APP_URL','STRIPE_LIVE_MODE'] as const;
  if (required.some(key => !process.env[key]) || !['true','false'].includes(process.env.STRIPE_LIVE_MODE!)) {
    throw new BillingError('Subscriptions are not available yet.');
  }
  const url = new URL(process.env.STRIPE_PAYMENT_LINK_URL!);
  const app = new URL(process.env.APP_URL!);
  if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com' ||
    (app.protocol !== 'https:' && app.hostname !== 'localhost')) throw new BillingError('Invalid billing configuration.');
  return { price: process.env.STRIPE_PRICE_ID!, link: process.env.STRIPE_PAYMENT_LINK_ID!,
    paymentUrl: url.toString(), appUrl: app.origin, live: process.env.STRIPE_LIVE_MODE === 'true' };
}
let client: Stripe;
export function stripe() {
  config();
  return client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: STRIPE_API_VERSION, timeout: 15000, maxNetworkRetries: 1 });
}
export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function authenticated(request: Request) {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) throw new BillingError('Please sign in.', 401);
  const result = await db().auth.getUser(match[1]);
  if (result.error || !result.data.user) throw new BillingError('Please sign in again.', 401);
  return result.data.user;
}
export async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await db().rpc(name, args);
  if (error) {
    if (error.code === '22023') throw new BillingError('Checkout association requires review.', 409, true);
    if (error.code === 'P0001') throw new BillingError(error.message, 409);
    throw new BillingError('Billing could not be updated. Please try again.', 503);
  }
  return data;
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function failure(error: unknown) {
  if (error instanceof BillingError) return json({ error: error.message }, error.status);
  console.error('Billing operation failed', error instanceof Error ? error.name : 'unknown');
  return json({ error: 'Billing is temporarily unavailable. Please try again.' }, 503);
}
export function objectId(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id ?? null;
}
