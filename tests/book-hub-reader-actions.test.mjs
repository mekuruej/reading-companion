import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const grid = fs.readFileSync(
  'app/(protected)/books/[userBookId]/components/BookHubActionGrid.tsx',
  'utf8',
);
const bookHub = fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8');

test('Read, Listen, and entitled Japanese Learning use equal primary cards', () => {
  assert.match(grid, /title="Read"[\s\S]*?size="primary"/);
  assert.match(grid, /title="Listen"[\s\S]*?size="primary"/);
  assert.match(grid, /showJapaneseLearningCard && onJapaneseLearning[\s\S]*?title="Japanese Learning"[\s\S]*?size="primary"/);
  assert.match(grid, /showJapaneseLearningSection \|\| showJapaneseLearningPromo/);
  assert.match(grid, /lg:grid-cols-3/);
  assert.match(bookHub, /onJapaneseLearning=\{\(\) => \{[\s\S]*?confirmLeaveIfTimerActive\(\)[\s\S]*?canUseJapaneseLearningActions[\s\S]*?"\/library-study"[\s\S]*?"\/japanese-learning\?source=book_hub"/);
});

test('Book Hub Read copy is outcome-first and does not expose internal mode names', () => {
  assert.match(grid, /subtitle=\{canUseCuriosityReading \? "Also save Japanese words as you go!" : "Read and track your progress\."\}/);
  assert.doesNotMatch(grid, /Fluid or Curiosity Reading|Fluid Reading/);
});

test('Reading Journal is a compact utility beside the other secondary destinations', () => {
  assert.match(grid, /title="Reading Journal"[\s\S]*?onClick=\{onStoryNotes\}/);
  assert.match(grid, /title="Book Stats"[\s\S]*?title="Reading History"[\s\S]*?title="About this Book"/);
  assert.doesNotMatch(grid, /CompactActionButton|bg-green-50/);
});

test('book-specific Japanese Learning actions remain available as compact utilities', () => {
  for (const title of ['Review Words', 'Follow-Along', 'Vocabulary List', 'Bulk Add']) {
    assert.ok(grid.includes(`title="${title}"`), `${title} remains available`);
  }
  assert.match(grid, /showJapaneseLearningSection \? \([\s\S]*?More Japanese Learning tools/);
});
