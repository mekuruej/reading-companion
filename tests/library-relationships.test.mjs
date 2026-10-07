import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const require = createRequire(import.meta.url);
const base = 'app/(protected)/users/[username]/books/';
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const { getLibraryRelationshipBadge: badge } = load(base + 'libraryRelationship.ts');
const { resolvePersonalTrackingStatus } = load('lib/personalTracking.ts');

test('personally tracked books default to Both unless explicitly not for teaching', () => {
  for (const status of ['want_to_read', 'reading', 'finished', 'dnf']) {
    const personal = resolvePersonalTrackingStatus({ personal_tracking_status: status }) !== 'not_tracking';
    for (const teachingStatus of [undefined, null, 'considering', 'currently_teaching', 'previously_taught', 'do_not_use']) {
      assert.equal(badge(personal, teachingStatus), null);
    }
    assert.equal(badge(personal, 'not_for_teaching'), 'Personal Only');
  }
  assert.equal(badge(resolvePersonalTrackingStatus({ started_at: '2026-01-01' }) !== 'not_tracking', undefined), null);
});

test('not_tracking alone shows Teaching Only, including missing status and conflicting opt-out', () => {
  for (const teachingStatus of [undefined, null, 'currently_teaching', 'not_for_teaching']) {
    assert.equal(badge(false, teachingStatus), 'Teaching Only');
  }
});

test('cover and list render the same secondary badges and preserve book/workspace actions', () => {
  for (const name of ['LibraryBookCard', 'LibraryBookRow']) {
    const Component = load(base + 'components/' + name + '.tsx').default;
    for (const relationshipBadge of ['Personal Only', 'Teaching Only', null]) {
      const html = renderToStaticMarkup(createElement(Component, {
        row: { id: 'book', books: { title: 'Book', cover_url: null }, relationshipBadge },
        href: '/books/book', onOpen() {}, status: 'Want to Read', formatRelativeDate: value => value,
        secondaryActionHref: '/teacher/students/student/books/book/workspace', secondaryActionLabel: 'Open Workspace',
      }));
      assert.equal(html.includes('Personal Only'), relationshipBadge === 'Personal Only');
      assert.equal(html.includes('Teaching Only'), relationshipBadge === 'Teaching Only');
      assert.ok(html.includes('/teacher/students/student/books/book/workspace'));
      if (name === 'LibraryBookCard') assert.ok(html.includes('href="/books/book"'));
      assert.ok(!html.includes('<select') && !html.includes('>Save<'));
    }
  }
});

test('Library controls retain search, personal filtering, views and sorts without teaching controls', () => {
  const Component = load(base + 'components/LibraryViewControls.tsx').default;
  const html = renderToStaticMarkup(createElement(Component, {
    searchQuery: '', onSearchQueryChange() {}, viewMode: 'cover', bookTypeFilter: 'all', statusFilter: 'all', sortMode: 'status',
    onViewModeChange() {}, onBookTypeFilterChange() {}, onStatusFilterChange() {}, onSortModeChange() {},
  }));
  for (const status of ['reading', 'want_to_read', 'finished', 'dnf']) assert.ok(html.includes(`value="${status}"`));
  assert.ok(html.includes('Cover') && html.includes('List') && html.includes('difficulty_low'));
  assert.ok(html.includes('type=\"search\"') && html.includes('Search title or author'));
  assert.ok(!/currently_teaching|Teaching Status|Teaching Difficulty|Clear teaching/.test(html));
});

