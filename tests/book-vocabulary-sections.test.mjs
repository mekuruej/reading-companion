import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = path.join(root, 'lib/vocabulary/wordSections.ts');
const helperSource = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helperModule = { exports: {} };
const helperRequire = (id) => {
  if (id === './wordPosition') {
    return {
      wordPosition: (row) => row.position_unit
        ? { unit: row.position_unit, value: row.position_value ?? null }
        : row.page_number != null
          ? { unit: 'page', value: row.page_number }
          : row.percent_location != null
            ? { unit: 'percent', value: row.percent_location }
            : { unit: 'page', value: null },
    };
  }
  throw new Error(`Unexpected test dependency: ${id}`);
};
new Function('require', 'module', 'exports', helperSource)(helperRequire, helperModule, helperModule.exports);
const {
  AUTOMATIC_WORD_SECTION_SIZE,
  getAutomaticWordSectionOptions,
  selectAutomaticWordSection,
  shouldUseAutomaticWordSections,
  compareVocabularyReadingOrder,
} = helperModule.exports;

function makeWords(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `word-${String(index).padStart(4, '0')}`,
    chapter_number: null,
    page_number: index + 1,
    page_order: 1,
    created_at: '2026-10-21T00:00:00.000Z',
  }));
}

for (const count of [0, 100, 200]) {
  test(`${count} chapterless words keep the normal list without automatic sections`, () => {
    assert.equal(shouldUseAutomaticWordSections(false, count), false);
  });
}

for (const count of [201, 1000, 1237]) {
  test(`${count} chapterless words offer dynamic 100-word sections plus All Words`, () => {
    assert.equal(shouldUseAutomaticWordSections(false, count), true);
    const options = getAutomaticWordSectionOptions(count);
    assert.equal(options[0].value, 'all');
    assert.equal(options[0].label, 'All Words');
    assert.equal(options[1].label, 'Words 1–100');
    assert.equal(options.at(-1).label, `Words ${Math.floor((count - 1) / 100) * 100 + 1}–${count}`);
  });
}

test('books with chapter metadata never receive automatic word sections', () => {
  for (const count of [201, 1000, 5000]) {
    assert.equal(shouldUseAutomaticWordSections(true, count), false);
  }
});

test('section boundaries are inclusive, stable, and have no gaps or duplicates', () => {
  const words = makeWords(1000).sort(compareVocabularyReadingOrder);
  const sections = Array.from({ length: 10 }, (_, index) =>
    selectAutomaticWordSection(words, String(index), false)
  );
  assert.deepEqual(sections.map((section) => section.length), Array(10).fill(100));
  assert.equal(sections[0][0].id, 'word-0000');
  assert.equal(sections[0].at(-1).id, 'word-0099');
  assert.equal(sections[1][0].id, 'word-0100');
  assert.equal(sections[9].at(-1).id, 'word-0999');
  const flattened = sections.flat().map((word) => word.id);
  assert.equal(new Set(flattened).size, words.length);
  assert.deepEqual(flattened, words.map((word) => word.id));
});

test('section order follows reading position then page order, creation time, and stable ID', () => {
  const rows = [
    { id: 'later-created', chapter_number: null, page_number: 8, page_order: 1, created_at: '2026-10-21T00:00:02Z' },
    { id: 'second-on-page', chapter_number: null, page_number: 8, page_order: 2, created_at: '2026-10-21T00:00:01Z' },
    { id: 'first-tie-b', chapter_number: null, page_number: 8, page_order: 1, created_at: '2026-10-21T00:00:01Z' },
    { id: 'first-tie-a', chapter_number: null, page_number: 8, page_order: 1, created_at: '2026-10-21T00:00:01Z' },
    { id: 'earlier-page', chapter_number: null, page_number: 7, page_order: 50, created_at: '2026-10-21T00:00:03Z' },
  ];
  rows.sort(compareVocabularyReadingOrder);
  assert.deepEqual(rows.map((row) => row.id), [
    'earlier-page', 'first-tie-a', 'first-tie-b', 'later-created', 'second-on-page',
  ]);
});

test('All Words and search selection return the entire currently sorted book result set', () => {
  const words = makeWords(1237);
  assert.deepEqual(selectAutomaticWordSection(words, 'all', false), words);
  assert.deepEqual(selectAutomaticWordSection(words, '5', true), words);
});

test('a final partial section is retained and stale section choices clamp safely', () => {
  const words = makeWords(201);
  assert.deepEqual(selectAutomaticWordSection(words, '2', false).map((word) => word.id), ['word-0200']);
  assert.deepEqual(selectAutomaticWordSection(words, '99', false), [words[200]]);
  assert.equal(AUTOMATIC_WORD_SECTION_SIZE, 100);
});

