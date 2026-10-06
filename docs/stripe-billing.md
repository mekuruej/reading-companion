# MEKURU Japanese Learning Tools billing

## What this implements

Payment Link → server-issued opaque reference → signature-verified webhook → existing
`profiles.app_access_type = reading_access` and `app_access_expires_at`.
Feature helpers do not read Stripe tables. Browser returns never grant access.
Price: JPY 500 monthly, quantity one, no Stripe trial. Existing MEKURU trials remain separate.

The supplied production link is https://buy.stripe.com/dRm00j51C3NLe139oQgEg00.
It is documented only: no live keys, prices, dashboard settings, database migration or deployment
were provisioned by this implementation. The owner supplied these production identifiers (not yet verified against Stripe):

- Price: `price_1UNLlNGX4vBqbtcSb9vyINo8`
- Payment Link object: `plink_1UNLuPGX4vBqbtcSxJAkdrYP`

These production identifiers are documentation only. Untracked `.env.local` now contains
owner-supplied sandbox Price and Payment Link values with `STRIPE_LIVE_MODE=false`.
Test secrets and an isolated Supabase test database are still required before checkout testing.

## Database migration and boundaries

Apply `sql/20261006_stripe_subscription_billing.sql` once, after the existing profile and
Japanese Learning access-request migrations. It is transactional, not a repeatable migration.
Take the normal database backup and test it on staging first.

Four server-only RLS tables remain appropriate:

- `stripe_customers`: immutable customer → user mapping. A user can have multiple historical
  customers because a new Payment Link purchase may create another customer.
- `stripe_subscriptions`: one record per subscription, payment/status dates and review flags.
- `stripe_checkout_attempts`: opaque reference → authenticated account and single accepted
  Checkout Session. One-hour creation window; repeated Subscribe requests reuse an outstanding
  reference. Delayed webhooks may still bind a session CREATED during that window.
- `stripe_webhook_events`: durable deduplication/retry inbox. Original payloads are retrieved
  from Stripe during retries; no email or payment details are copied into this table.

These cannot safely be consolidated into a single profile/customer row: one user can have several
checkout attempts, subscriptions and events. No second entitlement system is introduced.

Three profile columns: `app_access_subscription_id` (provenance), `billing_sync_token` and
`billing_sync_until` (short-lived per-user worker lease). A worker must acquire the lease BEFORE
fetching Stripe state. Database writes verify the same unexpired token, lock the profile and
reject incomplete subscription snapshots. A process that loses its lease cannot overwrite a
newer worker. A newly bound subscription during reconciliation causes a retry.

The migration adds a trigger rejecting browser writes to entitlement, trial-history, staff-role,
provenance and lease fields. Browser profile setup uses database defaults and only sends editable
profile fields. Review existing live profile RLS, grants, SECURITY DEFINER functions and any
external administrative workflow on staging: a pre-existing privileged RPC must not bypass this
protection. Ordinary profile ownership policies must still prevent editing other users' profiles.
No live policy/catalog verification has been performed beyond the earlier REST schema audit.

Manual server-side changes to the access type or expiry clear Stripe provenance. To deliberately
replace a Stripe grant with a manual grant having IDENTICAL type/expiry, explicitly set
`app_access_subscription_id = null` too. Lesson/staff/inactive access takes precedence. No user
content is deleted or updated. Trial history is retained. A Stripe grant does not turn on the
user's Japanese-navigation preference.

Both trial activation routes now call `activate_guided_trial`, which atomically checks prior
trial history, current access, pending/bound subscriptions and approval under a profile lock.
If trial activation wins the race first, subsequent payment upgrades it; if Stripe binding wins,
trial activation is rejected.

## Environment variables

