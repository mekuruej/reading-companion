import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export function load(file,mocks={}) {
 const mod={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',js)(name=>name in mocks?mocks[name]:name.startsWith('@/')?load(name.slice(2)+'.ts',mocks):name.startsWith('.')?load(path.join(path.dirname(file),name+'.ts'),mocks):require(name),mod,mod.exports);
 return mod.exports;
}
const helpers=load('lib/books/readerAddBook.ts');
test('one field recognizes titles, valid ISBN10/13 and supported book URLs',()=>{
 for(const input of ['9780306406157','978-0-306-40615-7','0306406152','ISBN-10: 0306406152','https://openlibrary.org/isbn/9780306406157','https://www.amazon.co.jp/dp/0306406152/','https://books.google.com/books?vid=ISBN9780306406157']) assert.deepEqual(helpers.parseReaderSearch(input),{kind:'isbn',isbn13:'9780306406157'});
 assert.deepEqual(helpers.parseReaderSearch('https://www.amazon.co.jp/gp/product/B012345678'),{kind:'asin',asin:'B012345678'});
 assert.deepEqual(helpers.parseReaderSearch('  Japanese book  '),{kind:'title',title:'Japanese book'});
 for(const input of ['9780306406158','javascript:alert(1)','https://amazon.co.jp.attacker.invalid/dp/B012345678','http://127.0.0.1/private','https://user:pass@amazon.com/dp/B012345678','https://amzn.to/test','https://books.google.com/books?id=not-an-isbn']) assert.equal(helpers.parseReaderSearch(input).kind,'invalid',input);
});
test('only supported real language codes; five formats; no guessed Japanese language',()=>{
 for(const code of ['ja','en','fr','de','zh','ko'])assert.equal(helpers.readerLanguage(code),code);
 for(const code of [null,'','other','unknown','zz','und'])assert.equal(helpers.readerLanguage(code),null);
 assert.equal(helpers.readerLanguage('fra'),'fr');
 assert.equal(helpers.READER_FORMAT_OPTIONS.length,5);
 for(const {value}of helpers.READER_FORMAT_OPTIONS)assert.equal(helpers.readerFormat(value),value);
 assert.equal(helpers.readerFormat('tankobon_softcover'),null); // existing edition values are never rewritten.
});
test('teacher/admin/student contexts retain the original Add Book experience',()=>{
 const base={role:'reader',isSuperTeacher:false,destination:'',context:'',targetUserId:'',ownerId:'owner'};
 assert.equal(helpers.isSimpleReaderAddBook(base),true);
 for(const role of ['teacher','admin','super_teacher'])assert.equal(helpers.isSimpleReaderAddBook({...base,role}),false);
 for(const extra of [{isSuperTeacher:true},{context:'student-lesson-book'},{destination:'teaching'},{targetUserId:'someone-else'}])assert.equal(helpers.isSimpleReaderAddBook({...base,...extra}),false);
});

function harness(options={}) {
 const books=[...(options.books??[])], copies=[...(options.copies??[])], writes=[];
 let next=0;
 const client={auth:{getUser:async()=>({data:{user:options.invalidAuth?null:{id:'owner'}},error:null})},from(table){
  const filters=[];let payload=null,operation='select';let countLimit=Infinity;
  const rows=()=>table==='books'?books:copies;
  const matches=row=>filters.every(([op,k,v])=>op==='eq'?row[k]===v:row[k]?.toLowerCase()===v.toLowerCase().replace(/\\([\\%_])/g,'$1'));
  async function result(single=false){
   if(operation==='insert'){
    writes.push({table,payload});
    if(table==='user_books' && options.failLibrary) return {data:null,error:{code:'fake-write-failure'}};
    if(table==='books' && options.race){ books.push({id:'raced',edition_format:'paperback',isbn13:payload.isbn13});return {data:null,error:{code:'23505'}}; }
    const row={...payload,id:`new-${++next}`};rows().push(row);return {data:row,error:null};
   }
   if(options.queryError)return {data:null,error:{code:'query-failed'}};
   const data=rows().filter(matches).slice(0,countLimit);return {data:single?data[0]??null:data,error:null};
  }
  const q={select(){return q},eq(k,v){filters.push(['eq',k,v]);return q},ilike(k,v){filters.push(['ilike',k,v]);return q},limit(n){countLimit=n;return q},insert(p){payload=p;operation='insert';return q},update(p){payload=p;operation='update';return q},maybeSingle(){return result(true)},single(){return result(true)},then(resolve,reject){return result().then(resolve,reject)}};
  return q;
 }};
 const route=load('app/api/books/reader/route.ts',{'@supabase/supabase-js':{createClient:(url,key,config)=>{assert.equal(config.global.headers.Authorization,'Bearer synthetic');assert.equal(config.auth.persistSession,false);return client;}}});
 return {books,copies,writes,post:async(body,authorization='Bearer synthetic')=>{const response=await route.POST(new Request('https://fixture.invalid/add',{method:'POST',headers:authorization?{authorization}:{},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()}}};
}
const minimal={title:'A synthetic book',languageCode:'ja',editionFormat:'paperback'};
test('minimal creation permits absent author, cover, identifier and totals, creates owner Library immediately',async()=>{
 for(const languageCode of ['ja','en','fr'])for(const {value:editionFormat}of helpers.READER_FORMAT_OPTIONS){
  const h=harness();const result=await h.post({...minimal,languageCode,editionFormat});assert.equal(result.status,200,JSON.stringify(result));
  const book=h.books[0];assert.equal(book.author,null);assert.equal(book.cover_url,null);assert.equal(book.page_count,null);assert.equal(book.isbn13,null);assert.equal(book.language_code,languageCode);assert.equal(book.edition_format,editionFormat);
  assert.equal(h.copies[0].user_id,'owner');assert.equal(h.copies[0].book_id,book.id);assert.equal(result.data.userBookId,h.copies[0].id);
 }
});
test('authorization and required reader fields are enforced before insertion',async()=>{
 for(const change of [{title:''},{languageCode:'other'},{languageCode:'zz'},{editionFormat:''},{isbn13:'not-valid'},{asin:'bad'}]){const h=harness();assert.equal((await h.post({...minimal,...change})).status,400);assert.equal(h.writes.length,0);}
 for(const change of [{targetUserId:'other'},{user_id:'other'},{destinations:{catalogOnly:true}},{mode:'global_only'},{studentId:'other'},{bookId:'x'}]){const h=harness();assert.equal((await h.post({...minimal,...change})).status,403);assert.equal(h.writes.length,0);}
 assert.equal((await harness().post(minimal,'')).status,401);assert.equal((await harness({invalidAuth:true}).post(minimal)).status,401);
});
test('identifier match reuses catalog and existing Library rows; exact format conflict cannot be bypassed',async()=>{
 const existing={id:'existing',isbn13:'9780306406157',edition_format:'paperback'};
 const h=harness({books:[existing],copies:[{id:'copy',user_id:'owner',book_id:'existing',personal_tracking_status:'want_to_read'}]});
 const result=await h.post({...minimal,isbn13:existing.isbn13});assert.equal(result.status,200);assert.equal(result.data.userBookId,'copy');assert.equal(h.writes.length,0);
 const conflict=await h.post({...minimal,isbn13:existing.isbn13,editionFormat:'ebook',confirmDifferentEdition:true});assert.equal(conflict.status,409);assert.equal(h.writes.length,0);
});
test('possible editions require explicit confirmation; no automatic merge; literal title wildcards escaped',async()=>{
 const existing={id:'same-title',title:'100% Book_',language_code:'ja',edition_format:'paperback'};
 const h=harness({books:[existing]});const result=await h.post({...minimal,title:existing.title});assert.equal(result.status,409);assert.equal(result.data.requiresConfirmation,true);assert.equal(h.writes.length,0);
 assert.equal((await h.post({...minimal,title:existing.title,confirmDifferentEdition:true})).status,200);assert.equal(h.books.length,2);
});
test('identifier creation race reuses the winning edition; query failures never create a fallback duplicate',async()=>{
 const h=harness({race:true});const result=await h.post({...minimal,isbn13:'9780306406157'});assert.equal(result.status,200);assert.equal(result.data.bookId,'raced');assert.equal(h.books.length,1);
 const failed=harness({queryError:true});assert.equal((await failed.post(minimal)).status,500);assert.equal(failed.writes.length,0);
});
test('Library attachment failure returns the existing created catalog ID for retry',async()=>{
 const h=harness({failLibrary:true});const result=await h.post(minimal);assert.equal(result.status,500);assert.equal(result.data.createdBookId,h.books[0].id);assert.equal(h.books.length,1);
});
test('optional ISBN metadata is retained without adding entry requirements; invalid cover schemes ignored',async()=>{
 const h=harness();assert.equal((await h.post({...minimal,metadata:{author:' An author ',coverUrl:'javascript:alert(1)',publisher:' Publisher ',pageCount:320}})).status,200);
 assert.equal(h.books[0].author,'An author');assert.equal(h.books[0].cover_url,null);assert.equal(h.books[0].publisher,'Publisher');assert.equal(h.books[0].page_count,320);
});

test('minimal metadata retains existing reading/study gates and progress behavior without a page total',()=>{
 const access=load('lib/access/readingCompanion.ts');
 const progress=load('lib/books/readingProgress.ts');
 const book={title:'Minimal',author:null,language_code:'ja',edition_format:'paperback',page_count:null};
 assert.deepEqual(load('lib/books/bookMetadata.ts').missingCoreBookFields(book),['author']); // Existing administrative missing-info detection remains strict.
 assert.equal(access.canUseReadingCompanionJournal({canAccessBook:true}),true);
 assert.equal(access.canUseReadingCompanionJournal({canAccessBook:false}),false);
 assert.equal(access.canUseActiveJapaneseLearningActions({bookLanguageCode:book.language_code,featureAccess:{canUseCuriosityReading:true}}),true);
 assert.equal(access.canUseActiveJapaneseLearningActions({bookLanguageCode:'fr',featureAccess:{canUseCuriosityReading:true}}),false);
 assert.equal(access.canUseActiveJapaneseLearningActions({bookLanguageCode:'ja',featureAccess:{canUseCuriosityReading:false,canUseSavedWordReading:false,canUseStudyFlashcards:false,canUseVocabularyList:false,canUseBulkAdd:false}}),false);
 assert.equal(progress.parseProgressRange('1','16','page',null).error,null);
 assert.equal(progress.completionPercent(16,'page',book),null);
 assert.equal(progress.effectiveProgressMethod(null,{edition_format:'audiobook'}),'audiobook_time');
});

test('reader provenance is atomic only on new catalog INSERT, including complete metadata and failed attachment',async()=>{
 for(const opts of [{},{failLibrary:true}]) {const h=harness(opts);await h.post({...minimal,metadata:{author:'Author',publisher:'Publisher',coverUrl:'https://example.invalid/cover',pageCount:20,publishedDate:'2026'}});assert.equal(h.books[0].reader_created,true);assert.equal(h.writes.filter(w=>w.table==='books').length,1);assert.equal(h.books[0].catalog_reviewed_at,undefined);}
 const existing={id:'existing',isbn13:'9780306406157',edition_format:'paperback',reader_created:false};const h=harness({books:[existing]});await h.post({...minimal,isbn13:existing.isbn13});assert.equal(h.writes.filter(w=>w.table==='books').length,0);assert.equal(existing.reader_created,false);
 const race=harness({race:true});await race.post({...minimal,isbn13:'9780306406157'});assert.equal(race.books.length,1);assert.equal(race.books[0].reader_created,undefined);
});
