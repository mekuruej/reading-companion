import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/reader-add-book-baseline.json',import.meta.url),'utf8'));
const migration=await fs.readFile(new URL('../sql/20261029_reader_book_optional_author.sql',import.meta.url),'utf8');
const q=s=>'"'+s.replaceAll('"','""')+'"';
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
async function setup(){
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION public.is_super_teacher(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
 CREATE TABLE public.books(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,author text,language_code text DEFAULT 'ja',edition_format text,cover_url text,isbn13 text,publisher text,page_count int,narrator text,
 CONSTRAINT books_edition_format_check CHECK(edition_format IN ('bunko','tankobon_hardcover','tankobon_softcover','paperback','hardcover','ebook','audiobook','other')));
 CREATE TABLE public.user_books(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,book_id uuid REFERENCES books(id) ON DELETE RESTRICT,UNIQUE(user_id,book_id));
 CREATE TABLE public.user_book_reading_sessions(id int PRIMARY KEY,user_book_id uuid REFERENCES user_books(id),end_page int);
 INSERT INTO books(id,title,author,language_code,edition_format) VALUES ('00000000-0000-0000-0000-000000000100','Legacy book',NULL,NULL,NULL);
 INSERT INTO user_books(id,user_id,book_id) VALUES ('00000000-0000-0000-0000-000000000200','${owner}','00000000-0000-0000-0000-000000000100');
 INSERT INTO user_book_reading_sessions VALUES (1,'00000000-0000-0000-0000-000000000200',16);
 ALTER TABLE books ENABLE ROW LEVEL SECURITY; ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
 CREATE POLICY owner_read ON user_books FOR SELECT TO authenticated USING(user_id=auth.uid());
 CREATE POLICY owner_insert ON user_books FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
 GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
 GRANT SELECT,INSERT,UPDATE ON books TO authenticated;
 GRANT SELECT,INSERT ON user_books TO authenticated;
 `);
 for(const p of fixture.books_policies.filter(p=>p.tablename==='books'))await db.exec(`CREATE POLICY ${q(p.policyname)} ON books FOR ${p.cmd} TO ${p.roles.map(q).join(',')}${p.qual?' USING ('+p.qual+')':''}${p.with_check?' WITH CHECK ('+p.with_check+')':''}`);
 await db.exec(fixture.core_function.definition);
 await db.exec('CREATE TRIGGER validate_book_core_metadata BEFORE INSERT OR UPDATE ON books FOR EACH ROW EXECUTE FUNCTION validate_book_core_metadata()');
 return db;
}
async function metadata(db){return (await db.query(`SELECT jsonb_build_object('policies',(SELECT jsonb_agg(p ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public'),'grants',(SELECT jsonb_agg(g ORDER BY table_name,grantee,privilege_type) FROM information_schema.role_table_grants g WHERE table_schema='public'),'triggers',(SELECT jsonb_agg(pg_get_triggerdef(oid) ORDER BY tgname) FROM pg_trigger WHERE NOT tgisinternal),'columns',(SELECT jsonb_agg(c ORDER BY table_name,ordinal_position) FROM information_schema.columns c WHERE table_schema='public'),'function_acl',(SELECT proacl FROM pg_proc WHERE oid='public.validate_book_core_metadata()'::regprocedure),'owner',(SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.validate_book_core_metadata()'::regprocedure)) AS snapshot`)).rows[0].snapshot;}
async function asUser(db,id,sql){await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${id}'`);try{return await db.query(sql)}finally{await db.exec('RESET ROLE')}}

test('author-optional migration: real baseline trigger/policies, metadata preservation, RLS and immediate sessions',async()=>{
 const db=await setup();try{
  const before=await metadata(db),rows=(await db.query('SELECT * FROM books')).rows,history=(await db.query('SELECT * FROM user_book_reading_sessions')).rows;
  await assert.rejects(db.exec("INSERT INTO books(title,language_code,edition_format) VALUES ('New','ja','paperback')"),/Author is required/);
  await db.exec(migration);
  assert.deepEqual(await metadata(db),before);
  assert.deepEqual((await db.query('SELECT * FROM books')).rows,rows);
  assert.deepEqual((await db.query('SELECT * FROM user_book_reading_sessions')).rows,history);
  for(const language of ['ja','en','fr'])for(const format of ['paperback','hardcover','ebook','audiobook','other']){
   const added=await asUser(db,owner,`INSERT INTO books(title,language_code,edition_format) VALUES ('Minimal','${language}','${format}') RETURNING *`);
   assert.equal(added.rows[0].author,null);assert.equal(added.rows[0].page_count,null);assert.equal(added.rows[0].cover_url,null);
   const copy=await asUser(db,owner,`INSERT INTO user_books(user_id,book_id) VALUES ('${owner}','${added.rows[0].id}') RETURNING id`);
   await db.exec(`INSERT INTO user_book_reading_sessions VALUES ((SELECT max(id)+1 FROM user_book_reading_sessions),'${copy.rows[0].id}',1)`);
  }
  assert.equal((await asUser(db,other,'SELECT * FROM user_books')).rows.length,0);
  await assert.rejects(asUser(db,other,`INSERT INTO user_books(user_id,book_id) VALUES ('${owner}','00000000-0000-0000-0000-000000000100')`),/row-level security/);
  await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT * FROM books'),/permission denied/);await db.exec('RESET ROLE');
  for(const values of ["'',NULL,'ja','paperback'","'New',' ','ja','paperback'","'New',NULL,NULL,'paperback'","'New',NULL,'other','paperback'","'New',NULL,'JA','paperback'","'New',NULL,'en',NULL","'New',NULL,'en','bad-format'"]){await assert.rejects(db.exec(`INSERT INTO books(title,author,language_code,edition_format) VALUES (${values})`));}
  for(const format of ['bunko','tankobon_softcover','tankobon_hardcover'])await db.exec(`INSERT INTO books(title,author,language_code,edition_format) VALUES ('Teacher edition','Author','ja','${format}')`);
  await db.exec("UPDATE books SET publisher='New metadata' WHERE title='Legacy book'");
  await db.exec(migration);assert.deepEqual(await metadata(db),before);
  const fn=(await db.query("SELECT prosecdef,proconfig FROM pg_proc WHERE oid='public.validate_book_core_metadata()'::regprocedure")).rows[0];assert.equal(fn.prosecdef,false);assert.deepEqual(fn.proconfig,['search_path=public']);
 }finally{await db.close()}
});
test('unexpected function drift stops the transactional migration before changing anything',async()=>{
 const db=await setup();try{
  await db.exec("CREATE OR REPLACE FUNCTION public.validate_book_core_metadata() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$BEGIN RETURN NEW; END$$");
  const before=(await db.query("SELECT pg_get_functiondef('public.validate_book_core_metadata()'::regprocedure) AS definition")).rows;
  await assert.rejects(db.exec(migration),/Unexpected core metadata/);await db.exec('ROLLBACK');
  assert.deepEqual((await db.query("SELECT pg_get_functiondef('public.validate_book_core_metadata()'::regprocedure) AS definition")).rows,before);
 }finally{await db.close()}
});

test('NULL author is INSERT-only relaxation: existing authors cannot be cleared by catalog editors',async()=>{
 const db=await setup();try{
  await db.exec(migration);
  for(const actor of [owner,other]){
   const row=(await asUser(db,owner,"INSERT INTO books(title,author,language_code,edition_format) VALUES ('Existing edition','Original author','en','paperback') RETURNING id")).rows[0];
   for(const invalid of ['NULL',"''","'   '"]){
    await assert.rejects(asUser(db,actor,`UPDATE books SET author=${invalid} WHERE id='${row.id}'`),/Author is required/);
    assert.equal((await db.query(`SELECT author FROM books WHERE id='${row.id}'`)).rows[0].author,'Original author');
   }
   await asUser(db,actor,`UPDATE books SET author='Corrected author' WHERE id='${row.id}'`);
   await asUser(db,actor,`UPDATE books SET author=author,publisher='Ordinary edit' WHERE id='${row.id}'`);
   assert.equal((await db.query(`SELECT author FROM books WHERE id='${row.id}'`)).rows[0].author,'Corrected author');
  }
 }finally{await db.close()}
});

test('legitimately authorless books allow ordinary edits, explicit NULL no-ops and later author enrichment',async()=>{
 const db=await setup();try{
  await db.exec(migration);
  for(const authorClause of ['',',author']){
   const authorValue=authorClause?',NULL':'';
   const row=(await asUser(db,owner,`INSERT INTO books(title,language_code,edition_format${authorClause}) VALUES ('Authorless edition','ja','paperback'${authorValue}) RETURNING id,author`)).rows[0];
   assert.equal(row.author,null);
   await asUser(db,owner,`UPDATE books SET publisher='Publisher',page_count=200 WHERE id='${row.id}'`);
   await asUser(db,owner,`UPDATE books SET title='Corrected title',author=NULL,language_code='fr',edition_format='ebook' WHERE id='${row.id}'`);
   const edited=(await db.query(`SELECT author,title,language_code,edition_format,page_count FROM books WHERE id='${row.id}'`)).rows[0];
   assert.deepEqual(edited,{author:null,title:'Corrected title',language_code:'fr',edition_format:'ebook',page_count:200});
   for(const assignment of ["title=''","language_code=NULL","language_code='other'","edition_format=NULL","edition_format='invalid'","author='  '"]){
    await assert.rejects(asUser(db,owner,`UPDATE books SET ${assignment} WHERE id='${row.id}'`));
   }
   await asUser(db,owner,`UPDATE books SET author='Verified author' WHERE id='${row.id}'`);
   await assert.rejects(asUser(db,owner,`UPDATE books SET author=NULL WHERE id='${row.id}'`),/Author is required/);
  }
  await asUser(db,owner,"UPDATE books SET author=NULL,publisher='Legacy ordinary edit' WHERE title='Legacy book'");
  assert.equal((await db.query("SELECT author FROM books WHERE title='Legacy book'")).rows[0].author,null);
 }finally{await db.close()}
});

test('previous overly broad optional-author definition is rejected as unexpected installed drift',async()=>{
 const db=await setup();try{
  const unsafe=fixture.core_function.definition.replace("and nullif(btrim(NEW.author), '') is null then","and NEW.author is not null and nullif(btrim(NEW.author), '') is null then");
  assert.notEqual(unsafe,fixture.core_function.definition);
  await db.exec(unsafe);
  const before=(await db.query("SELECT pg_get_functiondef('public.validate_book_core_metadata()'::regprocedure) AS definition")).rows;
  await assert.rejects(db.exec(migration),/Unexpected core metadata/);
  await db.exec('ROLLBACK');
  assert.deepEqual((await db.query("SELECT pg_get_functiondef('public.validate_book_core_metadata()'::regprocedure) AS definition")).rows,before);
 }finally{await db.close()}
});

test('broad existing Supabase table grants do not bypass catalog or Library RLS after migration',async()=>{
 const db=await setup();try{
  // The supplied Production export has these broad ACLs; RLS remains the boundary.
  await db.exec('GRANT ALL ON books,user_books TO anon,authenticated,service_role');
  const before=await metadata(db);
  await db.exec(migration);
  assert.deepEqual(await metadata(db),before);
  await db.exec("SET ROLE anon; SET request.jwt.claim.sub=''");
  assert.equal((await db.query('SELECT * FROM books')).rows.length,0);
  assert.equal((await db.query('SELECT * FROM user_books')).rows.length,0);
  await assert.rejects(db.exec("INSERT INTO books(title,language_code,edition_format) VALUES ('Anonymous attempt','en','ebook')"),/row-level security/);
  await assert.rejects(db.exec(`INSERT INTO user_books(user_id,book_id) VALUES ('${owner}','00000000-0000-0000-0000-000000000100')`),/row-level security/);
  await db.exec('RESET ROLE');
  const row=(await asUser(db,owner,"INSERT INTO books(title,language_code,edition_format) VALUES ('Owner authorless book','en','ebook') RETURNING id")).rows[0];
  await asUser(db,owner,`INSERT INTO user_books(user_id,book_id) VALUES ('${owner}','${row.id}')`);
  assert.equal((await asUser(db,other,'SELECT * FROM user_books')).rows.length,0);
  await assert.rejects(asUser(db,other,`INSERT INTO user_books(user_id,book_id) VALUES ('${owner}','${row.id}')`),/row-level security/);
  assert.deepEqual(await metadata(db),before);
 }finally{await db.close()}
});
