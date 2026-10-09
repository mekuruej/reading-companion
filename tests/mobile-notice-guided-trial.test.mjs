import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function compile(path, require, window) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', 'window', 'fetch', code)(exports, require, window, window?.fetch);
  return exports.default;
}
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };

test('mobile notice uses the existing breakpoint, survives navigation, and remembers session dismissal', () => {
  const stored = new Map();
  const browser = {
    sessionStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    dispatchEvent() {},
  };
  const react = { useSyncExternalStore: (_subscribe, snapshot) => snapshot() };
  const require = name => name === 'react' ? react : jsx;
  const notice = compile('components/MobileOptimizationNotice.tsx', require, browser);
  const visible = notice();
  assert.match(visible.props.className, /md:hidden/);
  assert.doesNotMatch(visible.props.className, /fixed|absolute/);
  visible.props.children[1].props.onClick();
  assert.equal(notice(), null);
  const remounted = compile('components/MobileOptimizationNotice.tsx', require, browser);
  assert.equal(remounted(), null);
  const newSession = compile('components/MobileOptimizationNotice.tsx', require, { ...browser, sessionStorage: { getItem: () => null } });
  assert.ok(newSession());
});

test('guided-trial scheduling requires the existing authenticated approved request', async () => {
  for (const status of ['approved', 'pending', 'declined', null, 'error', 'signed-out']) {
    let state = 'loading';
    const effects = [];
    const requests = [];
    const browser = { fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: status !== 'error', json: async () => ({ request: status ? { status } : null }) };
    } };
    const react = { useState: () => [state, next => { state = next; }], useEffect: effect => effects.push(effect) };
    const supabase = { auth: { getSession: async () => ({ data: { session: status === 'signed-out' ? null : { access_token: 'test-token' } }, error: null }) } };
    const component = compile('components/GuidedTrialSchedulingAction.tsx', name =>
      name === 'react' ? react : name === 'react/jsx-runtime' ? jsx : name.includes('supabaseClient') ? { supabase } : { default: 'Link' }, browser);
    component();
    effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    const rendered = component();
    if (status === 'approved') {
      assert.equal(rendered.type, 'a');
      assert.equal(rendered.props.href, 'https://scheduler.zoom.us/mekuru/initial-japanese');
      assert.equal(rendered.props.children, 'Schedule your initial reading session');
    } else {
      assert.notEqual(rendered.type, 'a');
      assert.equal(rendered.props.href, undefined);
    }
    if (requests.length) {
      assert.equal(requests[0].url, '/api/japanese-learning/request');
      assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token');
      assert.equal(requests[0].options.method, undefined); // Read-only approval check.
    }
  }
});

test('direct-link information retains the route, hides indexing, and avoids acquisition messaging', () => {
  const page = fs.readFileSync('app/try-mekuru/page.tsx', 'utf8');
  assert.match(page, /index: false/);
  assert.match(page, /30-minute/);
  assert.match(page, /28-day/);
  assert.match(page, /optional follow-up/);
  assert.doesNotMatch(page, /Request an invitation|Subscribe|requires approval/);
  const approvalPage = fs.readFileSync('app/(protected)/japanese-learning/page.tsx', 'utf8');
  assert.match(approvalPage, /https:\/\/scheduler.zoom.us\/mekuru\/initial-japanese/);
  assert.match(approvalPage, /!loading && approvedRequest/);
  assert.match(approvalPage, /href="\/try-mekuru"/);
});
