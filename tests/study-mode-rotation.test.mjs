import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../lib/study/modeRotation.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('exports', code)(mod.exports);
const { shuffleModes, startModeRotation, selectRotationMode } = mod.exports;
const modes = ['reading-typing', 'meaning-typing', 'reading-mc', 'meaning-mc', 'reveal'];
function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
test('shuffle keeps every mode exactly once and does not mutate the options', () => {
  const original = [...modes];
  assert.deepEqual(shuffleModes(modes,rng(1)).sort(),[...modes].sort());
  assert.deepEqual(modes,original);
});
test('new sessions have varied starts and varied sequences', () => {
  const starts = new Set(), orders = new Set();
  for (let i=1;i<=100;i++) {
    const rotation=startModeRotation(modes,rng(i));
    starts.add(rotation.current); orders.add(JSON.stringify(rotation));
  }
  assert.ok(starts.size > 2); assert.ok(orders.size > 10);
});
test('every cycle covers all modes with no immediate boundary repeats', () => {
  const random=rng(7301);
  let rotation=startModeRotation(modes,random),previous=null;
  for(let cycle=0;cycle<100;cycle++) {
    const visited=[];
    for(let i=0;i<modes.length;i++) {
      assert.notEqual(rotation.current,previous);
      visited.push(rotation.current); previous=rotation.current;
      rotation=selectRotationMode(rotation,rotation.remaining[0],shuffleModes(modes,random));
    }
    assert.deepEqual([...visited].sort(),[...modes].sort());
  }
});
test('a manually selected mode is removed from the pending cycle', () => {
  const rotation={current:'reading-typing',remaining:['reading-mc','meaning-typing','reveal']};
  const changed=selectRotationMode(rotation,'meaning-typing',modes);
  assert.equal(changed.current,'meaning-typing');
  assert.deepEqual(changed.remaining,['reading-mc','reveal']);
  assert.deepEqual(rotation.remaining,['reading-mc','meaning-typing','reveal']);
});
test('the previewed next mode is the one selected, without another random draw', () => {
  const rotation=startModeRotation(modes,rng(7));
  const preview=rotation.remaining[0];
  const next=selectRotationMode(rotation,preview,shuffleModes(modes,rng(20)));
  assert.equal(next.current,preview);
  assert.equal(rotation.remaining[0],preview);
});
test('reselecting the same mode preserves the current cycle', () => {
  const rotation=startModeRotation(modes,rng(3));
  assert.equal(selectRotationMode(rotation,rotation.current,modes),rotation);
});
test('one mode remains usable; an empty pool is rejected', () => {
  const rotation=startModeRotation(['only'],rng(1));
  assert.equal(rotation.current,'only');
  assert.deepEqual(rotation.remaining,[]);
  assert.equal(selectRotationMode(rotation,'only',['only']),rotation);
  assert.throws(()=>startModeRotation([]),/at least one/);
});
