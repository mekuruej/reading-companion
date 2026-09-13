const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = name => {
    if (name === '@/components/LibraryColorBadge') return load('components/LibraryColorBadge.tsx');
    if (name.startsWith('./Dictionary')) return { __esModule: true, default: () => null };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
  return mod.exports;
}
const { computeLibraryStudyColorStatus } = load('lib/libraryStudyColor.ts');
const Card = load('app/(protected)/discovery/dictionary/components/DictionaryResultCard.tsx').default;
const settings = { red_stages: 3, orange_stages: 3, yellow_stages: 3 };
function render(input, showBadgeNumbers = true, promotedThroughWordSky = false) {
  return renderToStaticMarkup(React.createElement(Card, {
    entry: { word: '本', reading: 'ほん', meanings: ['book'] }, fallbackWord: '',
    showBadge: true, colorStatus: computeLibraryStudyColorStatus({ settings, ...input }),
    colorMessage: '', showBadgeNumbers, promotedThroughWordSky, jlptLabel: '', isKanjiLoading: false,
    kanjiMeta: [], kanjiGroups: [], personalHistory: [], chapterDisplay: () => '',
  }));
}
for (const [input, label] of [
  [{ encounterCount: 2 }, 'Red 2'],
  [{ encounterCount: 5 }, 'Orange 2'],
  [{ encounterCount: 8 }, 'Yellow 2'],
  [{ encounterCount: 9, readyForReadingGate: true }, 'Green'],
  [{ encounterCount: 0, claimedGreen: true }, 'Green'],
  [{ encounterCount: 1, readingGate: 'passed' }, 'Blue'],
  [{ encounterCount: 0, mastered: true }, 'Purple'],
  [{ encounterCount: 0, meaningGate: 'passed' }, 'Purple'],
  [{ encounterCount: 9, readingGate: 'failed' }, 'L2'],
]) {
  const html = render(input);
  assert.ok(html.includes(`Library Study color: ${label}`) || (label === 'L2' && html.includes('L2 —')), label);
  assert.ok(html.indexOf('Your vocabulary status') < html.indexOf('Library Study color:'));
  assert.ok(html.indexOf('Library Study color:') < html.indexOf('Saved in your books'));
}
assert.ok(!render({ encounterCount: 2 }, false).includes('Red 2'));
assert.ok(!render({ encounterCount: 1, settings: { red_stages: 1 } }).includes('Red 1'));
console.log('PASS: dictionary badge renders Red/Orange/Yellow stages, Green claims, Blue, Purple, support status, saved number preference, and placement above saved-book history.');

for (const input of [{ encounterCount: 0, claimedGreen: true }, { encounterCount: 0, readingGate: 'passed' }, { encounterCount: 0, mastered: true }]) {
  assert.ok(render(input, true, true).includes('This word was promoted to Green via Word Sky.'));
  assert.ok(!render(input).includes('This word was promoted to Green via Word Sky.'));
}
console.log('PASS: Word Sky provenance remains visible at Green, Blue, and Purple and is absent for other words.');
