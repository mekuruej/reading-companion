import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeRequire = createRequire(import.meta.url);
const cache = new Map();
let tracking;
let pathname = '/books/copy';
let providerState = null;
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} };
  cache.set(filename, mod);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = name => {
    if (name === '@/lib/supabaseClient') return { supabase: {} };
    if (name === 'next/navigation') return { usePathname: () => pathname };
    if (name === 'react') return {
      ...React,
      useContext: () => tracking,
      useState: initial => {
        const actualState = React.useState(initial);
        return providerState ? [providerState.shift(), () => {}] : actualState;
      },
    };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      const resolved = ['.ts', '.tsx'].map(extension => base + extension).find(file => fs.existsSync(file));
      return load(resolved);
    }
    return runtimeRequire(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
  return mod.exports;
}
const { hasUsableProgressTotal, isValidProgressTotal } = load('lib/books/catalogProgressTotal.ts');
const provider = load('components/books/BookProgressProvider.tsx');
const { default: StatusPanel } = load('app/(protected)/books/[userBookId]/components/BookHubStatusPanel.tsx');
const { default: Hero } = load('app/(protected)/books/[userBookId]/components/BookHubHero.tsx');
const { TeacherBookInfoSectionHeader } = load('app/(protected)/teacher/books/add/components/TeacherBookInfoSectionHeader.tsx');

