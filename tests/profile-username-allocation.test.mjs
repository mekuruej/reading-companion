import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', code)(name => mocks[name] ?? (name === 'server-only' ? {} : require(name)), exports);
  return exports;
}
const allocator = load('lib/profile/allocateUsername.ts');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function database() {
  const db = new PGlite();
  // Relevant production definitions, inspected read-only on 2026-10-09.
  await db.exec(`create table profiles(id uuid primary key, username text null,
    display_name text null, level text not null default 'Level 1', is_public boolean not null default true,
    role text default 'member', app_access_type text not null default 'free',
    app_access_expires_at timestamptz, trial_started_at timestamptz,
    constraint profiles_level_check check(level is null or level in ('Level 1','Level 2','Level 3','Level 4','Level 5','Level 6','Level 7','Level 8','Level 9','Level 10')));
    create unique index profiles_username_unique_idx on profiles(username);`);
  return db;
}
function storeFor(db) {
  return {
    async find(id) { return (await db.query('select username from profiles where id=$1', [id])).rows[0] ?? null; },
    async create(id, username) { await db.query('insert into profiles(id,username,level,is_public) values($1,$2,null,false)', [id, username]); },
    async assignIfMissing(id, previous, username) {
      return (await db.query('update profiles set username=$3 where id=$1 and username is not distinct from $2 returning username', [id, previous, username])).rows.length > 0;
    },
  };
}
const migration = fs.readFileSync('sql/20261009_optional_profile_reading_level.sql', 'utf8');

