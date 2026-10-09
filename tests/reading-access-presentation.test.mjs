import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => mocks[name] ?? require(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
const base = { reason: 'eligible', canSubscribe: true, configured: true, hasAccess: false,
  accessType: 'free', expiresAt: null, isComplimentaryLegacy: false, subscriptions: [] };
function render(status, signedOut = false) {
  const values = [status, signedOut, false, ''];
  const Component = load('../components/SubscriptionControls.tsx', {
    react: { ...React, useState: () => [values.shift(), () => {}], useEffect: () => {} },
    'next/link': link, '@/lib/supabaseClient': { supabase: {} },
  }).default;
  return renderToStaticMarkup(React.createElement(Component));
}

test('free access presents status before subscription action; signed-out users can sign in', () => {
  const html = render(base);
  assert.ok(html.indexOf('Free reading tools remain available') < html.indexOf('Subscribe —'));
  assert.match(render(null, true), /Sign in to view your access/);
});
test('active trial keeps its date, full-access copy and subscribe action', () => {
  const expiresAt = '2030-10-20T12:00:00Z';
  const html = render({ ...base, hasAccess: true, accessType: 'trial', expiresAt });
  assert.match(html, /Japanese Learning Tools trial active/);
  assert.ok(html.includes(new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })));
  assert.match(html, /Subscribe — ¥500\/month/);
});
test('lesson, staff and ordinary manual access have their own status without acquisition copy', () => {
  for (const reason of ['lessons', 'staff', 'manual']) {
    const html = render({ ...base, reason, hasAccess: true, canSubscribe: false });
    assert.match(html, /Japanese Learning Tools are included/);
    assert.doesNotMatch(html, /Subscribe —|payment is confirmed|through Stripe/);
  }
});
test('complimentary legacy access suppresses all payment and subscription controls', () => {
  const html = render({ ...base, hasAccess: true, isComplimentaryLegacy: true });
  assert.match(html, /complimentary legacy access/);
  assert.doesNotMatch(html, /Subscribe —|Refresh subscription|payment|Manage billing|Cancellation/);
});
test('subscriber and period-end cancellation keep billing management and paid-through messaging', () => {
  for (const cancelAtPeriodEnd of [false, true]) {
    const html = render({ ...base, reason: 'subscription', hasAccess: true, canSubscribe: false,
      subscriptions: [{ id: 'sub_test', status: 'active', cancelAtPeriodEnd, paidThrough: '2030-10-20T12:00:00Z', needsReview: false }] });
    assert.match(html, /Manage billing/);
    assert.doesNotMatch(html, /Subscribe —/);
    assert.match(html, cancelAtPeriodEnd ? /You’ll keep access until then/ : /Subscription: active/);
  }
});
test('expired trial retains basic app access and trial-ended links use existing destinations', () => {
  const { getAppAccessStatus } = load('../lib/access/appAccess.ts');
  const status = getAppAccessStatus({ role: 'member', app_access_type: 'trial', app_access_expires_at: '2020-01-01T00:00:00Z' });
  assert.equal(status.hasAccess, true);
  assert.equal(status.hasFullAccess, false);
  const Page = load('../app/trial-ended/page.tsx', { 'next/link': link }).default;
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.match(html, /href="\/reading-access"/);
  assert.match(html, /href="\/books"/);
  assert.match(html, /Free reading tools remain available/);
  assert.doesNotMatch(html, /email|mailto:/);
});
