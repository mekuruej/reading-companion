import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const base = 'app/(protected)/books/[userBookId]/curiosity-reading/';
const source = fs.readFileSync(base + 'WordTimerExperience.tsx', 'utf8');
const ast = ts.createSourceFile('capture.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function load(file) {
  const exports = {};
  new Function('require', 'exports', compile(fs.readFileSync(file, 'utf8')))(name => {
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? name.slice(2) : path.resolve(path.dirname(file), name);
      return load(['.ts', '.tsx'].map(ext => target + ext).find(fs.existsSync));
    }
    return require(name);
  }, exports);
  return exports;
}
function extract(name) {
  let result;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(result, name); return result;
}
const lookup = load('lib/libraryStudyColorLookup.ts');
const Row = load(base + 'components/CuriosityQuickSearchRow.tsx').default;
const key = lookup.makeLibraryStudyColorKey('本', 'ほん');
const noop = () => {};
function harness({ count = 0, settings = {}, progress = {} } = {}) {
  let colors = {}, failSave = false, releaseRead, readGate = Promise.resolve();
  const writes = [], persisted = [];
  const draft = { id:null, surface:'本', reading:'ほん', meaning:'book', meanings:['book'], selectedMeaningIndex:0,
    isCustomMeaning:false, cacheSurface:'本', alternateSurface:'', page:'', chapterNumber:'', chapterName:'' };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id:'reader' } } }) },
    from(table) {
      let payload;
      const query = {};
      for (const method of ['select','eq','in','maybeSingle']) query[method] = () => query;
      query.insert = value => { assert.equal(table,'user_book_words'); payload=value; writes.push(value); return query; };
      query.single = async () => {
        if (failSave) return {error:{message:'Save failed'}};
        count++;
        const data={...payload,id:String(count)}; persisted.push(data);
        return {data,error:null};
      };
      query.then = async resolve => {
        await readGate;
        const data = {
          user_learning_settings:{red_stages:1,orange_stages:1,yellow_stages:1,...settings},
          user_library_word_summaries:count ? [{study_identity_key:'book',surface:'本',reading:'ほん',total_encounter_count:count}] : [],
          user_library_word_progress:[{study_identity_key:'book',definition_key:'',...progress}],
          vocabulary_cache:{id:1},
        };
        assert.ok(table in data, table);
        return resolve({data:data[table],error:null});
      };
      return query;
    },
  };
  const env = {
    supabase:client, fetchLibraryStudyColorInfoByWord:lookup.fetchLibraryStudyColorInfoByWord,
    isListeningMode:false,isEnglishBook:false,cancelled:false,quickSessionWords:[],quickPreview:draft,
    setLibraryColorByWordKey: value => { colors=value; },
    userBookId:'book',canAccessBook:true,canUseCuriosityReading:true,studentContext:null,
    positionUnit:'page',hideKanjiInReadingSupport:false,
    parseWordPosition:()=>({value:null}),wordPositionPayload:()=>({}),wordContextPayload:()=>({}),
    isReadyForFlashcards:()=>true,getNextPageOrder:async()=>1,wordPositionInput:()=>'',wordPosition:()=>({unit:'page'}),
    upsertAndSortQuickSessionWords:(rows,item)=>[...rows,item],
    setQuickSessionWords: fn => {env.quickSessionWords=fn(env.quickSessionWords);},
    tracking:{refreshSummary:noop},setChapterNameOptions:noop,setChapterNumberByName:noop,
    setSavedQuickNotice:noop,setLastSavedWordContext:noop,setMessage:noop,setQuickError:noop,hasKanji:()=>false,
    clearQuickWordFields:()=>{env.quickPreview={...draft,surface:'',reading:''};},
    console:{error:noop},
  };
  // Execute the real async caller and persistence function, as in existing capture tests.
  const fns = new Function('env', `with(env) { ${compile(extract('loadLibraryColors')+'\n'+extract('persistQuickWord'))}; return {loadLibraryColors,persistQuickWord}; }`)(env);
  return {
    lookup:()=>fns.loadLibraryColors(),save:()=>fns.persistQuickWord(draft,{}),writes,persisted,
    fail:()=>{failSave=true;},succeed:()=>{failSave=false;},
    deferRead:()=>{readGate=new Promise(resolve=>{releaseRead=resolve;});},release:()=>releaseRead(),
    info:()=>colors[key] ?? null,
    badge:()=>renderToStaticMarkup(React.createElement(Row,{surface:'本',reading:'ほん',quickLoading:false,
      quickPreviewLibraryColorInfo:colors[key] ?? null,quickWordInputRef:{current:null},onSurfaceChange:noop,onSearch:noop,onSearchKeyDown:noop})),
  };
}
test('new lookup stays visibly unsaved before and after the async response, with no writes',async()=>{
  const h=harness();h.deferRead();const pending=h.lookup();
  assert.match(h.badge(),/Not in library yet/);
  h.release();await pending;
  assert.equal(h.info(),null);assert.match(h.badge(),/Not in library yet/);assert.deepEqual(h.writes,[]);
});
test('failed first Save stays unsaved; successful first Save refreshes from the persisted encounter',async()=>{
  const h=harness();await h.lookup();h.fail();await h.save();await h.lookup();
  assert.match(h.badge(),/Not in library yet/);assert.equal(h.persisted.length,0);
  h.succeed();await h.save();assert.equal(h.persisted.length,1);
  h.deferRead();const refresh=h.lookup();assert.equal(h.info(),null);
  h.release();await refresh;
  assert.equal(h.info().encounterCount,1);assert.equal(h.info().colorStatus.color,'red');
  assert.doesNotMatch(h.badge(),/Not in library yet/);
});
test('saved orange stays orange through lookup and failed Save; only persisted encounter advances to yellow',async()=>{
  const h=harness({count:2});await h.lookup();assert.equal(h.info().colorStatus.color,'orange');
  await h.lookup();assert.equal(h.info().encounterCount,2);assert.equal(h.writes.length,0);
  h.fail();await h.save();await h.lookup();assert.equal(h.info().colorStatus.color,'orange');
  h.succeed();await h.save();await h.lookup();
  assert.equal(h.info().encounterCount,3);assert.equal(h.info().colorStatus.color,'yellow');
});
test('caller retains saved stage settings and learning gates',async()=>{
  for(const fixture of [
    {count:2,settings:{red_stages:2},color:'red',stage:'2'},
    {count:3,progress:{reading_gate_status:'passed'},color:'blue'},
    {count:3,progress:{meaning_gate_status:'passed'},color:'purple'},
  ]) {
    const h=harness(fixture);await h.lookup();assert.equal(h.info().colorStatus.color,fixture.color);
    if(fixture.stage)assert.equal(h.info().stageLabel,fixture.stage);
    assert.equal(h.writes.length,0);
  }
});
