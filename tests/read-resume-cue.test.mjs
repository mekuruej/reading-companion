import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function load(file, deps = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', source)((name) => deps[name] ?? require(name), exports);
  return exports;
}

const progress = load('lib/books/readingProgress.ts');
const { readResumeCue } = load('lib/books/readResumeCue.ts', {
  './readingProgress': progress,
});
const { hasUnfinishedTimedSession } = load('app/(protected)/books/[userBookId]/_shared/timed-session/timedSessionPersistence.ts');

test('resume cue uses the furthest reading page and ignores listening positions', () => {
  assert.equal(readResumeCue([
    { tracking_unit: 'page', end_position: 208, session_mode: 'fluid' },
    { tracking_unit: 'page', end_position: 240, session_mode: 'listening' },
    { tracking_unit: 'page', end_position: 193, session_mode: 'curiosity' },
  ], 'page', { page_count: 400 }, null), 'Resume from page 208');
});

test('resume cue formats Kindle locations and percentages using their configured unit', () => {
  assert.equal(readResumeCue([
    { tracking_unit: 'kindle_location', end_position: 3841, session_mode: 'fluid' },
  ], 'kindle_location', { kindle_location_count: 9000 }, null), 'Resume from location 3841');
  assert.equal(readResumeCue([
    { tracking_unit: 'percent', end_position: 42, session_mode: 'curiosity' },
  ], 'percent', {}, null), 'Resume from 42%');
});

test('resume cue uses the latest audiobook position and fallbacks already available', () => {
  assert.equal(readResumeCue([
    { id: '1', tracking_unit: 'audiobook_time', end_position: 120, read_on: '2026-10-01', session_mode: 'listening' },
    { id: '2', tracking_unit: 'audiobook_time', end_position: 90, read_on: '2026-10-02', session_mode: 'listening' },
  ], 'audiobook_time', { audiobook_duration_minutes: 300 }, null), 'Resume from 1 hr 30 min');
  assert.equal(readResumeCue([], 'audiobook_time', {}, 'Chapter 8 · 3:12:45'), 'Resume from Chapter 8 · 3:12:45');
  assert.equal(readResumeCue([], 'page', {}, null, [{ page_number: 67, created_at: '2026-10-02' }]), 'Resume from page 67');
});

test('mode switching treats running, paused, saved-form and elapsed drafts as unfinished', () => {
  const base = { version: 1, sessionMode: 'fluid', userBookId: 'book', startedAt: null,
    accumulatedElapsedMs: 0, isPaused: false, sessionDate: '', sessionStartPage: '',
    sessionEndPage: '', showTimedSessionForm: false, savedAt: 1 };
  assert.equal(hasUnfinishedTimedSession(null), false);
  assert.equal(hasUnfinishedTimedSession(base), false);
  assert.equal(hasUnfinishedTimedSession({ ...base, startedAt: 2 }), true);
  assert.equal(hasUnfinishedTimedSession({ ...base, isPaused: true }), true);
  assert.equal(hasUnfinishedTimedSession({ ...base, showTimedSessionForm: true }), true);
  assert.equal(hasUnfinishedTimedSession({ ...base, accumulatedElapsedMs: 1000 }), true);
});
