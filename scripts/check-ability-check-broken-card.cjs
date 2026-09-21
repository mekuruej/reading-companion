// Mocked broken-card handling: no real database or study progress is touched.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/(protected)/library-study/check/page.tsx'), 'utf8');
const ast = ts.createSourceFile('check.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'flagCurrentCard') handler = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast); assert(handler);
const compile = (code) => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
async function run({ claim = false, fail = false, empty = false, allowed = true, busy = false } = {}) {
  const writes = []; const notices = []; let advances = 0; const locks = [];
  const context = {
    canUseAbilityCheck: allowed, currentUserId: 'owner',
    currentCard: { id: claim ? 'claim:word' : 'word', userBookId: 'book' },
    brokenCardIdsRef: { current: new Set() },
    flaggingCardRef: { current: busy }, setIsFlaggingCard: (value) => locks.push(value),
    isClaimCardId: (id) => id.startsWith('claim:'), setNotice: (message) => notices.push(message),
    nextCardWithoutMarkingSeen: () => { advances++; },
    supabase: { from(table) {
      const write = { table, filters: [] }; writes.push(write);
      const query = {
        update(payload) { write.payload = payload; return query; },
        eq(...filter) { write.filters.push(filter); return query; },
        select() { return query; },
        async maybeSingle() { return { data: fail || empty ? null : { id: 'word' }, error: fail ? { message: 'Failed' } : null }; },
      };
      return query;
    } },
  };
  vm.createContext(context);
  await vm.runInContext(compile(handler) + '; flagCurrentCard();', context);
  return { writes, notices, advances, locks, skipped: context.brokenCardIdsRef.current };
}
(async () => {
  const saved = await run();
  assert.equal(saved.advances, 1);
  assert(saved.skipped.has("word"));
  assert.equal(saved.writes.length, 1);
  assert.equal(saved.writes[0].table, 'user_book_words');
  assert.deepEqual(Object.keys(saved.writes[0].payload).sort(), ['flagged_at', 'flagged_by_user_id', 'flagged_for_review']);
  assert.equal(saved.writes[0].payload.flagged_for_review, true);
  assert.equal(saved.writes[0].payload.flagged_by_user_id, 'owner');
  assert.deepEqual(saved.writes[0].filters, [['id', 'word'], ['user_book_id', 'book']]);
  assert.deepEqual(saved.locks, [true, false]);
  const claim = await run({ claim: true });
  assert(claim.skipped.has("claim:word"));
  assert.equal(claim.advances, 1); assert.equal(claim.writes.length, 0);
  assert(claim.notices[0].includes('claim and progress are unchanged'));
  for (const options of [{ fail: true }, { empty: true }, { allowed: false }, { busy: true }]) {
    assert.equal((await run(options)).advances, 0, JSON.stringify(options));
  }
  const mod = { exports: {} };
  vm.runInNewContext(compile(fs.readFileSync(path.join(root, 'app/(protected)/library-study/check/components/AbilityCheckActionPanel.tsx'), 'utf8')), { module: mod, exports: mod.exports, require });
  const html = renderToStaticMarkup(React.createElement(mod.exports.default, { meaningReviewCount: 0, canComeBackLater: true, canRestartCurrentCard: true }));
  assert(html.includes('Broken card — skip'));
  assert(!html.includes('Shuffle'));
  assert(!html.includes('>Skip<'));
  assert(html.includes('Send back to Red'));
  console.log('PASS: broken-card report and skip, ownership filters, no hidden/deleted words or progress writes, claim preservation, failed report stays put, double-submit guard, and no ordinary Skip/Shuffle in Ability Check.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
