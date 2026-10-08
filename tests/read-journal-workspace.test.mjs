import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readPage = fs.readFileSync('app/(protected)/books/[userBookId]/read/page.tsx', 'utf8');
const curiosity = fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx', 'utf8');
const fluid = fs.readFileSync('app/(protected)/books/[userBookId]/_shared/timed-session/SimpleTimedSessionPage.tsx', 'utf8');
const persistence = fs.readFileSync('app/(protected)/books/[userBookId]/_shared/timed-session/timedSessionPersistence.ts', 'utf8');

test('Read Journal is an owner-scoped presentation option, separate from reading mode', () => {
  assert.match(readPage, /import ReadingJournalPanel from "\.\.\/components\/ReadingJournalPanel"/);
  assert.doesNotMatch(readPage, /StoryNotesExperience/);
  assert.match(readPage, /if \(ownerUserId === user\.id\)/);
  assert.match(readPage, /Read \+ Journal/);
  assert.doesNotMatch(readPage, /mode=journal/);
  assert.match(readPage, /onReadingJournalContextChange=\{setJournalPageContext\}/);
});

test('opening and closing the journal keeps both session engines mounted and leaves persistence mode-keyed', () => {
  assert.match(readPage, /SimpleTimedSessionPage[\s\S]*?onActiveTimerChange=\{onActiveTimerChange\}/);
  assert.match(readPage, /CuriosityReadingExperience[\s\S]*?workspaceAside=\{showJournal \? journalPanel : undefined\}/);
  assert.match(readPage, /onCloseWorkspaceAside=\{\(\) => setJournalOpen\(false\)\}/);
  assert.match(fluid, /onActiveTimerChange\?\.\(isRunning \|\| isPaused \|\| showTimedSessionForm\)/);
  assert.match(curiosity, /onActiveTimerChange\?\.\(isRunning \|\| isPaused \|\| showTimedSessionForm\)/);
  assert.match(curiosity, /fixed inset-0 z-50 overflow-y-auto/);
  assert.match(persistence, /timed-session:\$\{sessionMode\}:\$\{userBookId\}/);
});