Copy names from `.env.example` into deployment secrets or untracked `.env.local`.
Never paste keys into chat or add them to version control.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: existing browser configuration.
- `SUPABASE_SERVICE_ROLE_KEY`: existing server-only credential.
- `STRIPE_SECRET_KEY`: test key for staging; live key only for production.
- `STRIPE_WEBHOOK_SECRET`: endpoint-specific secret; Stripe CLI uses a different local secret.
- `STRIPE_PRICE_ID`: supply the matching environment’s `price_...` ID here. Stripe Dashboard → Product catalogue →
  MEKURU Japanese Learning Tools → the JPY 500/month price → copy Price ID.
- `STRIPE_PAYMENT_LINK_ID`: the matching Payment Link object's `plink_...` ID, from Dashboard
  object details/Workbench or the Stripe API. The public `buy.stripe.com/...` suffix is NOT this ID.
- `STRIPE_PAYMENT_LINK_URL`: matching full hosted URL, with no appended reference.
- `STRIPE_LIVE_MODE`: explicitly `false` in test, `true` in production.
- `APP_URL`: canonical MEKURU origin (HTTPS in production, localhost allowed for local testing).
- `BILLING_RECONCILE_SECRET`: independent long random scheduler credential.

All billing variables and service-role credentials remain server-only. The public Supabase anon
key is intentionally client-side. Missing required billing configuration disables Subscribe.
Billing endpoints require the migration before they can read the new schema.

SDK: Stripe 23; API/webhook version **2026-09-30.endive**, explicitly pinned in
`lib/billing/server.ts`. Configure the webhook version accordingly. Billing periods come from the
matching subscription item, not removed subscription-level fields.

## Stripe Dashboard setup

1. In test mode create Product **MEKURU Japanese Learning Tools** with one recurring monthly
   JPY 500 price, quantity one. Disable adjustable quantities, promotions, extra products and
   Stripe free trials for this first release. Production needs separate live objects.
2. Create the Payment Link using that price. Keep the first release to card payments. If other
   methods are enabled, the asynchronous events below must remain enabled and tested.
3. Set the link's post-payment redirect to `APP_URL/reading-access`. This is a status page only.
   Do not put user IDs or static client-reference values into the configured link.
4. Configure Customer Portal cancellation at period end, payment-method updates and billing
   details. Disable product/price switching and trial changes; the integration supports one
   fixed-price product. Portal return goes to `/reading-access`.
5. Create a webhook endpoint at `APP_URL/api/stripe/webhook`, API version above, with:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
6. Set failed-payment retry behavior in Stripe. MEKURU grants no grace period regardless of
   retry settings. Do not use Stripe Entitlements for this integration.
7. Configure a trusted scheduler to POST `/api/billing/reconcile` every five minutes with
   `Authorization: Bearer <BILLING_RECONCILE_SECRET>`. Do not expose that header to browser code.
   The endpoint retries pending events, scans seven days of completed Payment Link sessions for
   missing initial bindings, then refreshes least-recently-synced users (bounded batches).
   Configure monitoring for non-2xx responses and execution timeouts. Hosting must support a
   60-second route duration; scheduler setup depends on your deployment provider.

## Access and event behavior

- Subscribe validates the user's bearer token with Supabase `auth.getUser`. Body user/customer
  IDs are never trusted. Database checks also block duplicate/pending subscriptions.
- A random 256-bit checkout reference is mapped server-side and passed as `client_reference_id`.
  Never share the personalized resulting URL: it attributes payment to its original account.
- Webhooks verify the raw body with the Stripe SDK, validate mode, and persist an event ID.
  Completed Checkout Sessions must match the link, price, quantity and reference.
- If an invoice arrives first, the server looks up the subscription's completed Checkout Session
  to establish the same verified reference mapping. Billing email is never an identity key.
- Workers retrieve CURRENT Stripe objects under the lease, rather than applying old event snapshots
  or ordering by event timestamps. Repeated events and repeated session bindings are safe.
- Paid-through comes from the most recent qualifying paid invoice's subscription line, not from
  `active` status or an advancing billing period. The fixed-price first release requires JPY 500
  or more paid and a non-prorated matching line; discounted/free invoices do not grant access.
- Failed payments, `past_due`, `unpaid` and pauses do not extend paid-through or remove time already
  paid for. No grace period. Recovery extends/restores `reading_access` after verified payment.
