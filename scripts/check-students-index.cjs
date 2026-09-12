const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
let actor = { id: 'viewer', role: 'teacher', is_super_teacher: false };
const profiles = [
  { id: 'linked', display_name: 'Linked learner', role: 'member', app_access_type: 'free' },
  { id: 'other-linked', display_name: 'Other learner', role: 'member', app_access_type: 'free' },
  { id: 'trial', display_name: 'Trial learner', role: 'member', app_access_type: 'trial', app_access_expires_at: future },
  { id: 'expired', display_name: 'Expired learner', role: 'member', app_access_type: 'trial', app_access_expires_at: past },
  { id: 'archived', display_name: 'Archived learner', role: 'member', app_access_type: 'free' },
  { id: 'member', display_name: 'Ordinary member', role: 'member', app_access_type: 'free' },
  { id: 'staff', display_name: 'Staff', role: 'teacher', app_access_type: 'trial', app_access_expires_at: future },
];
const links = [
  { teacher_id: 'viewer', student_id: 'linked', archived_at: null },
  { teacher_id: 'another-teacher', student_id: 'other-linked', archived_at: null },
  { teacher_id: 'viewer', student_id: 'archived', archived_at: past },
];
let writes = [];
let reads = [];
class Query {
  constructor(table) { this.table = table; this.filters = []; }
  select() { return this; }
  order() { return this; }
  range(from, to) { this.bounds = [from, to]; return this; }
  limit(n) { this.bounds = [0, n - 1]; return this; }
  eq(k, v) { this.filters.push(row => row[k] === v); return this; }
  neq(k, v) { this.filters.push(row => row[k] !== v); return this; }
  in(k, values) { this.filters.push(row => values.includes(row[k])); return this; }
  is(k, v) { this.filters.push(row => v === null ? row[k] == null : row[k] === v); return this; }
  not(k, op, v) { assert.equal(op, 'is'); this.filters.push(row => v === null ? row[k] != null : row[k] !== v); return this; }
  gte(k, v) { this.filters.push(row => row[k] >= v); return this; }
  ilike(k, value) { this.filters.push(row => String(row[k] ?? '').toLowerCase() === value.toLowerCase()); return this; }
  or(expression) {
    if (expression === 'status.eq.pending,status.is.null') this.filters.push(row => row.status == null || row.status === 'pending');
    else if (expression.startsWith('role.is.null')) this.filters.push(row => !['teacher', 'super_teacher', 'admin'].includes(row.role));
    else if (expression.startsWith('is_super_teacher.is.null')) this.filters.push(row => !row.is_super_teacher);
    else {
      const match = expression.match(/display_name\.ilike\."%(.+?)%"/);
      assert.ok(match, expression);
      this.filters.push(row => [row.display_name, row.username, row.level, row.lesson_day].some(v => v?.toLowerCase().includes(match[1].toLowerCase())));
    }
    return this;
  }
  update(values) { this.updateValues = values; return this; }
  maybeSingle() { this.single = true; return this; }
  then(resolve, reject) {
    try {
      reads.push(this.table);
      let rows = this.table === 'profiles' ? [actor, ...profiles] : this.table === 'teacher_students' ? links : [];
      rows = rows.filter(row => this.filters.every(test => test(row)));
      const count = rows.length;
      if (this.bounds) rows = rows.slice(this.bounds[0], this.bounds[1] + 1);
      if (this.updateValues) writes.push({ table: this.table, ids: rows.map(row => [row.teacher_id, row.student_id]), values: this.updateValues });
      return Promise.resolve({ data: this.single ? rows[0] ?? null : rows, count, error: null }).then(resolve, reject);
    } catch (error) { return Promise.reject(error).then(resolve, reject); }
  }
}
const db = { from: table => new Query(table), auth: { getUser: async token => ({ data: { user: token === 'valid' ? { id: actor.id } : null }, error: null }) } };
let fixtureStates = [];
const React = require('react');
const cache = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const localRequire = name => {
    if (name === 'react' && file.endsWith('/students/page.tsx')) return { ...React, useEffect: () => {}, useState: () => [fixtureStates.shift(), () => {}] };
    if (name === 'next/navigation') return { useSearchParams: () => new URLSearchParams() };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
    if (name === '@/lib/supabaseClient') return { supabase: db };
    if (name === '@supabase/supabase-js') return { createClient: () => db };
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
  return mod.exports;
}
const policy = load('lib/teacher/studentsIndex.ts');
const index = load('app/api/teacher/students-index/route.ts');
const workspace = load('app/api/teacher/student-workspace/route.ts');
async function list(category, query = '') {
  const response = await index.GET(new Request(`http://localhost/api/teacher/students-index?category=${category}&q=${query}`, { headers: { authorization: 'Bearer valid' } }));
  return { status: response.status, body: await response.json() };
}
async function openWorkspace(studentId) {
  return workspace.GET(new Request(`http://localhost/api/teacher/student-workspace?studentId=${studentId}`, { headers: { authorization: 'Bearer valid' } }));
}
async function manage(studentId, teacherId, action = 'archive-relationship') {
  const response = await workspace.PATCH(new Request('http://localhost/api/teacher/student-workspace', {
    method: 'PATCH', headers: { authorization: 'Bearer valid', 'content-type': 'application/json' },
    body: JSON.stringify({ studentId, teacherId, action, reason: 'Test note' }),
  }));
  return response.status;
}
(async () => {
  for (const role of ['teacher', 'super_teacher']) assert.equal(policy.canUseStudentsIndex({ role }), true);
  for (const role of ['admin', 'member', 'student']) assert.equal(policy.canUseStudentsIndex({ role }), false);
  assert.equal(policy.canUseStudentsIndex({ role: 'admin', is_super_teacher: true }), true);
  assert.equal(policy.canUseStudentsIndex({ role: 'admin', is_super_teacher: 'false' }), false);
  assert.equal(policy.isActiveTrialParticipant(profiles.find(p => p.id === 'trial')), true);
  for (const id of ['expired', 'member', 'staff']) assert.equal(policy.isActiveTrialParticipant(profiles.find(p => p.id === id)), false);
  assert.equal(policy.isActiveTrialParticipant({ app_access_type: 'trial', app_access_expires_at: null }), false);
  assert.equal(policy.isActiveTrialParticipant({ app_access_type: 'trial', app_access_expires_at: 'invalid' }), false);
  assert.equal((await index.GET(new Request('http://localhost/api/teacher/students-index'))).status, 401);
  assert.deepEqual((await list('current')).body.users.map(p => p.id), ['linked']);
  assert.equal((await list('trial')).status, 403);
  assert.equal((await list('all')).status, 403);
  assert.equal((await openWorkspace('linked')).status, 200);
  assert.equal((await openWorkspace('archived')).status, 403);
  assert.equal((await openWorkspace('member')).status, 403);
  assert.deepEqual((await list('past')).body.users.map(p => p.id), ['archived']);
  reads = []; await list('past'); assert.ok(!reads.includes('user_book_reading_sessions'));
  assert.equal(await manage('other-linked', 'another-teacher'), 403);
  assert.equal(await manage('linked', 'another-teacher'), 403);
  assert.equal(await manage('linked', 'viewer'), 200);
  assert.deepEqual(writes[0].ids, [['viewer', 'linked']]);
  assert.equal(writes[0].table, 'teacher_students');
  assert.equal(writes[0].values.relationship_status, 'past');
  assert.equal(writes[0].values.archived_by, 'viewer');
  assert.equal(await manage('archived', 'viewer', 'restore-relationship'), 403, 'ordinary archived workspace remains blocked');
  actor = { ...actor, role: 'super_teacher' };
  assert.deepEqual((await list('current')).body.users.map(p => p.id), ['linked', 'other-linked']);
  assert.deepEqual((await list('trial')).body.users.map(p => p.id), ['trial']);
  const writesBeforeOpen = writes.length;
  assert.equal((await openWorkspace('trial')).status, 200);
  assert.equal((await openWorkspace('member')).status, 200);
  assert.equal(writes.length, writesBeforeOpen, 'opening unrelated users creates no relationship');
  assert.ok((await list('all')).body.users.some(p => p.id === 'archived'));
  assert.deepEqual((await list('all', 'Ordinary')).body.users.map(p => p.id), ['member']);
  assert.deepEqual((await list('trial', 'Ordinary')).body.users, []);
  assert.equal(await manage('archived', 'viewer', 'restore-relationship'), 200);
  assert.equal(await manage('member', 'viewer'), 409, 'does not fabricate a relationship');
  actor = { ...actor, role: 'admin' };
  assert.equal((await list('current')).status, 403);
  assert.equal(await manage('linked', 'viewer'), 403);
  assert.equal((await openWorkspace('linked')).status, 403);
  actor = { ...actor, is_super_teacher: true };
  assert.equal((await list('all')).status, 200);
  assert.equal(await manage('linked', 'viewer'), 200);
  assert.ok(writes.every(write => write.table === 'teacher_students'));
  const Page = load('app/(protected)/teacher/students/page.tsx').default;
  const { renderToStaticMarkup } = require('react-dom/server');
  function renderIndex(elevated, current, profile = profiles[0]) {
    fixtureStates = ['current', '', 0, [{ ...profile, isCurrentStudent: current, lastEngagedAt: null }], 1, 24, elevated, false, false, '', 0, null];
    return renderToStaticMarkup(React.createElement(Page));
  }
  const teacherHtml = renderIndex(false, true);
  assert.ok(teacherHtml.includes('Open Student Space'));
  assert.ok(teacherHtml.includes('assignTask=1'));
  assert.ok(teacherHtml.includes('Assign a Task'));
  assert.ok(teacherHtml.includes('Last engaged: No recent activity'));
  for (const removed of ['Library context', 'View Library', 'Add Book', 'Move to Past', 'Delete User', 'Product access:', 'Teaching:', '>All Users<', '>Trial<']) assert.ok(!teacherHtml.includes(removed), removed);
  const trialHtml = renderIndex(true, true, profiles.find(p => p.id === 'trial'));
  assert.ok(trialHtml.includes('Trial: Ends '), 'linked trial users also show their trial end date');
  assert.ok(renderIndex(true, false, profiles.find(p => p.id === 'expired')).includes('Trial: Ended '));
  assert.ok(renderIndex(true, false, profiles.find(p => p.id === 'expired')).includes('Free · Trial ended '));
  const elevatedHtml = renderIndex(true, false);
  for (const label of ['Trial', 'Current Students', 'All Users', 'Open User Space']) assert.ok(elevatedHtml.includes(label), label);
  assert.ok(!elevatedHtml.includes('Assign a Task'));
  for (const label of ['Role:', 'Teaching:', 'Product access:', 'No relationship']) assert.ok(elevatedHtml.includes(label));
  assert.ok(renderIndex(true, true).includes('Active relationship'));
  assert.ok(renderIndex(true, false, { ...profiles[0], archivedTeacherId: 'viewer' }).includes('Archived relationship'));
  console.log('PASS: rendered compact cards, role-specific navigation, last-engaged fallback, workspace links, and eligible assignment links.');
  console.log('PASS: Students roles, category scoping, search, trial expiry, archived access, archive/restore authorization, and relationship-only updates. No live writes performed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
