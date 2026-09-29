import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
function load(file, client) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@supabase/supabase-js') return { createClient: () => client };
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts', client);
    if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'), client);
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const time = '2026-09-29T00:00:00Z';
const book = (n, format) => ({ id: id(n), title: `Book ${n}`, edition_format: format, updated_at: time, isbn13: 'existing-isbn', page_count: 200 });
function harness(initial, profile = { role: 'admin' }) {
  const books = structuredClone(initial), writes = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'actor' } } }) },
    from(table) {
      const filters = []; let patch;
      const q = {
        select() { return q; }, order() { return q; },
        eq(key, value) { filters.push([key, value]); return q; },
        is(key, value) { filters.push([key, value]); return q; },
        update(value) { patch = value; return q; },
        range: async (start, end) => ({ data: books.slice(start, end + 1) }),
        async maybeSingle() {
          if (table === 'profiles') return { data: profile };
          const record = books.find(item => filters.every(([key, value]) => item[key] === value));
          if (!record) return { data: null };
          if (patch) { writes.push({ table, patch }); Object.assign(record, patch); }
          return { data: { id: record.id } };
        },
      };
      return q;
    },
  };
  const route = load('app/api/admin/book-formats/route.ts', client);
  const request = (method, changes, auth = true) => new Request('http://localhost/api/admin/book-formats', {
    method, headers: auth ? { Authorization: 'Bearer test' } : {},
    ...(changes === undefined ? {} : { body: JSON.stringify({ changes }) }),
  });
  return { books, writes, get: (auth = true) => route.GET(request('GET', undefined, auth)), patch: changes => route.PATCH(request('PATCH', changes)) };
}
const correction = (n, previousFormat = null, format = 'ebook') => ({ id: id(n), previousFormat, format, updatedAt: time });
test('backlog pages past row limits and includes only exact noncanonical values', async () => {
  const h = harness([...Array.from({ length: 501 }, (_, n) => book(n, 'paperback')), book(501, null), book(502, 'Paperback'), book(503, '')]);
  const result = await (await h.get()).json();
  assert.deepEqual(result.counts, { total: 504, valid: 501, missing: 2, legacy: 1 });
  assert.deepEqual(new Set(result.items.map(b => b.id)), new Set([id(501), id(502), id(503)]));
});
test('ordinary teachers and unsigned requests cannot read or write catalog cleanup', async () => {
  const h = harness([book(1, null)], { role: 'teacher', is_super_teacher: false });
  assert.equal((await h.get(false)).status, 401);
  assert.equal((await h.get()).status, 403);
  assert.equal((await h.patch([correction(1)])).status, 403);
  assert.deepEqual(h.writes, []);
});
test('admin and explicit super-teacher permissions work, truthy false text does not', async () => {
  for (const profile of [{ role: 'admin' }, { role: 'super_teacher' }, { role: 'teacher', is_super_teacher: true }]) {
    assert.equal((await harness([], profile).get()).status, 200);
  }
  assert.equal((await harness([], { role: 'teacher', is_super_teacher: 'false' }).get()).status, 403);
});
test('batch saves only format and removes corrected rows from subsequent loads', async () => {
  const h = harness([book(1, null), book(2, 'Kindle Edition'), book(3, 'paperback')]);
  const result = await (await h.patch([correction(1), correction(2, 'Kindle Edition', 'audiobook')])).json();
  assert.deepEqual(result, { saved: [id(1), id(2)], failed: [] });
  assert.equal(h.books[0].isbn13, 'existing-isbn'); assert.equal(h.books[0].page_count, 200);
  assert.equal(h.books[2].edition_format, 'paperback');
  assert.ok(h.writes.every(w => w.table === 'books' && Object.keys(w.patch).join() === 'edition_format'));
  assert.equal((await (await h.get()).json()).items.length, 0);
});
test('stale records cannot overwrite another correction or metadata edit; batch reports partial results', async () => {
  const h = harness([book(1, 'hardcover'), { ...book(2, null), updated_at: 'newer' }, book(3, null)]);
  const result = await (await h.patch([correction(1), correction(2), correction(3)])).json();
  assert.deepEqual(result.saved, [id(3)]); assert.equal(result.failed.length, 2);
  assert.equal(h.books[0].edition_format, 'hardcover'); assert.equal(h.books[1].edition_format, null);
});
test('valid records, free-text format, malformed IDs, duplicates and oversized batches are rejected before any write', async () => {
  for (const changes of [[correction(1, 'paperback')], [correction(1, null, 'Kindle')], [{ ...correction(1), id: 'bad' }],
    [correction(1), correction(1)], Array.from({ length: 101 }, (_, n) => correction(n)), [{ ...correction(1), previousFormat: undefined }]]) {
    const h = harness([book(1, null)]);
    assert.equal((await h.patch(changes)).status, 400); assert.deepEqual(h.writes, []);
  }
});

test('format-only correction works on legacy rows with other missing fields and leaves metadata intact', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`create table books(id uuid primary key,title text,author text,language_code text,edition_format text,isbn13 text,page_count integer,updated_at timestamptz);
      insert into books values('${id(1)}','Legacy',null,null,null,'same-isbn',200,'2026-09-29T00:00:00Z');`);
    await db.exec(fs.readFileSync(path.join(root, 'sql/20260929_book_core_metadata_and_narrator.sql'), 'utf8'));
    const before = (await db.query('select * from books')).rows[0];
    const result = await db.query('update books set edition_format=$1 where id=$2 and updated_at=$3 and edition_format is null returning id', ['ebook', id(1), time]);
    assert.equal(result.rows.length, 1);
    const after = (await db.query('select * from books')).rows[0];
    assert.deepEqual(after, { ...before, edition_format: 'ebook' });
    const stale = await db.query('update books set edition_format=$1 where id=$2 and updated_at=$3 and edition_format is null returning id', ['paperback', id(1), time]);
    assert.equal(stale.rows.length, 0);
  } finally { await db.close(); }
});
