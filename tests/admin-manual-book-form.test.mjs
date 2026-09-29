import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'));
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const base = 'app/(protected)/teacher/books/add/components/';
const nodes = t => !t || typeof t !== 'object' ? [] : Array.isArray(t) ? t.flatMap(nodes) : [t, ...nodes(t.props?.children)];
const text = t => t == null ? '' : typeof t !== 'object' ? String(t) : Array.isArray(t) ? t.map(text).join('') : text(t.props?.children);
const Actions = load(base + 'TeacherBookFindCreateActions.tsx').TeacherBookFindCreateActions;
const CoreFields = load('components/books/EditionCoreFields.tsx').default;
const { EDITION_FORMAT_OPTIONS, missingCoreBookFields } = load('lib/books/bookMetadata.ts');
const { COMMON_BOOK_LANGUAGE_OPTIONS } = load('lib/books/bookLanguage.ts');

test('manual creation requires four visible core inputs and uses existing controlled selectors', () => {
  const tree = nodes(CoreFields({ title: '', author: '', languageCode: '', editionFormat: '', narrator: '' }));
  const required = tree.filter(n => n.props?.required);
  assert.equal(required.length, 4);
  assert.equal(required.filter(n => n.type === 'input').length, 2);
  const selects = required.filter(n => n.type === 'select');
  assert.deepEqual(nodes(selects[0]).filter(n => n.type === 'option').map(n => n.props.value), ['', ...COMMON_BOOK_LANGUAGE_OPTIONS.map(o => o.code)]);
  assert.deepEqual(nodes(selects[1]).filter(n => n.type === 'option').map(n => n.props.value), ['', ...EDITION_FORMAT_OPTIONS.map(o => o.value)]);
});

test('ISBN lookup stays enabled while incomplete manual creation is disabled', () => {
  let lookedUp = 0;
  const tree = nodes(Actions({ isbnLookupLoading: false, hasIsbnValue: true, saving: false,
    missingCoreFields: ['title', 'author', 'language', 'format'], onLookupIsbn: () => lookedUp++ }));
  const buttons = tree.filter(n => n.type === 'button');
  const lookup = buttons.find(n => text(n) === 'Look up ISBN');
  const create = buttons.find(n => text(n) === 'Create Manual Book Entry');
  assert.equal(lookup.props.disabled, false); assert.equal(lookup.props.type, 'button');
  assert.equal(create.props.disabled, true); assert.equal(create.props.type, 'button');
  lookup.props.onClick(); assert.equal(lookedUp, 1);
});

test('manual create enables only after all core metadata is complete; identifiers remain optional', () => {
  const complete = { title: 'Book', author: 'Author', language_code: 'ja', edition_format: 'ebook' };
  for (const field of ['title', 'author', 'language_code', 'edition_format', null]) {
    const book = field ? { ...complete, [field]: '' } : complete;
    const tree = nodes(Actions({ isbnLookupLoading: false, hasIsbnValue: false, saving: false,
      missingCoreFields: missingCoreBookFields(book) }));
    assert.equal(tree.find(n => n.type === 'button' && text(n) === 'Create Manual Book Entry').props.disabled, field !== null);
  }
});

test('ISBN preview permits opening existing sparse records but requires completed fields for a new record', () => {
  const Preview = load(base + 'TeacherBookIsbnPreviewCard.tsx').TeacherBookIsbnPreviewCard;
  for (const existing of [true, false]) {
    const tree = nodes(Preview({ preview: { found_existing_book: existing, title: 'Book', isbn13: '9780008742768' },
      saving: false, missingCoreFields: ['author', 'language', 'format'], metadataSourceLabel: () => 'Catalog' }));
    const button = tree.find(n => n.type === 'button');
    assert.equal(button.props.disabled, !existing);
  }
});
