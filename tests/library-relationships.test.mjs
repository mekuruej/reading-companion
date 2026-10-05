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
let fetchSource;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'fetchBooks') fetchSource = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
const fetchCode = ts.transpileModule(fetchSource, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
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
    isTeacher: teacher, hasTeachingLibraryAccess: teacher, meId: 'me', isSuperTeacher: false, students: [],
    setLibraryBooksError() {}, setRows(value) { rows = value; }, setLibraryBooksLoading() {}, logSbError() {},
    resolvePersonalTrackingStatus, getLibraryRelationshipBadge: badge, effectiveProgressMethod: () => null,
    loadReadingStatsForBooks: async ids => statsIds.push(...ids), loadKanjiEnrichmentAlerts: async () => {}, setKanjiEnrichmentAlerts() {},
    console: { error() {} },
  };
  await new Function(...Object.keys(env), fetchCode + ';return fetchBooks;')(...Object.values(env))(target);
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


const { sortLibraryItems } = load(base + 'helpers.ts');
test('six sort choices retain personal rating/difficulty ordering with missing values last', () => {
  const items = [
    { id: 'missing', books: { title: 'C' }, rating_overall: null, rating_difficulty: null },
    { id: 'hard', books: { title: 'B' }, rating_overall: 5, rating_difficulty: 5 },
    { id: 'easy', books: { title: 'A' }, rating_overall: 2, rating_difficulty: 1 },
    { id: 'unset', books: { title: 'D' } },
  ];
  assert.deepEqual(sortLibraryItems(items, 'difficulty_low', {}).map(row => row.id), ['easy', 'hard', 'missing', 'unset']);
  assert.deepEqual(sortLibraryItems(items, 'rating_high', {}).map(row => row.id), ['hard', 'easy', 'missing', 'unset']);
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

test('Library loader keeps page, Kindle and audio progress and recent engagement without pace data', async () => {
  let loaderSource;
  function findLoader(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'loadReadingStatsForBooks') loaderSource = node.getText(ast);
    ts.forEachChild(node, findLoader);
  }
  findLoader(ast);
  const code = ts.transpileModule(loaderSource, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const sessions = [
    { user_book_id: 'page', start_page: 1, end_page: 30, tracking_unit: 'page', end_position: 30, read_on: '2026-01-01' },
    { user_book_id: 'page', start_page: 31, end_page: 50, tracking_unit: 'page', end_position: 50, read_on: '2026-02-01' },
    { user_book_id: 'kindle', tracking_unit: 'kindle_location', end_position: 250, read_on: '2026-02-02' },
    { user_book_id: 'audio', tracking_unit: 'audiobook_time', end_position: 90, read_on: '2026-02-01' },
    { user_book_id: 'audio', tracking_unit: 'audiobook_time', end_position: 60, read_on: '2026-02-02' },
  ];
  const progressByBook = { page: { method: 'page', totals: { page_count: 100 } }, kindle: { method: 'kindle_location', totals: { kindle_location_count: 1000 } }, audio: { method: 'audiobook_time', totals: { audiobook_duration_minutes: 120 } } };
  let result;
  const queriedTables = [];
  const { progressSummary } = load('lib/books/readingProgress.ts');
  const supabase = { from(table) { queriedTables.push(table); return {
    select(fields) {
      if (table === 'user_book_reading_sessions') assert.ok(!fields.includes('minutes_read'));
      return this;
    },
    in: async () => ({ data: table === 'user_book_reading_sessions' ? sessions : [] }),
  }; } };
  const loader = new Function('supabase', 'progressSummary', 'setReadingStatsByUserBookId', code + ';return loadReadingStatsForBooks;')(supabase, progressSummary, value => { result = value; });
  await loader(['page', 'kindle', 'audio'], progressByBook);
  assert.equal(result.page.progressPercent, 50);
  assert.equal(result.page.furthestPage, 50);
  assert.equal(result.page.lastEngagedAt, '2026-02-01');
  assert.equal(result.kindle.progressPercent, 25);
  assert.equal(result.audio.progressPercent, 50); // Latest audio position, including rewind.
  assert.equal(result.audio.lastEngagedAt, '2026-02-02');
  assert.deepEqual(queriedTables, ['user_book_reading_sessions']);
  assert.ok(Object.values(result).every(stats => !('averageMinutesPerPage' in stats)));
  assert.ok(Object.values(result).every(stats => !('wordsLookedUp' in stats)));
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
