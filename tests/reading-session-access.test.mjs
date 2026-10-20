import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
let state, cursor, writes, alerts;
const cache = new Map();
const tracking = { method: 'page', totals: { page_count: 100 }, requireMethod() { throw Error('Unexpected missing method'); } };
const pageStateSlots = [
  ['ownsBook', value => value === false],
  ['loading', value => value === true],
  ['accessMessage', value => value === ''],
  ['row', value => value === null],
  ['sessions', Array.isArray],
  ['startedAt', value => value === ''],
  ['finishedAt', value => value === ''],
  ['dnfAt', value => value === ''],
  ['dnfReason', value => value === ''],
  ['dnfNote', value => value === ''],
  ['wouldRetry', value => value === ''],
  ['sessionDate', value => typeof value === 'string'],
  ['sessionMode', value => value === 'fluid'],
  ['sessionStartPage', value => value === ''],
  ['sessionEndPage', value => value === ''],
  ['sessionMinutesRead', value => value === ''],
  ['editingSessionId', value => value === null],
  ['isNativeBook', value => value === false],
  ['canUseCuriosityReading', value => value === false],
];
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require','module','exports',code)(name => {
    if (name === 'react') return { ...React,
      useState(initial) {
        const index = cursor++;
        const [key, matchesInitial] = pageStateSlots[index] ?? [];
        assert.ok(key, `Unexpected Reading History useState hook at position ${index}`);
        assert.ok(matchesInitial(initial), `Reading History useState hook "${key}" changed position or default`);
        return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }];
      },
      useEffect() {}, useMemo: fn => fn(),
    };
    if (name === 'next/navigation') return { useParams: () => ({userBookId:'book'}) };
    if (name === '@/components/books/BookProgressProvider') return { useBookProgress: () => tracking };
    if (name === '@/lib/supabaseClient') return { supabase: { auth: { getSession: async () => ({data:{session:{access_token:'test'}}}) } } };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(root,name.slice(2)) : path.resolve(path.dirname(filename),name);
      return load(['.ts','.tsx'].map(ext=>base+ext).find(file=>fs.existsSync(file)));
    }
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const Page = load('app/(protected)/books/[userBookId]/sessions/page.tsx').default;
const { getFeatureAccess } = load('lib/access/featureAccess.ts');
const { getAppAccessStatus } = load('lib/access/appAccess.ts');
const historical = {id:'old',user_book_id:'book',read_on:'2026-09-01',session_mode:'curiosity',start_page:1,end_page:10,minutes_read:20,tracking_unit:'page',progress_total:100,is_filler:false};
function setup(canUseCuriosityReading, sessions = [historical]) {
  // Named values mirror the page's useState declarations; effect callbacks are disabled for isolated UI testing.
  state = {
    ownsBook: false,
    loading: false,
    accessMessage: '',
    row: {id:'book',started_at:'2026-09-01',books:{title:'Test',page_count:100}},
    sessions,
    startedAt: '',
    finishedAt: '',
    dnfAt: '',
    dnfReason: '',
    dnfNote: '',
    wouldRetry: '',
    sessionDate: '2026-09-27',
    sessionMode: 'fluid',
    sessionStartPage: '',
    sessionEndPage: '',
    sessionMinutesRead: '',
    editingSessionId: null,
    isNativeBook: false,
    canUseCuriosityReading,
  };
  writes=[];alerts=[];
}
function render() {
  cursor=0;
  const tree=Page();
  assert.equal(cursor, pageStateSlots.length, 'Reading History useState hook count changed');
  return tree;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree,...nodes(tree.props?.children)];
}
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const button = (tree,label) => nodes(tree).find(n=>n.type==='button' && text(n)===label);
const select = tree => nodes(tree).find(n=>n.type==='select' && nodes(n).some(x=>x.type==='option' && x.props.value==='fluid'));
const options = tree => nodes(select(tree)).filter(n=>n.type==='option').map(n=>[n.props.value,text(n)]);

test('new session choices use capability; saved curiosity stays visible without granting new choices', () => {
  setup(false);
  assert.deepEqual(options(render()),[['fluid','Fluid Reading (reading without saving words)'],['listening','Listening']]);
  assert.ok(text(render()).includes('Curiosity Reading')); // Existing history remains labeled.
  setup(true);
  assert.deepEqual(options(render()).map(x=>x[0]),['fluid','curiosity','listening']);
  for (const app_access_type of ['free','trial']) {
    const access=getAppAccessStatus({app_access_type,app_access_expires_at:'2000-01-01'});
    assert.equal(getFeatureAccess({hasFullAccess:access.hasFullAccess,isTrialActive:access.isTrialActive}).canUseCuriosityReading,false);
  }
});

test('editing and saving historical curiosity preserves mode; cancel/save cannot leak it into a new session', async () => {
  setup(false);
  const originalFetch=global.fetch, originalAlert=global.alert;
  global.alert=message=>alerts.push(message);
  global.fetch=async (_url,init) => {
    if(init.method==='PATCH' || init.method==='POST') writes.push({method:init.method,...JSON.parse(init.body)});
    return Response.json({sessions:[historical]});
  };
  try {
    button(render(),'Edit').props.onClick();
    let tree=render();
    assert.equal(select(tree).props.value,'curiosity');
    assert.deepEqual(options(tree).map(x=>x[0]),['fluid','curiosity','listening']);
    nodes(tree).filter(n=>n.type==='input' && n.props.type==='date' && n.props.value==='2026-09-01').at(-1).props.onChange({target:{value:'2026-09-02'}});
    // Edit the session date/minutes/positions via the actual form callbacks.
    const inputs=nodes(tree).filter(n=>n.type==='input');
    inputs.find(n=>n.props.placeholder==='e.g. 25').props.onChange({target:{value:'30'}});
    inputs.find(n=>n.props.placeholder==='Enter page' && n.props.value==='10').props.onChange({target:{value:'12'}});
    button(render(),'Update Session').props.onClick();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(writes[0].method,'PATCH');assert.equal(writes[0].id,'old');
    assert.equal(writes[0].session_mode,'curiosity');assert.equal(writes[0].minutes_read,30);
    assert.equal(writes[0].end_position,12);assert.equal(writes[0].read_on,'2026-09-02');
    assert.equal(select(render()).props.value,'fluid');
    assert.deepEqual(options(render()).map(x=>x[0]),['fluid','listening']);
    button(render(),'Edit').props.onClick();
    button(render(),'Cancel Edit').props.onClick();
    assert.deepEqual(options(render()).map(x=>x[0]),['fluid','listening']);
    // A stale draft cannot submit curiosity without editing its saved historical record.
    state.sessionMode='curiosity';
    await button(render(),'Save Session').props.onClick();
    assert.equal(writes.length,1);assert.equal(alerts.length,1);
    // Editing a different historical mode does not grant the curiosity option.
    setup(false,[{...historical,session_mode:'fluid'}]);
    button(render(),'Edit').props.onClick();
    assert.deepEqual(options(render()).map(x=>x[0]),['fluid','listening']);
  } finally {global.fetch=originalFetch;global.alert=originalAlert;}
});
