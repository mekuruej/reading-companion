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
async function mount(profile, pathname = '/books', options = {}) {
  let currentProfile = profile;
  let currentUser = profile ? { id: 'synthetic' } : null;
  const authListeners = new Set(), windowListeners = new Map();
  const navigation = [];
  const router = { replace: href => navigation.push(href), refresh: () => navigation.push('refresh') };
  const text = n => Array.isArray(n) ? n.map(text).join('') : typeof n === 'string' ? n : n && typeof n === 'object' ? text(n.props?.children) : '';
  const state = [], refs = [], effects = [], pending = [], listeners = new Map();
  let si, ri, ei, tree;
  const queries = [];
  const fakeDocument = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); } };
  const fakeWindow = { addEventListener(name, fn) { windowListeners.set(name, fn); }, removeEventListener(name) { windowListeners.delete(name); } };
  const fakeReact = {
    useState(initial) { const i = si++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = ei++; const old = effects[i]; if (!old || deps.some((d, j) => d !== old.deps[j])) { old?.cleanup?.(); effects[i] = { deps }; pending.push(() => { effects[i].cleanup = fn(); }); } },
  };
  const supabase = { auth: { getUser: () => options.getUser ? options.getUser() : Promise.resolve({ data: { user: currentUser } }), onAuthStateChange(fn) { authListeners.add(fn); return { data: { subscription: { unsubscribe: () => authListeners.delete(fn) } } }; }, async signOut() { if (options.signOutError) return { error: options.signOutError }; currentUser = null; currentProfile = null; authListeners.forEach(fn => fn('SIGNED_OUT', null)); return { error: null }; } }, from(table) {
    const query = { select(...args) { queries.push([table, ...args]); return query; }, eq() { return query; }, maybeSingle: async () => options.profileResponse ? options.profileResponse() : ({ data: currentProfile, error: null }), then(resolve) { return Promise.resolve({ count: 3, error: null }).then(resolve); } }; return query;
  } };
  const exports = {};
  new Function('exports', 'require', 'document', 'window', code)(exports, name => ({
    react: fakeReact,
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => pathname, useRouter: () => router },
    '@/components/TeacherAttentionBadge': { default: () => null },
    '@/lib/teacher/useTeacherAttention': { useTeacherAttention: () => ({ total: 7 }) },
    '@/lib/access/appAccess': { getAppAccessStatus, isMissingAppAccessColumnError: () => false },
    '@/lib/access/featureAccess': { getFeatureAccess },
    '@/lib/access/japaneseLearningIntent': { shouldShowJapaneseStudyNavigation },
    '@/lib/access/japaneseLearningFreeFeatures': { loadJapaneseLearningFreeFeatureFlags: async () => ({}) },
    '@/lib/supabaseClient': { supabase },
    '@/lib/appearance/defaultAppearance': load('lib/appearance/defaultAppearance.ts'),
  })[name] ?? require(name), fakeDocument, fakeWindow);
  const render = () => { si = ri = ei = 0; tree = exports.default(); pending.splice(0).forEach(fn => fn()); return tree; };
  render(); await new Promise(setImmediate); render();
  return { render, queries, listeners, refs, navigation, windowListeners, async flush() { render(); await new Promise(setImmediate); render(); await new Promise(setImmediate); render(); }, setIdentity(nextProfile, id = 'synthetic') { currentProfile = nextProfile; currentUser = nextProfile ? { id } : null; }, emit(event, session) { authListeners.forEach(fn => fn(event, session)); }, all: predicate => nodes(tree, predicate), button: label => nodes(tree, n => n.type === 'button' && (n.props['aria-label'] === label || text(n.props.children).trim() === label))[0], hrefs: () => nodes(tree, n => n.props?.href).map(n => n.props.href) };
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
  for (const route of ['/library', '/books/add', '/community/profile', '/reading-access']) assert.ok(h.hrefs().includes(route));
  assert.ok(!h.hrefs().includes('/library/book-hubs'));
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
test('recovered account menu retains Production appearance and Library logout', () => {
  assert.doesNotMatch(headerSource, /sticky top-0|useAppearance|AppearanceProvider|localStorage/);
  assert.match(headerSource, /aria-label="Main navigation"/);
  assert.match(headerSource, /trial_started_at/);
  const library = fs.readFileSync('app/(protected)/users/[username]/books/page.tsx', 'utf8');
  assert.match(library, /<UserBar[\s\S]*?variant="logoutOnly"/);
});

