import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tools = fs.readFileSync(
  'app/(protected)/books/[userBookId]/components/BookHubTeachingTools.tsx',
  'utf8',
);

test('attached and unattached student cards have distinct restrained surfaces', () => {
  assert.match(tools, /student\.isAttached\s*\?\s*"border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50"\s*:\s*"border-stone-200 bg-stone-50\/80"/);
});

test('student-card actions share one accessible button system and Follow-Along is primary', () => {
  assert.match(tools, /function StudentCardButton/);
  assert.match(tools, /min-h-9[\s\S]*rounded-lg[\s\S]*focus-visible:ring-2/);
  assert.match(tools, /onClick=\{\(\) => onStudentFollowAlong\(student\.userBookId as string\)\}[\s\S]*variant="primary"/);
  for (const callback of ['onStudentSaveWords', 'onStudentFlashcards', 'onStudentVocabularyList']) {
    assert.match(tools, new RegExp(`<StudentCardButton[\\s\\S]*?${callback}\\(student\\.userBookId as string\\)`));
  }
});

test('Reading Experience is a regular secondary card action without the Add label', () => {
  assert.match(tools, /onClick=\{\(\) => onReadingExperiences\(student\.studentId\)\}[\s\S]*?>\s*Reading Experience\s*</);
  assert.doesNotMatch(tools, />\s*Add Reading Experience\s*</);
});

test('resume editing and attach/remove actions keep their existing handlers and quieter variants', () => {
  assert.match(tools, /onClick=\{\(\) => void saveResumePoint\(student\)\}/);
  assert.match(tools, /onClick=\{\(\) => void removeStudentBook\(student\)\}[\s\S]*variant="tertiary"/);
  assert.match(tools, /onClick=\{\(\) => void addStudentBook\(student\)\}[\s\S]*variant="attach"/);
});
