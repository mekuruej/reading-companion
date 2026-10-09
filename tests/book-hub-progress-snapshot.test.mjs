import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('lib/books/bookHubLearningSnapshot.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function('exports', code)(exports);
const { countReviewedBookWords, readingTimeLabel, loadReviewedBookWordCount } = exports;

const words = [
  { id: 'a', surface: '読む', reading: 'ヨム', meaning: 'read' },
  { id: 'a2', surface: '読む', reading: 'よむ', meaning: 'read' },
  { id: 'b', surface: '本', reading: 'ほん', meaning: 'book' },
  { id: 'c', surface: '猫', reading: 'ねこ', meaning: 'cat' },
];

test('reviewed count intersects this book vocabulary and deduplicates encounters and repeated reviews', () => {
  assert.equal(countReviewedBookWords(words, [{ user_book_word_id: 'a' }, { user_book_word_id: 'a2' }, { user_book_word_id: 'elsewhere' }], [
    { study_identity_key: '本||ほん', last_studied_at: '2026-10-09' },
    { study_identity_key: '猫||ねこ', last_studied_at: null },
    { study_identity_key: '読む||よむ', last_studied_at: '2026-10-09' },
  ]), 2);
  assert.equal(countReviewedBookWords(words, [], []), 0);
  assert.equal(countReviewedBookWords([], [{ user_book_word_id: 'a' }], []), 0);
});

test('Library Review matches the existing kana identity without collapsing long vowels', () => {
  const rows = [{ id: 'x', surface: 'コート', reading: 'コート', meaning: 'coat' }];
  assert.equal(countReviewedBookWords(rows, [], [{ study_identity_key: 'コート||こーと', last_studied_at: 'today' }]), 1);
  assert.equal(countReviewedBookWords(rows, [], [{ study_identity_key: 'コート||こと', last_studied_at: 'today' }]), 0);
});

test('reading time is human-readable and missing timed evidence stays unavailable', () => {
  assert.equal(readingTimeLabel(38), '38 min');
  assert.equal(readingTimeLabel(84), '1 hr 24 min');
  assert.equal(readingTimeLabel(120), '2 hr');
  assert.equal(readingTimeLabel(0), '—');
});

test('review loader scopes evidence to owner/book, pages results, and propagates failures', async () => {
  const queries = [];
  const client = { from(table) {
    const steps = [];
    queries.push({ table, steps });
    const query = {};
    for (const method of ['select', 'eq', 'in', 'not', 'order', 'range']) {
      query[method] = (...args) => { steps.push([method, ...args]); return query; };
    }
    query.then = resolve => Promise.resolve({
      data: table === 'user_book_words' ? words : table === 'study_logs' ? [{ user_book_word_id: 'b' }] : [],
      error: null,
    }).then(resolve);
    return query;
  } };
  assert.equal(await loadReviewedBookWordCount(client, 'book', 'owner'), 1);
  const failingClient = { from() {
    const query = {};
    for (const method of ['select', 'eq', 'order', 'range']) query[method] = () => query;
    query.then = resolve => Promise.resolve({ data: null, error: new Error('not authorized') }).then(resolve);
    return query;
  } };
  await assert.rejects(loadReviewedBookWordCount(failingClient, 'book', 'owner'), /not authorized/);

  for (const query of queries) {
    assert.ok(query.steps.some(step => step[0] === 'range'));
    assert.ok(query.steps.some(step => step[0] === 'eq' && step[1] === (query.table === 'user_book_words' ? 'user_book_id' : 'user_id') && step[2] === (query.table === 'user_book_words' ? 'book' : 'owner')));
  }
});

test('snapshot switch is local presentation and Book Hub supplies exactly three reading and learning metrics', () => {
  const page = fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8');
  const component = fs.readFileSync('app/(protected)/books/[userBookId]/components/BookHubProgressSummary.tsx', 'utf8');
  const reading = page.slice(page.indexOf('const bookHubSummaryStats ='), page.indexOf('const bookHubLearningStats ='));
  const learning = page.slice(page.indexOf('const bookHubLearningStats ='), page.indexOf('useEffect(() => {', page.indexOf('const bookHubLearningStats =')));
  assert.equal((reading.match(/label:/g) || []).length, 3);
  assert.equal((learning.match(/label:/g) || []).length, 3);
  assert.match(component, /useState<"reading" \| "learning">\("reading"\)/);
  assert.match(component, /}, 15000\)/);
  assert.match(component, /snapshotHovered \|\| snapshotFocused/);
  assert.match(component, /window.clearInterval\(rotation\)/);
  assert.match(component, /onMouseEnter=[^\n]*setSnapshotHovered\(true\)/);
  assert.match(component, /onFocusCapture=[^\n]*setSnapshotFocused\(true\)/);
  assert.match(component, /col-start-1 row-start-1/);
  assert.match(component, /aria-hidden=\{snapshotView !== view\}/);
  assert.match(component, /view === "reading" \? "Reading Snapshot" : "Learning Snapshot"/);
  assert.doesNotMatch(component, /aria-pressed|setSnapshotView\(view\)/);
  assert.match(page, /learningStats=\{canSeeVocabularySummary && isJapaneseLearningBook/);
});

