import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const base = 'app/(protected)/books/[userBookId]/';
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(base + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(require, mod, mod.exports);
  return mod.exports;
}
const { getBookUse, changeBookUse } = load('bookUse.ts');
test('saved fields derive Both by default and distinguish the invalid combination', () => {
  for (const personal of ['want_to_read', 'reading', 'finished', 'dnf']) {
    for (const teaching of [null, 'considering', 'currently_teaching', 'previously_taught']) assert.equal(getBookUse(personal, teaching), 'both');
    assert.equal(getBookUse(personal, 'not_for_teaching'), 'personal_only');
  }
  assert.equal(getBookUse('not_tracking', null), 'teaching_only');
  assert.equal(getBookUse('not_tracking', 'not_for_teaching'), 'neither');
});
test('all direct transitions use existing fields and never introduce Neither', async () => {
  for (const personalStatus of ['reading', 'finished', 'not_tracking']) {
    for (const teachingStatus of [null, 'currently_teaching', 'not_for_teaching']) {
      for (const nextUse of ['both', 'personal_only', 'teaching_only']) {
        let personal = personalStatus, teaching = teachingStatus;
        const result = await changeBookUse({ nextUse, personalStatus, teachingStatus,
          savePersonal: async status => { personal = status; assert.notEqual(getBookUse(personal, teaching), 'neither'); return true; },
          saveTeaching: async status => { teaching = status; assert.notEqual(getBookUse(personal, teaching), 'neither'); return true; },
        });
        assert.equal(result, true);
        assert.equal(getBookUse(personal, teaching), nextUse);
        if (personalStatus !== 'not_tracking' && nextUse !== 'teaching_only') assert.equal(personal, personalStatus);
        if (teachingStatus === 'currently_teaching' && nextUse !== 'personal_only') assert.equal(teaching, teachingStatus);
      }
    }
  }
});
test('failed first step stops the transition; failed second step leaves a valid saved state', async () => {
  const calls = [];
  assert.equal(await changeBookUse({ nextUse: 'teaching_only', personalStatus: 'reading', teachingStatus: 'not_for_teaching',
    saveTeaching: async () => { calls.push('teaching'); return false; }, savePersonal: async () => { calls.push('personal'); return true; } }), false);
  assert.deepEqual(calls, ['teaching']);
  let personal = 'not_tracking', teaching = null;
  assert.equal(await changeBookUse({ nextUse: 'personal_only', personalStatus: personal, teachingStatus: teaching,
    savePersonal: async status => { personal = status; return true; }, saveTeaching: async () => false }), false);
  assert.equal(getBookUse(personal, teaching), 'both');
});
test('section names each use and clearly flags Neither and unavailable data', () => {
  const Component = load('components/BookUseSection.tsx').default;
  for (const currentUse of ['both', 'personal_only', 'teaching_only', 'neither', null]) {
    const html = renderToStaticMarkup(createElement(Component, { currentUse, saving: false, disabled: currentUse === null, error: null, onChange() {} }));
    for (const text of ['How I use this book', 'Both', 'Personal Only', 'Teaching Only']) assert.ok(html.includes(text));
    assert.equal(html.includes('Needs attention'), currentUse === 'neither');
    assert.equal(html.includes('Unavailable'), currentUse === null);
  }
});

const pageSource = fs.readFileSync(base + 'page.tsx', 'utf8');
const ast = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function pageFunction(name, env) {
  let source;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) source = node.getText(ast); ts.forEachChild(node, visit); }
  visit(ast);
  assert.ok(source);
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(env), code + ';return ' + name)(...Object.values(env));
}
test('original controls reject changes that would produce Neither before any write', async () => {
  let error;
  const personalSave = pageFunction('savePersonalTrackingStatus', {
    row: { id: 'book' }, savingBookStatus: false, personalTrackingStatus: 'reading',
    isOwnBookHub: true, isTeacherContext: true,
    teacherBookRelationship: { teaching_status: 'not_for_teaching' },
    setBookStatusError: value => { error = value; },
  });
  assert.equal(await personalSave('not_tracking'), false);
  assert.match(error, /How I use this book/);
  const teachingSave = pageFunction('saveTeachingStatus', {
    row: { id: 'book' }, userId: 'teacher', teachingStatusSaving: false,
    isOwnBookHub: true, isTeacherContext: true, personalTrackingStatus: 'not_tracking',
    teachingStatusDraft: 'not_for_teaching', setTeachingStatusError: value => { error = value; },
  });
  await teachingSave();
  assert.match(error, /Personal Only/);
});
test('direct book-use updates remain owner/teacher-only and require loaded relationship data', async () => {
  for (const override of [{ isOwnBookHub: false }, { isTeacherContext: false }, { bookUseLoaded: false }]) {
    const handler = pageFunction('saveBookUse', {
      row: { id: 'book' }, userId: 'teacher', isOwnBookHub: true, isTeacherContext: true,
      bookUseLoaded: true, bookUseSaving: false, savingBookStatus: false, teachingStatusSaving: false,
      ...override,
    });
    await handler('personal_only');
  }
});
