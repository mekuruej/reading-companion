import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'exports', code)(name => dependencies[name] ?? require(name), exports);
  return exports;
}
const model = load('lib/teacher/readingExperiences.ts');
const teacher = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const person = '00000000-0000-4000-8000-000000000003';
const book = '00000000-0000-4000-8000-000000000004';
const valid = { person_id: person, experienced_on: '2026-09-28', context: 'Book club', reader_level: 'Level 5', level_fit: 'good_fit', notes: 'Read the opening together.' };

test('experience validates a real date, a person, optional context and bounded notes', () => {
  assert.equal(model.validateExperience(valid), null);
  assert.equal(model.validateExperience({ ...valid, context: null, reader_level: null, level_fit: null }), null);
  for (const reader_level of ['N3', 'Level 0', 'Level 11', '', 5]) assert.ok(model.validateExperience({ ...valid, reader_level }));
  assert.ok(model.validateExperience({ ...valid, level_fit: 'invalid' }));
  for (const patch of [{ person_id: '' }, { experienced_on: '2026-02-30' }, { experienced_on: 'yesterday' }, { context: 'fake' }, { notes: ' ' }, { notes: 'a'.repeat(4001) }]) {
    assert.ok(model.validateExperience({ ...valid, ...patch }));
  }
  assert.equal(model.validateAssessment({ ...model.EMPTY_ASSESSMENT, teacher_use_status: 'testing', teacher_use_note: 'a'.repeat(5000) }), null);
  assert.ok(model.validateAssessment({ ...model.EMPTY_ASSESSMENT, teaching_suitability: 'fake' }));
  assert.equal(model.isExperienceTeacher({ role: 'member' }), false);
  for (const role of ['teacher', 'admin', 'super_teacher']) assert.equal(model.isExperienceTeacher({ role }), true);
});

