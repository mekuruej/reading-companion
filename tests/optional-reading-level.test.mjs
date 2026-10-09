import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function load(file, mocks = {}) {
  const code = ts.transpileModule(read(file), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const result = { exports: {} };
  new Function('require', 'exports', code)(name => mocks[name] ?? require(name), result.exports);
  return result.exports;
}
const levels = load('lib/profileLevels.ts');
const reflection = load('lib/books/readingReflectionLevel.ts');
const hub = 'app/(protected)/books/[userBookId]/';

test('optional setup/settings payloads preserve stored levels and do not guess unknown ones', () => {
  for (const enabled of [true, false, null]) {
    assert.deepEqual(levels.profileReadingLevelFields(enabled, ''), {});
    assert.deepEqual({ level: 'Level 4', ...levels.profileReadingLevelFields(enabled, '') }, { level: 'Level 4' });
  }
  assert.deepEqual(levels.profileReadingLevelFields(true, ' Level 6 '), { level: 'Level 6' });
});
test('only a new reflection defaults to profile level', () => {
  assert.equal(reflection.initialReflectionReaderLevel({}, 'Level 5'), 'Level 5');
  assert.equal(reflection.initialReflectionReaderLevel({}, null), '');
  assert.equal(reflection.initialReflectionReaderLevel({ reader_level: 'Level 2', rating_difficulty: 3 }, 'Level 9'), 'Level 2');
  for (const contribution of [{ rating_difficulty: 3 }, { rating_overall: 4 }, { reader_advice: 'Try this book' }]) {
    assert.equal(reflection.initialReflectionReaderLevel({ reader_level: null, ...contribution }, 'Level 9'), '');
  }
});
test('explicit unknown and changed reflection levels persist through reload independently of profile', () => {
  const unknown = reflection.reflectionReaderLevelForSave('');
  assert.equal(unknown, null);
  assert.equal(reflection.initialReflectionReaderLevel({ reader_level: unknown, rating_difficulty: 3 }, 'Level 8'), '');
  const changed = reflection.reflectionReaderLevelForSave('Level 6');
  assert.equal(changed, 'Level 6');
  assert.equal(reflection.initialReflectionReaderLevel({ reader_level: changed }, 'Level 9'), changed);
});
test('reflection UI exposes existing level choices and a null-valued Not sure selection', () => {
  const { default: RatingTab } = load(`${hub}components/tabs/RatingTab.tsx`, { '@/lib/profileLevels': levels });
  const html = renderToStaticMarkup(React.createElement(RatingTab, {
    row: { reader_level: null }, isEditingReflection: true, readerLevel: '', readerAdvice: '',
    StarRatingField: () => null, DifficultyField: () => null,
  }));
  assert.match(html, /Your reading level for this experience \(optional\)/);
  assert.match(html, /value="" selected="">Not sure/);
  for (const option of levels.PROFILE_LEVEL_OPTIONS) assert.ok(html.includes(`value="${option.value}"`));
});
test('completeness checks and profile forms no longer require a level', () => {
  for (const file of ['app/(protected)/books/page.tsx', 'app/dashboard/page.tsx']) {
    assert.doesNotMatch(read(file), /needsJapaneseReadingLevel|!!profile\?\.level/);
  }
  for (const file of ['app/(protected)/community/profile/setup/page.tsx', 'app/(protected)/community/profile/settings/page.tsx']) {
    const source = read(file);
    assert.doesNotMatch(source, /Please choose the reading level/);
    if (file.includes("/settings/")) assert.match(source, /profileReadingLevelFields\(japaneseLearningEnabled, level\)/);
    else assert.match(read("app/api/profile/setup/route.ts"), /profileReadingLevelFields\(enabled, level\)/);
    assert.match(source, /MekuruReadingLevelGuide optional/);
    assert.match(source, /Please (?:enter|add) a display name/);
    if (file.includes("/settings/")) assert.match(source, /Please (?:enter|choose) a username/);
    assert.match(source, /Please choose your native language/);
  }
});
test('reflection save paths use selected level consistently without profile writes or historical fallbacks', () => {
  const source = read(`${hub}page.tsx`);
  const save = source.slice(source.indexOf('async function saveReadingReflectionFields()'), source.indexOf('async function saveReadingReflectionFields()') + 3400);
  assert.match(save, /const reflectionReaderLevel = reflectionReaderLevelForSave\(readerLevel\)/);
  assert.match(save, /reader_level: reflectionReaderLevel/);
  assert.match(save, /readerLevel: reflectionReaderLevel/);
  assert.doesNotMatch(save, /from\("profiles"\)/);
  assert.doesNotMatch(source, /readerLevel \|\| profileLevel|profileLevel \|\| readerLevel/);
  for (const file of ['app/(protected)/teacher/page.tsx', 'app/(protected)/teacher/needs-attention/page.tsx', 'app/(protected)/teacher/reading-fit/page.tsx', 'app/(protected)/discovery/page.tsx']) {
    assert.doesNotMatch(read(file), /readerLevelByUserId|profileLevelsByUserId|reader_level \|\| profile/);
  }
});

test('actual reflection save writes null or changed levels to both destinations without touching profiles', async () => {
  const source = read(`${hub}page.tsx`);
  const parsed = ts.createSourceFile('hub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let saveNode;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'saveReadingReflectionFields') saveNode = node;
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  const code = ts.transpileModule(saveNode.getText(parsed), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const selectedLevel of ['', 'Level 2', 'Level 6']) {
    const updates = [], signals = [], errors = [];
    const noop = () => {};
    const context = {
      row: { id: 'ub', user_id: 'reader', books: { id: 'book', book_type: 'novel' } },
      readerLevel: selectedLevel, profileLevel: 'Level 9', canUseReadingReflection: true,
      ratingOverall: '4', ratingDifficulty: '3', readerAdvice: 'Good book', bookType: 'novel', userId: 'reader',
      reflectionReaderLevelForSave: reflection.reflectionReaderLevelForSave,
      clampRating5: n => n,
      supabase: { from: table => ({ update: fields => ({ eq: async () => { updates.push({ table, fields }); return { error: null }; } }) }) },
      syncBookRecommendationSignal: async fields => { signals.push(fields); },
      saveCommunityContributions: async () => {}, load: async () => {},
      setError: value => { if (value) errors.push(value); },
      setSavedReflectionBookId: noop, setSaving: noop, setSaveNotice: noop, setSaveNoticeTone: noop, setEditingTab: noop,
    };
    const save = new Function(...Object.keys(context), `${code}; return saveReadingReflectionFields;`)(...Object.values(context));
    await save();
    assert.deepEqual(errors, []);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].table, 'user_books');
    assert.equal(updates[0].fields.reader_level, selectedLevel || null);
    assert.equal(signals[0].readerLevel, updates[0].fields.reader_level);
  }
});
