import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const helperSource = fs.readFileSync('lib/vocabulary/loadAllPagedRows.ts', 'utf8');
const helperCode = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helperExports = {};
new Function('exports', helperCode)(helperExports);
const { loadAllPagedRows } = helperExports;
const pageSource = fs.readFileSync('app/(protected)/books/[userBookId]/words/page.tsx', 'utf8');

function makeRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `word-${String(index).padStart(5, '0')}`,
    chapter_number: index % 7 === 0 ? null : Math.floor(index / 200) + 1,
    chapter_name: index % 7 === 0 ? null : `Chapter ${Math.floor(index / 200) + 1}`,
    hidden: false,
  }));
}

function pagedReader(rows, { pageSize = 500, failAt = -1 } = {}) {
  const ranges = [];
  return {
    ranges,
    fetchPage: async (from, to) => {
      ranges.push([from, to]);
      if (from === failAt) return { data: null, error: new Error('page request failed'), count: rows.length };
      return { data: rows.slice(from, to + 1), error: null, count: rows.length };
    },
    pageSize,
  };
}

for (const count of [999, 1000, 1001, 3874]) {
  test(`retrieves all ${count} vocabulary rows in bounded, ordered pages`, async () => {
    const rows = makeRows(count);
    const reader = pagedReader(rows);
    const result = await loadAllPagedRows(reader.fetchPage, reader.pageSize);
    assert.deepEqual(result, rows);
    assert.equal(new Set(result.map((row) => row.id)).size, count);
    assert.deepEqual(result.map((row) => row.id), rows.map((row) => row.id));
    assert.ok(reader.ranges.every(([from, to]) => to - from + 1 === 500));
    assert.equal(reader.ranges.length, Math.ceil(count / 500));
  });
}

test('preserves chaptered and unassigned records in deterministic page order', async () => {
  const rows = makeRows(1203);
  const reader = pagedReader(rows);
  const loaded = await loadAllPagedRows(reader.fetchPage);
  assert.deepEqual(loaded, rows);
  assert.ok(loaded.some((row) => row.chapter_number === null));
  assert.ok(loaded.some((row) => row.chapter_number !== null));
});

test('fails rather than returning a partial list when a later page fails', async () => {
  const rows = makeRows(1300);
  const reader = pagedReader(rows, { failAt: 500 });
  await assert.rejects(loadAllPagedRows(reader.fetchPage), /page request failed/);
  assert.deepEqual(reader.ranges, [[0, 499], [500, 999]]);
});

test('rejects incomplete, changing, or duplicated page results', async () => {
  await assert.rejects(
    loadAllPagedRows(async () => ({ data: [{ id: 'one' }], error: null, count: 2 })),
    /complete vocabulary list/,
  );

  let calls = 0;
  await assert.rejects(
    loadAllPagedRows(async (from) => ({
      data: from === 0 ? [{ id: 'one' }] : [{ id: 'two' }],
      error: null,
      count: calls++ === 0 ? 2 : 3,
    }), 1),
    /changed while loading/,
  );

  await assert.rejects(
    loadAllPagedRows(async () => ({ data: [{ id: 'same' }, { id: 'same' }], error: null, count: 2 }), 2),
    /duplicate-free/,
  );
});

test('keeps page requests on the existing secure view with the existing book, visibility, and ordering rules', () => {
  const start = pageSource.indexOf('const rows = await loadAllPagedRows<WordRow>');
  const end = pageSource.indexOf('const list = (rows ?? []).map', start);
  const query = pageSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(query, /\.from\("personal_user_book_words"\)/);
  assert.match(query, /\.eq\("user_book_id", userBookId\)/);
  assert.match(query, /\.or\("hidden\.eq\.true,follow_along_hidden\.eq\.true,flashcard_hidden\.eq\.true"\)/);
  assert.match(query, /\.eq\("hidden", false\)/);
  assert.match(query, /\.order\("chapter_number"[\s\S]*?\.order\("page_number"[\s\S]*?\.order\("page_order"[\s\S]*?\.order\("created_at"[\s\S]*?\.order\("id"/);
  assert.match(query, /\.select\([\s\S]*?\{ count: "exact" \}[\s\S]*?\)/);
  assert.match(query, /\.range\(from, to\)/);
  assert.doesNotMatch(query, /\.from\("user_book_words"\)/);

  const bookLookupStart = pageSource.indexOf('.from("user_books")');
  const bookLookupEnd = pageSource.indexOf('const ownerUserId =', bookLookupStart);
  const bookLookup = pageSource.slice(bookLookupStart, bookLookupEnd);
  assert.match(bookLookup, /\.eq\("id", userBookId\)/);
  assert.match(pageSource, /if \(!isOwner && !isSuperTeacher && !isLinkedTeacher\)/);
});

test('chapter/search filtering and CSV export still consume the complete words collection', () => {
  const filterStart = pageSource.indexOf('const filtered = useMemo');
  const sortStart = pageSource.indexOf('const filteredSorted = useMemo', filterStart);
  const filter = pageSource.slice(filterStart, sortStart);
  assert.match(filter, /return words\.filter/);
  assert.match(filter, /chapterFilter !== "all"/);
  assert.match(filter, /hay\.includes\(q\)/);

  const exportStart = pageSource.indexOf('function handleExportVocabCsv');
  const exportEnd = pageSource.indexOf('\n  }', exportStart);
  const exportHandler = pageSource.slice(exportStart, exportEnd);
  const exportSelection = pageSource.slice(pageSource.indexOf('const exportWords = useMemo'), exportStart);
  assert.match(exportSelection, /words\.filter/);
  assert.match(exportSelection, /chapterMatches/);
  assert.match(exportSelection, /jlptMatches/);
  assert.match(exportHandler, /exportWords\.map/);
  assert.match(exportHandler, /\["Surface", "Reading", "Meaning", "Def #", "Chapter", "Position", "JLPT", "Common"\]/);
});