function apiFixture() {
  const tables = {
    profiles: [{ id: teacher, role: 'teacher' }, { id: other, role: 'teacher' }, { id: person, role: 'member', username: 'bookclub', display_name: 'Book Club Reader' }],
    books: [{ id: book, title: 'Test Book' }],
    teacher_students: [],
    teacher_books: [{ teacher_id: teacher, book_id: book, user_book_id: 'preserved-copy', teaching_status: 'currently_teaching', teacher_use_status: 'testing', teacher_use_note: 'Original' }],
    user_books: [],
    book_reading_experiences: [],
  };
  let serial = 10;
  const calls = [];
  const db = {
    auth: { async getUser(token) { return { data: { user: token === 'teacher' ? { id: teacher } : token === 'other' ? { id: other } : token === 'member' ? { id: person } : null }, error: null }; } },
    from(table) {
      const filters = [];
      let action = 'read', payload, start = 0, end = Infinity;
      const q = {
        select() { return q; }, eq(k, v) { filters.push(row => row[k] === v); return q; },
        order() { return q; }, limit(n) { end = n - 1; return q; }, range(a, b) { start = a; end = b; return q; },
        insert(p) { action = 'insert'; payload = p; return q; },
        update(p) { action = 'update'; payload = p; return q; },
        upsert(p) { action = 'upsert'; payload = p; return q; },
        async execute(single = false) {
          calls.push({ table, action, payload });
          let rows = tables[table].filter(row => filters.every(f => f(row)));
          if (action === 'insert') {
            const row = { id: '00000000-0000-4000-8000-' + String(serial++).padStart(12, '0'), ...payload, created_at: '2026-09-28' };
            tables[table].push(row); rows = [row];
          } else if (action === 'update') {
            rows.forEach(row => Object.assign(row, payload));
          } else if (action === 'upsert') {
            let row = tables[table].find(row => row.teacher_id === payload.teacher_id && row.book_id === payload.book_id);
            if (row) Object.assign(row, payload);
            else { row = { ...payload }; tables[table].push(row); }
            rows = [row];
          }
          rows = rows.slice(start, end + 1);
          return { data: single ? rows[0] ?? null : rows, error: null };
        },
        maybeSingle() { return q.execute(true); }, single() { return q.execute(true); },
        then(resolve, reject) { return q.execute().then(resolve, reject); },
      };
      return q;
    },
  };
  const api = load('app/api/teacher/reading-experiences/route.ts', {
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/teacher/readingExperiences': model,
  });
  const request = (method, token, body, query = '') => new Request('http://localhost/api/teacher/reading-experiences?bookId=' + book + query, {
    method, headers: token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { api, tables, calls, request };
}

test('API authenticates teachers and supports repeated non-student experiences without creating links', async () => {
  const { api, tables, calls, request } = apiFixture();
  assert.equal((await api.GET(request('GET', null))).status, 401);
  assert.equal((await api.GET(request('GET', 'member'))).status, 403);
  const found = await api.GET(request('GET', 'teacher', null, '&username=bookclub'));
  assert.equal(found.status, 200);
  assert.equal((await found.json()).person.id, person);
  const body = { kind: 'experience', bookId: book, ...valid, teacher_id: other };
  const first = await api.POST(request('POST', 'teacher', body));
  assert.equal(first.status, 200);
  const id = (await first.json()).experience.id;
  assert.equal((await api.POST(request('POST', 'teacher', body))).status, 200);
  assert.equal(tables.book_reading_experiences.length, 2);
  assert.equal(tables.book_reading_experiences[0].reader_level, 'Level 5');
  assert.equal(tables.book_reading_experiences[0].level_fit, 'good_fit');
  assert.ok(tables.book_reading_experiences.every(row => row.teacher_id === teacher));
  assert.equal(tables.teacher_students.length, 0);
  assert.ok(!calls.some(call => call.table === 'teacher_students' && call.action !== 'read'));
  assert.equal((await api.PATCH(request('PATCH', 'other', { ...body, id, notes: 'Overwrite' }))).status, 404);
  assert.equal(tables.book_reading_experiences[0].notes, valid.notes);
  const otherData = await (await api.GET(request('GET', 'other'))).json();
  assert.equal(otherData.experiences.length, 0);
  assert.equal((await api.PATCH(request('PATCH', 'teacher', { ...body, id, notes: 'Updated' }))).status, 200);
  assert.equal(tables.book_reading_experiences[0].notes, 'Updated');
  assert.equal((await api.PATCH(request('PATCH', 'teacher', { ...body, id, reader_level: null, level_fit: null }))).status, 200);
  assert.equal(tables.book_reading_experiences[0].reader_level, null);
  assert.equal(tables.book_reading_experiences[0].level_fit, null);
});

test('assessment reuses existing fields without changing prep links or teaching workflow', async () => {
  const { api, tables, request } = apiFixture();
  const response = await api.POST(request('POST', 'teacher', {
    kind: 'assessment', bookId: book,
    assessment: { teacher_jlpt_difficulty: 'n2', teaching_suitability: 'excellent', teacher_use_status: 'usable', teacher_use_note: 'New assessment' },
  }));
  assert.equal(response.status, 200);
  assert.equal(tables.teacher_books.length, 1);
  assert.equal(tables.teacher_books[0].user_book_id, 'preserved-copy');
  assert.equal(tables.teacher_books[0].teaching_status, 'currently_teaching');
  assert.equal(tables.teacher_books[0].teacher_use_note, 'New assessment');
  assert.ok(tables.teacher_books[0].assessed_at);
});

test('database permits repeats and enforces private ownership without a student or teaching-book table', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      create table books(id uuid primary key);
      create table profiles(id uuid primary key, role text, is_super_teacher boolean);
      grant select on profiles to authenticated;
      insert into auth.users values('${teacher}'),('${other}'),('${person}');
      insert into profiles values('${teacher}','teacher',false),('${other}','teacher',false),('${person}','member',false);
      insert into books values('${book}');`);
    const sql = fs.readFileSync('sql/20260928_book_reading_experiences.sql', 'utf8');
    await db.exec(sql); await db.exec(sql);
    await db.exec('create table book_teaching_reflections(id uuid);');
    const detailsSql = fs.readFileSync('sql/20260928_reading_experience_reader_details.sql', 'utf8');
    await db.exec(detailsSql); await db.exec(detailsSql);
    assert.equal((await db.query("select to_regclass('public.book_teaching_reflections') as old_table")).rows[0].old_table, null);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${teacher}';`);
    const insert = "insert into book_reading_experiences(teacher_id,book_id,person_id,experienced_on,notes) values($1,$2,$3,'2026-09-28','Reading together')";
    await db.query(insert, [teacher, book, person]); await db.query(insert, [teacher, book, person]);
    assert.equal((await db.query('select * from book_reading_experiences')).rows.length, 2);
    await db.exec("update book_reading_experiences set reader_level='Level 5', level_fit='good_fit'");
    await assert.rejects(db.exec("update book_reading_experiences set reader_level='Level 11'"), /check constraint/);
    await assert.rejects(db.exec("update book_reading_experiences set level_fit='invalid'"), /check constraint/);
    const snapshots = (await db.query('select reader_level,level_fit from book_reading_experiences')).rows;
    assert.ok(snapshots.every(row => row.reader_level === 'Level 5' && row.level_fit === 'good_fit'));
    await assert.rejects(db.query(insert, [other, book, person]), /row-level security/);
    await db.exec(`set request.jwt.claim.sub='${other}';`);
    assert.equal((await db.query('select * from book_reading_experiences')).rows.length, 0);
    assert.equal((await db.query("update book_reading_experiences set notes='Overwrite' returning *")).rows.length, 0);
    await db.exec(`set request.jwt.claim.sub='${person}';`);
    await assert.rejects(db.query(insert, [person, book, teacher]), /row-level security/);
    await db.exec('reset role');
    await db.query('delete from profiles where id=$1', [person]);
    const rows = (await db.query('select * from book_reading_experiences')).rows;
    assert.equal(rows.length, 2); assert.ok(rows.every(row => row.person_id === null));
  } finally { await db.close(); }
});