const source = fs.readFileSync(base + 'page.tsx', 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function getCallbackSource(name) {
  let callbackSource;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer && ts.isCallExpression(node.initializer)) {
      callbackSource = node.initializer.arguments[0].getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return callbackSource;
}
const fetchCode = ts.transpileModule(getCallbackSource('fetchBooks'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText.trim().replace(/;$/, '');
async function fetchScenario({ teacher = true, target = 'me', fail = false } = {}) {
  const queries = [], statsIds = [];
  let rows;
  const books = [
    { id: 'personal', personal_tracking_status: 'reading', books: {} },
    { id: 'teaching', personal_tracking_status: 'not_tracking', books: {} },
    { id: 'both', personal_tracking_status: 'finished', books: {} },
    { id: 'neither', personal_tracking_status: 'not_tracking', books: {} },
    { id: 'unlinked', personal_tracking_status: 'reading', books: {} },
    { id: 'unlinked-teaching', personal_tracking_status: 'not_tracking', books: {} },
  ];
  const env = {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
      from(table) {
        const record = { table, filters: [] }; queries.push(record);
        const result = table === 'user_books' ? { data: books } : { data: [{ user_book_id: 'personal', teaching_status: 'not_for_teaching' }, { user_book_id: 'teaching', teaching_status: null }, { user_book_id: 'both', teaching_status: 'considering' }, { user_book_id: 'neither', teaching_status: 'not_for_teaching' }], error: fail ? new Error('offline') : null };
        return { select(fields) { record.fields = fields; return this; }, eq(...args) { record.filters.push(args); return this; },
          not(...args) { record.filters.push(args); return this; }, order() { return this; }, then(resolve) { return Promise.resolve(result).then(resolve); } };
      },
    },
    isTeacher: teacher, hasTeachingLibraryAccess: teacher, meId: 'me', fetchBooksRequestIdRef: { current: 1 },
    setLibraryBooksError() {}, setRows(value) { rows = value; }, setLibraryBooksLoading() {}, logSbError() {},
    resolvePersonalTrackingStatus, getLibraryRelationshipBadge: badge, effectiveProgressMethod: () => null,
    loadReadingStatsForBooks: async (ids, _progress, isCurrentRequest) => { if (isCurrentRequest()) statsIds.push(...ids); },
    console: { error() {} },
  };
  const fetchBooks = new Function(...Object.keys(env), `return (${fetchCode});`)(...Object.values(env));
  await fetchBooks(target, 'me', 1);
  return { rows, queries, statsIds };
}

test('own teacher Library loads only links and explicit teaching status and derives all states', async () => {
  const { rows, queries, statsIds } = await fetchScenario();
  assert.deepEqual(rows.map(row => row.relationshipBadge), ['Personal Only', 'Teaching Only', null, 'Teaching Only', null, 'Teaching Only']);
  assert.deepEqual(statsIds, ['personal', 'both', 'unlinked']);
  assert.deepEqual(queries.find(query => query.table === 'teacher_books'), {
    table: 'teacher_books', fields: 'user_book_id, teaching_status', filters: [['teacher_id', 'me'], ['user_book_id', 'is', null]],
  });
});

test('target-user scope and failure do not fabricate Personal Only relationships', async () => {
  const student = await fetchScenario({ target: 'student' });
  assert.deepEqual(student.rows.map(row => row.relationshipBadge), [null, 'Teaching Only', null, 'Teaching Only', null, 'Teaching Only']);
  assert.ok(!student.queries.some(query => query.table === 'teacher_books'));
  assert.ok(student.queries[0].filters.some(([key, value]) => key === 'user_id' && value === 'student'));
  const failed = await fetchScenario({ fail: true });
  assert.deepEqual(failed.rows.map(row => row.relationshipBadge), [null, 'Teaching Only', null, 'Teaching Only', null, 'Teaching Only']);
  const reader = await fetchScenario({ teacher: false, target: 'someone-else' });
  assert.ok(!reader.queries.some(query => query.table === 'teacher_books'));
  assert.ok(reader.queries[0].filters.some(([key, value]) => key === 'user_id' && value === 'me'));
  assert.equal(reader.rows[0].relationshipBadge, null);
});

test('Library fetch ignores a stale teacher-metadata response after a newer user load', async () => {
  const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
  };
  const userBookRequests = [], teacherBookRequests = [];
  let rows;
  const requestRef = { current: 1 };
  const env = {
    supabase: {
      from(table) {
        const request = deferred();
        (table === 'user_books' ? userBookRequests : teacherBookRequests).push(request);
        return { select() { return this; }, eq() { return this; }, not() { return this; }, order() { return this; }, then(resolve, reject) { return request.promise.then(resolve, reject); } };
      },
    },
    isTeacher: true, hasTeachingLibraryAccess: true, meId: 'me', fetchBooksRequestIdRef: requestRef,
    setLibraryBooksError() {}, setRows(value) { rows = value; }, setLibraryBooksLoading() {}, logSbError() {},
    resolvePersonalTrackingStatus, getLibraryRelationshipBadge: badge, effectiveProgressMethod: () => null,
    loadReadingStatsForBooks: async (ids, _progress, isCurrentRequest) => { if (isCurrentRequest()) return; },
    console: { error() {} },
  };
  const fetchBooks = new Function(...Object.keys(env), `return (${fetchCode});`)(...Object.values(env));
  const staleRequest = fetchBooks('me', 'me', 1);
  userBookRequests[0].resolve({ data: [{ id: 'old', personal_tracking_status: 'reading', books: {} }], error: null });
  await new Promise(setImmediate);
  assert.equal(teacherBookRequests.length, 1);

  requestRef.current = 2;
  const currentRequest = fetchBooks('student', 'me', 2);
  userBookRequests[1].resolve({ data: [{ id: 'current', personal_tracking_status: 'reading', books: {} }], error: null });
  await new Promise(setImmediate);
  assert.equal(rows[0].id, 'current');

  teacherBookRequests[0].resolve({ data: [{ user_book_id: 'old', teaching_status: 'not_for_teaching' }], error: null });
  await Promise.all([staleRequest, currentRequest]);
  assert.equal(rows[0].id, 'current');
  assert.match(source, /if \(requestId === fetchBooksRequestIdRef\.current\) \{\s*setLibraryBooksLoading\(false\)/);
  assert.match(source, /if \(requestId === fetchBooksRequestIdRef\.current\) \{\s*fetchBooksRequestIdRef\.current \+= 1/);
  assert.match(source, /\}, \[isTeacher, hasTeachingLibraryAccess, meId, loadReadingStatsForBooks, logSbError\]\);/);
  assert.match(source, /\}, \[viewingUserId, meId, fetchBooks\]\);/);
});


