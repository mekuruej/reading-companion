import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { resumeBookmarkLabel } from '../lib/books/resumeBookmark.mjs';
const require = createRequire(import.meta.url);
function load(file, deps) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => deps[name] ?? require(name), exports);
  return exports.default;
}
test('Listening owns one reminder before workspace tabs, with child summaries disabled in every mode', () => {
  const page = fs.readFileSync('app/(protected)/books/[userBookId]/listening/page.tsx', 'utf8');
  assert.equal((page.match(/<BookProgressSummaryBar/g) ?? []).length, 1);
  assert.match(page, /<BookProgressSummaryBar userBookId={userBookId} listening={!isNativeListeningWorkspace \|\| nativeSessionMode === "listening"} bookmarkAware showBackLink={Boolean\(showReadingWorkspace\)} \/>/);
  assert.ok(page.indexOf('<h1') < page.indexOf('<BookProgressSummaryBar'));
  assert.ok(page.indexOf('<BookProgressSummaryBar') < page.indexOf('Workspace\n'));
  assert.equal((page.match(/showProgressSummaryBar={false}/g) ?? []).length, 3);
  assert.doesNotMatch(page, /ResumeBookmarkSummary/);
});
test('Book Hub extra reminder removed; Read reminder remains', () => {
  assert.doesNotMatch(fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8'), /ResumeBookmarkSummary/);
  assert.match(fs.readFileSync('app/(protected)/books/[userBookId]/read/page.tsx', 'utf8'), /<ResumeBookmarkSummary/);
});
test('actual Listening summary renders exactly one explicit bookmark or original fallback', () => {
  let bookmark = null;
  const Summary = load('components/books/ResumeBookmarkSummary.tsx', {
    '@/lib/books/useResumeBookmark': { useResumeBookmark: () => ({ available: true, eligible: true, bookmark, pageCount: 100 }) },
    '@/lib/books/resumeBookmark.mjs': { resumeBookmarkLabel },
  });
  const Bar = load('components/books/BookProgressSummaryBar.tsx', {
    './ResumeBookmarkSummary': { default: Summary },
    './BookProgressProvider': { useBookProgress: () => ({ userBookId: 'book', loaded: true, refreshSummary() {}, summaryData: { sessions: [{ session_mode: 'listening', read_on: '2026-10-29', end_page: 12, progress_unit: 'page', ending_phrase: 'Listening fallback phrase' }] } }) },
    '@/lib/books/bookProgressSummary': { summarizeBookProgress: () => null },
    '@/lib/books/readingProgress': { sessionEnd: () => 12, sessionProgressUnit: () => 'page', formatAudioTime: String },
    '@/app/(protected)/books/[userBookId]/components/BookHubProgressSummary': { default: () => null },
    'next/link': { default: ({ children }) => React.createElement('a', null, children) },
  });
  function render() { return renderToStaticMarkup(React.createElement(Bar, { userBookId: 'book', listening: true, bookmarkAware: true })); }
  let html = render();
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
  assert.match(html, /Resume from page 12/);
  assert.match(html, /Listening fallback phrase/);
  bookmark = { kind: 'phrase', page: 20, phrase: 'Explicit bookmark phrase' };
  html = render();
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
  assert.match(html, /Explicit bookmark phrase/);
  assert.doesNotMatch(html, /Listening fallback phrase|Resume from page 12/);
  assert.match(html, /var\(--appearance-surface\)/);
});
