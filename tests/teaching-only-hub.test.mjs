import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const base = 'app/(protected)/books/[userBookId]/';
function load(file, react) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name === 'react' && react ? react : require(name), mod, mod.exports);
  return mod.exports;
}
const nodes = t => !t || typeof t !== 'object' ? [] : Array.isArray(t) ? t.flatMap(nodes) : [t, ...nodes(t.props?.children)];
test('Teaching Only forces eligible teaching hub while preserving normal mode and eligibility', () => {
  const { resolveBookHubMode: mode } = load('lib/books/bookHubMode.ts');
  for (const requestedMode of [null, 'reader', 'teaching']) {
    assert.equal(mode({ canUseTeachingMode: true, teachingOnly: true, requestedMode }), 'teaching');
    assert.equal(mode({ canUseTeachingMode: false, teachingOnly: true, requestedMode }), 'reader');
    assert.equal(mode({ canUseTeachingMode: true, teachingOnly: false, requestedMode }), requestedMode === 'teaching' ? 'teaching' : 'reader');
  }
});
test('management actions expose owner-only move and removal and retain flag action', () => {
  const Component = load(base + 'components/BookHubManagementActions.tsx').default;
  const calls = [];
  const props = { canRemove: true, teachingOnly: true, saving: false, error: null, onFlag: () => calls.push('flag'), onRemove: () => calls.push('remove'), onMoveToLibrary: () => calls.push('move') };
  const buttons = p => nodes(Component(p)).filter(n => n.type === 'button');
  assert.deepEqual(buttons(props).map(n => n.props.children), ['Flag a problem', 'Move to My Library', 'Remove book']);
  buttons(props).forEach(n => n.props.onClick());
  assert.deepEqual(calls, ['flag', 'move', 'remove']);
  assert.deepEqual(buttons({ ...props, canRemove: false }).map(n => n.props.children), ['Flag a problem']);
  assert.deepEqual(buttons({ ...props, teachingOnly: false }).map(n => n.props.children), ['Flag a problem', 'Remove from My Library']);
  assert.ok(buttons({ ...props, saving: true }).slice(1).every(n => n.props.disabled));
});
test('Teaching Only removal explicitly removes teaching data without offering to keep it again', () => {
  const Component = load(base + 'components/RemoveFromLibraryDialog.tsx', { useState: () => [null, () => {}] }).default;
  let confirmed;
  const props = { teachingOnly: true, retainForTeaching: true, isRemoving: false, error: null, onCancel() {}, onConfirm: value => confirmed = value };
  const tree = nodes(Component(props));
  assert.equal(tree.filter(n => n.type === 'input').length, 0);
  const confirm = tree.filter(n => n.type === 'button').at(-1);
  assert.equal(confirm.props.disabled, false);
  confirm.props.onClick();
  assert.equal(confirmed, 'remove');
  assert.equal(nodes(Component({ ...props, isRemoving: true })).filter(n => n.type === 'button').at(-1).props.disabled, true);
});
test('moving uses existing status save, refreshes tracking and leaves teaching mode only after success', async () => {
  const source = ts.createSourceFile('page.tsx', fs.readFileSync(base + 'page.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn;
  const visit = node => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'moveToMyLibrary') fn = node; ts.forEachChild(node, visit); };
  visit(source);
  const code = ts.transpileModule(fn.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const calls = [];
  let saved = false;
  const move = new Function('canRemoveFromMyLibrary', 'alreadyTeachingOnly', 'savingBookStatus', 'savePersonalTrackingStatus', 'tracking', 'router', 'row', 'setBookStatusError', code + '; return moveToMyLibrary;')(true, true, false, async status => { calls.push(status); return saved; }, { refresh: async () => calls.push('refresh') }, { replace: route => calls.push(route) }, { id: 'copy' }, () => {});
  await move();
  assert.deepEqual(calls, ['want_to_read']);
  saved = true; calls.length = 0;
  await move();
  assert.deepEqual(calls, ['want_to_read', 'refresh', '/books/copy']);
});
