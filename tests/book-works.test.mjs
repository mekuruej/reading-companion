import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>{
  if(name.startsWith('.')||name.startsWith('@/')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(base+'.ts')}
  return require(name);
 },mod,mod.exports);return mod.exports;
}
const {loadBookWork}=load('lib/books/bookWorks.ts');
const {canMaintainCatalog}=load('lib/books/catalogMaintenance.ts');
const migration=fs.readFileSync('sql/20261014_book_works.sql','utf8');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create table profiles(id uuid primary key,role text,is_super_teacher boolean default false);
 create table books(id uuid primary key,title text,author text,language_code text,edition_format text,edition_note text,isbn13 text,asin text,page_count int,kindle_location_count int);
 create table user_books(id uuid primary key,book_id uuid,user_id uuid);
 create table teacher_books(id uuid primary key,book_id uuid,teacher_id uuid);
 insert into auth.users values('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}');
 insert into profiles values('${id(1)}','admin',false),('${id(2)}','super_teacher',false),('${id(3)}','teacher',false),('${id(4)}','reader',false);
 insert into books values('${id(10)}','Work A','Author','ja','paperback','print','111',null,200,null),('${id(11)}','Work A','Author','ja','ebook','Kindle',null,'ASIN1',null,2500),('${id(12)}','Unrelated','Someone','ja','hardcover',null,'222',null,350,null);
 grant usage on schema public to authenticated,service_role;
 grant select,insert,update,delete on books to authenticated;
 grant all on all tables in schema public to service_role;`);
 return db;
}
async function action(db,{actor=id(1),book=id(10),previous=null,action='create',confirmed=true,work=null,title='Work A',author='Author'}={}){
 return (await db.query('select maintain_book_work($1,$2,$3,$4,$5,$6,$7,$8) as work',[actor,book,previous,action,confirmed,work,title,author])).rows[0].work;
}
function adapter(db){return {from(table){assert.ok(['books','book_works'].includes(table));let columns='*',filters=[],params=[],offset=0,limit=null,order='';const q={select(c){columns=c;return q},eq(k,v){params.push(v);filters.push(`${k}=$${params.length}`);return q},order(k){order=k;return q},range(a,b){offset=a;limit=b-a+1;return q},async single(){const result=await q;return {data:result.data[0],error:null}},async maybeSingle(){return q.single()},async then(resolve,reject){try{const rows=await db.query(`select ${columns} from ${table}${filters.length?' where '+filters.join(' and '):''}${order?' order by '+order:''}${limit!=null?' limit '+limit+' offset '+offset:''}`,params);return resolve({data:rows.rows,error:null})}catch(e){return reject(e)}}};return q}}}
test('migration preserves all legacy rows unlinked and is repeatable',async()=>{
 const db=await fixture();try{
 const before=(await db.query('select * from books order by id')).rows;
 await db.exec(migration);await db.exec(migration);
 const after=(await db.query('select * from books order by id')).rows;
 assert.equal(after.length,3);for(let i=0;i<3;i++){for(const [k,v] of Object.entries(before[i]))assert.deepEqual(after[i][k],v);assert.equal(after[i].work_id,null)}
 assert.equal((await db.query('select count(*)::int n from book_works')).rows[0].n,0);
 }finally{await db.close()}
});
test('explicit creation, linkage, move and unlink preserve exact editions, metadata and ownership',async()=>{
 const db=await fixture();try{
 await db.exec(migration);
 const before=(await db.query('select * from books order by id')).rows;
 await db.exec('set role service_role');
 const a=await action(db);await action(db,{book:id(11),action:'link',work:a});
 const context=await loadBookWork(adapter(db),id(10));assert.equal(context.work.id,a);assert.deepEqual(context.editions.map(e=>e.id),[id(10),id(11)]);
 assert.equal((await loadBookWork(adapter(db),id(12))).work,null);
 assert.deepEqual((await loadBookWork(adapter(db),id(12))).editions,[]);
 assert.equal(await loadBookWork(adapter(db),id(99)),null);
 const linked=(await db.query('select * from books order by id')).rows;
 for(let i=0;i<3;i++)for(const [k,v] of Object.entries(before[i]))if(!['work_id','work_linked_at','work_linked_by'].includes(k))assert.deepEqual(linked[i][k],v,k);
 assert.equal(linked[0].work_id,a);assert.equal(linked[1].work_id,a);assert.equal(linked[2].work_id,null);
 const b=await action(db,{book:id(12),title:'Work B',actor:id(2)});
 await assert.rejects(action(db,{book:id(11),previous:a,action:'link',work:b,confirmed:false}),/Explicit confirmation/);
 await assert.rejects(action(db,{book:id(11),previous:null,action:'link',work:b}),/Work link changed/);
 await action(db,{book:id(11),previous:a,action:'link',work:b});
 assert.deepEqual((await loadBookWork(adapter(db),id(10))).editions.map(e=>e.id),[id(10)]);
 assert.deepEqual((await loadBookWork(adapter(db),id(11))).editions.map(e=>e.id),[id(11),id(12)]);
 await action(db,{book:id(11),previous:b,action:'unlink'});
 assert.equal((await loadBookWork(adapter(db),id(11))).work,null);
 assert.equal((await db.query('select count(*)::int n from books')).rows[0].n,3);
 for(const table of ['user_books','teacher_books'])assert.equal((await db.query(`select count(*)::int n from ${table}`)).rows[0].n,0);
 assert.equal((await db.query('select work_linked_by from books where id=$1',[id(11)])).rows[0].work_linked_by,id(1));
 await assert.rejects(db.query('delete from book_works where id=$1',[a]),/foreign key/);
 }finally{await db.close()}
});
test('direct client writes cannot bypass catalog authorization; server RPC also checks actor',async()=>{
 const db=await fixture();try{
 await db.exec(migration);
 await db.exec('set role service_role');const a=await action(db);
 for(const actor of [id(3),id(4),id(99)])await assert.rejects(action(db,{actor,book:id(11),action:'link',work:a}),/Catalog maintenance access/);
 await db.exec('set role authenticated');
 assert.equal((await db.query('select count(*)::int n from book_works')).rows[0].n,1);
 await assert.rejects(action(db,{book:id(11),action:'link',work:a}),/permission denied/);
 await assert.rejects(db.query('update books set work_id=$1 where id=$2',[a,id(11)]),/authorized catalog maintenance/);
 await assert.rejects(db.query('update books set work_id=null where id=$1',[id(10)]),/authorized catalog maintenance/);
 await assert.rejects(db.query('insert into books(id,work_id) values($1,$2)',[id(13),a]),/authorized catalog maintenance/);
 await assert.rejects(db.query('insert into book_works(title) values($1)',['Forged']),/permission denied/);
 // Ordinary metadata edits are not blocked by the new guard.
 await db.query('update books set title=$1 where id=$2',['Corrected title',id(11)]);
 await db.exec('set role anon');await assert.rejects(db.query('select * from book_works'),/permission denied/);
 }finally{await db.close()}
});
test('failed creation leaves no orphan work; stale confirmation cannot overwrite a new link',async()=>{
 const db=await fixture();try{
 await db.exec(migration);await db.exec('set role service_role');
 const a=await action(db);await assert.rejects(action(db,{title:'Accidental second work'}),/Work link changed/);
 await assert.rejects(action(db,{book:id(11),title:'x'.repeat(501)}),/check constraint/);
 await assert.rejects(action(db,{book:id(11),action:'link',work:id(99)}),/Work not found/);
 assert.equal((await db.query('select count(*)::int n from book_works')).rows[0].n,1);
 assert.equal((await loadBookWork(adapter(db),id(11))).work,null);
 assert.equal((await loadBookWork(adapter(db),id(10))).work.id,a);
 }finally{await db.close()}
});
test('catalog role predicate accepts maintenance roles without assigning teaching access',()=>{
 for(const p of [{role:'admin'},{role:'super_teacher'},{role:'reader',is_super_teacher:true},{role:'reader',is_super_teacher:'true'}])assert.equal(canMaintainCatalog(p),true);
 for(const p of [null,{role:'teacher'},{role:'reader'},{role:'reader',is_super_teacher:'false'}])assert.equal(canMaintainCatalog(p),false);
});
test('same-edition teaching validator and source matching remain unchanged',()=>{
 const validator=fs.readFileSync('lib/teacher/studentToolContext.ts','utf8');assert.match(validator,/source.data.book_id !== copy.data.book_id/);assert.doesNotMatch(validator,/work_id|bookWorks/);
 for(const file of ['app/api/books/[userBookId]/teaching-lesson/route.ts','app/api/vocab/bulk/teaching/route.ts'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/work_id|bookWorks/);
});
test('work-only changes do not require rewriting incomplete legacy edition metadata',async()=>{
 const db=await fixture();try{
 await db.exec(`update books set author=null,edition_format=null,language_code=null where id='${id(10)}'`);
 await db.exec(fs.readFileSync('sql/20260929_book_core_metadata_and_narrator.sql','utf8'));
 await db.exec(migration);await db.exec('set role service_role');
 const work=await action(db);const edition=(await db.query('select * from books where id=$1',[id(10)])).rows[0];
 assert.equal(edition.work_id,work);assert.equal(edition.author,null);assert.equal(edition.edition_format,null);assert.equal(edition.language_code,null);
 }finally{await db.close()}
});