const completeBook = {title:'Book',author:'Author',isbn13:'9780000000000',asin:null,cover_url:'cover.jpg',book_type:'novel',publisher:'Publisher',published_date:'2026',page_count:null,kindle_location_count:null};
// Execute the actual production completeness functions without mounting their data-loading pages.
function productionFunction(file, name) {
  const source = fs.readFileSync(path.resolve(root,file),'utf8');
  const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `${name} exists in ${file}`);
  const code = ts.transpileModule(declaration.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  return new Function('hasUsableProgressTotal','exports',`${code}\nreturn ${name};`)(hasUsableProgressTotal,{});
}
const completenessFiles = [
  'app/(protected)/teacher/page.tsx',
  'app/(protected)/teacher/needs-attention/page.tsx',
  'app/(protected)/teacher/books/page.tsx',
  'app/(protected)/teacher/books/_shared/bookAttentionHelpers.ts',
  'app/(protected)/books/add/page.tsx',
];
for (const file of completenessFiles) {
  test(`catalog completeness accepts either total: ${file}`, () => {
    const missing = productionFunction(file,'missingGlobalBookFields');
    for(const totals of [{page_count:200},{kindle_location_count:4000},{page_count:200,kindle_location_count:4000}]) {
      assert.deepEqual(missing({...completeBook,...totals}),[]);
    }
    assert.deepEqual(missing(completeBook),['progress total']);
    assert.deepEqual(missing({...completeBook,page_count:0,kindle_location_count:-1}),['progress total']);
    assert.deepEqual(missing({...completeBook,missing_info_cleared_at:'2026-09-21'}),[]);
  });
}
test('teacher assignment warnings use either total',()=> {
  const missing=productionFunction('app/(protected)/teacher/assign/page.tsx','missingBookInfo');
  assert.deepEqual(missing({...completeBook,kindle_location_count:4000}),[]);
  assert.deepEqual(missing(completeBook),['progress total']);
});
test('catalog ranking gives pages and Kindle Locations the same completeness credit',()=> {
  const score=productionFunction('app/api/books/search/route.ts','bookCompletenessScore');
  assert.equal(score({...completeBook,page_count:200}),score({...completeBook,kindle_location_count:4000}));
  assert.equal(score({...completeBook,page_count:200,kindle_location_count:4000}),score({...completeBook,page_count:200}));
  assert.equal(score({...completeBook,kindle_location_count:4000})-score(completeBook),3);
});
test('valid totals include form strings but reject missing, fractional, nonpositive and nonfinite values',()=> {
  for(const value of [1,200,'4000',' 4000 '])assert.equal(isValidProgressTotal(value),true);
  for(const value of [null,undefined,'',' ',0,-1,1.5,'1.5','bad',Infinity,NaN,true])assert.equal(isValidProgressTotal(value),false,String(value));
  assert.equal(hasUsableProgressTotal({page_count:NaN,kindle_location_count:4000}),true);
});
test('editor shows a neutral missing-total badge',()=> {
  const html=renderToStaticMarkup(React.createElement(TeacherBookInfoSectionHeader,{missingFields:['Progress Total']}));
  assert.match(html,/No Progress Total/);assert.doesNotMatch(html,/Page Count/);
});
function setTracking(patch={}) {
  tracking={method:null,totals:{kindle_location_count:4000},loaded:true,canChoose:true,editorOpen:false,choice:'kindle_location',saving:false,error:null,choose:()=>{},saveMethod:async()=>{},closeEditor:()=>{},changeMethod:()=>{},...patch};
}
function statusHtml(status='reading',patch={}) {
  return renderToStaticMarkup(React.createElement(StatusPanel,{
    personalTrackingStatus:status,showNotTrackingOption:false,isSavingStatus:false,statusError:null,
    startedAt:'2026-09-21',finishedAt:'',dnfAt:'',dnfReason:'',dnfNote:'',wouldRetry:'',
    showStartButton:false,showReflectionLink:false,showReviewLink:false,reviewLinkLabel:'Review',
    shouldNudgeStartBook:false,canFillBeginningPages:false,canFillEndingPages:false,
    earliestTrackedStartPage:null,furthestTrackedPage:null,pageCount:null,progressPercent:null,
    onStartToday:()=>{},onPersonalTrackingStatusChange:()=>{},onOpenReview:()=>{},onOpenReflection:()=>{},onFillBeginningPages:()=>{},onFillEndingPages:()=>{},...patch,
  }));
}
test('Currently Reading prompt is inline between the status dropdown and dates',()=> {
  setTracking();
  const html=statusHtml();
  assert.ok(html.indexOf('</select>')<html.indexOf('How will you track'));
  assert.ok(html.indexOf('How will you track')<html.indexOf('Started:'));
  for(const option of ['Page number','Kindle Location','Percentage'])assert.ok(html.includes(option));
  assert.doesNotMatch(html,/role="dialog"/);
});
test('Want to Read does not ask for a method yet',()=> {
  setTracking();assert.doesNotMatch(statusHtml('want_to_read'),/How will you track|Progress tracking/);
});
test('saved method collapses to one compact control in the same place',()=> {
  setTracking({method:'kindle_location'});
  const html=statusHtml();
  assert.equal((html.match(/Progress tracking:/g)||[]).length,1);
  assert.doesNotMatch(html,/How will you track/);
  assert.ok(html.indexOf('</select>')<html.indexOf('Progress tracking:'));
  assert.ok(html.indexOf('Progress tracking:')<html.indexOf('Started:'));
});
test('changing a method expands the inline editor with an original-unit explanation',()=> {
  setTracking({method:'page',editorOpen:true});
  const html=statusHtml();
  assert.match(html,/Earlier entries keep their original units/);
  assert.match(html,/Record your next position in the new unit/);
  assert.match(html,/Cancel/);
});
test('book header no longer includes progress tracking',()=> {
  setTracking({method:'kindle_location'});
  const html=renderToStaticMarkup(React.createElement(Hero,{book:{title:'Book',title_reading:null,author:'Author',author_reading:null,cover_url:null},displayedCoverUrl:null,bookHubContextLabel:'My Library',isViewingStudentBookHub:false,onAboutBook:()=>{}}));
  assert.match(html,/About this book/);assert.doesNotMatch(html,/Progress tracking/);
});
test('hub never overlays its inline prompt with a dialog; standalone timer retains its chooser',()=> {
  setTracking({editorOpen:true});
  for (const [route,expected] of [['/books/copy',false],['/books/copy/just-reading',true]]) {
    pathname=route;
    providerState=[null,{kindle_location_count:4000},true,'reader',true,'kindle_location',false,null];
    const html=renderToStaticMarkup(React.createElement(provider.BookProgressProvider,{userBookId:'copy'},React.createElement('div',null,'Workspace')));
    providerState=null;
    assert.equal(html.includes('role="dialog"'),expected);
  }
  pathname='/books/copy';
});
test('finish reminder uses selected-unit completion, not historical page endpoints',()=> {
  setTracking({method:'kindle_location'});
  assert.doesNotMatch(statusHtml('reading',{pageCount:200,furthestTrackedPage:200,progressPercent:null}),/Finish book/);
  assert.match(statusHtml('reading',{pageCount:null,furthestTrackedPage:null,progressPercent:100}),/Finish book/);
});
