import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const future = '2099-01-01T00:00:00Z', past = '2020-01-01T00:00:00Z';
function fixture() {
  const profile = (id, extra = {}) => ({ id, display_name: `Person ${id}`, username: id, role: 'member',
    app_access_type: 'free', app_access_expires_at: null, app_access_subscription_id: null, trial_started_at: null, ...extra });
  const rows = {
    profiles: [profile('super', { role: 'super_teacher' }), profile('teacher', { role: 'teacher' }), profile('admin', { role: 'admin' }),
      profile('legacy', { app_access_type: 'reading_access' }), profile('both', { app_access_type: 'reading_access' }),
      profile('manual', { app_access_type: 'reading_access' }), profile('revoked', { app_access_type: 'reading_access' }),
      profile('stale', { app_access_type: 'free' }), profile('dated', { app_access_type: 'reading_access', app_access_expires_at: future }),
      profile('subscriber', { app_access_type: 'reading_access', app_access_subscription_id: 'sub_test' }),
      profile('trial', { app_access_type: 'trial', app_access_expires_at: future }), profile('ended', { app_access_type: 'trial', app_access_expires_at: past }),
      profile('current'), profile('other')],
    teacher_students: [{ teacher_id: 'teacher', student_id: 'both', archived_at: null },
      { teacher_id: 'teacher', student_id: 'current', archived_at: null }],
    complimentary_legacy_access_grants: ['legacy', 'both', 'revoked', 'stale', 'dated', 'subscriber'].map(user_id => ({
      user_id, revoked_at: user_id === 'revoked' ? past : null, reason: 'PRIVATE_REASON', prior_access_snapshot: 'PRIVATE_SNAPSHOT', granted_by: 'PRIVATE_ACTOR' })),
    stripe_subscriptions: [{ subscription_id: 'sub_test', user_id: 'subscriber', status: 'active', paid_through: future }],
    user_book_reading_sessions: [], user_books: [],
  };
  const calls = [];
  const db = {
    auth: { getUser: async token => ({ data: { user: ['super', 'teacher', 'admin'].includes(token) ? { id: token } : null } }),
      admin: { listUsers: async () => ({ data: { users: rows.profiles.map(p => ({ id: p.id, email: `${p.id}@example.test` })) } }) } },
    from(table) {
      const call = { table }; calls.push(call);
      let filters = [], first = 0, last = Infinity, columns = '*';
      const q = {
        select(value) { columns = value; call.columns = value; return q; },
        eq(key, value) { filters.push(row => row[key] === value); return q; },
        neq(key, value) { filters.push(row => row[key] !== value); return q; },
        is(key, value) { filters.push(row => value === null ? row[key] == null : row[key] === value); return q; },
        in(key, values) { filters.push(row => values.includes(row[key])); return q; },
        not(key, operator, value) {
          if (operator === 'in') { const values = value.slice(1, -1).split(','); filters.push(row => !values.includes(row[key])); }
          else if (operator === 'is') filters.push(row => row[key] != null);
          return q;
        },
        gte(key, value) { filters.push(row => row[key] != null && row[key] >= value); return q; },
        ilike(key, pattern) { const match = pattern.replaceAll('%', '').toLowerCase(); filters.push(row => String(row[key] ?? '').toLowerCase().includes(match)); return q; },
        or(expression) {
          if (expression.includes('app_access_type.is.null')) filters.push(row =>
            row.app_access_type !== 'trial' || !row.app_access_expires_at || row.app_access_expires_at < new Date().toISOString() || ['teacher','super_teacher','admin'].includes(row.role) || row.is_super_teacher === true);
          else if (expression.includes('role.not.in.')) filters.push(row => !['teacher','super_teacher','admin'].includes(row.role));
          else if (expression.includes('is_super_teacher.eq.false')) filters.push(row => row.is_super_teacher !== true);
          return q;
        },
        order() { return q; }, range(from, to) { first = from; last = to; return q; }, limit(n) { last = first + n - 1; return q; },
        async result(single = false) {
          const matched = rows[table].filter(row => filters.every(filter => filter(row)));
          const data = matched.slice(first, last + 1).map(row => columns === '*' ? { ...row } : Object.fromEntries(columns.split(',').map(key => key.trim()).filter(key => key in row).map(key => [key, row[key]])));
          return { data: single ? data[0] ?? null : data, error: null, count: matched.length };
        },
        maybeSingle() { return q.result(true); }, then(resolve, reject) { return q.result().then(resolve, reject); },
      };
      return q;
    },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'exports', code)(name => {
      if (name === 'server-only') return {};
      if (name === '@supabase/supabase-js') return { createClient: () => db };
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), `${name}.ts`));
      return require(name);
    }, exports);
    return exports;
  }
  return { rows, calls, db, load };
}
const request = (actor, query) => new Request(`https://example.test/api?${query}`, { headers: { authorization: `Bearer ${actor}` } });
const ids = payload => payload.users.map(user => user.id);

