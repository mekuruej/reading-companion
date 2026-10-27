import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file);
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',js)(name=>{if(name==='@/lib/libraryStudyColor')return load('lib/libraryStudyColor.ts');throw Error(name);},module,module.exports);
 cache.set(file,module.exports);return module.exports;
}
const {calculateAdvancedStudyReadiness:calculate}=load('lib/study/advancedStudyReadiness.ts');
const row=(key='word||かな')=>({study_identity_key:key,surface:'word',reading:'かな',meaning:'meaning',total_encounter_count:1,hidden_encounter_count:0});
test('null, missing, empty and whitespace fields are unusable; valid padded text is usable',()=>{
 for(const field of ['study_identity_key','surface','reading','meaning']){
  for(const value of [null,undefined,'',' \t\n ']){
   assert.equal(calculate({summaries:[{...row(),[field]:value}]}).eligibleWordCount,0,field+':'+String(value));
  }
 }
 assert.equal(calculate({summaries:[{...row(),surface:' word ',reading:' かな ',meaning:' meaning '}]}).eligibleWordCount,1);
});
test('distinct identities count once even for duplicate occurrences or separate definitions',()=>{
 const summaries=[row(),row(),{...row(),definition_key:'2',meaning:'second meaning'}];
 const result=calculate({summaries});
 assert.equal(result.eligibleWordCount,1);
 assert.equal(Object.values(result.colorCounts).reduce((a,b)=>a+b,0),1);
 assert.equal(calculate({summaries:[{...row(),meaning:null},row()]}).eligibleWordCount,1);
 assert.equal(calculate({summaries:[row('a||かな'),row('b||かな')]}).eligibleWordCount,2);
});
test('99 versus exactly 100 distinct usable identities; duplicates cannot unlock readiness',()=>{
 const summaries=Array.from({length:99},(_,i)=>row('word'+i+'||かな'));
 assert.equal(calculate({summaries:[...summaries,...summaries]}).abilityCheckReady,false);
 assert.equal(calculate({summaries:[...summaries,row('last||かな')]}).abilityCheckReady,true);
 assert.equal(calculate({summaries:[...summaries,{...row('last||かな'),meaning:null}]}).abilityCheckReady,false);
});
test('hidden and empty encounters remain ineligible; eligible colors/progress calculations stay intact',()=>{
 assert.equal(calculate({summaries:[{...row(),hidden_encounter_count:1}]}).eligibleWordCount,0);
 assert.equal(calculate({summaries:[{...row(),total_encounter_count:0}]}).eligibleWordCount,0);
 const input={summaries:[{...row(),total_encounter_count:4}],progressRows:[{study_identity_key:'word||かな',reading_gate_status:'passed',meaning_gate_status:'passed',mastered:true}]};
 const result=calculate(input);assert.equal(result.eligibleWordCount,1);assert.equal(result.colorCounts.purple,1);
});
test('readiness still has no database/auth/write dependency and does not change Ability Check scheduling',()=>{
 const src=fs.readFileSync('lib/study/advancedStudyReadiness.ts','utf8');
 assert.doesNotMatch(src,/supabase|\.insert\(|\.upsert\(|\.update\(/);
 // Source eligibility boundary used by actual card grouping is stricter than the former null acceptance.
 const grouping=load('lib/studySenseIdentity.ts').groupSavedSenseEncounters;
 assert.equal(grouping([{...row(),meaning:null}],(s,r)=>s+'||'+r).size,0);
 assert.equal(grouping([row(),{...row(),meaning_choice_index:1}],(s,r)=>s+'||'+r).size,2);
});