const { sortLibraryItems } = load(base + 'helpers.ts');
test('Easiest First sorts Japanese books only and keeps missing difficulty last', () => {
  const items = [
    { id: 'missing', books: { title: 'C', language_code: 'ja' }, rating_overall: null, rating_difficulty: null },
    { id: 'hard', books: { title: 'B', language_code: 'jpn' }, rating_overall: 5, rating_difficulty: 5 },
    { id: 'easy', books: { title: 'A', language_code: 'ja' }, rating_overall: 2, rating_difficulty: 1 },
    { id: 'english-easy', books: { title: 'Easy English', language_code: 'en' }, rating_overall: 4, rating_difficulty: 1 },
    { id: 'unset', books: { title: 'D', language_code: 'ja' } },
  ];
  assert.deepEqual(sortLibraryItems(items, 'difficulty_low', {}).map(row => row.id), ['easy', 'hard', 'missing', 'unset']);
  assert.deepEqual(sortLibraryItems(items, 'rating_high', {}).map(row => row.id), ['hard', 'english-easy', 'easy', 'missing', 'unset']);
  assert.deepEqual(sortLibraryItems(items, 'title', {}).map(row => row.id), ['easy', 'hard', 'missing', 'unset', 'english-easy']);
  assert.equal(items[0].id, 'missing');
  const Component = load(base + 'components/LibraryViewControls.tsx').default;
  const html = renderToStaticMarkup(createElement(Component, { searchQuery: '', onSearchQueryChange() {}, viewMode: 'cover', bookTypeFilter: 'all', statusFilter: 'all', sortMode: 'status', onViewModeChange() {}, onBookTypeFilterChange() {}, onStatusFilterChange() {}, onSortModeChange() {} }));
  const sortMenu = [...html.matchAll(/<select[^>]*>(.*?)<\/select>/g)].at(-1)[1];
  assert.deepEqual([...sortMenu.matchAll(/<option[^>]*>(.*?)<\/option>/g)].map(match => match[1]), ['Book Status', 'Title', 'Recently Engaged With', 'Easiest First', 'Highest Rated']);
});