test('account menu recovers the existing destinations and signed-out controls', async () => {
  const h = await mount(member);
  assert.ok(h.button('My Account'));
  assert.ok(!h.hrefs().includes('/login'));
  h.button('My Account').props.onClick(); h.render();
  for (const href of ['/community/profile','mailto:mekuru.ej@gmail.com','/reading-access']) assert.ok(h.hrefs().includes(href));
  assert.ok(h.button('Log out'));
  const signedOut = await mount(null);
  assert.ok(!signedOut.button('My Account'));
  assert.ok(signedOut.hrefs().includes('/login'));
  assert.ok(signedOut.hrefs().includes('/login/beta-signup'));
});
test('account menu shares exclusivity, Escape, outside click and focus-leaving behavior', async () => {
  const h = await mount({ ...member, role: 'teacher' });
  let focused = false;
  h.button('My Account').props.ref.current = { focus() { focused = true; } };
  h.button('My Account').props.onClick(); h.render();
  h.listeners.get('keydown')({ key: 'Escape' }); h.render();
  assert.equal(focused,true); assert.equal(h.button('My Account').props['aria-expanded'],false);
  for(const trigger of ['More Library destinations','More Study destinations','Teaching']) {
    h.button(trigger).props.onClick(); h.render();
    h.button('My Account').props.onClick(); h.render();
    assert.equal(h.button(trigger).props['aria-expanded'],false);
    h.button(trigger).props.onClick(); h.render();
    assert.equal(h.button('My Account').props['aria-expanded'],false);
  }
  h.button('My Account').props.onClick(); h.render();
  const wrapper = h.all(n => n.props?.ref && n.props?.onBlurCapture && nodes(n,c => c.type === 'button' && c.props['aria-controls']==='mekuru-account-menu').length)[0];
  const inside = {};wrapper.props.ref.current={contains:t=>t===inside};
  h.listeners.get('pointerdown')({target:inside});h.render();
  assert.equal(h.button('My Account').props['aria-expanded'],true);
  h.listeners.get('pointerdown')({target:{}});h.render();
  assert.equal(h.button('My Account').props['aria-expanded'],false);
  h.button('My Account').props.onClick();h.render();
  wrapper.props.onBlurCapture({currentTarget:{contains:()=>false},relatedTarget:null});h.render();
  assert.equal(h.button('My Account').props['aria-expanded'],false);
});
test('successful logout clears account/navigation state and follows the existing login return', async () => {
  const h = await mount({ ...member, role:'teacher' });
  h.button('My Account').props.onClick();h.render();
  await h.button('Log out').props.onClick(); await h.flush();
  assert.ok(!h.button('My Account'));assert.ok(!h.button('Teaching'));
  assert.ok(h.hrefs().includes('/login'));assert.deepEqual(h.navigation,['/login','refresh']);
});
test('failed logout does not navigate or pretend that the user signed out', async t => {
  t.mock.method(console,'error',()=>{});
  const h = await mount(member,'/books',{signOutError:{message:'Synthetic failure'}});
  h.button('My Account').props.onClick();h.render();
  await h.button('Log out').props.onClick();await h.flush();
  assert.ok(h.button('My Account'));assert.deepEqual(h.navigation,[]);
});
test('same-user authentication refresh preserves the menu without repeated profile queries', async () => {
  const h = await mount(member);
  h.button('My Account').props.onClick();h.render();const before=h.queries.length;
  for(const event of ['TOKEN_REFRESHED','SIGNED_IN']){h.emit(event,{user:{id:'synthetic'}});await h.flush();}
  assert.equal(h.queries.length,before);assert.equal(h.button('My Account').props['aria-expanded'],true);
});
test('sign-in after a signed-out render loads the new identity and role', async () => {
  const h = await mount(null);
  h.setIdentity({...member,role:'teacher'},'new-user');h.emit('SIGNED_IN',{user:{id:'new-user'}});await h.flush();
  assert.ok(h.button('My Account'));assert.ok(h.button('Teaching'));
});
test('profile lookup failure retains the confirmed account and supports retry', async () => {
  let fail=true;
  const h = await mount(member,'/books',{profileResponse:()=>({data:fail?null:member,error:fail?{code:'synthetic'}:null})});
  assert.ok(h.button('My Account'));assert.ok(!h.hrefs().includes('/login'));
  fail=false;h.emit('SIGNED_IN',{user:{id:'synthetic'}});await h.flush();
  assert.ok(h.hrefs().includes('/users/synthetic/books'));
});
test('late profile data cannot restore permissions after sign-out', async () => {
  let resolve;
  const h = await mount({...member,role:'teacher'},'/books',{profileResponse:()=>new Promise(r=>{resolve=r;})});
  h.setIdentity(null);h.emit('SIGNED_OUT',null);h.render();
  resolve({data:{...member,role:'teacher'},error:null});await h.flush();
  assert.ok(!h.button('My Account'));assert.ok(!h.button('Teaching'));assert.ok(h.hrefs().includes('/login'));
});
test('late previous-user profile data cannot overwrite a newly signed-in identity', async () => {
  let resolve, calls=0;
  const h=await mount({...member,role:'teacher'},'/books',{profileResponse:()=>++calls===1?new Promise(r=>{resolve=r;}):Promise.resolve({data:{...member,username:'new_reader'},error:null})});
  h.setIdentity({...member,username:'new_reader'},'new-user');h.emit('SIGNED_IN',{user:{id:'new-user'}});
  resolve({data:{...member,role:'teacher'},error:null});await h.flush();
  assert.ok(!h.button('Teaching'));assert.ok(h.hrefs().includes('/users/new_reader/books'));
});
test('a transient request failure does not hide a previously confirmed My Account', async () => {
  let fail=false;
  const h=await mount(member,'/books',{getUser:async()=>{if(fail)return {data:{user:null},error:Error('Synthetic network failure')};return {data:{user:{id:'synthetic'}},error:null};}});
  fail=true;h.windowListeners.get('mekuru-profile-preferences-updated')();await h.flush();
  assert.ok(h.button('My Account'));assert.ok(!h.hrefs().includes('/login'));
});

