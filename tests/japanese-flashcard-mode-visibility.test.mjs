import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const helperSource = fs.readFileSync(
  new URL('../lib/study/japaneseFlashcardModes.ts', import.meta.url),
  'utf8'
);
const helperCode = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const helperModule = { exports: {} };
new Function('exports', helperCode)(helperModule.exports);

const {
  JAPANESE_FLASHCARD_TYPING_MODES,
  JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES,
  JAPANESE_FLASHCARD_COMPLETE_MODES,
  JAPANESE_FLASHCARD_MODE_ORDER,
  normalizeJapaneseFlashcardMode,
} = helperModule.exports;

const bookPage = fs.readFileSync(
  new URL('../app/(protected)/books/[userBookId]/study/page.tsx', import.meta.url),
  'utf8'
);
const bookSelector = fs.readFileSync(
  new URL('../app/(protected)/books/[userBookId]/study/components/StudyModePanel.tsx', import.meta.url),
  'utf8'
);
const libraryPage = fs.readFileSync(
  new URL('../app/(protected)/library-study/practice/page.tsx', import.meta.url),
  'utf8'
);
const librarySelector = fs.readFileSync(
  new URL('../app/(protected)/library-study/practice/components/LibraryPracticeModeSelector.tsx', import.meta.url),
  'utf8'
);

test('Japanese Typing and Multiple Choice expose exactly the requested modes', () => {
  assert.deepEqual([...JAPANESE_FLASHCARD_TYPING_MODES], [
    'READING',
    'FROM_READING_MEANING',
  ]);
  assert.deepEqual([...JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES], [
    'MEANING_MC',
    'FROM_READING_MC',
  ]);
  assert.equal(new Set(JAPANESE_FLASHCARD_MODE_ORDER).size, 6);
  assert.ok(!JAPANESE_FLASHCARD_MODE_ORDER.includes('MEANING'));
  assert.ok(!JAPANESE_FLASHCARD_MODE_ORDER.includes('READING_MC'));
  assert.ok(!JAPANESE_FLASHCARD_MODE_ORDER.includes('FROM_READING_MEANING_MC'));
});

test('the Complete modes remain present and unchanged', () => {
  assert.deepEqual([...JAPANESE_FLASHCARD_COMPLETE_MODES], [
    'COMPLETE',
    'COMPLETE_TYPING',
  ]);
  assert.ok(bookSelector.includes('values: ["COMPLETE", "COMPLETE_TYPING"]'));
  assert.ok(librarySelector.includes('JAPANESE_FLASHCARD_COMPLETE_MODES.map'));
});

test('saved hidden mode preferences recover to Kanji/Meaning → Kana and preserve English mode handling', () => {
  for (const hiddenMode of ['MEANING', 'READING_MC', 'FROM_READING_MEANING_MC']) {
    assert.equal(normalizeJapaneseFlashcardMode(hiddenMode), 'READING');
  }
  assert.equal(normalizeJapaneseFlashcardMode('FROM_READING_MC'), 'FROM_READING_MC');
  assert.match(bookPage, /setStudySet\(normalizeJapaneseFlashcardMode\(parsed\.studySet\)\)/);
  assert.match(bookPage, /parsed\.studySet !== "ENGLISH_READER"/);
});

test('both normal selectors and next-mode rotations use only visible Japanese modes', () => {
  assert.match(bookPage, /JAPANESE_FLASHCARD_MODE_ORDER/);
  assert.match(bookPage, /JAPANESE_FLASHCARD_TYPING_MODES\.map/);
  assert.match(bookPage, /JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES\.map/);
  assert.match(bookPage, /JAPANESE_FLASHCARD_COMPLETE_MODES\.map/);
  assert.match(bookSelector, /values: \["READING", "FROM_READING_MEANING"\]/);
  assert.match(bookSelector, /values: \["MEANING_MC", "FROM_READING_MC"\]/);
  assert.match(libraryPage, /JAPANESE_FLASHCARD_MODE_ORDER/);
  assert.match(librarySelector, /JAPANESE_FLASHCARD_TYPING_MODES\.map/);
  assert.match(librarySelector, /JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES\.map/);
});

