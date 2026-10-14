import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadReadinessHelpers() {
  const file = 'lib/study/advancedStudyReadiness.ts';
  const compiledModule = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const libraryStudyColor = {
    computeLibraryStudyColorStatus: () => ({ color: 'none' }),
  };
  new Function('require', 'module', 'exports', js)(
    (name) => {
      if (name === '@/lib/libraryStudyColor') return libraryStudyColor;
      throw new Error(`Unexpected dependency: ${name}`);
    },
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}

test('Ability Check intro requires a confirmed first-time history lookup and a low eligible count', () => {
  const { hasAbilityCheckActivity, shouldShowAbilityCheckReadinessIntro: shouldShow } = loadReadinessHelpers();
  const target = 100;

  // An established user remains established even when personal hiding leaves
  // no currently eligible words for the readiness calculation.
  const previousAttempt = hasAbilityCheckActivity([{
    reading_gate_status: 'failed',
    meaning_gate_status: 'not_started',
    reading_gate_attempts: 1,
    meaning_gate_attempts: 0,
  }]);
  assert.equal(shouldShow({ hasPriorAbilityCheckActivity: previousAttempt, eligibleWordCount: 0, abilityCheckTarget: target }), false);

  // Completed Ability Checks leave progress activity and must not reset the UI.
  const completedCheck = hasAbilityCheckActivity([{
    reading_gate_status: 'passed',
    meaning_gate_status: 'passed',
    reading_gate_attempts: 1,
    meaning_gate_attempts: 1,
    mastered: true,
  }]);
  assert.equal(shouldShow({ hasPriorAbilityCheckActivity: completedCheck, eligibleWordCount: 0, abilityCheckTarget: target }), false);

  assert.equal(hasAbilityCheckActivity([]), false);
  assert.equal(shouldShow({ hasPriorAbilityCheckActivity: false, eligibleWordCount: 99, abilityCheckTarget: target }), true);
  assert.equal(shouldShow({ hasPriorAbilityCheckActivity: null, eligibleWordCount: 0, abilityCheckTarget: target }), false);
});

test('readiness counts continue to use the study-eligible view while history is queried independently', () => {
  const page = fs.readFileSync('app/(protected)/library-study/advanced/page.tsx', 'utf8');
  const summaryLoader = page.match(/async function loadAdvancedStudySummaryRows[\s\S]*?\n}\n/);
  const historyLoader = page.match(/async function loadHasPriorAbilityCheckActivity[\s\S]*?\n}\n/);

  assert.ok(summaryLoader, 'summary loader exists');
  assert.match(summaryLoader[0], /from\("study_available_library_word_summaries"\)/);
  assert.ok(historyLoader, 'independent history loader exists');
  assert.match(historyLoader[0], /from\("user_library_word_progress"\)/);
  assert.match(historyLoader[0], /\.eq\("user_id", userId\)/);
  assert.match(historyLoader[0], /reading_gate_attempts\.gt\.0/);
  assert.match(historyLoader[0], /meaning_gate_attempts\.gt\.0/);
  assert.doesNotMatch(historyLoader[0], /definition_key/);
  assert.doesNotMatch(historyLoader[0], /study_available_library_word_summaries/);
});
