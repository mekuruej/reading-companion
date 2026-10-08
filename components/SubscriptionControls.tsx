'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Status = {
  reason: string; canSubscribe: boolean; configured: boolean; hasAccess: boolean;
  accessType: string; expiresAt: string | null; isComplimentaryLegacy: boolean;
  subscriptions: Array<{ id: string; status: string; cancelAtPeriodEnd: boolean; paidThrough: string | null; needsReview: boolean }>;
};
export default function SubscriptionControls({
  onComplimentaryLegacyChange,
}: {
  onComplimentaryLegacyChange?: (isComplimentaryLegacy: boolean) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function call(path: string, body?: object) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSignedOut(true); return null; }
    setSignedOut(false);
    const response = await fetch(`/api/billing/${path}`, { method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Could not load billing.');
    return result;
  }
  async function refresh() {
    setMessage('');
    try {
      const nextStatus = await call('status') as Status | null;
      setStatus(nextStatus);
      onComplimentaryLegacyChange?.(Boolean(nextStatus?.isComplimentaryLegacy));
    } catch (error) {
      setMessage((error as Error).message);
      onComplimentaryLegacyChange?.(false);
    }
  }
  useEffect(() => {
    void refresh();
    // A Stripe return only refreshes server-owned access. It never grants anything.
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  async function navigate(path: string, body: object) {
    setBusy(true); setMessage('');
    try { const data = await call(path, body); if (data?.url) window.location.assign(data.url); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  const button = 'rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-stone-700 disabled:cursor-wait disabled:opacity-60';
  const activeTrial = status?.reason === 'eligible' && status.hasAccess &&
    status.accessType.trim().toLowerCase() === 'trial';
  const trialEndDate = activeTrial && status?.expiresAt
    ? new Date(status.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  if (status?.isComplimentaryLegacy) return null;
  return <div className="mt-6 space-y-3" aria-live="polite">
    {signedOut ? <Link href="/login" className={`${button} inline-flex`}>Sign in to subscribe</Link> : null}
    {status?.reason === 'lessons' ? <p>Japanese Learning Tools are included with your lessons.</p> : null}
    {status?.reason === 'manual' ? <p>Your Japanese Learning Tools access is already arranged. No subscription is needed here.</p> : null}
    {status?.reason === 'staff' ? <p>Japanese Learning Tools are included with your staff access.</p> : null}
    {status?.reason === 'inactive' ? <p>Your account is inactive. Please contact MEKURU before subscribing.</p> : null}
    {activeTrial ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <p className="font-semibold">Japanese Learning Tools trial active</p>
      {trialEndDate ? <p className="mt-1">Your trial ends {trialEndDate}.</p> : null}
      <p className="mt-2">You have full access to the Japanese Learning Tools during your trial.</p>
      {status?.canSubscribe ? <p className="mt-2 text-emerald-900">Want to keep access after your trial? Subscribe anytime.</p> : null}
    </div> : null}
    {status?.canSubscribe ? <button type="button" disabled={busy} onClick={() => navigate('subscribe', {})} className={button}>
      Subscribe — ¥500/month
    </button> : null}
    {status && !status.configured ? <p className="text-sm text-stone-600">Online subscriptions are not available yet.</p> : null}
    {status?.subscriptions.map(s => <div key={s.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
      {s.cancelAtPeriodEnd && s.paidThrough ? <>
        <p className="font-semibold">Subscription ends {new Date(s.paidThrough).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        <p className="mt-1">You’ll keep access until then.</p>
      </> : <>
        <p className="font-semibold">Subscription: {s.status === 'pending' ? 'confirming payment' : s.status.replaceAll('_', ' ')}</p>
        {s.paidThrough ? <p className="mt-1">Paid through {new Date(s.paidThrough).toLocaleDateString()}.</p> : null}
        {s.cancelAtPeriodEnd ? <p>Cancellation is scheduled.</p> : null}
      </>}
      {['past_due','unpaid','incomplete'].includes(s.status) ? <p>Please check your payment method. Access is limited to time already paid for.</p> : null}
      {s.needsReview ? <p>MEKURU needs to review this subscription. You can still manage your billing below.</p> : null}
      {status.configured ? <button type="button" disabled={busy} onClick={() => navigate('portal', { subscriptionId: s.id })}
        className="mt-3 font-semibold underline underline-offset-4">Manage billing</button> : null}
    </div>)}
    {!signedOut ? <button type="button" onClick={refresh} disabled={busy} className="block text-sm text-stone-600 underline underline-offset-4">Refresh subscription status</button> : null}
    {!status && !signedOut && !message ? <p className="text-sm text-stone-500">Checking subscription…</p> : null}
    {message ? <p role="alert" className="text-sm text-red-700">{message}</p> : null}
    <p className="text-xs leading-5 text-stone-500">Access updates after payment is confirmed. If you have just subscribed, refresh your status in a moment.</p>
  </div>;
}
