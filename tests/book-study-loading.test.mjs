import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const page = fs.readFileSync('app/(protected)/books/[userBookId]/study/page.tsx', 'utf8');
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function moduleExports(path) {
  const exports = {};
  new Function('exports', compile(fs.readFileSync(path, 'utf8')))(exports);
  return exports;
}
const paging = moduleExports('lib/vocabulary/loadAllPagedRows.ts');
const eligibility = moduleExports('lib/wordSupportEligibility.ts');
const senses = moduleExports('lib/studySenseIdentity.ts');
const position = moduleExports('lib/vocabulary/wordPosition.ts');
const ast = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function sourceFunction(name) {
  const node = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, name);
  return node.getText(ast);
}
const helpers = ['normalizeJlpt', 'chapterInfoFromRow', 'cardEncounters', 'matchesCardLocation',
  'asStringArray', 'normalizeRepeatKey', 'hasKanji'].map(sourceFunction).join('\n');
const location = new Function('wordPositionText', compile(helpers) + '\nreturn { cardEncounters, matchesCardLocation };')(position.wordPositionText);
const start = page.indexOf('        const totalCounts =');
const end = page.indexOf('\n    }\n\n    loadData();', start);
assert.ok(start > 0 && end > start);
const block = page.slice(start, end);
const setters = [...new Set(block.match(/\bset[A-Z]\w+/g))];
const constants = { ...paging, ...eligibility, ...senses, ...position,
  // The production key uses trimmed surface and reading (no kana normalization).
  makeLibraryStudyColorKey: (word, reading) => `${(word ?? '').trim()}|||${(reading ?? '').trim()}`,
};
const args = [...Object.keys(constants), 'supabase', 'ownerUserId', 'loadedLanguageCode', 'userBookId', ...setters];
// Execute the page's real loaders, card construction, selectors and failure handlers.
const run = new Function(...args, compile(`${helpers}\nasync function run() { try { ${block}\n}\n`) + '\nreturn run();');
const today = new Date().toISOString().slice(0, 10);
function fixture(count, language = 'ja') {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${String(i).padStart(5, '0')}`, user_book_id: 'book',
    surface: `漢字${i}`, reading: `かな${i}`, meaning: `meaning ${i}`, meaning_choice_index: 0,
    chapter_number: i < 1000 ? 1 : 205, chapter_name: null,
    page_number: i < 1000 ? 1 : 211, position_unit: 'page', position_value: i < 1000 ? 1 : 211,
    created_at: 'same', hidden: false, flashcard_hidden: false, follow_along_hidden: false,
    skipped_on: null, target_language_code: language, excluded_from_flashcards: false,
  }));
}
async function load(rows, { language = 'ja', fault, books = [{ id: 'book', user_id: 'owner' }] } = {}) {
  const calls = [], state = {}, history = [];
  for (const setter of setters) state[setter] = ['stale'];
  const supabase = { auth: { getSession: async () => ({ data: { session: null } }) }, from(table) {
    assert.ok(['user_books', 'personal_user_book_words', 'study_visible_user_book_words'].includes(table));
    const filters = [], orders = [];
    let bounds, options;
    const query = {
      select(_fields, opts) { options = opts; return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      in(key, values) { filters.push(row => values.includes(row[key])); return query; },
      or(expression) {
        if (expression === 'target_language_code.is.null,target_language_code.eq.ja') {
          filters.push(row => row.target_language_code == null || row.target_language_code === 'ja');
        } else {
          assert.equal(expression, `skipped_on.is.null,skipped_on.neq.${today}`);
          filters.push(row => row.skipped_on == null || row.skipped_on !== today);
        }
        return query;
      },
      order(key, options) { orders.push([key, options]); return query; },
      range(from, to) { bounds = [from, to]; return query; },
      returns() { return query; },
      then(resolve, reject) {
        assert.deepEqual(options, { count: 'exact' });
        assert.deepEqual(orders, (table === 'user_books' ? ['id'] : ['page_number', 'created_at', 'id'])
          .map(key => [key, { ascending: true }]));
        assert.ok(bounds, 'must explicitly request a page');
        const [from, to] = bounds;
        assert.equal(to - from, 499);
        let candidates = table === 'user_books' ? books : rows;
        if (table === 'study_visible_user_book_words') candidates = candidates.filter(row => !row.flashcard_hidden);
        candidates = candidates.filter(row => filters.every(filter => filter(row)));
        candidates = [...candidates].sort((a, b) => {
          for (const [key] of orders) {
            if (a[key] === b[key]) continue;
            if (a[key] == null) return 1;
            if (b[key] == null) return -1;
            return a[key] < b[key] ? -1 : 1;
          }
          return 0;
        });
        calls.push({ table, from, to });
        let result = { data: candidates.slice(from, to + 1), count: candidates.length, error: null };
        if (fault) result = fault(result, table, from);
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  }};
  await run(...Object.values(constants), supabase, 'owner', language, 'book', ...setters.map(name => value => {
    state[name] = value; history.push([name, value]);
  }));
  return { state, calls, history };
}

for (const count of [999, 1000, 1001, 1507]) {
  for (const language of ['ja', 'en']) {
    test(`${language}: loads all ${count} records, including equal ordering values`, async () => {
      const rows = fixture(count, language).reverse();
      const { state, calls } = await load(rows, { language });
      assert.equal(state.setCards.length, count);
      assert.equal(state.setFilteredCards.length, count);
      assert.equal(state.setLoading, false);
      assert.deepEqual(state.setErrorMsg, ['stale']); // No error setter call on success.
      const tables = language === 'ja' ? ['personal_user_book_words', 'study_visible_user_book_words'] : ['study_visible_user_book_words'];
      for (const table of tables) assert.equal(calls.filter(c => c.table === table).length, Math.ceil(count / 500));
      if (language === 'ja') assert.equal(state.setLibraryCards.length, count);
    });
  }
}

test('later duplicate-only chapters/pages retain one card per sense and match the same encounter', async () => {
  const rows = fixture(1507);
  rows.forEach(row => { row.surface = '漢字'; row.reading = 'かんじ'; });
  rows[1506].meaning_choice_index = 1; // Another sense remains a separate card.
  rows[1000].chapter_number = 204; rows[1000].page_number = 210; rows[1000].position_value = 210;
  const { state } = await load(rows);
  assert.equal(state.setCards.length, 2);
  const card = state.setCards[0];
  assert.equal(card.visibilityEntries.length, 1506);
  assert.deepEqual(state.setChapterOptions.map(o => o.value), ['ch1', 'ch204', 'ch205']);
  assert.deepEqual(state.setPageOptions, ['Page 1', 'Page 210', 'Page 211']);
  for (const [chapter, page, expected] of [['ch205', '211', true], ['ch204', 'Page 210', true],
    ['ch204', 'Page 211', false], ['all', '211', true], ['ch205', 'all', true], ['ch206', 'all', false]]) {
    assert.equal(location.matchesCardLocation(card, chapter, page), expected);
  }
  assert.match(page, /result = result\.filter\(card => matchesCardLocation\(card, chapterFilter, pageFilter\)\)/);
});

test('hidden, skipped and ineligible later repeats cannot introduce locations', async () => {
  const rows = fixture(6);
  rows.forEach((row, i) => {
    row.surface = '漢字'; row.reading = 'かんじ';
    row.chapter_number = i + 1; row.page_number = i + 1; row.position_value = i + 1;
  });
  rows[1].flashcard_hidden = true; rows[2].hidden = true;
  rows[3].skipped_on = today; rows[4].excluded_from_flashcards = true;
  rows[5].follow_along_hidden = true; // Does not hide a study encounter.
  const { state } = await load(rows);
  assert.equal(state.setCards.length, 1);
  assert.deepEqual(state.setChapterOptions.map(option => option.value), ['ch1', 'ch6']);
  assert.deepEqual(state.setPageOptions, ['Page 1', 'Page 6']);
  assert.equal(location.matchesCardLocation(state.setCards[0], 'ch2', 'all'), false);
});

test('unplaced cards and non-page positions use the existing position rules', () => {
  const first = { chapterLabel: '(none)', page_number: null };
  const later = { chapterLabel: 'ch2', position_unit: 'kindle_location', position_value: 211 };
  const card = { ...first, visibilityEntries: [first, later] };
  assert.equal(location.matchesCardLocation(card, 'all', 'all'), true);
  assert.equal(location.matchesCardLocation(card, 'ch2', 'Location 211'), true);
  assert.equal(location.matchesCardLocation(card, 'ch2', 'Page 211'), false);
  assert.equal(location.matchesCardLocation(first, '(none)', 'all'), true);
});

test('Japanese visibility, skip, language, legacy reading-only eligibility and library behavior are preserved', async () => {
  const rows = fixture(12);
  rows[0].hidden = true; rows[1].flashcard_hidden = true; rows[2].skipped_on = today;
  rows[3].target_language_code = 'en'; rows[4].target_language_code = null;
  rows[5].excluded_from_flashcards = true;
  rows[6].excluded_from_flashcards = true; rows[6].meaning = ''; // Legacy reading-only exception.
  rows[7].follow_along_hidden = true; rows[8].user_book_id = 'other';
  rows[9].skipped_on = '2000-01-01'; rows[10].hidden = null;
  rows[11].reading = ''; // Load eligibility unchanged; reading mode excludes it later.
  const { state } = await load(rows);
  assert.deepEqual(state.setCards.map(c => c.id), [4, 6, 7, 9, 11].map(i => rows[i].id));
  assert.deepEqual(state.setLibraryCards.map(c => c.id), [2, 4, 6, 7, 9, 11].map(i => rows[i].id));
  assert.equal(eligibility.canStudyWord(state.setCards.at(-1), 'READING'), false);
  assert.equal(eligibility.canStudyWord(state.setCards.find(c => c.id === rows[6].id), 'MEANING_MC'), false);
});

test('English retains exact language/excluded flags, surface and meaning requirements, and skip/visibility behavior', async () => {
  const rows = fixture(10, 'en');
  rows[0].target_language_code = null; rows[1].target_language_code = 'ja';
  rows[2].excluded_from_flashcards = true; rows[3].surface = ' '; rows[4].meaning = ' ';
  rows[5].reading = null; rows[6].hidden = true; rows[7].flashcard_hidden = true;
  rows[8].skipped_on = today; rows[9].follow_along_hidden = true;
  const { state } = await load(rows, { language: 'en' });
  assert.deepEqual(state.setCards.map(c => c.id), [rows[5].id, rows[9].id]);
});

for (const table of ['user_books', 'personal_user_book_words', 'study_visible_user_book_words']) {
  for (const failure of ['error', 'short-page', 'count-change', 'duplicate', 'missing-count']) {
    test(`${table}: later-page ${failure} clears every pool and selector`, async () => {
      const books = Array.from({ length: 1001 }, (_, i) => ({ id: i ? `book-${i}` : 'book', user_id: 'owner' }));
      const { state } = await load(fixture(1507), { books, fault(result, current, from) {
        if (current !== table || from !== 500) return result;
        if (failure === 'error') result.error = new Error('page failed');
        if (failure === 'short-page') result.data.pop();
        if (failure === 'count-change') result.count++;
        if (failure === 'duplicate') result.data[1] = result.data[0];
        if (failure === 'missing-count') result.count = null;
        return result;
      }});
      for (const name of ['setCards', 'setFilteredCards', 'setLibraryCards', 'setChapterOptions', 'setPageOptions']) {
        assert.deepEqual(state[name], []);
      }
      assert.equal(typeof state.setErrorMsg, 'string');
      assert.equal(state.setLoading, false);
    });
  }
}

test('English pagination failure clears stale cards and selectors', async () => {
  const { state } = await load(fixture(1001, 'en'), { language: 'en', fault(result, _table, from) {
    return from === 1000 ? { ...result, error: new Error('last page failed') } : result;
  }});
  assert.deepEqual(state.setCards, []);
  assert.deepEqual(state.setFilteredCards, []);
  assert.deepEqual(state.setPageOptions, []);
  assert.equal(state.setLoading, false);
});

test('library book-ID pagination includes vocabulary owned through a later book', async () => {
  const books = Array.from({ length: 1001 }, (_, i) => ({ id: i ? `book-${String(i).padStart(4, '0')}` : 'book', user_id: 'owner' }));
  const rows = fixture(2); rows[1].user_book_id = books.at(-1).id;
  const { state, calls } = await load(rows, { books });
  assert.equal(calls.filter(c => c.table === 'user_books').length, 3);
  assert.equal(state.setLibraryCards.length, 2);
  assert.equal(state.setCards.length, 1);
});

// Opt-in local, read-only reference. No personal vocabulary is checked into the repository.
test('diagnosed Production book: 1108 encounters / 1042 cards / 1029 reading cards', {
  skip: !process.env.BOOK_STUDY_REFERENCE_JSON,
}, async () => {
  const { server } = JSON.parse(fs.readFileSync(process.env.BOOK_STUDY_REFERENCE_JSON, 'utf8'));
  assert.equal(server.length, 1108);
  const { state } = await load(server.map(row => ({ ...row, user_book_id: 'book' })));
  assert.equal(state.setCards.length, 1042);
  const reading = state.setCards.filter(c => /[\p{Script=Han}]/u.test(c.word) && eligibility.canStudyWord(c, 'READING'));
  assert.equal(reading.length, 1029);
  assert.ok(state.setChapterOptions.some(c => c.value.startsWith('ch204::')));
  assert.ok(state.setChapterOptions.some(c => c.value.startsWith('ch205::')));
  assert.ok(state.setPageOptions.includes('Page 211'));
});