test('experience form preselects the shortcut person, retains failed drafts, and creates repeat entries', async () => {
  const states = []; let cursor = 0, effect, fail = false, saved = [], requestedPerson = false;
  const selectedPerson = { id: person, display_name: 'Reader', username: 'reader' };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('personId=')) { requestedPerson = true; return Response.json({ person: selectedPerson }); }
    if (options.method === 'POST' || options.method === 'PATCH') {
      if (fail) return Response.json({ error: 'Offline. Try again.' }, { status: 503 });
      const payload = JSON.parse(options.body);
      if (payload.kind === 'assessment') return Response.json({ assessment: { ...payload.assessment, assessed_at: '2026-09-28T12:00:00Z' } });
      const entry = { ...payload, id: String(saved.length + 1), person: selectedPerson, created_at: '2026-09-28' };
      saved.push(entry); return Response.json({ experience: entry });
    }
    return Response.json({ book: { id: book, title: 'Book' }, teacherId: teacher, userBookId: 'copy', assessment: null, experiences: saved, experienceError: null, hasMore: false });
  };
  try {
    const component = load('app/(protected)/teacher/reading-experiences/[bookId]/page.tsx', {
      react: {
        useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
        useEffect(fn) { effect ??= fn; },
      },
      'next/navigation': { useParams: () => ({ bookId: book }), useSearchParams: () => new URLSearchParams({ person }) },
      'next/link': { default: 'a' },
      '@/lib/supabaseClient': { supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } } },
      '@/lib/timeZone': { todayYmdAppTimeZone: () => '2026-09-28' },
      '@/lib/teacher/readingExperiences': model,
      '@/lib/teacher/teachingDiscovery': load('lib/teacher/teachingDiscovery.ts'),
      '@/components/profile/MekuruReadingLevelGuide': { MEKURU_READING_LEVEL_GROUPS: [{ title: 'Beginner', levels: [{ value: 'Level 5', plain: 'Beginner' }] }] },
    });
    const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
    const render = () => { cursor = 0; return nodes(component.default()); };
    const button = label => render().find(node => node.type === 'button' && node.props.children === label);
    const control = id => render().find(node => node.props?.id === id);
    const note = () => render().find(node => node.type === 'textarea' && node.props.maxLength === 4000);
    const settle = () => new Promise(resolve => setImmediate(resolve));
    render(); effect(); await settle();
    assert.equal(requestedPerson, true);
    const badges = () => render().filter(node => node.type?.name === 'SaveBadge');
    assert.equal(badges()[0].props.state, 'new');
    const assessmentNote = () => render().find(node => node.type === 'textarea' && !node.props.maxLength);
    assessmentNote().props.onChange({ target: { value: 'Good teaching choice' } });
    assert.equal(badges()[0].props.state, 'unsaved');
    render().filter(node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    assert.equal(badges()[0].props.state, 'saving');
    assert.ok(button('Saving assessment…'));
    await settle();
    assert.equal(badges()[0].props.state, 'saved');
    assert.equal(button('✓ Assessment saved').props.disabled, true);
    assessmentNote().props.onChange({ target: { value: 'Revised assessment' } });
    assert.equal(badges()[0].props.state, 'unsaved');
    fail = true;
    render().filter(node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    await settle();
    assert.equal(badges()[0].props.state, 'failed');
    assert.ok(button('Retry save assessment'));
    assert.equal(assessmentNote().props.value, 'Revised assessment');
    fail = false;
    render().filter(node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    await settle();
    assert.equal(badges()[0].props.state, 'saved');
    assert.ok(!render().some(node => node.type === 'details'));
    control('experience-reader-level').props.onChange({ target: { value: 'Level 5' } });
    control('experience-level-fit').props.onChange({ target: { value: 'good_fit' } });
    assert.equal(button('Save experience').props.disabled, false);
    note().props.onChange({ target: { value: 'Early observation' } });
    const submit = () => render().filter(node => node.type === 'form')[1].props.onSubmit({ preventDefault() {} });
    fail = true; submit();
    assert.equal(badges()[1].props.state, 'saving');
    await settle();
    assert.equal(badges()[1].props.state, 'failed');
    assert.ok(button('Retry save experience'));
    assert.equal(note().props.value, 'Early observation');
    assert.equal(control('experience-reader-level').props.value, 'Level 5');
    assert.equal(control('experience-level-fit').props.value, 'good_fit');
    fail = false; submit(); await settle();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].person_id, person);
    assert.equal(saved[0].bookId, book);
    assert.equal(saved[0].reader_level, 'Level 5');
    assert.equal(saved[0].level_fit, 'good_fit');
    assert.equal(badges().at(-1).props.state, 'saved');
    button('Edit').props.onClick();
    assert.equal(control('experience-reader-level').props.value, 'Level 5');
    assert.equal(control('experience-level-fit').props.value, 'good_fit');
    button('Cancel').props.onClick();
    assert.ok(!note());
    button('+ Add Reading Experience').props.onClick();
    assert.ok(note());
    assert.equal(button('Save experience').props.disabled, true);
    const usernameInput = render().find(node => node.type === 'input' && node.props.placeholder === '@username');
    usernameInput.props.onChange({ target: { value: 'reader' } });
    // Resolve a non-student through the same shared form.
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('username=')) return Response.json({ person: selectedPerson });
      const payload = JSON.parse(options.body);
      const entry = { ...payload, id: '2', person: selectedPerson, created_at: '2026-09-28' };
      saved.push(entry); return Response.json({ experience: entry });
    };
    button('Find person').props.onClick(); await settle();
    note().props.onChange({ target: { value: 'Final reflection' } });
    submit(); await settle();
    assert.equal(saved.length, 2); assert.equal(saved[1].person_id, person);
    assert.equal(saved[1].reader_level, null); assert.equal(saved[1].level_fit, null);
  } finally { globalThis.fetch = originalFetch; }
});