test('Legacy browse uses real active grants; overlap with Current Students remains; Other excludes Legacy', async () => {
  const f = fixture(), route = f.load('app/api/teacher/students-index/route.ts');
  const browse = async category => (await route.GET(request('super', `category=${category}`))).json();
  const legacy = await browse('legacy');
  assert.deepEqual(ids(legacy), ['legacy', 'both']);
  assert.ok(legacy.users.every(user => user.hasComplimentaryLegacyAccess));
  assert.ok(ids(await browse('current')).includes('both'));
  assert.deepEqual(ids(await browse('trial')), ['trial']);
  const other = ids(await browse('other'));
  assert.ok(other.includes('manual'));
  assert.ok(other.includes('revoked'));
  assert.ok(other.includes('ended'));
  for (const id of ['legacy', 'both', 'trial', 'current']) assert.ok(!other.includes(id));
  assert.doesNotMatch(JSON.stringify(legacy), /PRIVATE_REASON|PRIVATE_ACTOR|PRIVATE_SNAPSHOT|revoked_at/);
  assert.ok(f.calls.filter(call => call.table === 'complimentary_legacy_access_grants').every(call => call.columns === 'user_id'));
});
test('ordinary teacher stays restricted to authorized students; plain admin cannot access Users', async () => {
  const f = fixture(), route = f.load('app/api/teacher/students-index/route.ts');
  assert.deepEqual(ids(await (await route.GET(request('teacher', 'category=current'))).json()), ['both', 'current']);
  for (const category of ['trial','legacy','other']) assert.equal((await route.GET(request('teacher', `category=${category}`))).status, 403);
  assert.equal((await route.GET(request('admin', 'category=current'))).status, 403);
  assert.equal((await route.GET(request('teacher', 'category=current&q=Person%20legacy'))).status, 200);
  assert.ok(!ids(await (await route.GET(request('teacher', 'category=current&q=Person%20legacy'))).json()).includes('legacy'));
});
test('global search returns all categories with Legacy badges and preserves existing relationship status', async () => {
  const f = fixture(), route = f.load('app/api/teacher/users/search/route.ts');
  const response = await route.GET(request('super', 'q=Person&scope=students&limit=20'));
  assert.equal(response.status, 200);
  const payload = await response.json();
  for (const id of ['legacy','both','manual','trial','other']) assert.ok(ids(payload).includes(id));
  assert.equal(payload.users.find(user => user.id === 'both').searchStatus, 'Current Student');
  assert.equal(payload.users.find(user => user.id === 'both').hasComplimentaryLegacyAccess, true);
  assert.equal(payload.users.find(user => user.id === 'manual').hasComplimentaryLegacyAccess, false);
  assert.equal(payload.users.find(user => user.id === 'revoked').hasComplimentaryLegacyAccess, false);
  assert.doesNotMatch(JSON.stringify(payload), /PRIVATE_REASON|PRIVATE_ACTOR|PRIVATE_SNAPSHOT/);
  assert.equal((await route.GET(request('admin', 'q=Person&scope=students'))).status, 403);
});
test('canonical Legacy rule rejects mismatched access, missing/revoked grants and subscription state', () => {
  const f = fixture(), { hasActiveComplimentaryLegacyAccess: eligible } = f.load('lib/access/complimentaryLegacyAccess.ts');
  const profile = f.rows.profiles.find(p => p.id === 'legacy');
  assert.equal(eligible(profile, true, false), true);
  assert.equal(eligible(profile, false, false), false);
  assert.equal(eligible(profile, true, true), false);
  for (const extra of [{ role: 'teacher' }, { app_access_type: 'free' }, { trial_started_at: past }, { app_access_expires_at: future }, { app_access_subscription_id: 'sub' }]) {
    assert.equal(eligible({ ...profile, ...extra }, true, false), false);
  }
});
test('role labels and category permissions preserve ordinary teacher and admin boundaries', () => {
  const f = fixture(), model = f.load('lib/teacher/studentsIndex.ts');
  assert.equal(model.studentsIndexLabel(false), 'Students');
  assert.equal(model.studentsIndexLabel(true), 'Users');
  assert.equal(model.canUseStudentsCategory({ role: 'teacher' }, 'legacy'), false);
  assert.equal(model.canUseStudentsCategory({ role: 'super_teacher' }, 'legacy'), true);
  assert.equal(model.canUseStudentsCategory({ role: 'admin' }, 'legacy'), false);
  const page = fs.readFileSync('app/(protected)/teacher/students/page.tsx', 'utf8');
  assert.match(page, /\["trial", "Trial"\], \["current", "Current Students"\], \["legacy", "Legacy"\], \["other", "Other"\]/);
  assert.match(page, /hasComplimentaryLegacyAccess \? <span/);
  assert.match(page, /Searching all users/);
  assert.match(page, /globalSearch \? "\/api\/teacher\/users\/search" : "\/api\/teacher\/students-index"/);
});

test('server Legacy lookup pages grant rows and honors fresh revocation without exposing metadata', async () => {
  const f = fixture();
  const { loadActiveComplimentaryLegacyUserIds } = f.load('lib/teacher/complimentaryLegacyIndex.ts');
  for (let n = 0; n < 501; n++) {
    const id = `extra-${n}`;
    f.rows.profiles.push({ id, role: 'member', app_access_type: 'reading_access' });
    f.rows.complimentary_legacy_access_grants.push({ user_id: id, revoked_at: null });
  }
  assert.equal((await loadActiveComplimentaryLegacyUserIds(f.db)).size, 503);
  f.rows.complimentary_legacy_access_grants.find(grant => grant.user_id === 'legacy').revoked_at = past;
  assert.deepEqual([...await loadActiveComplimentaryLegacyUserIds(f.db, ['legacy', 'both'])], ['both']);
  assert.equal((await loadActiveComplimentaryLegacyUserIds(f.db, [])).size, 0);
});
