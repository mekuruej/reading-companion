import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { resumeBookmarkLabel } from '../lib/books/resumeBookmark.mjs';
const require = createRequire(import.meta.url);
function load(file, deps) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => deps[name] ?? require(name), exports);
  return exports.default;
}
test('Listening passes one shared reminder into all session variants, never into its header', () => {
  const page = fs.readFileSync('app/(protected)/books/[userBookId]/listening/page.tsx', 'utf8');
  assert.equal((page.match(/<BookProgressSummaryBar/g) ?? []).length, 1);
  assert.equal((page.match(/timerReminder={listeningReminder}/g) ?? []).length, 3);
  assert.equal((page.match(/showProgressSummaryBar={false}/g) ?? []).length, 3);
  const header=page.slice(page.indexOf('<h1'),page.indexOf('Workspace\n'));
  assert.doesNotMatch(header,/BookProgressSummaryBar|listeningReminder|ResumeBookmarkSummary/);
  const experience=fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx','utf8');
  assert.match(experience, /<CuriosityTimerPanel\s+timerReminder={timerReminder}/);
});
test('Book Hub extra reminder removed; Read reminder remains', () => {
  assert.doesNotMatch(fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8'), /ResumeBookmarkSummary/);
  assert.match(fs.readFileSync('app/(protected)/books/[userBookId]/read/page.tsx', 'utf8'), /<ResumeBookmarkSummary/);
});
test('actual Listening summary renders exactly one explicit bookmark or original fallback', () => {
  let bookmark = null;
  const Summary = load('components/books/ResumeBookmarkSummary.tsx', {
    '@/lib/books/useResumeBookmark': { useResumeBookmark: () => ({ available: true, eligible: true, bookmark, pageCount: 100 }) },
    '@/lib/books/resumeBookmark.mjs': { resumeBookmarkLabel },
  });
  const Bar = load('components/books/BookProgressSummaryBar.tsx', {
    './ResumeBookmarkSummary': { default: Summary },
    './BookProgressProvider': { useBookProgress: () => ({ userBookId: 'book', loaded: true, refreshSummary() {}, summaryData: { sessions: [{ session_mode: 'listening', read_on: '2026-10-29', end_page: 12, progress_unit: 'page', ending_phrase: 'Listening fallback phrase' }] } }) },
    '@/lib/books/bookProgressSummary': { summarizeBookProgress: () => null },
    '@/lib/books/readingProgress': { sessionEnd: () => 12, sessionProgressUnit: () => 'page', formatAudioTime: String },
    '@/app/(protected)/books/[userBookId]/components/BookHubProgressSummary': { default: () => null },
    'next/link': { default: ({ children }) => React.createElement('a', null, children) },
  });
  function render() { return renderToStaticMarkup(React.createElement(Bar, { userBookId: 'book', listening: true, bookmarkAware: true })); }
  let html = render();
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
  assert.match(html, /Resume from page 12/);
  assert.match(html, /Listening fallback phrase/);
  bookmark = { kind: 'phrase', page: 20, phrase: 'Explicit bookmark phrase' };
  html = render();
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
  assert.match(html, /Explicit bookmark phrase/);
  assert.doesNotMatch(html, /Listening fallback phrase|Resume from page 12/);
  assert.match(html, /var\(--appearance-surface\)/);
});


test('actual word-capture session renders a standalone reminder directly above the timer area', () => {
  const Panel=load('app/(protected)/books/[userBookId]/curiosity-reading/components/CuriosityTimerPanel.tsx',{
    '@/components/books/BookProgressProvider':{useBookProgress:()=>({method:'page',timersEnabled:true})},
    '@/components/books/AudioTimeInput':{default:()=>null},
  });
  const reminder=React.createElement('div',{role:'status'},'Where Did I Leave Off? Resume from page 14');
  let starts=0;
  for(const compact of [false,true]){
    const props={title:'Log your listening session',description:'Track listening',timerReminder:reminder,compact,isRunning:false,isPaused:false,elapsed:0,showTimedSessionForm:false,sessionStartPage:'',sessionEndPage:'',timerSaveMessage:'',formatTimer:()=> '00:00',onStart:()=>starts++,listeningProgressOnly:true};
    const tree=Panel(props);const html=renderToStaticMarkup(tree);
    assert.equal((html.match(/Where Did I Leave Off/g)??[]).length,1);
    assert.ok(html.indexOf('Where Did I Leave Off')<html.indexOf('Log your listening session'));
    assert.ok(html.indexOf('Where Did I Leave Off')<html.indexOf('Start Timer'));
    assert.match(html,/flex flex-wrap items-center justify-center gap-2/);
    const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
    nodes(tree).find(n=>n.type==='button'&&n.props.children.trim()==='Start Timer').props.onClick();
    const running=renderToStaticMarkup(React.createElement(Panel,{...props,isRunning:true}));
    assert.equal((running.match(/Where Did I Leave Off/g)??[]).length,1);assert.match(running,/>Pause</);assert.doesNotMatch(running,/Start Timer/);
    const unchanged=renderToStaticMarkup(React.createElement(Panel,{...props,timerReminder:null}));
    assert.doesNotMatch(unchanged,/Where Did I Leave Off/);
  }
  assert.equal(starts,2);
});

test('actual timer-only JSX keeps one reminder above controls in standard and compact layouts', () => {
  const file='app/(protected)/books/[userBookId]/_shared/timed-session/SimpleTimedSessionPage.tsx';
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='timerPanel')expression=node.initializer.getText(source);ts.forEachChild(node,visit)}visit(source);assert.ok(expression);
  let starts=0;
  for(const workspaceCompact of [false,true]){
    const scope={workspaceCompact,formatTimer:()=> '00:00',elapsed:0,isRunning:false,isPaused:false,startTimer:()=>starts++,pauseTimer(){},resumeTimer(){},finishTimer(){},activeSessionMode:'listening',resumeBookmark:{bookmark:null},LatestEndingPhrase:()=>null,ResumeBookmarkFeedback:()=>null,timerSaveMessage:'',timerReminder:React.createElement('div',{role:'status'},'Where Did I Leave Off? Resume from page 14')};
    const exports={};const code=ts.transpileModule('export default function Panel(){return '+expression+';}',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    new Function('require','exports',...Object.keys(scope),code)(require,exports,...Object.values(scope));
    const tree=exports.default();const html=renderToStaticMarkup(tree);
    assert.equal((html.match(/Where Did I Leave Off/g)??[]).length,1);
    assert.ok(html.indexOf('Where Did I Leave Off')<html.indexOf('Start Timer'));
    assert.match(html,/flex flex-wrap items-center justify-center gap-2/);
    const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
    nodes(tree).find(n=>n.type==='button'&&n.props.children.trim()==='Start Timer').props.onClick();
  }
  assert.equal(starts,2);
});