test('recent sorts and Book Status retain their existing ordering', () => {
  const items = [
    { id: 'finished', books: { title: 'A' }, personal_tracking_status: 'finished', finished_at: '2026-03-01' },
    { id: 'reading', books: { title: 'B' }, personal_tracking_status: 'reading', finished_at: null },
    { id: 'want', books: { title: 'C' }, personal_tracking_status: 'want_to_read', finished_at: null },
  ];
  assert.deepEqual(sortLibraryItems(items, 'status', {}).map(row => row.id), ['reading', 'want', 'finished']);
  assert.equal(sortLibraryItems(items, 'last_engaged', { reading: { lastEngagedAt: '2026-04-01' }, finished: { lastEngagedAt: '2026-03-01' } })[0].id, 'reading');
});

test('Library loader groups sessions by book and preserves page, legacy, Kindle, audio and recent-engagement results', async () => {
  const loaderSource = getCallbackSource('loadReadingStatsForBooks');
  const code = ts.transpileModule(loaderSource, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText.trim().replace(/;$/, '');
  const sessions = [
    { user_book_id: 'page', start_page: 1, end_page: 30, tracking_unit: 'page', end_position: 30, read_on: '2026-01-01' },
    { user_book_id: 'page', start_page: 31, end_page: 50, tracking_unit: 'page', end_position: 50, read_on: '2026-02-01' },
    { user_book_id: 'legacy-page', start_page: 1, end_page: 10, read_on: '2026-02-03' },
    { user_book_id: 'kindle', tracking_unit: 'kindle_location', end_position: 250, read_on: '2026-02-02' },
    { id: '1', created_at: '2026-02-01T10:00:00Z', user_book_id: 'audio', tracking_unit: 'audiobook_time', end_position: 90, read_on: '2026-02-01' },
    { id: '2', created_at: '2026-02-02T10:00:00Z', user_book_id: 'audio', tracking_unit: 'audiobook_time', end_position: 60, read_on: '2026-02-02' },
  ];
  const progressByBook = { page: { method: 'page', totals: { page_count: 100 } }, 'legacy-page': { method: 'page', totals: { page_count: 100 } }, kindle: { method: 'kindle_location', totals: { kindle_location_count: 1000 } }, audio: { method: 'audiobook_time', totals: { audiobook_duration_minutes: 120 } } };
  let result;
  const queriedTables = [];
  const selectedFields = [];
  const progressInputs = [];
  const { progressSummary: actualProgressSummary } = load('lib/books/readingProgress.ts');
  const progressSummary = (bookSessions, ...args) => {
    progressInputs.push(bookSessions.map(session => session.user_book_id));
    return actualProgressSummary(bookSessions, ...args);
  };
  const supabase = { from(table) { queriedTables.push(table); return {
    select(fields) {
      if (table === 'user_book_reading_sessions') selectedFields.push(fields);
      return this;
    },
    in: async () => ({ data: table === 'user_book_reading_sessions' ? sessions : [] }),
  }; } };
  const loader = new Function('supabase', 'progressSummary', 'setReadingStatsByUserBookId', `return (${code});`)(supabase, progressSummary, value => { result = value; });
  await loader(['page', 'legacy-page', 'kindle', 'audio'], progressByBook, () => true);
  assert.equal(result.page.progressPercent, 50);
  assert.equal(result.page.furthestPage, 50);
  assert.equal(result.page.lastEngagedAt, '2026-02-01');
  assert.equal(result['legacy-page'].progressPercent, 10); // Legacy page columns remain a fallback.
  assert.equal(result['legacy-page'].furthestPage, 10);
  assert.equal(result['legacy-page'].lastEngagedAt, '2026-02-03');
  assert.equal(result.kindle.progressPercent, 25);
  assert.equal(result.audio.progressPercent, 50); // Latest audio position, including rewind.
  assert.equal(result.audio.lastEngagedAt, '2026-02-02');
  assert.deepEqual(queriedTables, ['user_book_reading_sessions']);
  assert.equal(selectedFields.length, 1);
  assert.ok(!selectedFields[0].includes('progress_total'));
  assert.ok(selectedFields[0].includes('created_at') && selectedFields[0].includes('id'));
  assert.ok(selectedFields[0].includes('session_mode'));
  assert.deepEqual(progressInputs, [['page', 'page'], ['legacy-page'], ['kindle'], ['audio', 'audio']]);
  assert.doesNotMatch(loaderSource, /\(data \?\? \[\]\)\.filter\(s\s*=>\s*s\.user_book_id\s*===\s*userBookId\)/);
  assert.ok(Object.values(result).every(stats => !('averageMinutesPerPage' in stats)));
  assert.ok(Object.values(result).every(stats => !('wordsLookedUp' in stats)));

  let active = true;
  let staleStats;
  let resolveSessions;
  const waitingForSessions = new Promise(resolve => { resolveSessions = resolve; });
  const staleSupabase = { from() { return { select() { return this; }, in: () => waitingForSessions }; } };
  const staleLoader = new Function('supabase', 'progressSummary', 'setReadingStatsByUserBookId', `return (${code});`)(staleSupabase, actualProgressSummary, value => { staleStats = value; });
  const staleLoad = staleLoader(['page'], progressByBook, () => active);
  active = false;
  resolveSessions({ data: sessions, error: null });
  await staleLoad;
  assert.equal(staleStats, undefined);
});

test('Ability Check reminder waits for Library render and bounds refresh/query work', () => {
  const pageSource = fs.readFileSync(base + 'page.tsx', 'utf8');
  assert.match(pageSource, /if \(libraryBooksLoading\) \{\s*cancelAbilityCheckReminderLoad\(\);\s*return;\s*\}\s*void loadAbilityCheckReminder/);
  assert.match(pageSource, /window\.addEventListener\("focus", queueForegroundRefresh\)/);
  assert.match(pageSource, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(pageSource, /setTimeout\(flushForegroundRefresh, 150\)/);
  assert.match(pageSource, /activeRequest\.controller\.abort\(\)/);
  assert.match(pageSource, /Promise\.all\(\[\s*supabase\s*\.from\("user_library_word_summaries"\)[\s\S]*?\.from\("user_library_word_claims"\)/);
  assert.match(pageSource, /\.order\("updated_at", \{ ascending: false \}\)\s*\.limit\(500\)/);
  assert.match(pageSource, /keys\.slice\(i, i \+ 75\)/);
  assert.match(pageSource, /progressChunks\.slice\(i, i \+ 3\)/);
  assert.match(pageSource, /const ABILITY_CHECK_REMINDER_MIN_DUE_CARDS = 10/);
  assert.doesNotMatch(pageSource, /select\("id, study_identity_key, surface, reading, meaning, claimed_color, created_at, updated_at"\)/);
  assert.doesNotMatch(pageSource, /mastered_at, reading_gate_failed_at/);
  assert.match(pageSource, /router\.push\("\/library-study\/check\?start=1"\)/);
});


test('local search combines title/author with type and personal status filters and normalizes casing/space', () => {
  const componentPath = base + 'components/LibraryViewControls.tsx';
  const componentSource = fs.readFileSync(componentPath, 'utf8');
  assert.match(componentSource, /Search title or author/);
  const pageSource = fs.readFileSync(base + 'page.tsx', 'utf8');
  assert.match(pageSource, /searchQuery\.trim\(\)\.toLocaleLowerCase\(\)/);
  assert.match(pageSource, /row\.books\?\.title\?\.toLocaleLowerCase\(\)\.includes\(normalizedSearch\)/);
  assert.match(pageSource, /row\.books\?\.author\?\.toLocaleLowerCase\(\)\.includes\(normalizedSearch\)/);
  assert.match(pageSource, /return matchesSearch && matchesBookType && matchesStatus/);
  assert.match(pageSource, /sortLibraryItems\(validRows, sortMode, readingStatsByUserBookId\)/);
  assert.match(pageSource, /showLibraryBookSections && !hasLibraryBooks/);
  assert.match(pageSource, /showLibraryBookSections && hasLibraryBooks && validRows\.length === 0/);
  assert.match(pageSource, /No books match your search and filters\./);
  assert.ok(!pageSource.includes('fetch(searchQuery') && !pageSource.includes('from("search"'));
});
