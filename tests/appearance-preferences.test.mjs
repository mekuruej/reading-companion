import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const key = 'mekuru-appearance-v1';
function compile(file) { return ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText; }
function paletteModule() { const exports = {}; new Function('exports', compile('lib/appearance/palettes.ts'))(exports); return exports; }
function mount({ saved = null, readFails = false, writeFails = false } = {}) {
  const storage = new Map(saved === null ? [] : [[key, saved]]), listeners = new Map(), css = new Map(), dataset = {};
  let effects = [], subscribed = false, notifications = 0;
  const window = { localStorage: { getItem(k) { if (readFails) throw Error('blocked'); return storage.get(k) ?? null; }, setItem(k, value) { if (writeFails) throw Error('quota'); storage.set(k, value); } }, addEventListener(k, fn) { listeners.set(k, fn); }, removeEventListener(k) { listeners.delete(k); }, dispatchEvent(e) { listeners.get(e.type)?.(e); } };
  const document = { documentElement: { style: { setProperty(k, v) { css.set(k, v); } }, dataset } };
  const react = { createContext: () => ({ Provider: 'provider' }), useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => effects.push(fn), useSyncExternalStore(subscribe, getSnapshot) { if (!subscribed) { subscribe(() => notifications++); subscribed = true; } return getSnapshot(); } };
  const exports = {};
  new Function('exports', 'require', 'window', 'document', compile('components/appearance/AppearanceProvider.tsx'))(exports, name => name === 'react' ? react : name === '@/lib/appearance/palettes' ? paletteModule() : require(name), window, document);
  const render = () => { effects = []; const tree = exports.AppearanceProvider({ children: null }); effects.forEach(fn => fn()); return tree.props.value; };
  return { render, storage, css, dataset, external(value) { storage.set(key, value); listeners.get('storage')?.({ key, newValue: value }); }, notifications: () => notifications };
}
test('missing, invalid, and malformed browser preferences preserve Classic / Neutral Touches', () => {
  for (const saved of [null, '{bad json', JSON.stringify({ palette: 'unknown', treatment: 'solid' })]) {
    const m = mount({ saved }); assert.deepEqual(m.render().preferences, { palette: 'classic', treatment: 'neutralTouches' });
    assert.equal(m.css.get('--appearance-navigation'), '#c9c5c4');
    assert.match(m.css.get('--appearance-page-image'), /^linear-gradient\(118deg/);
  }
});
test('palette and treatment choices persist, survive a fresh provider, and update surface variables', () => {
  const m = mount(); m.render().setPalette('lavender');
  assert.ok(m.notifications() > 0);
  let current = m.render(); assert.equal(current.preferences.palette, 'lavender');
  assert.equal(m.css.get('--appearance-navigation'), '#bca4d3');
  current.setTreatment('solid'); current = m.render();
  assert.equal(m.css.get('--appearance-page-image'), 'none');
  const fresh = mount({ saved: m.storage.get(key) });
  assert.deepEqual(fresh.render().preferences, { palette: 'lavender', treatment: 'solid' });
});
test('cross-tab changes and legacy treatments normalize through the existing shared store', () => {
  const m = mount(); m.render();
  m.external(JSON.stringify({ palette: 'skyBlue', treatment: 'softGradient' }));
  assert.deepEqual(m.render().preferences, { palette: 'skyBlue', treatment: 'neutralTouches' });
  assert.deepEqual(JSON.parse(m.storage.get(key)), { palette: 'skyBlue', treatment: 'neutralTouches' });
  m.render(); assert.equal(m.dataset.appearancePalette, 'skyBlue');
});
test('blocked storage and write-only quota failures still allow appearance changes for this visit', () => {
  for (const options of [{ readFails: true, writeFails: true }, { writeFails: true }]) {
    const m = mount(options); m.render().setPalette('sageGreen');
    assert.deepEqual(m.render().preferences, { palette: 'sageGreen', treatment: 'neutralTouches' });
    assert.equal(m.css.get('--appearance-navigation'), '#9bb9a3');
    if (!options.readFails) {
      m.external(JSON.stringify({ palette: 'skyBlue', treatment: 'solid' }));
      assert.deepEqual(m.render().preferences, { palette: 'skyBlue', treatment: 'solid' });
    }
  }
});
test('preferences are added to the existing profile settings without introducing database/auth dependencies', () => {
  const provider = fs.readFileSync('components/appearance/AppearanceProvider.tsx', 'utf8');
  const settings = fs.readFileSync('components/appearance/AppearanceSettings.tsx', 'utf8');
  assert.doesNotMatch(provider + settings, /supabase|fetch\(|signOut|onAuthStateChange/);
  assert.match(fs.readFileSync('app/(protected)/community/profile/page.tsx', 'utf8'), /<AppearanceSettings \/>/);
  assert.match(settings, /saved in this browser only/);
  assert.match(settings, /htmlFor="appearance-palette"/);
  assert.match(settings, /htmlFor="appearance-treatment"/);
  assert.doesNotMatch(fs.readFileSync('app/(protected)/community/profile/ProfileEditor.tsx', 'utf8'), /AppearanceSettings/);
});