test('sections affect mobile/desktop rendering only; CSV, edits and reordering retain the full collection', () => {
  const page=fs.readFileSync(path.join(root,'app/(protected)/books/[userBookId]/words/page.tsx'),'utf8');
  assert.equal((page.match(/displayedWords\.map\(\(w\) =>/g)??[]).length,2);
  assert.match(page,/visibleCount=\{displayedWords\.length\}/);
  assert.match(page,/const exportWords = useMemo\([\s\S]*?\(\) => words\.filter/);
  assert.match(page,/function moveWordInGroup[\s\S]*?const group = sortWithinGroup\(words\.filter/);
  assert.match(page,/function wordOrderPosition[\s\S]*?const group = sortWithinGroup\(words\.filter/);
  assert.match(page,/useState\("0"\)/);
  assert.match(page,/setWordSection\("0"\); \}, \[userBookId\]\)/);
  assert.match(page,/<div hidden=\{exportExpanded\}>/);
});

test('Jump to Bottom continues targeting the bottom of rendered content', () => {
  const bottomButton = fs.readFileSync(path.join(root, 'app/(protected)/books/[userBookId]/words/components/BookVocabBackToTopButton.tsx'), 'utf8');
  assert.match(bottomButton, /document\.documentElement\.scrollHeight/);
});

// Execute the candidate page's real filtering and section calculations, not a duplicate implementation.
const pageSource=fs.readFileSync(path.join(root,'app/(protected)/books/[userBookId]/words/page.tsx'),'utf8');
const ast=ts.createSourceFile('page.tsx',pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function extract(predicate){let found;function visit(n){if(predicate(n))found=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(found);return found.getText(ast);}
const namedFunction=name=>extract(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
const variable=name=>extract(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name));
const variables=['filtered','filteredSorted','hasChapterMetadata','automaticSectionsEnabled','automaticSectionOptions','effectiveWordSection','displayedWords','exportWords'];
const pipeline=ts.transpileModule(['normalizeJlpt','chapterKey','chapterDisplayParts'].map(namedFunction).join('\n')+'\nfunction run(words,query,chapterFilter,showHidden,wordSection,exportChapter="all",exportJlpt="all"){'+variables.map(variable).join('\n')+';return {displayedWords,filteredSorted,automaticSectionOptions,effectiveWordSection,exportWords};}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const selectWords=new Function('useMemo','compareVocabularyReadingOrder','getAutomaticWordSectionOptions','selectAutomaticWordSection','shouldUseAutomaticWordSections','wordPositionText',pipeline+';return run;')(fn=>fn(),compareVocabularyReadingOrder,getAutomaticWordSectionOptions,selectAutomaticWordSection,shouldUseAutomaticWordSections,row=>`Page ${row.page_number}`);
const sample=count=>makeWords(count).map((w,i)=>({...w,surface:`word ${i+1}`,meaning:i===1200?'needle':'ordinary',chapter_name:null,hidden:false,jlpt:'N5'}));
test('page pipeline defaults to first 100, searches beyond 1000, and restores selection after clearing',()=>{
 const rows=sample(1237);
 assert.equal(selectWords(rows,'','all',false,'0').displayedWords.length,100);
 const later=selectWords(rows,'','all',false,'12');assert.equal(later.displayedWords.length,37);assert.equal(later.displayedWords[0].surface,'word 1201');
 const search=selectWords(rows,'needle','all',false,'0');assert.deepEqual(search.displayedWords.map(w=>w.id),[rows[1200].id]);assert.equal(search.exportWords.length,1237);
 assert.equal(selectWords(rows,'   ','all',false,'12').displayedWords.length,37);
 assert.equal(selectWords(rows,'','all',false,'all').displayedWords.length,1237);
});
test('page pipeline preserves chapter/visibility filtering, threshold, export independence, and valid shrunken selection',()=>{
 for(const count of [0,100,200]){const result=selectWords(sample(count),'','all',false,'0');assert.equal(result.automaticSectionOptions,undefined);assert.equal(result.displayedWords.length,count);}
 const rows=sample(201);assert.equal(selectWords(rows,'','all',false,'99').effectiveWordSection,'2');assert.equal(selectWords(rows,'','all',false,'99').displayedWords.length,1);
 rows[0].chapter_name='Opening';const chaptered=selectWords(rows,'','all',false,'0');assert.equal(chaptered.automaticSectionOptions,undefined);assert.equal(chaptered.displayedWords.length,201);
 assert.equal(selectWords(rows,'','||Opening',false,'0').displayedWords.length,1);
 rows[1].hidden=true;rows[2].follow_along_hidden=true;rows[3].flashcard_hidden=true;
 const hidden=selectWords(rows,'','all',true,'all');assert.deepEqual(hidden.displayedWords.map(w=>w.id),rows.slice(1,4).map(w=>w.id));
 assert.equal(selectWords(sample(1237),'needle','all',false,'0','missing').exportWords.length,0);
});

test('rendered controls select the requested range and retain ordinary chapter controls when unsplit',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const file=path.join(root,'app/(protected)/books/[userBookId]/words/components/BookVocabFilterPanel.tsx');
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};new Function('require','exports',compiled)(require,exports);const Panel=exports.default;
 const props={query:'',showHidden:false,chapterFilter:'all',chapterOptions:[],onQueryChange(){},onShowHiddenChange(){},onChapterFilterChange(){}};
 const normal=renderToStaticMarkup(React.createElement(Panel,props));assert.doesNotMatch(normal,/Browse by section/);assert.match(normal,/All chapters/);
 const sections=renderToStaticMarkup(React.createElement(Panel,{...props,sectionOptions:getAutomaticWordSectionOptions(1237),sectionFilter:'12',searchCoversWholeBook:true}));
 assert.match(sections,/<option value="12" selected="">Words 1201–1237<\/option>/);assert.match(sections,/All Words/);assert.match(sections,/Search results include all words in this book/);assert.doesNotMatch(sections,/All chapters/);
});