test('Book and Library Flashcards display the standardized visible mode titles', () => {
  const expectedTitles = [
    'Kanji/Meaning → Kana',
    'Kana → Meaning',
    'Kanji/Kana → Meaning',
    'Meaning → Kanji',
  ];

  for (const [interfaceName, source] of [
    ['Book Flashcards', bookPage],
    ['Library Flashcards page', libraryPage],
    ['Library Flashcards selector', librarySelector],
  ]) {
    for (const title of expectedTitles) {
      assert.ok(source.includes(`return "${title}";`), `${interfaceName} displays ${title}`);
    }
  }
});

test('Meaning → Kanji shows meaning only while preserving written-answer grading', () => {
  const bookQuestion = bookPage.match(/studySet === "FROM_READING_MC" \? \(\s*<>[\s\S]*?<\/\>\s*\) :/);
  const libraryQuestion = libraryPage.match(/practiceMode === "FROM_READING_MC" \? \(\s*<>[\s\S]*?<\/\>\s*\) :/);
  assert.ok(bookQuestion, 'book question branch exists');
  assert.ok(libraryQuestion, 'library question branch exists');
  assert.match(bookQuestion[0], /card\.meaning/);
  assert.doesNotMatch(bookQuestion[0], /card\.reading/);
  assert.match(libraryQuestion[0], /card\.meaning/);
  assert.doesNotMatch(libraryQuestion[0], /card\.reading/);

  assert.match(bookPage, /buildWordMcOptions\(card, filteredCards, libraryCards\)/);
  assert.match(bookPage, /setMcCorrectAnswer\(\(card\.word \|\| ""\)\.trim\(\)\)/);
  assert.match(libraryPage, /practiceCorrectAnswer\(card, practiceMode\)/);
  assert.match(libraryPage, /if \(target === "word"\) return card\.surface/);
  assert.match(libraryPage, /if \(target === "word"\) return candidate\.surface/);
});

function loadTs(relativePath) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function('exports', code)(exports);
  return exports;
}

test('all supported saved Japanese modes retain their identifiers; invalid preferences safely recover', () => {
  for (const mode of JAPANESE_FLASHCARD_MODE_ORDER) {
    assert.equal(normalizeJapaneseFlashcardMode(mode), mode);
  }
  for (const value of [undefined, null, '', 'unknown', 'ENGLISH_READER', 7, {}]) {
    assert.equal(normalizeJapaneseFlashcardMode(value), 'READING');
  }
});

test('visible Japanese mode rotations cover all six modes and keep the preview stable', () => {
  const { startModeRotation, selectRotationMode, shuffleModes } = loadTs('../lib/study/modeRotation.ts');
  let rotation = startModeRotation(JAPANESE_FLASHCARD_MODE_ORDER, () => 0.4);
  const visited = [];
  for (let i = 0; i < JAPANESE_FLASHCARD_MODE_ORDER.length; i++) {
    visited.push(rotation.current);
    const preview = rotation.remaining[0];
    const next = selectRotationMode(rotation, preview, shuffleModes(JAPANESE_FLASHCARD_MODE_ORDER, () => 0.7));
    assert.equal(next.current, preview);
    rotation = next;
  }
  const previous = visited.at(-1);
  assert.deepEqual([...visited].sort(), [...JAPANESE_FLASHCARD_MODE_ORDER].sort());
  assert.notEqual(rotation.current, previous);
});

test('Book and Library selectors give identical instructions for every visible mode', () => {
  const bookBody = bookSelector.match(/function descriptionForMode\(value: string, fallback: string\) \{([\s\S]*?)\n\}/)[1];
  const libraryBody = librarySelector.match(/function descriptionForMode\(mode: PracticeStudyMode\) \{([\s\S]*?)\n\}/)[1];
  const bookDescription = new Function('value', 'fallback', bookBody);
  const libraryDescription = new Function('mode', libraryBody);
  for (const mode of JAPANESE_FLASHCARD_MODE_ORDER) {
    assert.equal(bookDescription(mode, ''), libraryDescription(mode));
  }
});

test('English books retain their dedicated mode, language-specific card, and no Japanese mode selector or next-mode rotation', () => {
  assert.match(bookPage, /if \(loadedLanguageCode === "en"\) \{\s*setStudySet\("ENGLISH_READER"\)/);
  assert.match(bookPage, /\{isEnglishBook \? \([\s\S]*?English → Japanese[\s\S]*?\) : \(\s*<StudyModePanel/);
  assert.match(bookPage, /nextStudyModeLabel=\{isEnglishBook \? undefined : studySetLabel\(nextStudySet\)\}/);
  assert.match(bookPage, /isEnglishBook && card \? \([\s\S]*?Japanese meaning \/ support/);
});
