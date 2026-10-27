import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
const file='app/(protected)/library-study/check/page.tsx';
const baseline=execFileSync('git',['show','8608a4a94a08eef8a2c8326d8f203d558f3e841c:'+file],{encoding:'utf8'});
const parse=(s,kind=ts.ScriptKind.TSX)=>ts.createSourceFile('source.tsx',s,ts.ScriptTarget.Latest,true,kind);
const old=parse(baseline);
const printer=ts.createPrinter({removeComments:true});
const text=n=>printer.printNode(ts.EmitHint.Unspecified,n,n.getSourceFile());
const functions=s=>new Map(parse(s).statements.filter(ts.isFunctionDeclaration).map(n=>[n.name.text,n]));
const oldFn=functions(baseline);
const constants=source=>new Map(parse(source).statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations.map(d=>[d.name.getText(),d])));

test('shared scheduler functions and moved card helpers retain exact original AST bodies/signatures',()=>{
 const originalConstants=constants(baseline);
 for(const [name,declaration] of constants(fs.readFileSync('lib/study/abilityCheckScheduler.ts','utf8'))){
  assert.ok(originalConstants.has(name),name);assert.equal(text(declaration.initializer),text(originalConstants.get(name).initializer),name);
 }

 for(const f of ['lib/study/abilityCheckScheduler.ts','lib/study/abilityCheckCards.ts']){
  const source=fs.readFileSync(f,'utf8');
  for(const [name,node] of functions(source)){
   if(!oldFn.has(name))continue;
   assert.equal(text(node.body),text(oldFn.get(name).body),name);
   assert.deepEqual(node.parameters.map(text),oldFn.get(name).parameters.map(text),name+' parameters');
  }
 }
});
test('shared reading/claim construction expressions match actual former page construction',()=>{
 const src=fs.readFileSync('lib/study/abilityCheckCards.ts','utf8');
 const mod=parse(src),fn=functions(src);
 const oldExpressions=new Map();
 function visit(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&['cards','claimCards'].includes(n.name.text)&&n.initializer)oldExpressions.set(n.name.text,n.initializer);ts.forEachChild(n,visit);}
 visit(old);
 for(const [variable,name] of [['cards','buildReadingAbilityCheckCards'],['claimCards','buildClaimAbilityCheckCards']]){
  const returnNode=fn.get(name).body.statements.find(ts.isReturnStatement);
  const before=text(oldExpressions.get(variable)).replace(/\buser\.id\b/g,'userId');
  assert.equal(text(returnNode.expression),before,name);
 }
});
test('page delegates to shared builders/scheduler; all grading/progress-writing functions are unchanged',()=>{
 const current=fs.readFileSync(file,'utf8'),newFn=functions(current);
 assert.match(current,/buildReadingAbilityCheckCards\(\{/);assert.match(current,/buildClaimAbilityCheckCards\(\{/);
 assert.match(current,/from ['"]@\/lib\/study\/abilityCheckScheduler['"]/);
 // Compare every retained declaration, including nested handlers, recursively.
 const collect=s=>{const root=parse(s),map=new Map();function visit(n){if(ts.isFunctionDeclaration(n)&&n.name)map.set(n.name.text,n);ts.forEachChild(n,visit);}visit(root);return map;};
 const a=collect(baseline),b=collect(current);
 for(const [name,node] of b){if(['LibraryStudyPage','load'].includes(name))continue;assert.ok(a.has(name),name);assert.equal(text(node),text(a.get(name)),name);}
 // Every moved declaration is either unchanged in a shared module or remains local.
 const shared=new Map([...functions(fs.readFileSync('lib/study/abilityCheckCards.ts','utf8')),...functions(fs.readFileSync('lib/study/abilityCheckScheduler.ts','utf8'))]);
 for(const [name] of oldFn)assert.ok(newFn.has(name)||shared.has(name),name);
});
test('entire Ability Check component is unchanged except the two builder delegations',()=>{
 const current=functions(fs.readFileSync(file,'utf8')).get('LibraryStudyPage');
 const replacements=new Map();
 function collect(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&['cards','claimCards'].includes(n.name.text))replacements.set(n.name.text,n);ts.forEachChild(n,collect);}
 collect(current);assert.equal(replacements.size,2);
 let replaced=0;
 const transform=ts.transform(oldFn.get('LibraryStudyPage').body,[context=>root=>{
  function visit(n){
   if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&replacements.has(n.name.text)){
    replaced++;const replacement=replacements.get(n.name.text);
    return ts.factory.updateVariableDeclaration(n,n.name,n.exclamationToken,replacement.type,replacement.initializer);
   }
   return ts.visitEachChild(n,visit,context);
  }
  return ts.visitNode(root,visit);
 }]);
 function structure(node){
  const children=[];ts.forEachChild(node,child=>{children.push(structure(child));});
  return [node.kind,typeof node.text==='string'?node.text:null,children];
 }
 try{assert.equal(replaced,2);assert.deepEqual(structure(transform.transformed[0]),structure(current.body));}finally{transform.dispose();}
});