test('only the signed-in own Library moves the single existing account control into navigation', async () => {
  for (const pathname of ['/books', '/users/synthetic/books']) {
    const h = await mount({ ...member, role: 'teacher' }, pathname);
    const nav = h.all(n => n.type === 'nav')[0];
    assert.equal(nodes(nav, n => n.props?.['aria-controls'] === 'mekuru-account-menu').length, 1);
    assert.equal(h.all(n => n.props?.['aria-controls'] === 'mekuru-account-menu').length, 1);
    assert.equal(h.all(n => n.type === 'a' && n.props['aria-label'] === 'My MEKURU Library').length, 0);
    assert.ok(h.button('Teaching'));
    h.button('My Account').props.onClick(); h.render();
    for (const href of ['/community/profile', '/reading-access', 'mailto:mekuru.ej@gmail.com']) assert.ok(h.hrefs().includes(href));
    assert.ok(h.button('Log out'));
  }
});
test('student Library, teaching, book, study and signed-out routes retain the branded top row', async () => {
  for (const pathname of ['/users/student/books', '/teacher/students/student/workspace', '/books/book-id', '/library-study', '/community/profile']) {
    const h = await mount({ ...member, role:'teacher' }, pathname);
    const nav = h.all(n => n.type === 'nav')[0];
    assert.equal(nodes(nav,n=>n.props?.['aria-controls']==='mekuru-account-menu').length,0);
    assert.equal(h.all(n=>n.type==='a' && n.props['aria-label']==='My MEKURU Library').length,1);
    assert.ok(h.button('My Account'));
  }
  const h = await mount(null,'/books');
  assert.equal(h.all(n=>n.type==='a' && n.props['aria-label']==='My MEKURU Library').length,1);
  assert.ok(h.hrefs().includes('/login'));assert.ok(h.hrefs().includes('/login/beta-signup'));
});
test('welcome logout is omitted only for own Library; student identity and logout remain', () => {
 const page=fs.readFileSync('app/(protected)/users/[username]/books/page.tsx','utf8');
 const slot=page.slice(page.indexOf('<LibraryHeader'),page.indexOf('</LibraryHeader>'));
 assert.match(slot,/\{isViewingStudentLibrary \? \(/);
 assert.match(slot,/<UserBar isTeacher=\{isTeacher\} displayName=\{meDisplayName\} variant="logoutOnly"/);
 const gate=fs.readFileSync('components/AppHeaderGate.tsx','utf8');
 assert.match(gate,/"\/login"/);assert.match(gate,/HIDDEN_HEADER_ROUTES\.has\(pathname\)/);
});
