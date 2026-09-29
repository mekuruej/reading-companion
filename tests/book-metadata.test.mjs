import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
function load(file, mocks = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts', mocks);
    if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'), mocks);
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const { missingCoreBookFields, EDITION_FORMAT_OPTIONS } = load('lib/books/bookMetadata.ts');
const core = { title: 'A book', author: 'An author', language_code: 'en', edition_format: 'audiobook' };
test('only four core fields are required for every format', () => {
  for (const { value } of EDITION_FORMAT_OPTIONS) assert.deepEqual(missingCoreBookFields({ ...core, edition_format: value }), []);
  for (const [key, label] of [['title', 'title'], ['author', 'author'], ['language_code', 'language'], ['edition_format', 'format']]) {
    assert.deepEqual(missingCoreBookFields({ ...core, [key]: '' }), [label]);
  }
  assert.deepEqual(missingCoreBookFields({ ...core, language_code: 'unknown' }), ['language']);
});
test('narrator appears only for audio; the four core controls are required', () => {
  const Fields = load('components/books/EditionCoreFields.tsx').default;
  const nodes = t => !t || typeof t !== 'object' ? [] : Array.isArray(t) ? t.flatMap(nodes) : [t, ...nodes(t.props?.children)];
  for (const editionFormat of ['audiobook', 'ebook', 'paperback']) {
    const tree = nodes(Fields({ title: '', author: '', languageCode: '', editionFormat, narrator: 'Narrator' }));
    const inputs = tree.filter(n => n.type === 'input' || n.type === 'select');
    assert.equal(inputs.filter(n => n.props.required).length, 4);
    assert.equal(inputs.some(n => n.props.value === 'Narrator'), editionFormat === 'audiobook');
  }
});
function routeHarness(file, lookup = null, existing = null) {
  const inserted = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'actor' } } }) },
    from(table) {
      let payload;
      const q = {
        select() { return q; }, eq() { return q; }, ilike() { return q; }, limit() { return q; },
        insert(value) { payload = value; inserted.push({ table, value }); return q; },
        maybeSingle: async () => ({ data: table === 'profiles' ? { role: 'admin' } : existing }),
        single: async () => ({ data: payload ? { id: 'new-book' } : null }),
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
      };
      return q;
    },
  };
  const route = load(file, {
    '@supabase/supabase-js': { createClient: () => client },
    '@/lib/teacher/targetUserAccess': { canTeachTargetUser: async () => true },
    '@/lib/books/addBookDestinations': { applyAddBookDestinations: async () => ({ userBookId: 'copy' }) },
    '@/lib/teacher/studentLessonBooks': { StudentLessonBookError: class extends Error {}, ensureStudentLessonBook: async () => null },
    '@/lib/books/bookLookup': { lookupNormalizedExternalBookByIsbn13: async () => lookup },
  });
  return { inserted, post: body => route.POST(new Request('https://example.invalid/add', { method: 'POST', headers: { authorization: 'Bearer fake' }, body: JSON.stringify(body) })) };
}
test('manual backend creates each format with no identifiers or totals and keeps narrator optional', async () => {
  for (const { value } of EDITION_FORMAT_OPTIONS) {
    const h = routeHarness('app/api/books/add-manual/route.ts');
    const response = await h.post({ ...core, edition_format: value, narrator: 'A Narrator', confirmDifferentEdition: true });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(h.inserted[0].value.narrator, value === 'audiobook' ? 'A Narrator' : null);
    assert.equal(h.inserted[0].value.isbn13, null);
  }
  const h = routeHarness('app/api/books/add-manual/route.ts');
  assert.equal((await h.post({ ...core, author: '', isbn13: '9780306406157' })).status, 400);
  assert.equal(h.inserted.length, 0);
});
test('ISBN import can use user-supplied core details even when lookup returns no metadata', async () => {
  const h = routeHarness('app/api/books/add-by-isbn/route.ts');
  const response = await h.post({ ...core, editionFormat: 'audiobook', isbn13: '9780306406157', narrator: 'Reader' });
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  assert.equal(h.inserted[0].value.narrator, 'Reader');
  assert.equal(h.inserted[0].value.title, 'A book');
  assert.equal(h.inserted[0].value.isbn13, '9780306406157');
  const invalid = routeHarness('app/api/books/add-by-isbn/route.ts');
  assert.equal((await invalid.post({ isbn13: '9780306406157', title: 'Only a title' })).status, 400);
  assert.equal(invalid.inserted.length, 0);
});
test('ISBN enrichment preserves supplied rich metadata and does not require narrator', async () => {
  const lookup = { title: 'Imported', author_display: 'Author', language_code: 'en',
    edition_format: 'audiobook', publisher: 'Publisher', published_date: '2026-01-01',
    cover_url: 'https://example.invalid/cover.png', page_count: null };
  const h = routeHarness('app/api/books/add-by-isbn/route.ts', lookup);
  const response = await h.post({ isbn13: '9780306406157' });
  assert.equal(response.status, 200);
  assert.equal(h.inserted[0].value.narrator, null);
  for (const field of ['publisher', 'published_date', 'cover_url']) assert.equal(h.inserted[0].value[field], lookup[field]);
});
test('identifier reuse cannot silently select a different edition format', async () => {
  for (const route of ['add-manual', 'add-by-isbn']) {
    const h = routeHarness(`app/api/books/${route}/route.ts`, null, { id: 'print-book', edition_format: 'paperback' });
    const response = await h.post({ ...core, editionFormat: 'audiobook', isbn13: '9780306406157' });
    assert.equal(response.status, 409);
    assert.equal(h.inserted.length, 0);
  }
});
test('migration accepts core-only editions, preserves legacy/rich records and rejects missing core fields', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`create table books(id serial primary key,title text,author text,language_code text,edition_format text,isbn13 text,page_count integer,publisher text);
      insert into books(title) values('Legacy');
      insert into books(title,author,language_code,edition_format,isbn13,page_count,publisher) values('Rich','Author','ja','paperback','9780306406157',300,'Publisher');`);
    const before = (await db.query('select * from books where id=2')).rows[0];
    const migration = fs.readFileSync(path.join(root, 'sql/20260929_book_core_metadata_and_narrator.sql'), 'utf8');
    await db.exec(migration); await db.exec(migration);
    for (const { value } of EDITION_FORMAT_OPTIONS) await db.query('insert into books(title,author,language_code,edition_format) values($1,$2,$3,$4)', ['Book', 'Author', 'en', value]);
    for (const field of ['title', 'author', 'language_code', 'edition_format']) {
      const value = { ...core, [field]: null };
      await assert.rejects(db.query('insert into books(title,author,language_code,edition_format) values($1,$2,$3,$4)', [value.title, value.author, value.language_code, value.edition_format]), /required/);
      await assert.rejects(db.exec(`update books set ${field}=null where id=2`), /required/);
    }
    await db.exec("update books set publisher='Enriched later' where id=1");
    const after = (await db.query('select * from books where id=2')).rows[0];
    assert.deepEqual(after, { ...before, narrator: null });
    await db.exec("update books set narrator='Reader' where edition_format='audiobook'");
    assert.equal((await db.query("select narrator from books where edition_format='audiobook'")).rows[0].narrator, 'Reader');
  } finally { await db.close(); }
});

