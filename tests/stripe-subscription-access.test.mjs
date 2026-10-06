import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration = fs.readFileSync(new URL('../sql/20261006_stripe_subscription_billing.sql',import.meta.url),'utf8');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const future = new Date(Date.now()+86400000).toISOString();
const past = new Date(Date.now()-86400000).toISOString();

test('Stripe migration and real PostgreSQL entitlement transitions', async t => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
   create table profiles(id uuid primary key,role text default 'member',is_super_teacher boolean default false,
   app_access_type text not null default 'free',app_access_expires_at timestamptz,trial_started_at timestamptz);
   create table japanese_learning_access_requests(id uuid primary key default gen_random_uuid(),user_id uuid,status text);
   create table user_books(id uuid primary key,user_id uuid, title text);
  `);
  await db.exec(migration);
  for(let n=1;n<=15;n++) await db.query('insert into profiles(id) values($1)',[id(n)]);
  await db.query("update profiles set role='super_teacher' where id=$1",[id(15)]);
  const profile = async n => (await db.query('select * from profiles where id=$1',[id(n)])).rows[0];
  const rpc = async (name,args) => (await db.query(`select ${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args)).rows[0].result;
  const ref = n => String(n).padStart(64,'0');
  async function bind(n,suffix=String(n)) {
   const created = new Date().toISOString();
   await rpc('begin_stripe_checkout',[id(n),ref(n),'plink_test','price_test']);
   await rpc('bind_stripe_checkout',[ref(n),'cs_'+suffix,'sub_'+suffix,'cus_'+suffix,'plink_test','price_test',created]);
   return 'sub_'+suffix;
  }
  async function apply(n,snapshots) {
   const token=id(100+n);
   assert.equal(await rpc('acquire_billing_sync',[id(n),token]),true);
   await rpc('apply_stripe_snapshot',[id(n),token,JSON.stringify(snapshots)]);
   await rpc('release_billing_sync',[id(n),token]);
  }
  const snapshot=(sub,status='active',end=future)=>({subscription_id:sub,status,paid_through:end,
   current_period_end:future,cancel_at_period_end:false,ended_at:null,review_reason:null});
  await t.test('first paid invoice grants existing reading_access and preserves trial/data',async()=>{
   await db.query('update profiles set app_access_type=$2,trial_started_at=$3,app_access_expires_at=$4 where id=$1',[id(1),'trial',past,future]);
   await db.query('insert into user_books values($1,$2,$3)',[id(1000),id(1),'Keep my book']);
   await bind(1); await apply(1,[snapshot('sub_1')]);
   const p=await profile(1);assert.equal(p.app_access_type,'reading_access');assert.equal(p.app_access_subscription_id,'sub_1');assert.ok(p.trial_started_at);
  });
  await t.test('scheduled cancellation and failed renewal retain only already-paid time',async()=>{
   await apply(1,[{...snapshot('sub_1','past_due'),cancel_at_period_end:true}]);
   assert.equal((await profile(1)).app_access_type,'reading_access');
   assert.equal(new Date((await profile(1)).app_access_expires_at).toISOString(),future);
   await apply(1,[snapshot('sub_1','unpaid',past)]);
   assert.equal((await profile(1)).app_access_type,'free');
   assert.ok((await profile(1)).trial_started_at);
   assert.equal((await db.query('select count(*)::int n from user_books')).rows[0].n,1);
  });
  await t.test('payment recovery restores access; ended subscription falls back free',async()=>{
   await apply(1,[snapshot('sub_1')]);assert.equal((await profile(1)).app_access_type,'reading_access');
   await apply(1,[snapshot('sub_1','canceled',past)]);assert.equal((await profile(1)).app_access_type,'free');
  });
  await t.test('trial reuse is denied after trial-paid-free',async()=>{
   await db.query("insert into japanese_learning_access_requests(user_id,status) values($1,'approved')",[id(1)]);
   await assert.rejects(rpc('activate_guided_trial',[id(1),id(15)]),/Trial already used/);
  });
  await t.test('same checkout session can retry; other sessions cannot reuse reference',async()=>{
   await rpc('bind_stripe_checkout',[ref(1),'cs_1','sub_1','cus_1','plink_test','price_test',new Date().toISOString()]);
   await assert.rejects(rpc('bind_stripe_checkout',[ref(1),'cs_other','sub_other','cus_other','plink_test','price_test',new Date().toISOString()]),/already used/);
   await assert.rejects(rpc('bind_stripe_checkout',['invalid','cs_x','sub_x','cus_x','plink_test','price_test',future]),/Unknown/);
  });
  await t.test('reference expiration and customer ownership are enforced',async()=>{
   await rpc('begin_stripe_checkout',[id(2),ref(2),'plink_test','price_test']);
   await assert.rejects(rpc('bind_stripe_checkout',[ref(2),'cs_2','sub_2','cus_2','plink_test','price_test',future]),/expired/);
   await assert.rejects(rpc('bind_stripe_checkout',[ref(2),'cs_2','sub_2','cus_1','plink_test','price_test',new Date().toISOString()]),/ownership/);
  });
  await t.test('inactive, lesson and manual changes override Stripe permanently',async()=>{
   for(const [n,type] of [[3,'inactive'],[4,'lesson_access'],[5,'reading_access']]) {
    await bind(n);await apply(n,[snapshot('sub_'+n)]);
    await db.query('update profiles set app_access_type=$2,app_access_expires_at=null where id=$1',[id(n),type]);
    assert.equal((await profile(n)).app_access_subscription_id,null);
    await apply(n,[snapshot('sub_'+n)]);assert.equal((await profile(n)).app_access_type,type);
    assert.equal((await profile(n)).app_access_subscription_id,null);
    assert.ok((await db.query('select review_reason from stripe_subscriptions where user_id=$1',[id(n)])).rows[0].review_reason);
    await apply(n,[snapshot('sub_'+n,'canceled',past)]);assert.equal((await profile(n)).app_access_type,type);
   }
  });
  await t.test('bound subscription prevents trial from overwriting a payment race',async()=>{
   await bind(6);await db.query("insert into japanese_learning_access_requests(user_id,status) values($1,'approved')",[id(6)]);
   await assert.rejects(rpc('activate_guided_trial',[id(6),id(15)]),/already used/);
   await db.query("insert into japanese_learning_access_requests(user_id,status) values($1,'approved')",[id(7)]);
   await rpc('activate_guided_trial',[id(7),id(15)]);assert.equal((await profile(7)).app_access_type,'trial');
   await bind(7);await apply(7,[snapshot('sub_7')]);assert.equal((await profile(7)).app_access_type,'reading_access');
  });
  await t.test('expired lease cannot commit after another worker acquires it',async()=>{
   await bind(8);assert.equal(await rpc('acquire_billing_sync',[id(8),id(108)]),true);
   assert.equal(await rpc('acquire_billing_sync',[id(8),id(208)]),false);
   await db.query('update profiles set billing_sync_until=$2 where id=$1',[id(8),past]);
   assert.equal(await rpc('acquire_billing_sync',[id(8),id(208)]),true);
   await assert.rejects(rpc('apply_stripe_snapshot',[id(8),id(108),JSON.stringify([snapshot('sub_8')])]),/lease expired/);
   await rpc('release_billing_sync',[id(8),id(108)]);assert.equal((await profile(8)).billing_sync_token,id(208));
  });
  await t.test('ending an old subscription cannot revoke a replacement',async()=>{
   await bind(9);await apply(9,[snapshot('sub_9','canceled',past)]);
   await db.query('update stripe_checkout_attempts set expires_at=$2 where user_id=$1',[id(9),past]);
   await rpc('begin_stripe_checkout',[id(9),'f'.repeat(64),'plink_test','price_test']);
   await rpc('bind_stripe_checkout',['f'.repeat(64),'cs_new','sub_new','cus_new','plink_test','price_test',new Date().toISOString()]);
   await apply(9,[snapshot('sub_9','canceled',past),snapshot('sub_new')]);assert.equal((await profile(9)).app_access_subscription_id,'sub_new');
  });
  await t.test('browser cannot change entitlement or invoke privileged RPCs',async()=>{
   await db.exec('grant select,insert,update on profiles to authenticated; set role authenticated;');
   try {
    await assert.rejects(db.query("update profiles set app_access_type='reading_access' where id=$1",[id(10)]),/server-managed/);
    await assert.rejects(rpc('activate_guided_trial',[id(10),id(15)]),/permission denied/);
    await assert.rejects(db.query('select * from stripe_customers'),/permission denied/);
   } finally {await db.exec('reset role');}
  });
 } finally {await db.close();}
});
