import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const grid = fs.readFileSync(
  'app/(protected)/books/[userBookId]/components/BookHubActionGrid.tsx',
  'utf8',
);
const bookHub = fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8');

test('Read and Listen remain the only primary Reading Companion cards', () => {
  assert.match(grid, /title="Read"[\s\S]*?size="primary"/);
  assert.match(grid, /title="Listen"[\s\S]*?size="primary"/);
  assert.doesNotMatch(grid, /<ActionButton\s+title="Japanese Learning"/);
  assert.match(grid, /title="Japanese Learning"[\s\S]*?Flashcards/);
  assert.doesNotMatch(bookHub, /onJapaneseLearning=/);
});

test('Book Hub Read copy is outcome-first and does not expose internal mode names', () => {
  assert.match(grid, /subtitle=\{canUseCuriosityReading \? "Save Japanese words as you go!" : "Read and track your progress\."\}/);
  assert.doesNotMatch(grid, /Fluid or Curiosity Reading|Fluid Reading/);
});

test('Reading Journal is a compact utility beside the other secondary destinations', () => {
  assert.match(grid, /title="Reading Journal"[\s\S]*?onClick=\{onStoryNotes\}/);
  assert.match(grid, /title="Book Stats"[\s\S]*?title="Reading History"[\s\S]*?title="About this Book"/);
  assert.doesNotMatch(grid, /CompactActionButton|bg-green-50/);
});

test('book-specific Japanese Learning actions are consistent responsive feature cards', () => {
  const section = grid.match(/title="Japanese Learning"[\s\S]*?\{showJapaneseLearningSection \? \([\s\S]*?<\/ActionSection>/)?.[0];
  assert.ok(section, 'Japanese Learning has a dedicated section');
  for (const title of ['Vocabulary List', 'Bulk Add']) {
    assert.match(section, new RegExp(`title="${title}"[\\s\\S]*?size="secondary"`), `${title} is a feature card`);
  }
  for (const title of ['Flashcards', 'Follow-Along']) {
    assert.match(section, new RegExp(`title="${title}"[\\s\\S]*?size="primary"`));
  }
  assert.doesNotMatch(section, /Review Words/);
  assert.equal((section.match(/grid-cols-1 gap-2 text-sm sm:grid-cols-2/g) || []).length, 2);
  assert.match(grid, /title="Read"[\s\S]*?appearance="sky"/);
  assert.match(grid, /title="Listen"[\s\S]*?appearance="mint"/);
  assert.doesNotMatch(section, /UtilityActionButton/);
  assert.match(bookHub, /onStudyFlashcards=\{\(\) => \{[\s\S]*?confirmLeaveIfTimerActive\(\)[\s\S]*?router\.push\(`\/books\/\$\{row\.id\}\/study`\)/);
  assert.match(bookHub, /onFluidReadingExtensive=\{\(\) => \{[\s\S]*?confirmLeaveIfTimerActive\(\)[\s\S]*?router\.push\(`\/books\/\$\{row\.id\}\/readalong`\)/);
  assert.match(bookHub, /onVocabularyList=\{\(\) => \{[\s\S]*?confirmLeaveIfTimerActive\(\)[\s\S]*?router\.push\(`\/books\/\$\{row\.id\}\/words`\)/);
  assert.match(bookHub, /onBulkAdd=\{\(\) => \{[\s\S]*?confirmLeaveIfTimerActive\(\)[\s\S]*?router\.push\(`\/vocab\/bulk\?userBookId=/);
});
