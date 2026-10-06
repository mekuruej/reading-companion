// Run with PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node --test tests/guided-trial-workflow.test.mjs
// Uses an isolated PostgreSQL database; never connects to production.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const modulePath = process.env.PGLITE_MODULE;

test('Guided Trial routes converge without starting or replacing access during approval', { skip: !modulePath && 'Set PGLITE_MODULE to run isolated PostgreSQL integration tests' }, async () => {
  const { PGlite } = await import(modulePath);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
      create table profiles (id uuid primary key, display_name text, username text, role text default 'student',
        is_super_teacher boolean default false, app_access_type text default 'free', app_access_expires_at timestamptz, trial_started_at timestamptz);
      create table teacher_students (id uuid, teacher_id uuid, student_id uuid, archived_at timestamptz);
      create table user_alerts (user_id uuid, type text, message text);
    `);
    for (const file of ['20260813_japanese_learning_access_requests.sql', '20260814_japanese_learning_request_context.sql', '20260927_workspace_guided_trial_approval.sql', '20261006_stripe_subscription_billing.sql']) {
      await db.exec(fs.readFileSync(path.join(root, 'sql', file), 'utf8'));
    }
    const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    await db.query(`insert into profiles(id, role) values ($1,'super_teacher'),($2,'teacher'),($3,'admin')`, [id(1),id(2),id(3)]);
    for (let n = 10; n < 25; n++) await db.query('insert into profiles(id) values ($1)', [id(n)]);
    await db.query("insert into teacher_students(teacher_id,student_id) values ($1,$2)",[id(2),id(21)]);
    let actor = id(1);
    const client = {
      auth: {
        getUser: async token => ({ data: { user: token === 'invalid' ? null : { id: actor } } }),
        admin: { listUsers: async () => ({ data: { users: [{id:id(11),email:'student@example.com'}] } }) },
      },
      rpc: async (name, args) => {
        try { return {data: (await db.query(`select ${name}(${Object.keys(args).map((k,i)=>`${k} => $${i+1}`).join(',')}) as result`,Object.values(args))).rows[0].result}; }
        catch(error) { return {error}; }
      },
      from(table) {
        let operation='select', fields='*', values={}, filters=[], params=[], limit='';
        const query = {
          select(value) { fields=value; return query; },
          eq(key,value) { params.push(value); filters.push(`${key}=$${params.length}`); return query; },
          is(key,value) { assert.equal(value,null); filters.push(`${key} is null`); return query; },
          order(key,{ascending}) { query.orderSql=` order by ${key} ${ascending?'asc':'desc'}`; return query; },
          limit(n) {limit=` limit ${n}`; return query;},
          update(value) {operation='update';values=value;return query;},
          insert(value) {operation='insert';values=value;return query;},
          async execute(single=false) {
            let sql; const args=[...params];
            if(operation==='select') sql=`select ${fields} from ${table}`;
            else if(operation==='update') sql=`update ${table} set ${Object.entries(values).map(([k,v])=>{args.push(v);return `${k}=$${args.length}`;}).join(',')}`;
            else {args.push(...Object.values(values));sql=`insert into ${table} (${Object.keys(values).join(',')}) values (${Object.values(values).map((_,i)=>`$${i+1}`).join(',')})`;}
            if(filters.length) sql+=' where '+filters.join(' and ');
            if(operation==='select') sql+=(query.orderSql??'')+limit;
            else sql+=` returning ${fields}`;
            try {const rows=(await db.query(sql,args)).rows;return {data:single?(rows[0]??null):rows};} catch(error) {return {error};}
          },
          maybeSingle() {return query.execute(true);},
          then(resolve,reject) {return query.execute().then(resolve,reject);},
        }; return query;
      },
    };
    const cache=new Map();
    function load(relative) {
      const filename=path.resolve(root,relative);
      if(cache.has(filename)) return cache.get(filename).exports;
      const mod={exports:{}};cache.set(filename,mod);
      const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
      new Function('require','module','exports',compiled)(name=>{
        if(name==='@supabase/supabase-js') return {createClient:()=>client};
        if(name.startsWith('@/')) return load(name.slice(2)+'.ts');
        if(name.startsWith('.')) return load(path.resolve(path.dirname(filename),name)+'.ts');
        return require(name);
      },mod,mod.exports); return mod.exports;
    }
    const website=load('app/api/japanese-learning/request/route.ts');
    const review=load('app/api/teacher/japanese-learning-requests/route.ts');
    const trial=load('app/api/teacher/access/grant-trial/route.ts');
    const workspace=load('app/api/teacher/student-workspace/route.ts');
    const req = (method,body,token='valid') => new Request('http://localhost/api', {method,headers:{authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const call=async(handler,method,body)=>{const response=await handler(req(method,body)); const result=await response.json(); assert.equal(response.status,200,JSON.stringify(result));return result;};
    const profile=async n=>(await db.query('select * from profiles where id=$1',[id(n)])).rows[0];
    const manual=async n=>call(workspace.PATCH,'PATCH',{studentId:id(n),action:'approve-guided-trial'});
    // Normal website applicant -> approval -> scheduler state -> explicit trial start.
    actor=id(10);
    const submitted=await call(website.POST,'POST',{note:'From website',readingExperience:'starting',source:'study_hub'});
    assert.equal(submitted.request.status,'pending');
    actor=id(1);
    await call(review.PATCH,'PATCH',{requestId:submitted.request.id,action:'approve'});
    assert.equal((await profile(10)).trial_started_at,null);
    actor=id(10);
    assert.equal((await call(website.GET,'GET')).request.status,'approved');
    actor=id(1);
    await call(review.PATCH,'PATCH',{requestId:submitted.request.id,action:'start_trial'});
    assert.equal((await profile(10)).app_access_type,'trial');
    // Recruited student -> workspace approval -> same scheduler state and trial management.
    const before=await profile(11);
    const approved=await manual(11);
    assert.equal(approved.status,'approved');
    assert.deepEqual(await profile(11),before);
    assert.equal((await manual(11)).requestId,approved.requestId);
    actor=id(11);
    assert.equal((await call(website.GET,'GET')).request.status,'approved');
    assert.equal((await call(website.POST,'POST',{})).request.id,approved.requestId);
    actor=id(1);
    await call(trial.POST,'POST',{email:'student@example.com'});
    const active=await profile(11);
    assert.equal(active.app_access_type,'trial');
    assert.equal((new Date(active.app_access_expires_at)-new Date(active.trial_started_at))/86400000,28);
    assert.equal((await manual(11)).status,'existing_access');
    assert.deepEqual(await profile(11),active);
    // Pending and declined records are reused; onboarding context survives.
    actor=id(12);
    const pending=await call(website.POST,'POST',{note:'Keep my note',readingExperience:'comfortable'});
    actor=id(1);
    assert.equal((await manual(12)).requestId,pending.request.id);
    const reused=(await db.query('select * from japanese_learning_access_requests where user_id=$1',[id(12)])).rows;
    assert.equal(reused.length,1);assert.equal(reused[0].note,'Keep my note');
    await db.query(`insert into japanese_learning_access_requests(user_id,status) values ($1,'declined')`,[id(13)]);
    await manual(13);
    assert.equal((await db.query('select count(*)::int as n from japanese_learning_access_requests where user_id=$1',[id(13)])).rows[0].n,1);
    // All protected access variants are preserved, including expired trials.
    for(const [n,type,expiry] of [[14,'trial','2000-01-01'],[15,'reading_access',null],[16,'lesson_access',null],[17,'student',null]]) {
      await db.query('update profiles set app_access_type=$1,app_access_expires_at=$2 where id=$3',[type,expiry,id(n)]);
      const original=await profile(n);assert.equal((await manual(n)).status,'existing_access');assert.deepEqual(await profile(n),original);
    }
    // Repeated callers converge on one record.
    const concurrent=await Promise.all([manual(18),manual(18),manual(18)]);
    assert.equal(new Set(concurrent.map(x=>x.requestId)).size,1);
    actor=id(19);
    const simultaneous=await Promise.all([
      client.rpc('submit_japanese_learning_request',{student_id:id(19),request_note:null,experience:'starting',jlpt:null,source:'study_hub'}),
      client.rpc('approve_student_guided_trial',{student_id:id(19),reviewer_id:id(1)}),
    ]);
    assert.ok(simultaneous.every(x=>!x.error));
    assert.equal((await db.query('select count(*)::int as n from japanese_learning_access_requests where user_id=$1',[id(19)])).rows[0].n,1);
    // Auth checks reject students, ordinary teachers and unflagged admins.
    for(const n of [2,3,20]) {
      actor=id(n);
      const response=await workspace.PATCH(req('PATCH',{studentId:id(21),action:'approve-guided-trial'}));
      assert.equal(response.status,403);
      assert.ok((await client.rpc('approve_student_guided_trial',{student_id:id(21),reviewer_id:id(n)})).error);
    }
    assert.equal((await workspace.PATCH(req('PATCH',{studentId:id(21),action:'approve-guided-trial'},'invalid'))).status,401);
    const grants=(await db.query(`select has_function_privilege('authenticated','approve_student_guided_trial(uuid,uuid)','execute') as allowed`)).rows[0];
    assert.equal(grants.allowed,false);
  } finally {await db.close();}
});
