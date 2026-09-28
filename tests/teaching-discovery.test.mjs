import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, deps = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => deps[name] ?? require(name), exports);
  return exports;
}
const model = load('lib/teacher/teachingDiscovery.ts');
const book = (id, language_code = 'ja') => ({ id, title: id, author: 'Author', isbn13: '123', book_type: 'novel', language_code, cover_url: null });
const rating = { teacher_jlpt_difficulty: 'n3', teaching_suitability: 'excellent', teacher_use_status: 'approved_for_lesson' };
test('discovery includes unowned catalog books, groups teachers, and projects only structured assessments', () => {
  const results = model.buildTeachingDiscovery([
    { ...rating, teacher_id: 'private-teacher', teacher_use_note: 'PRIVATE NOTE', books: book('unowned') },
    { ...rating, teacher_jlpt_difficulty: 'n2', books: book('unowned') },
    { teacher_use_status: 'want_to_test', books: book('empty-workspace') },
  ]);
  assert.equal(results.length, 1); assert.equal(results[0].book.id, 'unowned'); assert.equal(results[0].assessments.length, 2);
  assert.ok(!JSON.stringify(results).includes('PRIVATE'));
  assert.ok(!JSON.stringify(results).includes('teacher_id'));
});
test('queue uses only personal Japanese books, deduplicates copies and accepts submitted or existing assessments', () => {
  const library = ['blank', 'not-teaching', 'saved-empty', 'rated', 'note-only', 'legacy-workflow', 'teaching-only', 'english']
    .map(id => ({ book_id: id, personal_tracking_status: id === 'teaching-only' ? 'not_tracking' : 'reading', books: book(id, id === 'english' ? 'en' : 'ja') }));
  library.push(library[0]);
  const own = [
    { book_id: 'not-teaching', teacher_use_status: 'do_not_use' },
    { book_id: 'saved-empty', assessed_at: '2026-09-28' },
    { book_id: 'rated', ...rating },
    { book_id: 'note-only', teacher_use_note: 'My opinion' },
    { book_id: 'legacy-workflow', teacher_use_status: 'testing' },
  ];
  assert.deepEqual(model.needsMyAssessment(library, own).map(b => b.id), ['blank', 'legacy-workflow']);
  own.push({ book_id: 'blank', teacher_use_status: 'do_not_use', assessed_at: '2026-09-28' });
  assert.deepEqual(model.needsMyAssessment(library, own).map(b => b.id), ['legacy-workflow']);
  assert.equal(model.buildTeachingDiscovery(own.map(a => ({ ...a, books: book(a.book_id) }))).some(entry => entry.book.id === 'blank'), true);
});
test('combined filters match a single contributed assessment rather than combining unrelated teacher opinions', () => {
  const entry = { book: book('Book'), assessments: [{ ...rating, teaching_suitability: 'poor_fit' }, { ...rating, teacher_jlpt_difficulty: 'n2' }] };
  const filters = { query: 'Author', difficulty: 'n3', suitability: 'excellent', status: 'all', format: 'novel' };
  assert.equal(model.matchesTeachingDiscovery(entry, filters), false);
  assert.equal(model.matchesTeachingDiscovery(entry, { ...filters, difficulty: 'n2' }), true);
  assert.equal(model.matchesTeachingDiscovery(entry, { ...filters, difficulty: 'all', query: 'absent' }), false);
});
test('endpoint separates cross-catalog contributions from actor-scoped queue, without querying experiences', async () => {
  const calls = [];
  const rows = {
    teacher_books: [
      { id: 'a', teacher_id: 'another', book_id: 'unowned', ...rating, books: book('unowned'), teacher_use_note: 'PRIVATE OTHER NOTE' },
      { id: 'b', teacher_id: 'actor', book_id: 'completed', ...rating, books: book('completed'), teacher_use_note: 'PRIVATE OWN NOTE' },
    ],
    user_books: [
      { id: 'c', user_id: 'actor', book_id: 'pending', personal_tracking_status: 'reading', books: book('pending') },
      { id: 'd', user_id: 'someone', book_id: 'not-mine', personal_tracking_status: 'reading', books: book('not-mine') },
    ],
  };
  const db = { auth: { async getUser(token) { return { data: { user: token ? { id: 'actor' } : null } }; } }, from(table) {
    const call = { table, fields: '', filters: [] }; calls.push(call);
    let start = 0, end = 499;
    const query = { select(fields) { call.fields = fields; return query; }, eq(key, value) { call.filters.push([key, value]); return query; },
      in() { return query; }, order() { return query; }, range(a, b) { start = a; end = b; return query; },
      async maybeSingle() { return { data: { role: 'teacher' }, error: null }; },
      then(resolve) { return Promise.resolve({ data: rows[table].filter(row => call.filters.every(([key, value]) => row[key] === value)).slice(start, end + 1), error: null }).then(resolve); } };
    return query;
  } };
  const api = load('app/api/teacher/teaching-discovery/route.ts', {
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/teacher/readingExperiences': { isExperienceTeacher: actor => actor?.role === 'teacher' },
    '@/lib/teacher/teachingDiscovery': model,
  });
  assert.equal((await api.GET(new Request('http://localhost'))).status, 401);
  const response = await api.GET(new Request('http://localhost', { headers: { Authorization: 'Bearer teacher' } }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.results.some(entry => entry.book.id === 'unowned'));
  assert.deepEqual(payload.queue.map(b => b.id), ['pending']);
  assert.ok(!JSON.stringify(payload).includes('PRIVATE'));
  const shared = calls.find(call => call.table === 'teacher_books' && call.fields.includes('books:'));
  assert.deepEqual(shared.filters, []); assert.ok(!shared.fields.includes('teacher_use_note')); assert.ok(!shared.fields.includes('teacher_id'));
  assert.ok(calls.filter(call => call.table === 'user_books').every(call => call.filters.some(([key, value]) => key === 'user_id' && value === 'actor')));
  assert.ok(!calls.some(call => call.table === 'book_reading_experiences'));
});
test('completion migration backfills opinions without treating automatic workflow defaults as assessment', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE); const db = new PGlite();
  try {
    await db.exec("create table teacher_books(id int, teacher_jlpt_difficulty text, teaching_suitability text, teacher_use_status text, teacher_use_note text, updated_at timestamptz, created_at timestamptz); insert into teacher_books(id,teacher_use_status) values(1,'do_not_use'),(2,'want_to_test'),(3,'testing'); insert into teacher_books(id,teacher_use_note) values(4,'My opinion');");
    const sql = fs.readFileSync('sql/20260928_teaching_assessment_completion.sql', 'utf8');
    await db.exec(sql); await db.exec(sql);
    const rows = (await db.query('select id, assessed_at is not null as completed from teacher_books order by id')).rows;
    assert.deepEqual(rows.map(r => r.completed), [true, false, false, true]);
  } finally { await db.close(); }
});
test('discovery page routes Assess to canonical assessment and refreshes the queue after a save', async () => {
  const states = [], listeners = {}; let cursor = 0, effect;
  const ref = { current: 0 };
  const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
  let queue = [book('pending')];
  const results = [{ book: book('unowned'), assessments: [rating] }];
  globalThis.window = { addEventListener: (key, fn) => listeners[key] = fn, removeEventListener() {} };
  globalThis.fetch = async () => Response.json({ results, queue });
  try {
    const component = load('app/(protected)/teacher/library/page.tsx', {
      react: {
        useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], next => states[i] = typeof next === 'function' ? next(states[i]) : next]; },
        useEffect(fn) { effect ??= fn; }, useMemo(fn) { return fn(); }, useCallback(fn) { return fn; }, useRef() { return ref; },
      },
      'next/link': { default: 'a' },
      'next/navigation': { useSearchParams: () => new URLSearchParams() },
      '@/lib/supabaseClient': { supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'teacher' } } }) } } },
      '@/lib/books/bookTypes': { bookTypeTitleLabel: value => value },
      '@/lib/teacher/readingExperiences': load('lib/teacher/readingExperiences.ts'),
      '@/lib/teacher/teachingDiscovery': model,
      '../components/teacherBackLink': { getTeacherBackLink: () => ({ href: '/teacher', label: 'Back' }) },
    });
    const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
    const render = () => { cursor = 0; return nodes(component.default()); };
    render(); effect(); await new Promise(resolve => setImmediate(resolve));
    const assess = render().find(n => n.props?.children === 'Assess');
    assert.equal(assess.props.href, '/teacher/reading-experiences/pending#overall-teaching-assessment');
    assert.ok(render().some(n => n.props?.href === '/teacher/reading-experiences/unowned#overall-teaching-assessment'));
    assert.equal(render().filter(n => n.type === 'textarea').length, 0);
    queue = [];
    listeners.storage({ key: 'teaching-assessment-saved', newValue: JSON.stringify({ bookId: 'pending' }) });
    assert.ok(!render().some(n => n.props?.children === 'Assess'));
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(render().some(n => n.props?.href === '/teacher/reading-experiences/unowned#overall-teaching-assessment'));
  } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
});