test('legacy exception flags neither require optional metadata nor bypass core fields', () => {
  const { missingGlobalBookFields } = load('app/(protected)/teacher/books/_shared/bookAttentionHelpers.ts', {
    '@/lib/supabaseClient': { supabase: {} },
  });
  for (const flag of [false, true, null]) {
    const book = { ...core, allow_missing_isbn: flag, allow_missing_publisher: flag, missing_info_cleared_at: '2026-01-01' };
    assert.deepEqual(missingGlobalBookFields(book), []);
    assert.deepEqual(missingGlobalBookFields({ ...book, author: '', edition_format: '' }), ['author', 'format']);
  }
});

test('catalog detail editor uses the edited format and passes narrator changes to its owner', () => {
  const Details = load('app/(protected)/books/[userBookId]/components/tabs/BookInfoDetailsSection.tsx', {
    '@/components/books/AudioTimeInput': { default: () => null },
    '@/lib/books/readingProgress': { formatAudioTime: () => '' },
  }).default;
  const nodes = t => !t || typeof t !== 'object' ? [] : Array.isArray(t) ? t.flatMap(nodes) : [t, ...nodes(t.props?.children)];
  let saved;
  const props = { book: { ...core, edition_format: 'paperback' }, isEditingBookInfo: true,
    editionFormat: 'audiobook', narrator: 'Reader', setNarrator: value => { saved = value; },
    BOOK_TYPE_OPTIONS: [], Detail: () => null };
  const narrator = nodes(Details(props)).find(n => n.props?.label === 'Narrator (optional)');
  assert.equal(narrator.props.inputValue, 'Reader');
  narrator.props.setInputValue('Updated reader');
  assert.equal(saved, 'Updated reader');
  assert.equal(nodes(Details({ ...props, editionFormat: 'ebook' })).some(n => n.props?.label === 'Narrator (optional)'), false);
});
