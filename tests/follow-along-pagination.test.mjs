import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const page = fs.readFileSync('app/(protected)/books/[userBookId]/readalong/page.tsx', 'utf8');
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helper = {};
new Function('exports', compile(fs.readFileSync('lib/vocabulary/loadAllPagedRows.ts', 'utf8')))(helper);
// Execute the actual page's loading block, including error handling and support filter.
const start = page.indexOf('            try {\n                const rows = await loadAllPagedRows<ReadAlongWord>');
assert.ok(start >= 0);
const block = page.slice(start, page.indexOf('\n        }\n\n        loadWords();', start));
const support = page.slice(page.indexOf('function hasUsefulSupport('), page.indexOf('\nfunction normalizeJlpt'));
const run = new Function('supabase', 'loadAllPagedRows', 'userBookId', 'setWords', 'setWordsLoadError', 'setLoading', 'console',
  compile(`${support}\nasync function run() { ${block} }`) + '\nreturn run();');

function fixture(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `word-${String(i).padStart(5, '0')}`, user_book_id: 'book', hidden: false,
    surface: 'word', meaning: null, chapter_number: i % 2 ? 1 : null,
    page_number: i % 3 ? 1 : null, page_order: 1, created_at: 'same',
    follow_along_hidden: i === 1002,
  }));
}

async function load(rows, fault) {
  const calls = [];
  const state = { words: ['stale'], error: '', loading: true };
  const supabase = { from(table) {
    assert.equal(table, 'personal_user_book_words');
    const filters = [], orders = [];
    let bounds, options;
    const query = {
      select(_fields, opts) { options = opts; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      order(key, opts) { orders.push([key, opts]); return query; },
      range(from, to) { bounds = [from, to]; return query; },
      returns() {
        assert.deepEqual(filters, [['user_book_id', 'book'], ['hidden', false]]);
        assert.deepEqual(orders, [
          ['page_number', { ascending: true, nullsFirst: false }],
          ['page_order', { ascending: true, nullsFirst: false }],
          ['created_at', { ascending: true }], ['id', { ascending: true }],
        ]);
        assert.deepEqual(options, { count: 'exact' });
        calls.push(bounds);
        const eligible = rows.filter(row => filters.every(([key, value]) => row[key] === value));
        const [from, to] = bounds;
        const result = { data: eligible.slice(from, to + 1), count: eligible.length, error: null };
        return Promise.resolve(fault ? fault(result, from) : result);
      },
    };
    return query;
  }};
  await run(supabase, helper.loadAllPagedRows, 'book', value => { state.words = value; },
    value => { state.error = value; }, value => { state.loading = value; }, { error() {} });
  return { ...state, calls };
}

test('Follow-Along loads 1,205 words through the release helper with stable ordering', async () => {
  const rows = fixture(1205);
  const result = await load(rows);
  assert.deepEqual(result.words, rows);
  assert.deepEqual(result.calls, [[0, 499], [500, 999], [1000, 1499]]);
  assert.equal(result.error, '');
  assert.equal(result.loading, false);
});

test('preserves book/global visibility and support filtering without losing hidden or unplaced page structure', async () => {
  const rows = fixture(1205);
  rows[0].hidden = true;
  rows[1].user_book_id = 'other-book';
  rows[2].surface = ' '; // Neither surface nor meaning: filtered after complete loading.
  rows[3].surface = ''; rows[3].meaning = 'meaning-only';
  const result = await load(rows);
  assert.deepEqual(result.words, rows.slice(3));
  assert.ok(result.words.some(row => row.follow_along_hidden));
  assert.ok(result.words.some(row => row.page_number === null && row.chapter_number === null));
  const cards = fs.readFileSync('app/(protected)/books/[userBookId]/readalong/components/ReadAlongWordList.tsx', 'utf8');
  assert.match(cards, /if \(word.follow_along_hidden\) return null/);
  assert.match(page, /if \(selectedChapterKey === "all"\) return words/);
  assert.match(page, /words\.filter\(\(word\) => chapterKeyForWord\(word\) === selectedChapterKey\)/);
  // The unchanged secure view, rather than raw user_book_words, supplies finalization rules.
  const view = fs.readFileSync('sql/20261014_personal_word_visibility.sql', 'utf8');
  assert.match(view, /from public\.finalized_user_book_words w/);
});

for (const failure of ['error', 'incomplete', 'count-change', 'duplicate']) {
  test(`a later-page ${failure} clears stale rows and reports failure`, async () => {
    const result = await load(fixture(1205), (response, from) => {
      if (from !== 500) return response;
      if (failure === 'error') response.error = new Error('failed page');
      if (failure === 'incomplete') response.data.pop();
      if (failure === 'count-change') response.count++;
      if (failure === 'duplicate') response.data[0] = fixture(1)[0];
      return response;
    });
    assert.deepEqual(result.words, []);
    assert.match(result.error, /Could not load the complete Follow-Along vocabulary/);
    assert.equal(result.loading, false);
  });
}

test('load failure has a visible alert and retry, separate from empty vocabulary', () => {
  assert.match(page, /if \(wordsLoadError\) \{[\s\S]*?role="alert"[\s\S]*?window\.location\.reload\(\)/);
  assert.match(page, /setLoading\(true\);\s*setWordsLoadError\(""\)/);
});
