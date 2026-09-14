const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.join(root, 'lib/libraryStudyColor.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod, mod.exports);
const { computeLibraryStudyColorStatus: color, getRestartSupportCycle, getLibraryStudyEncounterStageCounts } = mod.exports;
for (const settings of [{ red_stages: 1, orange_stages: 1, yellow_stages: 1 }, { red_stages: 3, orange_stages: 4, yellow_stages: 2 }]) {
  for (const encounterCount of [0, 1, 3, 8, 50, 1000]) {
    for (const claimedGreen of [false, true]) {
      const cycle = getRestartSupportCycle(encounterCount, settings, 0);
      const reset = { encounterCount, settings, claimedGreen, readingGate: 'not_started', meaningGate: 'not_started', mastered: false, heldBeforeReadingGate: true, heldBeforeMeaningGate: true, preReadingSupportCycle: cycle };
      assert.equal(color(reset).color, 'red', JSON.stringify(reset));
      assert.equal(color(reset).nextGate, null);
      assert.equal(color(reset).eligibleForLibraryStudy, false);
      const baseline = getLibraryStudyEncounterStageCounts(settings).total + (cycle - 2) * 2;
      assert.equal(color({ ...reset, encounterCount: baseline + 1 }).color, 'orange');
      assert.equal(color({ ...reset, encounterCount: baseline + 2 }).color, 'yellow');
      assert.equal(color({ ...reset, mastered: true }).color, 'purple');
    }
  }
}
console.log('PASS: send-back stays Red for zero-save Word Sky claims and high-encounter words, leaves Ability Check, and advances through support with new encounters.');
