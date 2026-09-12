const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => {
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts');
    return require(name);
  }, Date, Intl });
  return module.exports;
}
const { hasAbilityCheckRestDays } = load('lib/abilityCheckSpacing.ts');
const { computeLibraryStudyColorStatus: color } = load('lib/libraryStudyColor.ts');
const friday = '2026-09-11T14:59:00Z'; // Friday 23:59 in Tokyo.
for (const now of ['2026-09-11T14:59:30Z', '2026-09-11T15:00:00Z', '2026-09-13T14:59:59Z']) {
  assert.equal(hasAbilityCheckRestDays(friday, new Date(now)), false);
}
assert.equal(hasAbilityCheckRestDays(friday, new Date('2026-09-13T15:00:00Z')), true);
assert.equal(hasAbilityCheckRestDays(null), true);
assert.equal(hasAbilityCheckRestDays('invalid'), true);
assert.equal(hasAbilityCheckRestDays('2099-01-01'), false);
assert.equal(color({encounterCount: 0}).color, 'none');
for (const encounterCount of [0, 1, 2, 3, 10]) {
  const status = color({encounterCount, claimedGreen: true});
  assert.equal(status.color, 'green');
  assert.equal(status.eligibleForLibraryStudy, true);
  assert.equal(status.nextGate, 'reading');
}
assert.equal(color({encounterCount: 0, claimedGreen: true, readingGate: 'passed'}).color, 'blue');
assert.equal(color({encounterCount: 0, claimedGreen: true, readingGate: 'failed'}).color, 'grey');
assert.equal(color({encounterCount: 0, claimedGreen: true, mastered: true}).color, 'purple');
assert.notEqual(color({encounterCount: 3, claimedGreen: true, heldBeforeReadingGate: true}).color, 'green');
console.log('Ability Check spacing and Green claim regression checks passed.');
