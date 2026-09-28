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
const progress = load('lib/books/readingProgress.ts');
const { summarizeBookProgress: summary, loadBookProgressSummary: fetchSummary } = load('lib/books/bookProgressSummary.ts', { './readingProgress': progress });
const data = {
  currentLocation: null,
  sessions: [
    { read_on: '2026-09-28', created_at: '2026-09-28', tracking_unit: 'page', end_page: 45, minutes_read: 28, session_mode: 'fluid', ending_phrase: '最後の言葉' },
    { read_on: '2026-09-27', tracking_unit: 'page', end_page: 30, minutes_read: 60, session_mode: 'listening' },
    { read_on: '2026-09-29', tracking_unit: 'page', end_page: 12, minutes_read: 200, is_filler: true },
  ],
  words: [
    { surface: 'あっさり', meaning: 'plain', page_number: 40, chapter_number: 1, chapter_name: 'First', created_at: '2026-09-28' },
    { surface: 'あっさり', meaning: 'plain', page_number: 39, chapter_number: 3, chapter_name: 'Third', created_at: '2026-09-27' },
    { surface: 'あっさり', meaning: 'easily', page_number: 38, created_at: '2026-09-26' },
  ],
};
test('compact summary combines reading/listening time, unique saved words and existing chapter semantics', () => {
  const result = summary(data, 'page', { page_count: 200 });
  assert.equal(result.progressSummaryLabel, '1h 28m · 2 saved words · Last read 2026-09-28');
  assert.equal(result.lastPageLabel, 'Page 45');
  assert.equal(result.lastSavedWordLabel, 'あっさり');
  assert.equal(result.lastChapterLabel, 'Third');
  assert.equal(result.lastReadPhrase, '最後の言葉');
  const restricted = summary(data, 'page', {}, false);
  assert.equal(restricted.lastSavedWordLabel, ''); assert.equal(restricted.lastChapterLabel, '');
  assert.ok(!restricted.progressSummaryLabel.includes('saved words'));
});
test('location and percent use the book method without inventing position from legacy page words', () => {
  const d = { ...data, sessions: [...data.sessions, { tracking_unit: 'kindle_location', end_position: 97, read_on: '2026-09-28' }] };
  assert.equal(summary(d, 'kindle_location', {}).lastPageLabel, 'Location 97');
  assert.equal(summary(data, 'kindle_location', {}).lastPageLabel, '');
  assert.equal(summary({ ...data, sessions: [{ tracking_unit: 'percent', end_position: 37 }] }, 'percent', {}).lastPageLabel, 'Percent 37%');
});
test('audiobook shows latest timeline position, duration and progress while minutes track actual listening', () => {
  const d = { ...data, words: [], sessions: [
    { id: '1', read_on: '2026-09-27', tracking_unit: 'audiobook_time', end_position: 90, minutes_read: 15, session_mode: 'listening' },
    { id: '2', read_on: '2026-09-28', tracking_unit: 'audiobook_time', end_position: 60, minutes_read: 20, session_mode: 'listening' },
  ] };
  const result = summary(d, 'audiobook_time', { audiobook_duration_minutes: 120 });
  assert.equal(result.lastPageLabel, '1 hr 0 min / 2 hr 0 min (50%)');
  assert.equal(result.progressSummaryLabel, '35m · 0 saved words · Last listened 2026-09-28');
  const legacy = { ...data, currentLocation: 'Chapter 8 · 3:12:45' };
  assert.equal(summary(legacy, 'page', {}, true, true).lastPageLabel, legacy.currentLocation);
  assert.equal(summary({ ...legacy, formatType: 'audiobook' }, 'page', {}).lastPageLabel, legacy.currentLocation);
});
test('loader scopes all reads to this copy and paginates beyond the database row limit', async () => {
  const calls = [];
  const client = { from(table) {
    const call = { table, scope: null }; calls.push(call);
    const q = { select() { return q; }, eq(key, value) { call.scope = [key, value]; return q; }, order() { return q; },
      async single() { return { data: { current_location: '01:00', format_type: 'audiobook' }, error: null }; },
      async range(start) { return { data: table === 'user_book_words' ? Array(start === 0 ? 500 : 1).fill({ surface: 'word' }) : [], error: null }; },
    }; return q;
  } };
  const result = await fetchSummary(client, 'copy-A');
  assert.equal(result.words.length, 501); assert.equal(result.currentLocation, '01:00');
  assert.ok(calls.every(c => c.scope[1] === 'copy-A'));
  assert.equal(calls.filter(c => c.table === 'user_book_words').length, 2);
  const denied = {
    from() {
      return {
        select() { return this; }, eq() { return this; }, order() { return this; },
        range() { return Promise.resolve({ error: new Error('denied') }); },
        single() { return Promise.resolve({ error: new Error('denied') }); },
      };
    },
  };
  await assert.rejects(fetchSummary(denied, 'other-copy'), /denied/);
});
test('shared bar uses provider data, refreshes on entry/focus and refuses another book’s state', () => {
  let effect, refreshes = 0; const listeners = {};
  const tracking = { userBookId: 'copy-A', method: 'page', totals: { page_count: 200 }, loaded: true, summaryData: data, summaryError: null, refreshSummary: async () => { refreshes++; } };
  const originalWindow = globalThis.window;
  globalThis.window = { addEventListener: (name, fn) => listeners[name] = fn, removeEventListener: name => delete listeners[name] };
  try {
    const Component = load('components/books/BookProgressSummaryBar.tsx', {
      react: { useEffect(fn) { effect = fn; } },
      './BookProgressProvider': { useBookProgress: () => tracking },
      '@/lib/books/bookProgressSummary': { summarizeBookProgress: summary },
      '@/app/(protected)/books/[userBookId]/components/BookHubProgressSummary': { default: 'ExistingProgressCard' },
    }).default;
    const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
    const tree = nodes(Component({ userBookId: 'copy-A' }));
    const card = tree.find(node => node.type === 'ExistingProgressCard');
    assert.equal(card.props.lastPageLabel, 'Page 45');
    assert.equal(card.props.showProgressSection, false);
    const cleanup = effect(); assert.equal(refreshes, 1);
    listeners.focus(); assert.equal(refreshes, 2); cleanup(); assert.equal(listeners.focus, undefined);
    assert.equal(Component({ userBookId: 'copy-B' }), null);
    effect(); assert.equal(refreshes, 2);
  } finally { globalThis.window = originalWindow; }
});
