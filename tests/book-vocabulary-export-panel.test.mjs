import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = fs.readFileSync(path.join(root, 'app/(protected)/books/[userBookId]/words/components/BookVocabCsvExportPanel.tsx'), 'utf8');
const page = fs.readFileSync(path.join(root, 'app/(protected)/books/[userBookId]/words/page.tsx'), 'utf8');

test('CSV export panel is collapsed by default and exposes a keyboard-accessible toggle', () => {
  assert.match(page, /const \[exportExpanded, setExportExpanded\] = useState\(false\)/);
  assert.match(component, /expanded: boolean/);
  assert.match(component, /onExpandedChange: \(expanded: boolean\) => void/);
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /aria-controls="vocab-export-options"/);
  assert.match(component, /\{expanded \? \([\s\S]*?id="vocab-export-options"/);
  assert.match(component, /\{expanded \? "Hide options" : "Options"\}/);
});

test('existing independent chapter and JLPT filters still drive the existing CSV callback', () => {
  assert.match(page, /const \[exportChapter, setExportChapter\] = useState\("all"\)/);
  assert.match(page, /const \[exportJlpt, setExportJlpt\] = useState\("all"\)/);
  assert.match(component, /onClick=\{onExportCsv\}/);
  assert.match(component, /id="vocab-csv-chapter"/);
  assert.match(component, /id="vocab-csv-jlpt"/);
  assert.match(component, /Download CSV/);
  assert.match(component, /Choose which words you&apos;d like to export\./);
  assert.doesNotMatch(component, /These options do not change the list below/);
  assert.match(component, /rounded-lg border border-stone-200 bg-stone-50/);
  assert.match(page, /const exportWords = useMemo\([\s\S]*?\(\) => words\.filter/);
  assert.match(page, /chapterMatches = exportChapter === "all" \|\| chapterKey\(word\) === exportChapter/);
  assert.match(page, /jlptMatches = exportJlpt === "all" \|\| normalizeJlpt\(word\.jlpt\) === exportJlpt/);
  assert.match(page, /wordCount=\{exportWords\.length\}/);
  assert.match(page, /const rows = \[[\s\S]*?\.\.\.exportWords\.map/);
  assert.match(component, /No words match these filters\./);
  assert.match(component, /disabled=\{wordCount === 0\}/);
  assert.doesNotMatch(page, /window\.alert\("There are no words to export/);
});

// The list must remain mounted while the export panel is expanded. A hidden
// ancestor preserves row/input state; conditional rendering would discard it.
test('export expansion hides every vocabulary-list surface without unmounting it', async () => {
  const ts = (await import('typescript')).default;
  const ast = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let listRegion;
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'div') {
      const hidden = node.openingElement.attributes.properties.find(prop =>
        ts.isJsxAttribute(prop) && prop.name.getText(ast) === 'hidden' &&
        prop.initializer && ts.isJsxExpression(prop.initializer) &&
        prop.initializer.expression?.getText(ast) === 'exportExpanded'
      );
      if (hidden) {
        assert.equal(listRegion, undefined, 'one persistent list region');
        listRegion = node;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(listRegion, 'expanded export has a hidden ancestor for the list');
  assert.ok(ts.isJsxElement(listRegion.parent), 'list region is rendered directly, not conditionally');
  const content = listRegion.getText(ast);
  for (const component of ['BookVocabReorderHint', 'BookVocabMobileCard', 'BookVocabTableShell', 'BookVocabRow', 'BookVocabEmptyRow', 'BookVocabBackToTopButton']) {
    assert.ok(content.includes(`<${component}`), `${component} belongs to the hidden region`);
  }
  assert.match(content, /sharedTeachingWords\.map/);
  assert.doesNotMatch(content, /<BookVocabCsvExportPanel|<BookVocabFilterPanel/);
  assert.doesNotMatch(content, /setQuery|setChapterFilter|setShowHidden|setWords|setExportChapter|setExportJlpt/);
});

test('opening and closing export options cannot reset list state or change list/export selection', () => {
  const listSelection = page.slice(page.indexOf('const filtered = useMemo'), page.indexOf('const exportWords = useMemo'));
  assert.match(listSelection, /\[words, query, chapterFilter, showHidden\]/);
  assert.match(listSelection, /\[filtered\]/);
  assert.doesNotMatch(listSelection, /exportExpanded|exportChapter|exportJlpt/);
  const exportSelection = page.slice(page.indexOf('const exportWords = useMemo'), page.indexOf('function handleExportVocabCsv'));
  assert.match(exportSelection, /\[words, exportChapter, exportJlpt\]/);
  assert.doesNotMatch(exportSelection, /exportExpanded|chapterFilter|filteredSorted|showHidden|query/);
  assert.match(page, /onExpandedChange=\{setExportExpanded\}/);
  assert.equal((page.match(/setExportExpanded/g) ?? []).length, 2, 'setter is declared and passed directly, with no reset side effects');
});
