import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const source = fs.readFileSync('app/(protected)/books/[userBookId]/words/page.tsx', 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate) {
  let result;
  function visit(node) { if (predicate(node)) result = node; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(result); return result.getText(ast);
}
const fn = name => find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
const selection = find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === 'exportWords'));
const loadCall = find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'loadAllPagedRows');
function compile(text) {
  return ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
}
function moduleFrom(file) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compile(fs.readFileSync(file, 'utf8')))(require, mod, mod.exports);
  return mod.exports;
}
const { loadAllPagedRows } = moduleFrom('lib/vocabulary/loadAllPagedRows.ts');
const { wordPositionText } = moduleFrom('lib/vocabulary/wordPosition.ts');
const helperNames = ['normalizeJlpt','chapterKey','csvCell','commonCsvLabel','chapterCsvLabel','safeCsvFilenamePart','downloadCsv'];
const code = compile(helperNames.map(fn).join('\n') + '\nfunction run(words,exportChapter,exportJlpt,bookTitle,chapterOptions){\n' + selection + '\n' + fn('handleExportVocabCsv') + '\nreturn {count:exportWords.length,ids:exportWords.map(w=>w.id),download:handleExportVocabCsv};}');
function exporter(words, chapter='all', jlpt='all') {
  const blobs=[],downloads=[];
  const document = { createElement: () => ({ click(){ downloads.push(this.download); }, remove(){} }), body:{appendChild(){}} };
  const URL = {createObjectURL(blob){blobs.push(blob);return 'blob:synthetic';},revokeObjectURL(){}};
  const window = {setTimeout(fn){fn();},alert(){throw new Error('Unexpected alert');}};
  const run = new Function('wordPositionText','useMemo','Blob','URL','document','window',code+'\nreturn run;')(wordPositionText, fn=>fn(), Blob,URL,document,window);
  return {...run(words,chapter,jlpt,'Synthetic Book',[{value:'1||One',label:'Chapter 1: One'}]),blobs,downloads};
}
const rows = Array.from({length:1305},(_,i)=>({
  id:`word-${String(i).padStart(5,'0')}`, user_book_id:'book',surface:`語彙-${i+1}`,reading:'よみ',meaning:'meaning',
  chapter_number:i<700?1:2,chapter_name:i<700?'One':'Two',page_number:i+1,page_order:1,created_at:'2026-01-01',
  jlpt:i%2?'N4':'N5',hidden:i%101===0,follow_along_hidden:i%103===0,flashcard_hidden:i%107===0,
  is_common:i%2===0,meaning_choice_index:0,
}));
async function load(showHidden=false) {
  const ranges=[];
  const supabase={from(table){assert.equal(table,'personal_user_book_words');let selected=rows,expectedBook=false;const query={
    select(_fields,options){assert.deepEqual(options,{count:'exact'});return query;},
    eq(key,value){if(key==='user_book_id')expectedBook=true;selected=selected.filter(w=>w[key]===value);return query;},
    or(filter){assert.equal(filter,'hidden.eq.true,follow_along_hidden.eq.true,flashcard_hidden.eq.true');selected=selected.filter(w=>w.hidden||w.follow_along_hidden||w.flashcard_hidden);return query;},
    order(){return query;},
    range(from,to){assert.equal(expectedBook,true);ranges.push([from,to]);return {returns:()=>Promise.resolve({data:selected.slice(from,to+1),count:selected.length,error:null})};},
  };return query;}};
  const execute = new Function('supabase','loadAllPagedRows','userBookId','showHidden',compile(find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === 'BOOK_VOCABULARY_PAGE_SIZE')) + '\nasync function run(){return '+loadCall+';}')+'\nreturn run();');
  return {words:await execute(supabase,loadAllPagedRows,'book',showHidden),ranges};
}
function parseCsv(csv) {
  return csv.replace(/^\uFEFF/,'').split('\r\n').map(line => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')));
}

test('actual Production paginated query feeds complete CSV export beyond 1,000 rows',async()=>{
  const {words,ranges}=await load();
  assert.ok(words.length>1000);assert.equal(words.length,rows.filter(w=>!w.hidden).length);
  assert.equal(ranges.length,3);
  const result=exporter(words);assert.equal(result.count,words.length);result.download();
  const csv=await result.blobs[0].text(),parsed=parseCsv(csv);
  assert.equal(parsed.length,words.length+1);
  assert.deepEqual(parsed.slice(1).map(r=>r[0]),words.map(w=>w.surface));
  assert.ok(parsed.some(r=>r[0]==='語彙-1305'));
  assert.equal(result.downloads[0],'Synthetic-Book-all-chapters-all-jlpt-vocab.csv');
});

test('matching count and download use identical chapter/JLPT selection, independent of on-screen search',async()=>{
  const {words}=await load();
  for(const [chapter,jlpt] of [['1||One','N5'],['2||Two','all'],['all','N4'],['||','all']]){
    const expected=words.filter(w=>(chapter==='all'||`${w.chapter_number}||${w.chapter_name}`===chapter)&&(jlpt==='all'||w.jlpt===jlpt));
    const result=exporter(words,chapter,jlpt);assert.equal(result.count,expected.length);assert.deepEqual(result.ids,expected.map(w=>w.id));result.download();
    assert.equal(result.blobs.length,expected.length?1:0);
    if(expected.length)assert.equal(parseCsv(await result.blobs[0].text()).length,expected.length+1);
  }
  assert.doesNotMatch(selection,/filteredSorted|chapterFilter|query|selectedSection/);
});

test('hidden mode uses the existing hidden union; normal export retains feature-hidden but globally visible words',async()=>{
  const visible=await load(),hidden=await load(true);
  assert.deepEqual(hidden.words.map(w=>w.id),rows.filter(w=>w.hidden||w.follow_along_hidden||w.flashcard_hidden).map(w=>w.id));
  assert.ok(visible.words.some(w=>w.follow_along_hidden));assert.ok(visible.words.some(w=>w.flashcard_hidden));
  const result=exporter(hidden.words);result.download();
  assert.deepEqual(parseCsv(await result.blobs[0].text()).slice(1).map(r=>r[0]),hidden.words.map(w=>w.surface));
});

test('empty results produce neither a download nor an alert',()=>{
  for(const data of [[],rows]){
    const result=exporter(data,'missing-chapter','N1');assert.equal(result.count,0);result.download();assert.equal(result.blobs.length,0);assert.equal(result.downloads.length,0);
  }
});

test('CSV preserves BOM, CRLF, eight columns, Unicode, escaping, newline normalization and existing value conventions',async()=>{
  const input={...rows[1],surface:'語彙, "quoted"',meaning:'first\n second, "quote"',reading:null,meaning_choice_index:2,chapter_number:null,chapter_name:null,position_unit:'percent',position_value:12.5,jlpt:null,is_common:null};
  const result=exporter([input]);result.download();const blob=result.blobs[0],csv=await blob.text(),parsed=parseCsv(csv);
  assert.equal(blob.type,'text/csv;charset=utf-8');assert.deepEqual([...new Uint8Array(await blob.arrayBuffer()).slice(0,3)],[0xEF,0xBB,0xBF]);assert.ok(csv.includes('\r\n'));
  assert.deepEqual(parsed[0],['Surface','Reading','Meaning','Def #','Chapter','Position','JLPT','Common']);
  assert.deepEqual(parsed[1],['語彙, "quoted"','','first second, "quote"','3','','Percent 12.5%','','']);
  assert.ok(csv.includes('""quoted""'));assert.equal(parsed[1].length,8);
});

test('rendered export panel is collapsed by default and shows matching counts and disabled empty download',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const Panel=moduleFrom('app/(protected)/books/[userBookId]/words/components/BookVocabCsvExportPanel.tsx').default;
  const props={chapterOptions:[],wordCount:1305,exportChapter:'all',exportJlpt:'all',expanded:false,onExpandedChange(){},onExportChapterChange(){},onExportJlptChange(){},onExportCsv(){}};
  const closed=renderToStaticMarkup(React.createElement(Panel,props));assert.match(closed,/aria-expanded="false"/);assert.doesNotMatch(closed,/<select/);
  const open=renderToStaticMarkup(React.createElement(Panel,{...props,expanded:true}));assert.match(open,/1305 words available to export/);assert.match(open,/aria-expanded="true"/);
  const empty=renderToStaticMarkup(React.createElement(Panel,{...props,expanded:true,wordCount:0}));assert.match(empty,/No words match these filters/);assert.match(empty,/disabled=""/);
});
