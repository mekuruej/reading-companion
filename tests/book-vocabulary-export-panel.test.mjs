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
