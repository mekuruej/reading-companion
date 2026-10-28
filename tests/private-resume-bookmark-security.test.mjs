import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const snapshot=JSON.parse(await fs.readFile(new URL('./fixtures/resume-bookmark-production-security.json',import.meta.url),'utf8'));
const migration=await fs.readFile(new URL('../sql/20261028_private_resume_bookmarks.sql',import.meta.url),'utf8');
const q=x=>'"'+x.replaceAll('"','""')+'"',lit=x=>"'"+x.replaceAll("'","''")+"'";
const uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const owner=uid(1),other=uid(2),teacher=uid(3),superTeacher=uid(4),book=uid(11),otherBook=uid(12);

async function setup(){
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,is_super_teacher boolean,is_public boolean);
 CREATE TABLE public.teacher_students(teacher_id uuid,student_id uuid);
 CREATE TABLE public.books(id uuid PRIMARY KEY,language_code text);
 CREATE TABLE public.user_books(id uuid PRIMARY KEY,user_id uuid,book_id uuid,progress_tracking_method text,current_location text,reader_advice text,rating_overall int,rating_difficulty int,reader_level text);
 CREATE TABLE public.user_book_reading_sessions(id int PRIMARY KEY,user_book_id uuid,end_page int,ending_phrase text);
 INSERT INTO auth.users VALUES ('${owner}'),('${other}'),('${teacher}'),('${superTeacher}');
 INSERT INTO public.profiles VALUES ('${owner}',false,false),('${other}',false,false),('${teacher}',false,false),('${superTeacher}',true,false);
 INSERT INTO public.teacher_students VALUES ('${teacher}','${owner}');
 INSERT INTO public.books VALUES ('${uid(100)}','ja');
 INSERT INTO public.user_books VALUES ('${book}','${owner}','${uid(100)}','page','Page 40',null,null,null,null),('${otherBook}','${other}','${uid(100)}','page','Page 5',null,null,null,null);
 INSERT INTO public.user_book_reading_sessions VALUES (1,'${book}',40,'Synthetic historical phrase');
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 CREATE FUNCTION public.current_user_has_japanese_learning_feature(text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
 `);
 for(const f of snapshot.related.functions)await db.exec(f.definition);
 await db.exec('GRANT EXECUTE ON FUNCTION auth.uid(),public.is_super_teacher(uuid) TO anon,authenticated,service_role');
 for(const g of [...snapshot.user_books.grants.map(g=>({...g,table_name:'user_books'})),...snapshot.supporting_grants.table_grants]){
  if(g.grantee!=='postgres')await db.exec(`GRANT ${g.privilege_type} ON public.${q(g.table_name)} TO ${q(g.grantee)}`);
 }
 for(const table of ['user_books','profiles','teacher_students'])await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
 for(const p of [...snapshot.user_books.policies.map(p=>({...p,tablename:'user_books'})),...snapshot.related.related_policies]){
  await db.exec(`CREATE POLICY ${q(p.policyname)} ON public.${q(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map(q).join(',')}${p.qual?' USING ('+p.qual+')':''}${p.with_check?' WITH CHECK ('+p.with_check+')':''}`);
 }
 for(const trigger of snapshot.triggers.triggers)await db.exec(trigger.definition);
 return db;
}
async function asUser(db,role,id,sql){
 await db.exec(`SET ROLE ${q(role)}; SET request.jwt.claim.sub=${lit(id??'')}`);
 try{return await db.query(sql)}finally{await db.exec('RESET ROLE')}
}
const upsert=(user,copy,kind='phrase',page=44,phrase='Synthetic owner bookmark')=>`INSERT INTO public.user_book_resume_bookmarks(user_id,user_book_id,kind,page,phrase) VALUES ('${user}','${copy}',${lit(kind)},${page},${phrase==null?'NULL':lit(phrase)}) ON CONFLICT(user_id,user_book_id) DO UPDATE SET kind=excluded.kind,page=excluded.page,phrase=excluded.phrase RETURNING kind,page,phrase`;

// All databases are in-memory and contain synthetic records. No network access.
test('private bookmark migration with captured Production policies/grants',async t=>{
 const db=await setup();
 try{
  const before={rows:(await db.query('SELECT * FROM public.user_books ORDER BY id')).rows,history:(await db.query('SELECT * FROM public.user_book_reading_sessions ORDER BY id')).rows,
   policies:(await db.query("SELECT tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows,
   grants:(await db.query("SELECT table_name,grantee,privilege_type,is_grantable FROM information_schema.role_table_grants WHERE table_schema='public' ORDER BY table_name,grantee,privilege_type")).rows};
  await db.exec(migration);
  await t.test('new private table leaves existing rows, session history and Library policies/grants untouched',async()=>{
   assert.deepEqual((await db.query('SELECT * FROM public.user_books ORDER BY id')).rows,before.rows);
   assert.deepEqual((await db.query('SELECT * FROM public.user_book_reading_sessions ORDER BY id')).rows,before.history);
   assert.deepEqual((await db.query("SELECT tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename<>'user_book_resume_bookmarks' ORDER BY tablename,policyname")).rows,before.policies);
   assert.deepEqual((await db.query("SELECT table_name,grantee,privilege_type,is_grantable FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name<>'user_book_resume_bookmarks' ORDER BY table_name,grantee,privilege_type")).rows,before.grants);
   assert.equal((await db.query("SELECT count(*) AS n FROM information_schema.columns WHERE table_name='user_books' AND column_name LIKE 'resume_bookmark_%'")).rows[0].n,0);
  });
  await t.test('owner CRUD, top/end/phrase persistence, and empty/unset state',async()=>{
   assert.equal((await asUser(db,'authenticated',owner,'SELECT * FROM public.user_book_resume_bookmarks')).rows.length,0);
   for(const [kind,page,phrase]of[['top',44,null],['end',45,null],['phrase',44,'家族']]){
    await asUser(db,'authenticated',owner,upsert(owner,book,kind,page,phrase));
    assert.deepEqual((await asUser(db,'authenticated',owner,`SELECT kind,page,phrase FROM public.user_book_resume_bookmarks WHERE user_book_id='${book}'`)).rows[0],{kind,page,phrase});
   }
   assert.equal((await asUser(db,'authenticated',owner,`DELETE FROM public.user_book_resume_bookmarks WHERE user_book_id='${book}' RETURNING user_book_id`)).rows.length,1);
   await asUser(db,'authenticated',owner,upsert(owner,book));
  });
  await t.test('linked teacher, super teacher and unrelated reader cannot SELECT, UPDATE, DELETE or UPSERT another reader bookmark',async()=>{
   for(const actor of [teacher,superTeacher,other]){
    assert.equal((await asUser(db,'authenticated',actor,`SELECT * FROM public.user_book_resume_bookmarks WHERE user_id='${owner}'`)).rows.length,0);
    assert.equal((await asUser(db,'authenticated',actor,`UPDATE public.user_book_resume_bookmarks SET phrase='Forbidden' WHERE user_id='${owner}' RETURNING user_id`)).rows.length,0);
    assert.equal((await asUser(db,'authenticated',actor,`DELETE FROM public.user_book_resume_bookmarks WHERE user_id='${owner}' RETURNING user_id`)).rows.length,0);
    await assert.rejects(asUser(db,'authenticated',actor,upsert(owner,book)),e=>e.code==='42501');
    await assert.rejects(asUser(db,'authenticated',actor,upsert(actor,book)),e=>e.code==='42501');
   }
  });
  await t.test('teacher Library INSERT cannot initialize private student bookmarks',async()=>{
   const copy=uid(31);
   await asUser(db,'authenticated',teacher,`INSERT INTO public.user_books(id,user_id,progress_tracking_method) VALUES ('${copy}','${owner}','page')`);
   await assert.rejects(asUser(db,'authenticated',teacher,upsert(owner,copy)),e=>e.code==='42501');
   await assert.rejects(asUser(db,'authenticated',teacher,upsert(teacher,copy)),e=>e.code==='42501');
   await asUser(db,'authenticated',owner,upsert(owner,copy));
  });
  await t.test('anonymous and service-role direct access denied; no TRUNCATE/TRIGGER/REFERENCES grants',async()=>{
   for(const role of ['anon','service_role'])for(const sql of ['SELECT * FROM public.user_book_resume_bookmarks',upsert(owner,book),`UPDATE public.user_book_resume_bookmarks SET page=1`,`DELETE FROM public.user_book_resume_bookmarks`]){
    await assert.rejects(asUser(db,role,null,sql),e=>e.code==='42501');
   }
   const metadata=(await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='public.user_book_resume_bookmarks'::regclass")).rows[0];assert.deepEqual(metadata,{relrowsecurity:true,relforcerowsecurity:true});
   for(const permission of ['TRUNCATE','TRIGGER','REFERENCES'])assert.equal((await db.query(`SELECT has_table_privilege('authenticated','public.user_book_resume_bookmarks','${permission}') AS allowed`)).rows[0].allowed,false);
  });
  await t.test('invalid bookmark combinations and attempts to move private data to another owner/book fail',async()=>{
   const invalid=["kind='unknown'","page=-1","page=NULL","kind=NULL","kind='top',phrase='not allowed'","kind='phrase',phrase=NULL","kind='phrase',phrase=' '","kind='phrase',phrase=repeat('x',501)"];
   for(const patch of invalid)await assert.rejects(asUser(db,'authenticated',owner,`UPDATE public.user_book_resume_bookmarks SET ${patch} WHERE user_id='${owner}' AND user_book_id='${book}'`),e=>['23514','23502'].includes(e.code));
   await assert.rejects(asUser(db,'authenticated',owner,`UPDATE public.user_book_resume_bookmarks SET user_id='${other}' WHERE user_book_id='${book}'`),e=>e.code==='42501');
   await assert.rejects(asUser(db,'authenticated',owner,`UPDATE public.user_book_resume_bookmarks SET user_book_id='${otherBook}' WHERE user_book_id='${book}'`),e=>e.code==='42501');
   await assert.rejects(asUser(db,'authenticated',owner,upsert(owner,uid(999))),e=>e.code==='42501');
   // Privileged fixture administrator isolates the FK from normal RLS rejection.
   await assert.rejects(db.query(upsert(owner,uid(999))),e=>e.code==='23503');
   await assert.rejects(db.query(upsert(uid(999),book)),e=>e.code==='23503');
  });
  await t.test('repeat migration preserves bookmark data, including when default grants are broad',async()=>{
   const saved=(await db.query('SELECT * FROM public.user_book_resume_bookmarks ORDER BY user_id,user_book_id')).rows;
   await db.exec(migration);
   assert.deepEqual((await db.query('SELECT * FROM public.user_book_resume_bookmarks ORDER BY user_id,user_book_id')).rows,saved);
   assert.equal((await db.query("SELECT has_table_privilege('service_role','public.user_book_resume_bookmarks','SELECT') AS allowed")).rows[0].allowed,false);
  });
  await t.test('existing teacher read/update/insert and super teacher operations on Library remain available',async()=>{
   assert.equal((await asUser(db,'authenticated',teacher,`SELECT id FROM public.user_books WHERE id='${book}'`)).rows.length,1);
   await asUser(db,'authenticated',teacher,`UPDATE public.user_books SET current_location='Page 41' WHERE id='${book}'`);
   await asUser(db,'authenticated',superTeacher,`UPDATE public.user_books SET current_location='Page 42' WHERE id='${book}'`);
   assert.equal((await asUser(db,'authenticated',owner,`SELECT current_location FROM public.user_books WHERE id='${book}'`)).rows[0].current_location,'Page 42');
   assert.deepEqual((await db.query('SELECT * FROM public.user_book_reading_sessions ORDER BY id')).rows,before.history);
  });
  await t.test('Library ownership changes never transfer private bookmarks or obstruct a new owner bookmark',async()=>{
   // The existing super-teacher policy permits this Library operation.
   await asUser(db,'authenticated',superTeacher,`UPDATE public.user_books SET user_id='${other}' WHERE id='${book}'`);
   assert.equal((await asUser(db,'authenticated',other,`SELECT * FROM public.user_book_resume_bookmarks WHERE user_book_id='${book}'`)).rows.length,0);
   await asUser(db,'authenticated',other,upsert(other,book,'top',12,null));
   assert.equal((await asUser(db,'authenticated',other,`SELECT page FROM public.user_book_resume_bookmarks WHERE user_book_id='${book}'`)).rows[0].page,12);
   assert.equal((await asUser(db,'authenticated',owner,`SELECT phrase FROM public.user_book_resume_bookmarks WHERE user_book_id='${book}'`)).rows[0].phrase,'Synthetic owner bookmark');
   await assert.rejects(asUser(db,'authenticated',owner,upsert(owner,book)),e=>e.code==='42501');
   await asUser(db,'authenticated',owner,`DELETE FROM public.user_book_resume_bookmarks WHERE user_book_id='${book}'`);
  });
  await t.test('Library/account deletion cascades without orphan bookmarks, including legitimate parent operations',async()=>{
   await asUser(db,'authenticated',superTeacher,`DELETE FROM public.user_books WHERE id='${book}'`);
   assert.equal((await db.query(`SELECT * FROM public.user_book_resume_bookmarks WHERE user_book_id='${book}'`)).rows.length,0);
   assert.equal((await db.query(`SELECT * FROM public.user_book_resume_bookmarks WHERE user_id='${owner}'`)).rows.length,1);
   await db.exec(`DELETE FROM auth.users WHERE id='${owner}'`);
   assert.equal((await db.query(`SELECT * FROM public.user_book_resume_bookmarks WHERE user_id='${owner}'`)).rows.length,0);
  });
 }finally{await db.close()}
});

test('unexpected policies cause migration to stop transactionally without altering Library policies',async()=>{
 const db=await setup();try{
  await db.exec(migration);
  await db.exec("CREATE POLICY unexpected_private_access ON public.user_book_resume_bookmarks FOR SELECT TO authenticated USING (true)");
  await assert.rejects(db.exec(migration),/Unexpected private bookmark constraints or policies/);await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT count(*) AS n FROM pg_policies WHERE tablename='user_book_resume_bookmarks' AND policyname='unexpected_private_access'")).rows[0].n,1);
 }finally{await db.close()}
});


test('unexpected inherited service-role privileges fail closed and roll back creation',async()=>{
 const db=await setup();try{
  await db.exec('GRANT authenticated TO service_role');
  await assert.rejects(db.exec(migration),/Unexpected inherited anonymous\/service-role access/);await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT to_regclass('public.user_book_resume_bookmarks') AS relation")).rows[0].relation,null);
 }finally{await db.close()}
});

test('legacy user_books bookmark storage requires a separate reviewed transition',async()=>{
 const db=await setup();try{
  await db.exec("ALTER TABLE public.user_books ADD COLUMN resume_bookmark_phrase text; UPDATE public.user_books SET resume_bookmark_phrase='Synthetic legacy cue'");
  await assert.rejects(db.exec(migration),/Legacy user_books bookmark columns found/);await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT to_regclass('public.user_book_resume_bookmarks') AS relation")).rows[0].relation,null);
  assert.equal((await db.query('SELECT resume_bookmark_phrase FROM public.user_books LIMIT 1')).rows[0].resume_bookmark_phrase,'Synthetic legacy cue');
 }finally{await db.close()}
});
