const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const m = { exports: {} }; cache.set(file, m);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', source)(name => name.startsWith('@/') ? load(name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name), m, m.exports);
  return m.exports;
}
const { applyAddBookDestinations } = load('lib/books/addBookDestinations.ts');
const tracking = load('lib/personalTracking.ts');
let tables;
class Query {
  constructor(table) { this.table = table; this.filters = []; }
  select() { return this; }
  eq(key, value) { this.filters.push(row => row[key] === value); return this; }
  insert(row) { this.insertRow = row; return this; }
  update(patch) { this.patch = patch; return this; }
  maybeSingle() { return this; }
  single() { return this; }
  then(resolve, reject) {
    if (this.insertRow) tables[this.table].push({ id: `${this.table}-${tables[this.table].length}`, ...this.insertRow });
    const rows = tables[this.table].filter(row => this.filters.every(filter => filter(row)));
    if (this.patch) rows.forEach(row => Object.assign(row, this.patch));
    return Promise.resolve({ data: rows[0] ?? null, error: null }).then(resolve, reject);
  }
}
async function add(destinations) {
  return applyAddBookDestinations({ supabase: { from: table => new Query(table) }, authUserId: 'teacher', actorProfile: { role: 'teacher' }, bookId: 'book', input: { destinations } });
}
(async () => {
  for (const route of ['add-existing', 'add-by-isbn', 'add-manual']) {
    assert.ok(fs.readFileSync(path.join(root, `app/api/books/${route}/route.ts`), 'utf8').includes('await applyAddBookDestinations('), route);
  }
  tables = { user_books: [], teacher_books: [] };
  await add({ teachingBooks: true, myLibrary: false });
  assert.equal(tables.user_books[0].personal_tracking_status, 'not_tracking');
  assert.equal(tracking.isPersonalReadingTracked(tables.user_books[0]), false);
  assert.equal(tables.teacher_books[0].user_book_id, tables.user_books[0].id);
  await add({ teachingBooks: true, myLibrary: false });
  assert.equal(tables.user_books.length, 1); assert.equal(tables.teacher_books.length, 1);
  assert.equal(tables.user_books[0].personal_tracking_status, 'not_tracking');
  await add({ teachingBooks: true, myLibrary: true });
  assert.equal(tables.user_books[0].personal_tracking_status, 'want_to_read');
  assert.equal(tracking.isPersonalReadingTracked(tables.user_books[0]), true);
  for (const status of ['reading', 'finished', 'dnf']) {
    tables = { user_books: [{ id: 'existing', user_id: 'teacher', book_id: 'book', personal_tracking_status: status, started_at: '2026-01-01' }], teacher_books: [] };
    await add({ teachingBooks: true, myLibrary: false });
    assert.equal(tables.user_books[0].personal_tracking_status, status);
    assert.equal(tables.user_books[0].started_at, '2026-01-01');
  }
  tables = { user_books: [], teacher_books: [] };
  await add({ teachingBooks: true, myLibrary: true });
  assert.equal(tables.user_books[0].personal_tracking_status, 'want_to_read');
  assert.equal(tables.teacher_books.length, 1);
  assert.deepEqual([...tracking.PERSONAL_TRACKING_STATUSES], ['want_to_read', 'reading', 'finished', 'dnf', 'not_tracking']);
  assert.equal(tracking.personalTrackingStatusFromDates({ finishedAt: '2026-01-02' }), 'finished');
  assert.equal(tracking.personalTrackingStatusFromDates({ dnfAt: '2026-01-02' }), 'dnf');
  assert.equal(tracking.personalTrackingStatusFromDates({ startedAt: '2026-01-02' }), 'reading');
  assert.equal(tracking.personalTrackingStatusFromDates({}), 'want_to_read');
  console.log('PASS: teaching-only additions, repeated adds, both destinations, existing personal tracking preservation, personal-stats exclusion, and status ordering/restoration. Fixtures only; no live records changed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
