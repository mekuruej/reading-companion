import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = fs.readFileSync('lib/books/bookHubLearningSnapshot.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function('exports', code)(exports);
const { countReviewedBookWords, readingPaceLabel, readingTimeLabel, loadReviewedBookWordCount } = exports;

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

test('mode-specific reading pace stays labeled and missing or invalid values do not become zero', () => {
  assert.equal(readingPaceLabel(4.26), '4.3 min/page');
  assert.equal(readingPaceLabel(null), '— min/page');
  assert.equal(readingPaceLabel(0), '— min/page');
  assert.equal(readingPaceLabel(-2), '— min/page');
  assert.equal(readingPaceLabel(Number.NaN), '— min/page');
  assert.equal(readingPaceLabel(Number.POSITIVE_INFINITY), '— min/page');
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
      data: table === 'finalized_user_book_words' ? words : table === 'study_logs' ? [{ user_book_word_id: 'b' }] : [],
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
    assert.ok(query.steps.some(step => step[0] === 'eq' && step[1] === (query.table === 'finalized_user_book_words' ? 'user_book_id' : 'user_id') && step[2] === (query.table === 'finalized_user_book_words' ? 'book' : 'owner')));
  }
});

test('reading pace replaces only the combined pace card and keeps the three-card snapshots', () => {
  const page = fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8');
  const component = fs.readFileSync('app/(protected)/books/[userBookId]/components/BookHubProgressSummary.tsx', 'utf8');
  const statCard = fs.readFileSync('app/(protected)/books/[userBookId]/components/BookHubStatCard.tsx', 'utf8');
  const embedded = fs.readFileSync('components/books/BookProgressSummaryBar.tsx', 'utf8');
  const reading = page.slice(page.indexOf('const bookHubSummaryStats ='), page.indexOf('const bookHubLearningStats ='));
  const learning = page.slice(page.indexOf('const bookHubLearningStats ='), page.indexOf('useEffect(() => {', page.indexOf('const bookHubLearningStats =')));
  assert.match(reading, /label: "Days Engaged"/);
  assert.match(reading, /label: "Reading Pace"/);
  assert.match(reading, /label: "Total Reading Time"/);
  assert.doesNotMatch(reading, /Avg Min \/ Page/);
  assert.match(reading, /\{ label: "Fluid:", value: readingPaceLabel\(fluidMinPerPage\) \}/);
  assert.match(reading, /\{ label: "Curiosity:", value: readingPaceLabel\(curiosityMinPerPage\) \}/);
  assert.equal((learning.match(/label: "(?:Saved Words|Saved Words \/ Page|Words Reviewed)"/g) || []).length, 3);
  assert.match(page, /const curiosityMinPerPage = useMemo/);
  assert.match(page, /const fluidMinPerPage = useMemo/);
  assert.match(statCard, /details\.map\(\(detail\)/);
  assert.match(component, /useState<"reading" \| "learning">\("reading"\)/);
  assert.doesNotMatch(component, /setInterval|setTimeout|snapshotHovered|snapshotFocused|snapshotVisible/);
  assert.doesNotMatch(component, /onMouseEnter|onMouseLeave|onFocusCapture|onBlurCapture/);
  assert.match(component, /role="group" aria-label="Choose progress snapshot"/);
  assert.match(component, /aria-pressed=\{snapshotView === view\}/);
  assert.match(component, /snapshotView === "reading" \? "Reading Snapshot" : "Learning Snapshot"/);
  assert.match(component, /onClick=\{\(\) => setSnapshotView\(view\)\}/);
  assert.match(page, /learningStats=\{canSeeVocabularySummary && isJapaneseLearningBook/);
  assert.doesNotMatch(embedded, /learningStats=/);
});

test('snapshot controls are manual, default to Reading, and retain the selected view', () => {
  const filename = 'app/(protected)/books/[userBookId]/components/BookHubProgressSummary.tsx';
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  function mount({ learning = true } = {}) {
    let stateIndex = 0;
    let currentView = 'reading';
    const state = [];
    let tree;
    const fakeReact = {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = initial;
        return [state[index], update => {
          state[index] = typeof update === 'function' ? update(state[index]) : update;
          if (index === 0) currentView = state[index];
        }];
      },
    };
    const moduleExports = {};
    const jsx = {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    };
    new Function('exports', 'require', 'window', compiled)(
      moduleExports, name => name === 'react' ? fakeReact : name === 'react/jsx-runtime' ? jsx : { default: () => null }, {},
    );
    const props = {
      summaryStats: [{ label: 'Days Engaged', value: '2', caption: '' }],
      learningStats: learning ? [{ label: 'Saved Words', value: '3', caption: '' }] : undefined,
    };
    const findNodes = (node, predicate, found = []) => {
      if (Array.isArray(node)) node.forEach(child => findNodes(child, predicate, found));
      else if (node && typeof node === 'object') {
        if (predicate(node)) found.push(node);
        findNodes(node.props?.children, predicate, found);
      }
      return found;
    };
    const render = () => {
      stateIndex = 0;
      tree = moduleExports.default(props);
      return tree;
    };
    render();
    return {
      render,
      view: () => currentView,
      buttons: () => findNodes(tree, node => node.type === 'button'),
      group: () => findNodes(tree, node => node.props?.role === 'group')[0],
      heading: () => findNodes(tree, node => node.type === 'h3')[0]?.props.children,
    };
  }
  const active = mount();
  assert.equal(active.view(), 'reading');
  assert.equal(active.heading(), 'Reading Snapshot');
  assert.equal(active.group().props['aria-label'], 'Choose progress snapshot');
  assert.deepEqual(active.buttons().map(button => button.props.children), ['Reading', 'Learning']);
  assert.equal(active.buttons()[0].props['aria-pressed'], true);
  assert.equal(active.buttons()[1].props['aria-pressed'], false);
  active.buttons()[1].props.onClick();
  assert.equal(active.view(), 'learning');
  active.render();
  assert.equal(active.heading(), 'Learning Snapshot');
  assert.equal(active.buttons()[0].props['aria-pressed'], false);
  assert.equal(active.buttons()[1].props['aria-pressed'], true);
  active.buttons()[0].props.onClick();
  assert.equal(active.view(), 'reading');
  active.render();
  assert.equal(active.heading(), 'Reading Snapshot');
  assert.equal(mount({ learning: false }).buttons().length, 0);
});

function loadSummaryComponent(file) {
  const require = createRequire(import.meta.url);
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('exports', 'require', compiled)(exports, name =>
    name === './BookHubStatCard'
      ? loadSummaryComponent('app/(protected)/books/[userBookId]/components/BookHubStatCard.tsx')
      : require(name));
  return exports;
}

test('reading-only summaries retain both pace rows, including explicit empty-data units', () => {
  const Summary = loadSummaryComponent('app/(protected)/books/[userBookId]/components/BookHubProgressSummary.tsx').default;
  for (const values of [[4.26, 2], [null, null]]) {
    const html = renderToStaticMarkup(createElement(Summary, {
      summaryStats: [{ label: 'Reading Pace', details: [
        { label: 'Fluid:', value: readingPaceLabel(values[0]) },
        { label: 'Curiosity:', value: readingPaceLabel(values[1]) },
      ] }],
    }));
    assert.ok(html.includes('Fluid:') && html.includes('Curiosity:'));
    for (const value of values) assert.ok(html.includes(readingPaceLabel(value)));
    assert.ok(!html.includes('Choose progress snapshot'));
    assert.doesNotMatch(html, /NaN|undefined/);
  }
  const empty = renderToStaticMarkup(createElement(Summary, { summaryStats: [] }));
  assert.ok(!empty.includes('Days Engaged') && !empty.includes('Reading Pace'));
});