test('migration removes the production unknown-level blocker without changing existing identity/access', async () => {
  const db = await database();
  try {
    await db.query('insert into profiles(id, username, display_name, level, app_access_type) values($1,$2,$3,$4,$5)', [uuid(1), 'DEMO1', 'Original Name', 'Level 6', 'reading_access']);
    const before = (await db.query('select * from profiles')).rows;
    await assert.rejects(storeFor(db).create(uuid(2), 'reader_test'), error => error.code === '23502');
    await db.exec(migration);
    assert.deepEqual((await db.query('select * from profiles')).rows, before);
    await db.query('insert into profiles(id) values($1)', [uuid(2)]);
    assert.equal((await db.query('select level from profiles where id=$1', [uuid(2)])).rows[0].level, null);
    await assert.rejects(db.query('update profiles set level=$2 where id=$1', [uuid(2), 'guessed']), error => error.code === '23514');
  } finally { await db.close(); }
});
test('allocation uses the unique index for genuine collisions and preserves repeated/existing submissions', async () => {
  const db = await database();
  try {
    await db.exec(migration);
    const store = storeFor(db);
    await store.create(uuid(1), 'reader_collision');
    let attempts = 0;
    assert.equal(await allocator.allocateUsername(uuid(2), store, () => ++attempts === 1 ? 'reader_collision' : 'reader_success'), 'reader_success');
    assert.equal(attempts, 2);
    assert.equal(await allocator.allocateUsername(uuid(2), store, () => { throw new Error('Must not regenerate'); }), 'reader_success');
    await db.query('insert into profiles(id,username,display_name,level,app_access_type) values($1,$2,$3,$4,$5)', [uuid(3), 'DEMO1', 'Existing Name', 'Level 8', 'lesson_access']);
    const before = (await db.query('select * from profiles where id=$1', [uuid(3)])).rows[0];
    assert.equal(await allocator.allocateUsername(uuid(3), store), 'DEMO1');
    assert.deepEqual((await db.query('select * from profiles where id=$1', [uuid(3)])).rows[0], before);
    // Production uniqueness is case-sensitive; existing mixed-case handles must survive.
    await store.create(uuid(4), 'demo1');
  } finally { await db.close(); }
});
test('concurrent submissions choose one username for a missing or existing incomplete profile', async () => {
  const db = await database();
  try {
    await db.exec(migration);
    const store = storeFor(db);
    for (const n of [1,2,3]) {
      if (n > 1) await db.query('insert into profiles(id,username) values($1,$2)', [uuid(n), n === 2 ? null : '']);
      let next = 0;
      const results = await Promise.all(Array.from({ length: 5 }, () => allocator.allocateUsername(uuid(n), store, () => `reader_${n}_${++next}`)));
      assert.equal(new Set(results).size, 1);
      assert.equal((await store.find(uuid(n))).username, results[0]);
    }
  } finally { await db.close(); }
});
test('allocator never retries unrelated database failures or ignores an exhausted collision budget', async () => {
  let calls = 0;
  const otherFailure = { code: '23505', constraint: 'some_other_constraint' };
  await assert.rejects(allocator.allocateUsername('user', { find: async () => null,
    create: async () => { calls++; throw otherFailure; }, assignIfMissing: async () => false }), error => error === otherFailure);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(allocator.allocateUsername('user', { find: async () => null,
    create: async () => { calls++; throw { code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_unique_idx"' }; },
    assignIfMissing: async () => false }), /Could not assign your Library link/);
  assert.equal(calls, 10);
});
test('neutral names use server-generated randomness and valid format', () => {
  const names = Array.from({ length: 100 }, () => allocator.createNeutralUsername());
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every(name => /^reader_[0-9a-f]{16}$/.test(name)));
});

function mockApi(initial = []) {
  const profiles = new Map(initial.map(p => [p.id, { ...p }]));
  const writes = [];
  const db = {
    auth: { getUser: async token => ({ data: { user: token === 'valid' ? { id: 'owner' } : null } }) },
    from(table) {
      assert.equal(table, 'profiles');
      let selected = [], predicates = [], update, insert;
      const q = {
        select(columns) { selected = columns.split(',').map(value => value.trim()); return q; },
        eq(key, value) { predicates.push(row => row[key] === value); return q; },
        is(key, value) { predicates.push(row => row[key] === value); return q; },
        insert(value) { insert = value; return q; }, update(value) { update = value; return q; },
        async run(single) {
          if (insert) {
            writes.push({ ...insert });
            if (profiles.has(insert.id)) return { error: { code: '23505', constraint: 'profiles_pkey' } };
            if ([...profiles.values()].some(p => p.username === insert.username)) return { error: { code: '23505', constraint: 'profiles_username_unique_idx' } };
            profiles.set(insert.id, { display_name: null, ...insert });
          }
          let found = [...profiles.values()].filter(row => predicates.every(predicate => predicate(row)));
          if (update) { writes.push({ ...update }); found.forEach(row => Object.assign(row, update)); }
          const data = found.map(row => Object.fromEntries(selected.map(key => [key, row[key]])));
          return { data: single ? data[0] ?? null : data, error: null };
        },
        single() { return q.run(true); }, maybeSingle() { return q.run(true); }, then(resolve, reject) { return q.run(false).then(resolve, reject); },
      };
      return q;
    },
  };
  const levels = load('lib/profileLevels.ts');
  const intent = load('lib/access/japaneseLearningIntent.ts', { '@/lib/books/englishNativeTracker': load('lib/books/englishNativeTracker.ts') });
  const route = load('app/api/profile/setup/route.ts', {
    '@supabase/supabase-js': { createClient: () => db }, '@/lib/profile/allocateUsername': allocator,
    '@/lib/profileLevels': levels, '@/lib/access/japaneseLearningIntent': intent,
  });
  return { profiles, writes, route };
}
const payload = { displayName: 'Chosen Name', nativeLanguage: 'English', japaneseLearningEnabled: true, level: '' };
const request = (body = payload, token = 'valid') => new Request('https://example.test/api/profile/setup', {
  method: 'POST', headers: token ? { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}, body: JSON.stringify(body),
});
test('setup endpoint scopes writes to authenticated self, preserves existing identity/access and ignores protected inputs', async () => {
  const before = { id: 'owner', username: 'DEMO1', display_name: 'Original Name', level: 'Level 8',
    role: 'teacher', app_access_type: 'lesson_access', public_name_choice: 'username', trial_started_at: 'unchanged' };
  const f = mockApi([before, { id: 'other', username: 'other', display_name: 'Other Name' }]);
  assert.equal((await f.route.POST(request(payload, ''))).status, 401);
  assert.equal((await f.route.POST(request(payload, 'invalid'))).status, 401);
  const response = await f.route.POST(request({ ...payload, id: 'other', username: 'new_name', displayName: 'Replacement', role: 'admin', app_access_type: 'reading_access' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).username, 'DEMO1');
  for (const key of ['username','display_name','level','role','app_access_type','public_name_choice','trial_started_at']) assert.equal(f.profiles.get('owner')[key], before[key]);
  assert.equal(f.profiles.get('other').display_name, 'Other Name');
  assert.ok(f.writes.every(write => !('role' in write) && !('app_access_type' in write) && !('trial_started_at' in write)));
});
test('new-user setup remains display-name-required, creates unknown-level profiles and is repeatable', async () => {
  const f = mockApi();
  assert.equal((await f.route.POST(request({ ...payload, displayName: '' }))).status, 400);
  assert.equal((await f.route.POST(request({ ...payload, nativeLanguage: '' }))).status, 400);
  assert.equal((await f.route.POST(request({ ...payload, japaneseLearningEnabled: null }))).status, 400);
  assert.equal((await f.route.POST(request({ ...payload, level: 'Guess' }))).status, 400);
  assert.equal(f.profiles.size, 0);
  const responses = await Promise.all([f.route.POST(request()), f.route.POST(request()), f.route.POST(request())]);
  assert.ok(responses.every(response => response.status === 200));
  const names = await Promise.all(responses.map(response => response.json()));
  assert.equal(new Set(names.map(result => result.username)).size, 1);
  assert.equal(f.profiles.get('owner').display_name, 'Chosen Name');
  assert.equal(f.profiles.get('owner').level, null);
  assert.equal(f.profiles.get('owner').is_public, false);
  assert.equal((await f.route.POST(request())).status, 200);
});
test('setup navigation retains username completeness checks and uses existing Library entry', () => {
  const setup = fs.readFileSync('app/(protected)/community/profile/setup/page.tsx', 'utf8');
  assert.doesNotMatch(setup, /setUsername|cleanUsername|>Username</);
  assert.match(setup, /fetch\("\/api\/profile\/setup"/);
  assert.match(setup, /router.replace\("\/books"\)/);
  const books = fs.readFileSync('app/(protected)/books/page.tsx', 'utf8');
  assert.match(books, /!!profile\?\.username/);
  assert.match(books, /router.replace\(`\/users\/\$\{profile.username\}\/books`\)/);
  const settings = fs.readFileSync('app/(protected)/community/profile/settings/page.tsx', 'utf8');
  assert.match(settings, /username === originalUsername \? originalUsername : username.trim\(\).toLowerCase\(\)/);
  const settingsCard = fs.readFileSync('app/(protected)/community/profile/settings/components/ProfileSettingsCoreCard.tsx', 'utf8');
  assert.match(settingsCard, /Changing your username changes your Library link/);
});
