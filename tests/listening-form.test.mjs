import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file){
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(code,{exports:module.exports,require:name=>{
  if(name.includes('BookProgressProvider'))return {useBookProgress:()=>({method:'page'})};
  if(name.includes('WordPositionField'))return {__esModule:true,default:()=>React.createElement('span',null,'Page')};
  if(name.includes('ChapterNameCombobox'))return {__esModule:true,default:()=>React.createElement('span',null,'Chapter name')};
  if(name.includes('LibraryColorBadge'))return {__esModule:true,default:()=>React.createElement('span',null,'Familiarity badge')};
  if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.resolve(path.dirname(file),name);const target=['.tsx','.ts'].map(ext=>base+ext).find(fs.existsSync);return load(target);}
  return require(name);
 }});return module.exports;
}
const base='app/(protected)/books/[userBookId]/curiosity-reading/components/';
const noop=()=>{};
test('same editable word form keeps reading rows and study help for reading; listening removes both rows and every study guide',()=>{
 const Form=load(base+'CuriosityWordDetailFields.tsx').default;
 const props={quickPreview:{surface:'猫',reading:'ねこ',alternateSurface:'ネコ',meanings:['cat'],meaning:'cat',selectedMeaningIndex:0,isCustomMeaning:false,page:'',chapterNumber:'',chapterName:''},chapterNameOptions:[],isEditing:false,savedQuickNotice:'',quickWordFieldsRef:{current:null},onReadingChange:noop,onPromoteAlternative:noop,onAlternateSurfaceChange:noop,onMeaningChoiceChange:noop,onCustomMeaningChange:noop,positionUnit:'page',onPageChange:noop,onChapterNumberChange:noop,onChapterNameChange:noop,onSaveWord:noop,onClearWordFields:noop,contextFields:React.createElement('div',null,'Form in the book · Form description · Note')};
 const reading=renderToStaticMarkup(React.createElement(Form,props));const listening=renderToStaticMarkup(React.createElement(Form,{...props,listening:true}));
 for(const text of ['Form in the book','Form description','Note','Page','Chapter name','Chapter number','Flashcards','Follow-Along','Vocabulary List']){assert.ok(reading.includes(text),text);assert.ok(!listening.includes(text),text);}
 for(const text of ['Reading','Alternative spelling','Meaning','Save Word','Clear Word Fields','Swap with main word'])assert.ok(listening.includes(text),text);
});
test('search stays available without study labels or familiarity badge in listening',()=>{
 const Search=load(base+'CuriosityQuickSearchRow.tsx').default;
 const props={surface:'猫',reading:'ねこ',quickLoading:false,quickPreviewLibraryColorInfo:null,quickWordInputRef:{current:null},onSurfaceChange:noop,onSearch:noop,onSearchKeyDown:noop};
 const listening=renderToStaticMarkup(React.createElement(Search,{...props,listening:true}));const reading=renderToStaticMarkup(React.createElement(Search,props));
 assert.ok(listening.includes('Search'));assert.ok(!listening.includes('Familiarity badge'));assert.ok(!listening.includes('Flashcards'));assert.ok(reading.includes('Familiarity badge'));assert.ok(reading.includes('Flashcards'));
});
test('listening finish form cannot start over before save; reading timer retains existing behavior',()=>{
 const Timer=load(base+'CuriosityTimerPanel.tsx').default;
 const props={isRunning:false,isPaused:false,elapsed:60,showTimedSessionForm:true,sessionStartPage:'',sessionEndPage:'',timerSaveMessage:'',endingPhraseField:null,latestEndingPhrase:null,formatTimer:()=> '01:00',onStart:noop,onPause:noop,onFinish:noop,onResume:noop,onSaveSession:noop,onCancelSession:noop,onSessionStartPageChange:noop,onSessionEndPageChange:noop};
 assert.ok(!renderToStaticMarkup(React.createElement(Timer,{...props,listeningProgressOnly:true})).includes('Start Timer'));
 assert.ok(renderToStaticMarkup(React.createElement(Timer,props)).includes('Start Timer'));
});