test('calm fifteen-second rotation fades out before changing content and pauses for hover/focus', () => {
  const filename = 'app/(protected)/books/[userBookId]/components/BookHubProgressSummary.tsx';
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  function mount({ learning = true, hovered = false, focused = false } = {}) {
    let stateIndex = 0;
    let currentView = 'reading';
    let callback;
    const pendingTimeouts = [];
    let cleared = false;
    const effects = [];
    const fakeReact = {
      useState(initial) {
        const index = stateIndex++;
        return [index === 1 ? hovered : index === 2 ? focused : initial, update => {
          if (index === 0) currentView = typeof update === 'function' ? update(currentView) : update;
        }];
      },
      useEffect(effect) { effects.push(effect); },
    };
    const moduleExports = {};
    const jsx = { jsx: () => null, jsxs: () => null };
    const fakeWindow = {
      setInterval(fn, delay) { assert.equal(delay, 15000); callback = fn; return 1; },
      setTimeout(fn, delay) { pendingTimeouts.push({ fn, delay }); return pendingTimeouts.length; },
      clearTimeout() {},
      clearInterval(id) { assert.equal(id, 1); cleared = true; },
    };
    new Function('exports', 'require', 'window', compiled)(
      moduleExports, name => name === 'react' ? fakeReact : name === 'react/jsx-runtime' ? jsx : { default: () => null }, fakeWindow,
    );
    moduleExports.default({
      summaryStats: [{ label: 'Days Engaged', value: '2', caption: '' }],
      learningStats: learning ? [{ label: 'Saved Words', value: '3', caption: '' }] : undefined,
    });
    const cleanup = effects[0]();
    return { tick: () => callback?.(), advanceFade: () => { const next = pendingTimeouts.shift(); next?.fn(); return next?.delay; }, hasTimer: () => Boolean(callback), cleanup, view: () => currentView, cleared: () => cleared };
  }
  const active = mount();
  assert.equal(active.view(), 'reading');
  active.tick();
  assert.equal(active.view(), 'reading');
  assert.equal(active.advanceFade(), 450);
  assert.equal(active.view(), 'learning');
  assert.equal(active.advanceFade(), 150);
  active.tick();
  active.advanceFade();
  active.advanceFade();
  assert.equal(active.view(), 'reading');
  active.cleanup();
  assert.equal(active.cleared(), true);
  assert.equal(mount({ hovered: true }).hasTimer(), false);
  assert.equal(mount({ focused: true }).hasTimer(), false);
  assert.equal(mount({ learning: false }).hasTimer(), false);
  assert.equal(mount().hasTimer(), true);
});
