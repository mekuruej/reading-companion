import { authenticated, failure, json } from '@/lib/billing/server';
import { billingStatus } from '@/lib/billing/status';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try { return json(await billingStatus((await authenticated(request)).id)); }
  catch (error) { return failure(error); }
}
