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
    if (name === '@/lib/supabaseClient') return { supabase };
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts');
    return require(name);
  }, Date, Intl });
  return module.exports;
}

const summaries = Array.from({length: 1200}, (_, i) => ({study_identity_key: `word${String(i).padStart(4, '0')}`, total_encounter_count: 3}));
const progress = summaries.map((row, i) => ({...row, id: row.study_identity_key, definition_key: '', reading_gate_status: i >= 1110 ? 'passed' : 'not_started', meaning_gate_status: i >= 1110 ? 'passed' : 'not_started', mastered: i >= 1110}));
// Separate definition progress must not overwrite main-word mastery.
progress.push({...progress[1199], id: 'other-definition', definition_key: '2', mastered: false, meaning_gate_status: 'not_started'});
const claims = Array.from({length: 100}, (_, i) => ({study_identity_key: `sky${i}`, claimed_color: 'green'}));
progress.push(...claims.map(row => ({...row, id: row.study_identity_key, definition_key: '', reading_gate_status: 'passed', meaning_gate_status: 'passed', mastered: true})));
// A claim also found in a book must count only once.
claims.push({study_identity_key: summaries[1199].study_identity_key, claimed_color: 'green'});
const tables = {user_library_word_summaries: summaries, user_library_word_progress: progress, user_library_word_claims: claims};
const requests = [];
const supabase = {from(table) {
  let rows = [...tables[table]], from = 0, to = 499;
  const query = {
    select() {return query;},
    eq(field, value) {if (field !== 'user_id') rows = rows.filter(row => row[field] === value); return query;},
    order(field) {rows.sort((a,b) => String(a[field]).localeCompare(String(b[field])));return query;},
    range(start, end) {from = start; to = end; return query;},
    returns() {requests.push({table, from});return Promise.resolve({data: rows.slice(from, Math.min(to + 1, from + 500)), error: null});},
  };return query;
}};
(async () => {
 const {fetchLibraryStudyColorBreakdown} = load('lib/libraryStudyTotals.ts');
 const result = await fetchLibraryStudyColorBreakdown('test-user', {red_stages:1, orange_stages:1, yellow_stages:1});
 assert.equal(result.colorTotals.purple, 190);
 assert.equal(result.colorTotals.green, 1110);
 assert.equal(Object.values(result.colorTotals).reduce((a,b) => a+b, 0), 1300);
 for (const table of ['user_library_word_summaries','user_library_word_progress']) {
   assert.ok(requests.some(request => request.table === table && request.from === 1000));
 }
 console.log('Color totals checks passed: 190 Purple, paginated rows, main definitions, and deduplicated Word Sky claims.');
})().catch(error => {console.error(error);process.exitCode = 1;});