- Period-end cancellation preserves access. Even an immediate Stripe cancellation retains any
  remaining verified paid-through time; once no qualifying paid time remains, Stripe-owned access
  becomes `free`. Existing timestamp checks stop premium access even if reconciliation is delayed.
  The scheduler normalizes the stored type to `free`; it never restarts a trial.
- Inactive, manual, lesson and staff grants are preserved. Paid events for those profiles set a
  review flag instead of replacing access. Trial history and all reading data remain intact.
- All bound subscriptions are considered together. Ending an old subscription cannot revoke a
  newer qualifying subscription. Multiple open subscriptions are flagged for review.

## Operational limits and review

Payment Links are reusable public checkout pages. This mitigates repeat clicks and prevents
reusing one reference across sessions, but cannot guarantee prevention of another CHARGE through
an old copied link. A second checkout using an already-consumed reference is rejected for
entitlement purposes and recorded for review; it must be inspected/canceled/refunded manually
in Stripe if appropriate. No automatic refund or cancellation is performed.

Monitor `stripe_webhook_events.status = 'review'`, pending retries, and non-null
`stripe_subscriptions.review_reason`. Investigate invalid references, price changes, duplicate
subscriptions and payments for inactive/manual/lesson accounts. Review records do not retry
until the underlying issue is resolved and an operator deliberately resets status to `pending`.
For missed initial payments older than seven days, resend the original event from Stripe.

This release does not automate refunds, disputes, discounts, price migrations or multiple products.
Do not change the configured price on existing subscriptions without an explicit migration plan.
Keep old Stripe IDs; never reassign them by email. Separate staging and production databases are
required because tables intentionally model one Stripe mode per deployment.

## Safe test-mode checklist

1. Use a staging Supabase project and test profiles; apply the SQL there only. Verify public and
   authenticated roles cannot change paid/staff access or execute billing RPCs. Confirm legitimate
   profile edits, teacher relationships and existing feature behavior still work.
2. Configure test keys, test Price/Payment Link IDs and URL, `STRIPE_LIVE_MODE=false`, and local/
   staging `APP_URL`. Keep production credentials absent.
3. Run `npm run test:billing`, `npx tsc --noEmit --incremental false`, and `npm run build`.
   Existing trial regression: `PGLITE_MODULE="$PWD/node_modules/@electric-sql/pglite/dist/index.js" node --test tests/guided-trial-workflow.test.mjs`.
4. Use Stripe CLI `stripe listen --forward-to localhost:3000/api/stripe/webhook` for local delivery;
   configure its signing secret locally. Complete an ACTUAL test Payment Link purchase from
   Subscribe (e.g. Stripe's test card 4242 4242 4242 4242), not just unrelated CLI fixture events.
5. Verify the URL contains an opaque reference, IDs are stored, paid access appears after the
   webhook, and loading the return page alone does not grant access.
6. Use Stripe test mode/available test-clock tooling to exercise renewal, failed renewal/recovery,
   scheduled cancellation, reversal and actual expiry. Verify paid-through-only behavior.
7. Resend events, deliver them out of order, and simulate a temporary webhook outage. Confirm the
   scheduler recovers and no duplicate grant occurs. Never use live charges for this test.
8. Test lesson/manual/staff/inactive profiles, trial → paid → free, and duplicate checkout tabs.
   Confirm books, vocabulary, journals, trial history and reading history are unchanged.
9. Test portal cancellation and payment updates; a forged subscription ID belonging to another
   user must return 404. Test both billing-email changes and app-email changes.
10. Only after staging acceptance: apply the production migration, configure live objects/secrets,
    register the live webhook/scheduler, deploy, and monitor review records. A code rollback does
    not require dropping billing tables. Preserve records for audit/recovery.

References: https://docs.stripe.com/payment-links/url-parameters,
https://docs.stripe.com/webhooks, https://docs.stripe.com/billing/subscriptions/webhooks.
