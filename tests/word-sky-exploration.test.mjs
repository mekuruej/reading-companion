import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file){const module={exports:{}};const source=fs.readFileSync(file,'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('module','exports','require',code)(module,module.exports,id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):require(id));return module.exports;}
const {isWordSkyExploration,getWordSkyExplorationReturnPath,getWordSkyLibraryReturnState}=load('lib/wordSkyExploration.ts');
for(const value of ['1','5'])test(`explore=${value} is an open-ended entry`,()=>assert.equal(isWordSkyExploration(value),true));
for(const value of [null,'','0','2','true',' 1','50'])test(`ordinary/unknown parameter ${value} does not enable exploration`,()=>assert.equal(isWordSkyExploration(value),false));
test('safe Library return paths preserve encoded search and viewing state',()=>{
 for(const p of ['/books','/books?wordSkyReturn=1&view=list','/users/reader/books?wordSkyReturn=1&search=%E7%8C%AB&bookType=novel&status=reading&sort=title&view=list','/users/reader/books/'])assert.equal(getWordSkyExplorationReturnPath(p),p);
});
test('external, malformed and non-Library return destinations are rejected',()=>{
 for(const p of [null,'','https://evil.example/books','//evil.example/books','/\\evil.example/books','/users/a/b/books','/users/a%2Fb/books','/users/%5C/books','/users/%00/books','/users/%ZZ/books','/users/%E0%A4/books','/books\n','/library-study/word-sky','/teacher/students/a/workspace','/login'])assert.equal(getWordSkyExplorationReturnPath(p),null,p);
});
test('Library restoration is opt-in and validates all filters',()=>{
 assert.equal(getWordSkyLibraryReturnState('?view=list'),null);
 assert.deepEqual(getWordSkyLibraryReturnState('?wordSkyReturn=1&search=%E7%8C%AB&bookType=novel&status=reading&sort=title&view=list'),{search:'猫',bookType:'novel',status:'reading',sort:'title',view:'list'});
 assert.deepEqual(getWordSkyLibraryReturnState('?wordSkyReturn=1&bookType=bad&status=bad&sort=bad&view=bad'),{search:'',bookType:'all',status:'all',sort:'status',view:'cover'});
});
const pageFile='app/(protected)/library-study/word-sky/page.tsx',page=fs.readFileSync(pageFile,'utf8');
test('existing Word Sky functions and data-loading effect remain unchanged',()=>{
 const baseline=execFileSync('git',['show',`8608a4a:${pageFile}`],{encoding:'utf8'});
 function parts(source){const root=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const found={};function visit(node){if(ts.isFunctionDeclaration(node)&&node.name&&!['WordSkyPage','finishExploration'].includes(node.name.text))found[node.name.text]=node.getText(root);if(ts.isCallExpression(node)&&node.expression.getText(root)==='useEffect'&&node.getText(root).includes('async function load()'))found.dataLoading=node.getText(root);ts.forEachChild(node,visit);}visit(root);return found;}
 assert.deepEqual(parts(page),parts(baseline));
});
test('exploration has no numeric goal, completion state or automatic exit',()=>{
 assert.match(page,/Discover words you already know!/);assert.match(page,/Explore the sky and see what feels familiar\./);
 assert.match(page,/onClick=\{finishExploration\}/);assert.match(page,/returnPath: getWordSkyExplorationReturnPath\(params.get\("returnTo"\)\) \?\? "\/books"/);
 assert.doesNotMatch(page,/EXPLORATION_TARGET|explorationComplete|newGreenClaimCount|countNewGreen|Can you find|Nice work!|Keep exploring/);
});
test('both Library routes recover preferences without changing authorization',()=>{
 const library=fs.readFileSync('app/(protected)/users/[username]/books/page.tsx','utf8');
 for(const field of ['setSearchQuery(restored.search)','setBookTypeFilter(restored.bookType)','setStatusFilter(restored.status)','setSortMode(restored.sort as LibrarySortMode)','setViewMode(restored.view)'])assert.ok(library.includes(field));
 assert.match(library,/router.replace\(cleanPath, \{ scroll: false \}\)/);
 const redirect=fs.readFileSync('app/(protected)/books/page.tsx','utf8');assert.match(redirect,/getWordSkyLibraryReturnState\(window.location.search\)/);assert.match(redirect,/new URLSearchParams\(\{ wordSkyReturn: "1", \.\.\.restored \}\)/);
 assert.ok(redirect.indexOf('if (!isComplete)')<redirect.indexOf('const restored ='));
});
