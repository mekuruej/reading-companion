// Mocked persistence/UI regression checks; never connects to a real database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(file, overrides = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, crypto: require('node:crypto').webcrypto,
    require(id) { return overrides[id] ?? require(id); } });
  return module.exports;
}
const awardsLib = load('lib/books/bookAwards.ts');
const { normalizeBookAwards, validateBookAwards, bookAwardSourceUrl } = awardsLib;
const fixture = { id: 'naoki', name: 'Naoki', kind: 'award', year: '2025', result: 'winner', detail: 'Round 173', source_url: 'https://example.org/prize' };
assert.equal(normalizeBookAwards(null).length, 0);
assert.equal(normalizeBookAwards([null, 'bad', {}, { name: ' ' }]).length, 0);
assert.equal(normalizeBookAwards([{ ...fixture, id: 'kadai_tosho' }])[0].result, 'selected');
assert.equal(normalizeBookAwards([{ ...fixture, id: 'custom_1', name: ' International prize ' }])[0].name, 'International prize');
assert(validateBookAwards([{ ...fixture, year: '25' }]));
assert(validateBookAwards([{ ...fixture, name: ' ' }]));
assert(validateBookAwards([{ ...fixture, source_url: 'javascript:alert(1)' }]));
assert.equal(validateBookAwards([{ ...fixture, year: '', source_url: '' }]), null);
assert.equal(bookAwardSourceUrl('data:text/html,test'), null);
assert.equal(bookAwardSourceUrl('https://example.org'), 'https://example.org/');

function harness(initial = [], options = {}) {
  const slots = [], effects = [], calls = [];
  let cursor = 0, didEffect = false, stored = initial;
  const db = { from(table) {
    let patch, bookId;
    const q = {
      select() { return q; },
      eq(key, value) { assert.equal(key, 'id'); bookId = value; return q; },
      update(value) { patch = value; return q; },
      async single() {
        calls.push({ table, bookId, patch });
        if (options.failLoad && !patch || options.failSave && patch) return { data: null, error: { message: 'Unavailable' } };
        if (patch) stored = patch.awards;
        return { data: { awards: stored }, error: null };
      },
    };
    return q;
  } };
  const Component = load('components/books/BookAwardsSection.tsx', {
    react: { ...React,
      useState(initialValue) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initialValue;
        return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useEffect(effect) { if (!didEffect) { effects.push(effect); didEffect = true; } },
    },
    '@/lib/supabaseClient': { supabase: db }, '@/lib/books/bookAwards': awardsLib,
  }).default;
  const props = { bookId: 'book-a', canEdit: true };
  function render(overrides = {}) { cursor = 0; Object.assign(props, overrides); return Component(props); }
  function nodes(node, predicate) {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child, predicate));
    if (typeof node !== 'object') return [];
    return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
  }
  const button = (label) => nodes(render(), (node) => node.type === 'button' && node.props.children === label)[0];
  return { render, nodes, calls, options,
    async ready() { render(); effects.forEach((effect) => effect()); await new Promise((resolve) => setImmediate(resolve)); },
    click(label) { const node = button(label); assert(node, `Missing ${label}`); return node.props.onClick(); },
    html() { return renderToStaticMarkup(render()); },
    stored() { return stored; },
  };
}
(async () => {
  const ui = harness([fixture]); await ui.ready();
  assert(ui.html().includes('Round 173'));
  ui.click('Edit awards');
  let boxes = ui.nodes(ui.render(), (node) => node.type === 'input' && node.props.type === 'checkbox');
  boxes[3].props.onChange({ target: { checked: true } });
  ui.click('Add another award or selection');
  let textInputs = ui.nodes(ui.render(), (node) => node.type === 'input' && !node.props.type && !node.props.inputMode);
  textInputs.find((node) => node.props.value === '' && !node.props.placeholder).props.onChange({ target: { value: 'International Prize' } });
  await ui.click('Save awards');
  assert.equal(ui.stored().length, 3);
  assert.equal(ui.stored()[1].kind, 'selection');
  assert.equal(ui.stored()[1].result, 'selected');
  assert.equal(ui.stored()[2].name, 'International Prize');
  const write = ui.calls.find((call) => call.patch);
  assert.equal(write.bookId, 'book-a');
  assert.equal(write.table, 'books');
  assert.equal(Object.keys(write.patch).join(','), 'awards');
  // A fresh About view reads persisted entries without offering editing.
  const about = harness(ui.stored()); await about.ready();
  const aboutTree = about.render({ canEdit: false });
  const html = renderToStaticMarkup(aboutTree);
  assert(html.includes('International Prize'));
  assert(html.includes('Selected book'));
  assert(!html.includes('Edit awards'));
  // Cancel discards edits; removing all entries persists an empty list.
  ui.click('Edit awards'); ui.click('Add another award or selection'); ui.click('Cancel');
  ui.click('Edit awards');
  assert.equal(ui.nodes(ui.render(), (node) => node.type === 'button' && node.props.children === 'Remove').length, 1);
  boxes = ui.nodes(ui.render(), (node) => node.type === 'input' && node.props.type === 'checkbox');
  boxes.filter((node) => node.props.checked).forEach((node) => node.props.onChange({ target: { checked: false } }));
  ui.click('Remove'); await ui.click('Save awards'); assert.equal(ui.stored().length, 0);
  const empty = harness(); await empty.ready(); assert.equal(empty.render({ canEdit: false }), null);
  const badSource = harness([{ ...fixture, source_url: 'javascript:alert(1)' }]); await badSource.ready();
  assert(!badSource.html().includes('javascript:'));
  const failed = harness([fixture], { failSave: true }); await failed.ready();
  failed.click('Edit awards'); failed.click('Add another award or selection');
  await failed.click('Save awards');
  assert(failed.html().includes('Enter a name'));
  assert(!failed.calls.some((call) => call.patch));
  failed.click('Remove'); await failed.click('Save awards');
  assert(failed.html().includes('Your edits are still here'));
  assert(failed.html().includes('Save awards'));
  failed.options.failSave = false; await failed.click('Save awards');
  assert(failed.html().includes('Edit awards'));
  const failedLoad = harness([], { failLoad: true }); await failedLoad.ready();
  assert(failedLoad.html().includes('could not be loaded'));
  assert(!failedLoad.html().includes('Edit awards'));
  console.log('PASS: award validation, selection semantics, custom awards, save/reload on About, isolated book writes, cancel, removal, empty state, safe links, load failure, and failed-save retry.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
