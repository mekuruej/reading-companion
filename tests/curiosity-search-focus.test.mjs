import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx','utf8');
const ast=ts.createSourceFile('capture.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(predicate){let found;function visit(n){if(predicate(n))found=n;ts.forEachChild(n,visit)}visit(ast);assert.ok(found);return found.getText(ast)}
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const fn=name=>find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
function focusHarness({connected=true,visible=true,disabled=false,value='',active='origin'}={}){
 let focusCount=0,scrollCount=0;const origin={},body={},other={};const input={isConnected:connected,value,getClientRects:()=>visible?[{}]:[],matches:()=>disabled,focus(){focusCount++},getBoundingClientRect:()=>({top:40,bottom:80})};const document={body,activeElement:active==='origin'?origin:active==='body'?body:active==='input'?input:other,querySelector:()=>null};const window={visualViewport:{offsetTop:0,height:800},scrollY:0,innerHeight:800,scrollTo(){scrollCount++}};
 const focus=new Function('document','window',compile(fn('focusResetCuriositySearch')+';return focusResetCuriositySearch;'))(document,window);return {focus:()=>focus(input,origin),get focused(){return focusCount},get scrolled(){return scrollCount}};
}
for(const active of ['origin','body','input'])test(`post-reset search can receive focus from ${active}`,()=>{const h=focusHarness({active});h.focus();assert.equal(h.focused,1)});
for(const [name,options] of [['another edited field',{active:'other'}],['closed capture',{connected:false}],['hidden responsive input',{visible:false}],['save-disabled form',{disabled:true}],['new draft',{value:'new word'}]])test(`does not steal focus: ${name}`,()=>{const h=focusHarness(options);h.focus();assert.equal(h.focused,0);assert.equal(h.scrolled,0)});
const layoutEffect=find(n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='useLayoutEffect').match(/^useLayoutEffect\(([^]*), \[/)[1];
function runEffect({saving=false,pending=true,listening=false}={}){let calls=0;const refs={quickSaveFocus:{current:{input:{},origin:{}}},quickFocusPending:{current:pending}};new Function('isListeningMode','quickSaving','quickFocusRequest','quickSaveFocus','quickFocusPending','focusResetCuriositySearch',compile('('+layoutEffect+')();'))(listening,saving,1,refs.quickSaveFocus,refs.quickFocusPending,()=>calls++);return {calls,...refs};}
test('handoff waits for enabled committed render, runs once, and consumes its request',()=>{const waiting=runEffect({saving:true});assert.equal(waiting.calls,0);assert.equal(waiting.quickFocusPending.current,true);const done=runEffect();assert.equal(done.calls,1);assert.equal(done.quickSaveFocus.current,null);assert.equal(done.quickFocusPending.current,false)});
test('failed/cancelled saves without a successful reset cannot reuse an earlier focus request',()=>{assert.equal(runEffect({pending:false}).calls,0)});
test('Listening keeps its existing focus path',()=>{assert.equal(runEffect({listening:true}).calls,0);assert.match(fn('prepareForNextQuickWord'),/if \(!isListeningMode\)/);assert.match(fn('prepareForNextQuickWord'),/window.setTimeout/)});
test('desktop/mobile use distinct refs and both saves keep the established persistence and reset flow',()=>{assert.match(source,/inputRef=\{isListeningMode \? quickWordInputRef : mobileQuickWordInputRef\}/);assert.match(source,/quickWordInputRef=\{quickWordInputRef\}/);assert.match(fn('saveQuickWord'),/quickFocusPending.current = false/);assert.match(fn('savePersonalQuickWord'),/await saveQuickWord\(\{\}, draft\)/);assert.match(fn('persistQuickWord'),/clearQuickWordFields\(\{ preserveSavedNotice: true \}\)/);assert.match(fn('clearQuickWordFields'),/prepareForNextQuickWord\(\)/)});
