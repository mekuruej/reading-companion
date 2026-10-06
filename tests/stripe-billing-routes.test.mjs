import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import Stripe from 'stripe';
const require=createRequire(import.meta.url), root=path.resolve(import.meta.dirname,'..');
const sdk=new Stripe('sk_test_placeholder');
const now=Math.floor(Date.now()/1000);
const customer='cus_reader',subscription='sub_reader',ref='a'.repeat(64);
const session={id:'cs_reader',livemode:false,payment_link:'plink_test',mode:'subscription',status:'complete',
 client_reference_id:ref,subscription,customer,created:now};
const sub={id:subscription,livemode:false,customer,status:'active',cancel_at_period_end:false,ended_at:null,
 items:{has_more:false,data:[{id:'si_reader',quantity:1,current_period_end:now+86400,
 price:{id:'price_test',currency:'jpy',unit_amount:500,recurring:{interval:'month',interval_count:1}}}]}};
const invoice={id:'in_reader',livemode:false,customer,currency:'jpy',amount_paid:500,parent:{subscription_details:{subscription}}};
const line={pricing:{price_details:{price:'price_test'}},parent:{subscription_item_details:{subscription,proration:false}},amount:500,period:{end:now+86400}};
function setup() {
 for(const [k,v] of Object.entries({STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_WEBHOOK_SECRET:'whsec_test_only',
 STRIPE_PRICE_ID:'price_test',STRIPE_PAYMENT_LINK_ID:'plink_test',STRIPE_PAYMENT_LINK_URL:'https://buy.stripe.com/test_example',
 STRIPE_LIVE_MODE:'false',APP_URL:'http://localhost:3000',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test_only'}))process.env[k]=v;
 const state={profiles:[{id:"reader",app_access_type:"free",app_access_expires_at:null,app_access_subscription_id:null,role:"member"}],events:[],subscriptions:[],rpc:[],applied:[],portal:[],auth:[],paidInvoices:[structuredClone(invoice)],lineItems:[structuredClone(line)],sub:structuredClone(sub),session:structuredClone(session),lease:true};
 const api={
  webhooks:sdk.webhooks,
  paymentLinks:{retrieve:async()=>({active:true,livemode:false,url:'https://buy.stripe.com/test_example'}),listLineItems:async()=>({has_more:false,data:[{price:{id:'price_test'},quantity:1}]})},
  prices:{retrieve:async()=>({active:true,livemode:false,currency:'jpy',unit_amount:500,recurring:{interval:'month',interval_count:1}})},
  checkout:{sessions:{retrieve:async()=>state.session,list:async()=>({data:[state.session]}),listLineItems:async()=>({has_more:false,data:[{price:{id:'price_test'},quantity:1}]})}},
  subscriptions:{retrieve:async()=>state.sub},
  invoices:{retrieve:async()=>invoice,list:async function*(){yield* state.paidInvoices;},listLineItems:async function*(){yield* state.lineItems;}},
  billingPortal:{sessions:{create:async args=>{state.portal.push(args);return {url:'https://billing.stripe.com/session'};}}},
 };
 const client={auth:{getUser:async token=>{state.auth.push(token);return {data:{user:token==='valid'?{id:'reader'}:null}};}},
  rpc:async(name,args)=>{
   state.rpc.push([name,args]);
   if(name==='bind_stripe_checkout') {
    if(args.p_reference!==ref)return {error:{code:'22023'}};
    if(!state.subscriptions.length)state.subscriptions.push({subscription_id:subscription,user_id:'reader',customer_id:customer});
    return {data:'reader'};
   }
   if(name==='begin_stripe_checkout')return {data:args.p_reference};
   if(name==='acquire_billing_sync')return {data:state.lease};
   if(name==='apply_stripe_snapshot')state.applied.push(args);
   return {data:null};
  },
  from(table) {
   const data=table==='profiles'?state.profiles:table==='stripe_webhook_events'?state.events:state.subscriptions;
   let action='select',value,filters=[];
   const q={
    select(){return q;},order(){return q;},eq(k,v){filters.push(row=>row[k]===v);return q;},
    upsert(v){action='upsert';value=v;return q;},update(v){action='update';value=v;return q;},
    async execute(single=false){
     if(action==='upsert'&&!data.some(row=>row.event_id===value.event_id))data.push({...value,status:'pending',attempts:0});
     const rows=data.filter(row=>filters.every(f=>f(row)));
     if(action==='update')for(const row of rows)Object.assign(row,value);
     return {data:single?rows[0]??null:rows};
    },single(){return q.execute(true);},maybeSingle(){return q.execute(true);},then(resolve,reject){return q.execute().then(resolve,reject);}
   };return q;
  }
 };
 const cache=new Map();
 function load(relative) {
  const filename=path.resolve(root,relative);
  if(cache.has(filename))return cache.get(filename).exports;
  const mod={exports:{}};cache.set(filename,mod);
  const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',compiled)(name=>{
   if(name==='server-only')return {};
   if(name==='stripe')return class {constructor(){return api;}};
   if(name==='@supabase/supabase-js')return {createClient:()=>client};
   if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
   if(name.startsWith('.'))return load(path.resolve(path.dirname(filename),name)+'.ts');
   return require(name);
  },mod,mod.exports);return mod.exports;
 }
 return {state,load};
}
const event=(id,type='checkout.session.completed',object={id:'cs_reader'})=>({id,type,livemode:false,data:{object}});
test('webhook signatures, idempotence, current-state reconciliation, authenticated endpoints',async t=>{
 await t.test('tampered signature and unsigned browser success cannot grant access',async()=>{
  const {load,state}=setup(),route=load('app/api/stripe/webhook/route.ts');
  const payload=JSON.stringify(event('evt_signed'));
  const signature=sdk.webhooks.generateTestHeaderString({payload,secret:'whsec_test_only'});
  const req=(body,sig)=>new Request('http://localhost/api/stripe/webhook',{method:'POST',body,headers:sig?{'stripe-signature':sig}:{}});
  assert.equal((await route.POST(req(payload))).status,400);
  assert.equal((await route.POST(req(payload+' ',signature))).status,400);
  assert.equal(state.applied.length,0);
  assert.equal((await route.POST(req(payload,signature))).status,200);
  assert.equal(state.applied.length,1);
 });
 await t.test('duplicate event is applied once',async()=>{
  const {load,state}=setup(),{processEvent}=load('lib/billing/reconcile.ts');
  await processEvent(event('evt_repeat'));await processEvent(event('evt_repeat'));
  assert.equal(state.applied.length,1);assert.equal(state.events[0].status,'processed');
 });
 await t.test('invoice arriving first binds through the completed Checkout Session',async()=>{
  const {load,state}=setup();await load('lib/billing/reconcile.ts').processEvent(event('evt_invoice','invoice.paid',{id:invoice.id}));
  assert.equal(state.applied.length,1);assert.ok(state.rpc.some(([name])=>name==='bind_stripe_checkout'));
 });
 await t.test('old event retrieves latest state instead of rolling subscription backwards',async()=>{
  const {load,state}=setup();state.sub.status='canceled';
  await load('lib/billing/reconcile.ts').processEvent(event('evt_old','customer.subscription.updated',{id:subscription,status:'active'}));
  assert.equal(state.applied[0].p_snapshots[0].status,'canceled');
 });
 await t.test('active status/current period alone never proves payment',async()=>{
  const {load,state}=setup();state.paidInvoices=[];
  const snapshot=await load('lib/billing/reconcile.ts').subscriptionSnapshot(subscription,customer);
  assert.equal(snapshot.paid_through,null);assert.ok(snapshot.current_period_end);
 });
 await t.test('failed renewal keeps old invoice period, not new unpaid period',async()=>{
  const {load,state}=setup();state.sub.status='past_due';state.sub.items.data[0].current_period_end=now+60*86400;
  const snapshot=await load('lib/billing/reconcile.ts').subscriptionSnapshot(subscription,customer);
  assert.equal(snapshot.paid_through,new Date((now+86400)*1000).toISOString());
 });
 await t.test('mismatched price cannot grant access',async()=>{
  const {load,state}=setup();state.sub.items.data[0].price.id='price_wrong';
  const snapshot=await load('lib/billing/reconcile.ts').subscriptionSnapshot(subscription,customer);
  assert.equal(snapshot.paid_through,null);assert.equal(snapshot.review_reason,'unexpected_subscription_price');
 });
 await t.test('invalid reference becomes review record; no entitlement grant',async()=>{
  const {load,state}=setup();state.session.client_reference_id='browser-supplied-user-uuid';
  await load('lib/billing/reconcile.ts').processEvent(event('evt_badref'));
  assert.equal(state.applied.length,0);assert.equal(state.events[0].status,'review');
 });
 await t.test('transient failure remains pending and retries successfully',async()=>{
  const {load,state}=setup();state.lease=false;const {processEvent}=load('lib/billing/reconcile.ts');
  await assert.rejects(processEvent(event('evt_retry')));assert.equal(state.events[0].status,'pending');
  state.lease=true;await processEvent(event('evt_retry'));assert.equal(state.events[0].status,'processed');assert.equal(state.applied.length,1);
 });
 await t.test('portal rejects another user subscription and ignores supplied customer/user IDs',async()=>{
  const {load,state}=setup(),route=load('app/api/billing/portal/route.ts');
  state.subscriptions.push({subscription_id:subscription,user_id:'reader',customer_id:customer});
  const req=(token,body)=>new Request('http://localhost/api/billing/portal',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  assert.equal((await route.POST(req('invalid',{subscriptionId:subscription}))).status,401);
  assert.equal((await route.POST(req('valid',{subscriptionId:'sub_someone_else'}))).status,404);
  assert.equal((await route.POST(req('valid',{subscriptionId:subscription,customerId:'cus_attacker',userId:'attacker'}))).status,200);
  assert.equal(state.portal[0].customer,customer);
 });
 await t.test('subscribe rejects requests without verified authentication',async()=>{
  const {load,state}=setup(),route=load('app/api/billing/subscribe/route.ts');
  const response=await route.POST(new Request('http://localhost/api/billing/subscribe',{method:'POST',body:JSON.stringify({userId:'reader'})}));
  assert.equal(response.status,401);assert.equal(state.rpc.length,0);
 });
 await t.test('Subscribe uses authenticated account and only an opaque URL reference',async()=>{
  const {load,state}=setup(),route=load('app/api/billing/subscribe/route.ts');
  const response=await route.POST(new Request('http://localhost/api/billing/subscribe',{method:'POST',
   headers:{authorization:'Bearer valid'},body:JSON.stringify({userId:'attacker'})}));
  assert.equal(response.status,200);
  const url=new URL((await response.json()).url);
  assert.match(url.searchParams.get('client_reference_id'),/^[a-f0-9]{64}$/);
  assert.equal(state.rpc.find(([name])=>name==='begin_stripe_checkout')[1].p_user,'reader');
  assert.equal(url.searchParams.size,1);
 });
 await t.test('missing Price ID disables subscription creation',async()=>{
  const {load,state}=setup();delete process.env.STRIPE_PRICE_ID;
  const response=await load('app/api/billing/subscribe/route.ts').POST(new Request('http://localhost/api/billing/subscribe',{
   method:'POST',headers:{authorization:'Bearer valid'}}));
  assert.equal(response.status,503);assert.equal(state.rpc.length,0);
 });

});
