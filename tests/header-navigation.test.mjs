import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const headerSource = fs.readFileSync('components/Header.tsx', 'utf8');
function load(file, overrides = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (name in overrides) return overrides[name];
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts', overrides);
    if (name.startsWith('./')) return load(path.join(path.dirname(file), name) + '.ts', overrides);
    return require(name);
  });
  return exports;
}
const { getAppAccessStatus } = load('lib/access/appAccess.ts');
const { getFeatureAccess } = load('lib/access/featureAccess.ts');
const { shouldShowJapaneseStudyNavigation } = load('lib/access/japaneseLearningIntent.ts');
const code = ts.transpileModule(headerSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function nodes(node, predicate, out = []) {
  if (Array.isArray(node)) node.forEach(n => nodes(n, predicate, out));
  else if (node && typeof node === 'object') { if (predicate(node)) out.push(node); nodes(node.props?.children, predicate, out); }
  return out;
}
async function mount(profile, pathname = '/books') {
  const state = [], refs = [], effects = [], pending = [], listeners = new Map();
  let si, ri, ei, tree;
  const queries = [];
  const fakeDocument = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); } };
  const fakeWindow = { addEventListener() {}, removeEventListener() {} };
  const fakeReact = {
    useState(initial) { const i = si++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = ei++; const old = effects[i]; if (!old || deps.some((d, j) => d !== old.deps[j])) { old?.cleanup?.(); effects[i] = { deps }; pending.push(() => { effects[i].cleanup = fn(); }); } },
  };
  const supabase = { auth: { getUser: async () => ({ data: { user: profile ? { id: 'synthetic' } : null } }) }, from(table) {
    const query = { select(...args) { queries.push([table, ...args]); return query; }, eq() { return query; }, maybeSingle: async () => ({ data: profile, error: null }), then(resolve) { return Promise.resolve({ count: 3, error: null }).then(resolve); } }; return query;
  } };
  const exports = {};
  new Function('exports', 'require', 'document', 'window', code)(exports, name => ({
    react: fakeReact,
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => pathname },
    '@/components/TeacherAttentionBadge': { default: () => null },
    '@/lib/teacher/useTeacherAttention': { useTeacherAttention: () => ({ total: 7 }) },
    '@/lib/access/appAccess': { getAppAccessStatus, isMissingAppAccessColumnError: () => false },
    '@/lib/access/featureAccess': { getFeatureAccess },
    '@/lib/access/japaneseLearningIntent': { shouldShowJapaneseStudyNavigation },
    '@/lib/access/japaneseLearningFreeFeatures': { loadJapaneseLearningFreeFeatureFlags: async () => ({}) },
    '@/lib/supabaseClient': { supabase },
  })[name] ?? require(name), fakeDocument, fakeWindow);
  const render = () => { si = ri = ei = 0; tree = exports.default(); pending.splice(0).forEach(fn => fn()); return tree; };
  render(); await new Promise(setImmediate); render();
  return { render, queries, listeners, refs, all: predicate => nodes(tree, predicate), button: label => nodes(tree, n => n.type === 'button' && (n.props['aria-label'] === label || n.props.children?.includes?.(label)))[0], hrefs: () => nodes(tree, n => n.props?.href).map(n => n.props.href) };
}
const member = { username: 'synthetic', role: 'member', japanese_learning_enabled: true, target_language: 'ja', app_access_type: 'reading_access' };
for (const [label, profile, expected] of [
  ['signed out', null, { study: false, dictionary: false, teaching: false }],
  ['free member', { ...member, app_access_type: 'free' }, { study: true, dictionary: false, teaching: false }],
  ['full member', member, { study: true, dictionary: true, teaching: false }],
  ['trial member', { ...member, app_access_type: 'trial', app_access_expires_at: '2099-01-01' }, { study: true, dictionary: true, teaching: false }],
  ['student', { ...member, role: 'student' }, { study: true, dictionary: true, teaching: false }],
  ['teacher', { ...member, role: 'teacher' }, { study: true, dictionary: true, teaching: true }],
  ['admin', { ...member, role: 'admin' }, { study: true, dictionary: true, teaching: true }],
  ['super teacher', { ...member, role: 'super_teacher' }, { study: true, dictionary: true, teaching: true }],
  ['non-Japanese reader', { ...member, japanese_learning_enabled: false, target_language: 'en' }, { study: false, dictionary: true, teaching: false }],
]) test(`Production navigation conditions remain intact for ${label}`, async () => {
  const h = await mount(profile);
  assert.equal(Boolean(h.button('More Study destinations')), expected.study);
  assert.equal(h.hrefs().includes('/discovery/dictionary'), expected.dictionary);
  assert.equal(Boolean(h.button('Teaching')), expected.teaching);
  h.button('More Library destinations').props.onClick(); h.render();
  for (const route of ['/library', '/books/add', '/library/book-hubs', '/community/profile', '/reading-access']) assert.ok(h.hrefs().includes(route));
  if (expected.teaching) {
    h.button('Teaching').props.onClick(); h.render();
    assert.ok(h.hrefs().includes('/teacher'));
    assert.equal(h.hrefs().includes('/teacher/students'), profile.role !== 'admin');
    assert.equal(h.hrefs().includes('/teacher/admin'), ['admin', 'super_teacher'].includes(profile.role));
  }
});
test('trial access keeps Book Study available but Advanced Study locked', async () => {
  const h = await mount({ ...member, app_access_type: 'trial', app_access_expires_at: '2099-01-01' });
  h.button('More Study destinations').props.onClick(); h.render();
  assert.ok(h.hrefs().includes('/library-study/book-study'));
  assert.ok(!h.hrefs().includes('/library-study/advanced'));
});
test('menus are exclusive, Escape restores trigger focus, outside pointers close, and focus leaving closes', async () => {
  const h = await mount({ ...member, role: 'teacher' });
  const library = h.button('More Library destinations'); let focused = false;
  library.props.ref.current = { focus() { focused = true; } };
  library.props.onClick(); h.render();
  assert.equal(h.button('More Library destinations').props['aria-expanded'], true);
  h.listeners.get('keydown')({ key: 'Escape' }); h.render();
  assert.equal(h.button('More Library destinations').props['aria-expanded'], false); assert.equal(focused, true);
  h.button('More Library destinations').props.onClick(); h.render();
  h.button('More Study destinations').props.onClick(); h.render();
  assert.equal(h.button('More Library destinations').props['aria-expanded'], false);
  const studyWrapper = h.all(n => n.props?.ref && n.props?.onBlurCapture && nodes(n, c => c.props?.['aria-label'] === 'More Study destinations').length)[0];
  const inside = {}; studyWrapper.props.ref.current = { contains: target => target === inside };
  h.listeners.get('pointerdown')({ target: inside }); h.render();
  assert.equal(h.button('More Study destinations').props['aria-expanded'], true);
  h.listeners.get('pointerdown')({ target: {} }); h.render();
  assert.equal(h.button('More Study destinations').props['aria-expanded'], false);
  h.button('More Study destinations').props.onClick(); h.render();
  studyWrapper.props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null }); h.render();
  assert.equal(h.button('More Study destinations').props['aria-expanded'], false);
});
test('student workspace still links My Library to the signed-in account', async () => {
  const h = await mount(member, '/teacher/students/another/books/book/workspace');
  assert.ok(h.hrefs().includes('/users/synthetic/books'));
  assert.ok(!h.hrefs().some(href => href.includes('/users/another')));
});
test('presentation has no sticky header, appearance provider, account dropdown, or auth refactor', () => {
  assert.doesNotMatch(headerSource, /sticky top-0|useAppearance|appearance-|onAuthStateChange|My Account|signOut/);
  assert.match(headerSource, /aria-label="Main navigation"/);
  assert.match(headerSource, /trial_started_at/);
  const library = fs.readFileSync('app/(protected)/users/[username]/books/page.tsx', 'utf8');
  assert.match(library, /<UserBar[\s\S]*?variant="logoutOnly"/);
});
