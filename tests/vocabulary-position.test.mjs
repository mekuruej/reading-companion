import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const cache = new Map();
function load(file) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename);
  const mod = {exports:{}};
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','module','exports',js)(name => {
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(root,name.slice(2)) : path.resolve(path.dirname(filename),name);
    return load(['.ts','.tsx'].map(x=>base+x).find(fs.existsSync));
  },mod,mod.exports);
  cache.set(filename,mod.exports);return mod.exports;
}
const {parseWordPosition,wordPosition,wordPositionText,wordPositionPayload,stickyWordPosition}=load('lib/vocabulary/wordPosition.ts');
const Field=load('components/vocabulary/WordPositionField.tsx').default;
const English=load('app/(protected)/books/[userBookId]/add-word/components/AddEnglishWordFields.tsx').default;
const Curiosity=load('app/(protected)/books/[userBookId]/curiosity-reading/components/CuriosityWordDetailFields.tsx').default;
const Detail=load('app/(protected)/books/[userBookId]/add-word/components/AddWordDetailFields.tsx').default;
for(const [unit,label] of [['page','Page'],['kindle_location','Location'],['percent','Percent']]) {
 test(`${label}: exact unit, zero allowed, blank optional, numeric validation`,()=>{
  assert.equal(parseWordPosition('0',unit).value,0);
  assert.deepEqual(parseWordPosition('',unit),{value:null,error:null});
  for(const bad of ['-1','NaN','Infinity','4%','p. 4','1e3']) assert.ok(parseWordPosition(bad,unit).error);
  assert.equal(Boolean(parseWordPosition('12.5',unit).error),unit!=='percent');
  assert.equal(Boolean(parseWordPosition('842',unit).error),unit==='percent');
  const value=unit==='percent'?12.5:842;
  assert.deepEqual(wordPosition(wordPositionPayload(value,unit)),{unit,value});
 });
 test(`${label}: one input, mobile widths and correct number constraints`,()=>{
  const html=renderToStaticMarkup(React.createElement(Field,{unit,value:'',onChange:()=>{}}));
  assert.equal((html.match(/<input/g)||[]).length,1);assert.match(html,new RegExp(`>${label}</span>`));assert.match(html,/min="0"/);assert.match(html,/w-full/);
  assert.equal(html.includes('max="100"'),unit==='percent');assert.equal(html.includes('step="any"'),unit==='percent');
 });
 test(`${label}: English, Japanese and Curiosity capture have no secondary position input`,()=>{
  const noop=()=>{};
  const props={positionUnit:unit,pageNumber:'',chapterName:'',chapterNumber:'',chapterNameOptions:[],source:'',support:'',itemType:'word',meaningChoices:[],reading:'',meaning:'',alternateSurface:'',word:'',onPageNumberChange:noop,onChapterNameChange:noop,onChapterNumberChange:noop};
  for(const [Component,extra] of [[English,{}],[Detail,{}],[Curiosity,{quickPreview:{surface:'',reading:'',alternateSurface:'',meanings:[],isCustomMeaning:true,meaning:'',page:'',chapterNumber:'',chapterName:''},onPageChange:noop}]]){
   const html=renderToStaticMarkup(React.createElement(Component,{...props,...extra}));
   assert.equal((html.match(/type="number"/g)||[]).length,1);assert.match(html,new RegExp(`>${label}</span>`));assert.ok(!html.includes('Page or %'));assert.ok(!html.includes('Saved separately'));
  }
 });
 test(`${label}: sticky position survives same method and clears for other methods`,()=>{
  assert.equal(stickyWordPosition('37',unit,unit),'37');
  for(const other of ['page','kindle_location','percent'].filter(x=>x!==unit)) assert.equal(stickyWordPosition('37',unit,other),'');
  assert.equal(stickyWordPosition('37',undefined,unit),'');
 });
}
test('Legacy dual values prefer page; percentage-only values survive including zero',()=>{
 assert.deepEqual(wordPosition({page_number:37,percent_location:19}),{unit:'page',value:37});
 assert.deepEqual(wordPosition({page_number:null,percent_location:0}),{unit:'percent',value:0});
 assert.equal(wordPositionText({page_number:37}),'Page 37');
 assert.equal(wordPositionText(wordPositionPayload(842,'kindle_location')),'Location 842');
 assert.equal(wordPositionText(wordPositionPayload(19.5,'percent')),'Percent 19.5%');
});
test('Canonical historical unit wins over legacy mirrors and remains independent of book preference',()=>{
 const old=wordPositionPayload(37,'page');const book={progress_tracking_method:'kindle_location'};
 assert.equal(wordPositionText(old),'Page 37');assert.equal(book.progress_tracking_method,'kindle_location');
 assert.deepEqual(wordPosition({...old,position_unit:'kindle_location',position_value:842}),{unit:'kindle_location',value:842});
});
test('An explicit editor unit change clears the number, never converts it',()=>{
 const actions=[];const tree=Field({unit:'page',value:'37',onChange:v=>actions.push(['value',v]),onUnitChange:u=>actions.push(['unit',u])});
 const selector=tree.props.children[1].props.children.find(x=>x?.type==='select');
 selector.props.onChange({target:{value:'kindle_location'}});
 assert.deepEqual(actions,[['unit','kindle_location'],['value','']]);
});

// Exercise the reader's actual grouping callback, including its empty-page behavior.
function readAlongGroups(words) {
 const file='app/(protected)/books/[userBookId]/readalong/page.tsx';
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let body;
 function visit(node) {
  if(ts.isVariableDeclaration(node) && node.name.getText(ast)==='pages' && node.initializer && ts.isCallExpression(node.initializer)) body=node.initializer.arguments[0].body;
  ts.forEachChild(node,visit);
 }
 visit(ast);assert.ok(body);
 const js=ts.transpileModule(`function group(){${body.statements.map(n=>n.getText(ast)).join('\n')}}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 return new Function('wordPositionText','wordPosition','chunkArray','filteredWords',`${js}; return group();`)(wordPositionText,wordPosition,(items,size)=>Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,(i+1)*size)),words);
}
test('Read Along separates equal numbers in different units and includes unpositioned words',()=>{
 const groups=readAlongGroups([{id:'p',...wordPositionPayload(37,'page')},{id:'k',...wordPositionPayload(37,'kindle_location')},{id:'x',...wordPositionPayload(37,'percent')},{id:'u',page_number:null}]);
 assert.equal(groups.length,4);
 assert.deepEqual(new Set(groups.map(g=>g.label)),new Set(['Page 37','Location 37','Percent 37%','Unplaced 1']));
 assert.equal(groups.flatMap(g=>g.words).length,4);
});
test('Read Along does not create thousands of empty Kindle locations',()=>{
 const groups=readAlongGroups([wordPositionPayload(1,'kindle_location'),wordPositionPayload(10000,'kindle_location')]);
 assert.equal(groups.length,2);assert.deepEqual(groups.map(g=>g.label),['Location 1','Location 10000']);
});
test('Read Along retains empty page navigation and accepts page zero',()=>{
 const groups=readAlongGroups([wordPositionPayload(0,'page'),wordPositionPayload(2,'page')]);
 assert.deepEqual(groups.map(g=>g.label),['Page 0','Page 1','Page 2']);assert.equal(groups[1].words.length,0);
});
