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

// Execute the page's actual history query against synthetic owner-scoped rows.
const pageSource = fs.readFileSync('app/(protected)/library-study/advanced/page.tsx', 'utf8');
const historySource = pageSource.match(/async function loadHasPriorAbilityCheckActivity[\s\S]*?\n}\n/)[0];
const { hasAbilityCheckActivity, shouldShowAbilityCheckReadinessIntro: shouldShowIntro } = loadReadinessHelpers();
function makeHistoryLoader(rows, failure = null) {
  const query = {
    from(table) { assert.equal(table, 'user_library_word_progress'); return query; },
    select(columns) { assert.ok(columns.includes('meaning_gate_attempts')); return query; },
    eq(column, value) { assert.equal(column, 'user_id'); query.owner = value; return query; },
    or(expression) { query.conditions = expression.split(','); return query; },
    limit(value) { assert.equal(value, 1); return query; },
    async maybeSingle() {
      if (failure) return { data: null, error: failure };
      const data = rows.find(row => row.user_id === query.owner && query.conditions.some(condition => {
        const [column, operator, value] = condition.split('.');
        if (row[column] == null) return false;
        if (operator === 'gt') return row[column] > Number(value);
        if (operator === 'neq') return row[column] !== value;
        if (operator === 'eq') return row[column] === (value === 'true');
        throw new Error(`Unexpected query operator ${operator}`);
      }));
      return { data: data ?? null, error: null };
    },
  };
  const js = ts.transpileModule(historySource, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function('supabase', 'hasAbilityCheckActivity', js + '\nreturn loadHasPriorAbilityCheckActivity;')(query, hasAbilityCheckActivity);
}
const untouched = {
  user_id: 'owner', definition_key: '', reading_gate_status: 'not_started',
  meaning_gate_status: 'not_started', reading_gate_attempts: 0, meaning_gate_attempts: 0, mastered: false,
};

test('confirmed first-time users keep the original introduction and 110-word cutoff', async () => {
  for (const rows of [[], [untouched]]) {
    const history = await makeHistoryLoader(rows)('owner');
    assert.equal(history, false);
    for (const count of [0, 99, 100, 109]) {
      assert.equal(shouldShowIntro({ hasPriorAbilityCheckActivity: history, eligibleWordCount: count, abilityCheckTarget: 100 }), true);
    }
    assert.equal(shouldShowIntro({ hasPriorAbilityCheckActivity: history, eligibleWordCount: 110, abilityCheckTarget: 100 }), false);
  }
});

test('established users are detected through either attempts, gate statuses, or mastery', async () => {
  for (const activity of [
    { reading_gate_attempts: 1 }, { meaning_gate_attempts: 1 },
    { reading_gate_status: 'failed' }, { meaning_gate_status: 'passed' }, { mastered: true },
  ]) {
    const history = await makeHistoryLoader([{ ...untouched, ...activity }])('owner');
    assert.equal(history, true);
    assert.equal(shouldShowIntro({ hasPriorAbilityCheckActivity: history, eligibleWordCount: 0, abilityCheckTarget: 100 }), false);
  }
});

test('hidden vocabulary and alternate definitions retain history outside the eligible summary sample', async () => {
  const rows = [{ ...untouched, definition_key: 'alternate-sense', study_identity_key: 'outside-summary-sample', personally_hidden: true, meaning_gate_attempts: 1 }];
  const history = await makeHistoryLoader(rows)('owner');
  assert.equal(history, true);
  assert.equal(shouldShowIntro({ hasPriorAbilityCheckActivity: history, eligibleWordCount: 0, abilityCheckTarget: 100 }), false);
  // The mock exposes only the history table; summary/definition filtering would fail the test.
});

test('another user\'s history cannot suppress a first-time owner introduction', async () => {
  const history = await makeHistoryLoader([{ ...untouched, user_id: 'other', mastered: true }])('owner');
  assert.equal(history, false);
  assert.equal(shouldShowIntro({ hasPriorAbilityCheckActivity: history, eligibleWordCount: 0, abilityCheckTarget: 100 }), true);
});

test('failed history lookup remains unknown in the actual page catch path and suppresses the intro', async () => {
  const failure = new Error('synthetic history lookup failure');
  const loader = makeHistoryLoader([], failure);
  await assert.rejects(loader('owner'), failure);
  const start = pageSource.indexOf('let hasPriorAbilityCheckActivity: boolean | null = null;');
  const end = pageSource.indexOf('\n                        try {\n                            progressRows', start);
  assert.ok(start >= 0 && end > start);
  const js = ts.transpileModule('async function run() {\n' + pageSource.slice(start, end) + '\nreturn hasPriorAbilityCheckActivity; }', {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const run = new Function('loadHasPriorAbilityCheckActivity', 'user', 'console', js + '\nreturn run;')(loader, { id: 'owner' }, { warn() {} });
  const history = await run();
  assert.equal(history, null);
  assert.equal(shouldShowIntro({ hasPriorAbilityCheckActivity: history, eligibleWordCount: 0, abilityCheckTarget: 100 }), false);
});
