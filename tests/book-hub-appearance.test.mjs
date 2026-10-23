import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const hub = 'app/(protected)/books/[userBookId]/';
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const css = read(hub+'bookHubAppearance.module.css');
const compiled = ts.transpileModule(read('lib/appearance/palettes.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports',compiled)(mod.exports);
const {APPEARANCE_PALETTES,APPEARANCE_TREATMENTS,DEFAULT_APPEARANCE,getAppearanceBackgroundImage}=mod.exports;
function luminance(hex){const rgb=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [name,p] of Object.entries(APPEARANCE_PALETTES))for(const treatment of Object.keys(APPEARANCE_TREATMENTS))test(`${name}/${treatment}: ordinary text, links, selected controls and focus retain contrast`,()=>{
 const backgrounds=[p.surface,p.surfaceMuted,p.page,...(treatment==='neutralTouches'?[p.neutralTouchStart,p.neutralTouchCenter,p.neutralTouchEnd]:[])];
 for(const bg of backgrounds){assert.ok(ratio(p.text,bg)>=4.5);assert.ok(ratio(p.mutedText,bg)>=4.5);assert.ok(ratio(p.text,bg)>=3);}
 for(const bg of [p.text,p.brandText])assert.ok(ratio(p.surface,bg)>=4.5,'solid control normal/hover');
 assert.equal(getAppearanceBackgroundImage(name,treatment)==='none',treatment==='solid');
});
test('default, storage and activity/semantic colors remain separate from hub styling',()=>{
 assert.deepEqual(DEFAULT_APPEARANCE,{palette:'classic',treatment:'neutralTouches'});
 const grid=read(hub+'components/BookHubActionGrid.tsx');
 assert.match(grid,/sky: "border-sky-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-teal-50 hover:border-sky-400"/);
 assert.match(grid,/mint: "border-teal-200 bg-gradient-to-br from-blue-50 via-teal-50 to-emerald-100 hover:border-teal-400"/);
 assert.match(css,/:not\(:global\(\[data-hub-activity\] \*\)\)/);
 assert.doesNotMatch(css,/--appearance-[\w-]+\s*:/); // no preference/token overrides
 assert.doesNotMatch(css, /\.text-(red|amber|emerald|rose)|\.bg-(red|amber|emerald|rose)/);
});
test('reflection text uses dark foreground and loading uses the shared themed page',()=>{
 assert.match(read(hub+'components/BookHubStatusPanel.tsx'),/bg-amber-500 px-4 py-2 text-sm font-black text-\[#1c1917\]/);
 for (const amber of ['#f59e0b','#d97706']) assert.ok(ratio('#1c1917',amber)>=4.5, 'reflection normal/hover contrast');
 assert.match(read(hub+'components/BookHubLoadingState.tsx'),/style=\{DEFAULT_PAGE_STYLE\}/);
 assert.match(css,/:focus-visible/);assert.match(css,/:disabled:hover/);assert.match(css, /animation: none/);
});
// Fingerprints omit only presentation attributes/imports. Any change to access conditions,
// handlers, navigation destinations, calculations or data operations requires review.
function behaviorFingerprint(source){
 const tree=ts.createSourceFile('component.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const result=ts.transform(tree,[context=>function visit(node){
  if(ts.isImportDeclaration(node))return undefined;
  if((ts.isJsxAttribute(node))&&['className','style','data-hub-info','data-hub-button','data-hub-activity'].includes(node.name.getText(tree)))return undefined;
  return ts.visitEachChild(node,visit,context);
 }]);
 const printed=ts.createPrinter({removeComments:true}).printFile(result.transformed[0]);result.dispose();return crypto.createHash('sha256').update(printed).digest('hex');
}
const baselineFingerprints = {
  "components/BookHubManagementActions.tsx": "ce3744d4758a7c0aed9b802f895bea00377b45d336191fa30b06749b55b4a73c",
  "page.tsx": "7bce20f0bc4ef6827a4e5a11aaacff7bbe74a36105619e38fd73f3174b4f2161",
  "components/BookHubActionGrid.tsx": "e3926d82bb6ce8da2a6beb8e4bdbbff3a60cda26a51869b4442dccaf709ffa41",
  "components/BookHubLoadingState.tsx": "062dea053e07ec4f2f915ee44d828a634f7d1ed52ba224227a6a88ceb404887d",
  "components/BookHubModeToggle.tsx": "25b3127545c04b77d70bb9c04f30fa6a8a9a33496c7145d9e0cf6456fd817e96",
  "components/BookHubProgressSummary.tsx": "61e51108b29b13670ad56af123bc62903e7215c3ef89cc9a187c520e872383f8",
  "components/BookHubStatCard.tsx": "23cd3a115420d977c6155a6a0f64f9013d5533101c7d2a168c9ff5c220290f54",
  "components/BookHubStatusPanel.tsx": "8f41cfab0320ede153ebc6835ceaea01587a750599d175b6240b0d8f7053cb28",
  "components/BookHubTeachingTools.tsx": "0606c35a12d3a3913078d2c8ac34230ea0dfe80eafc381a1dc2f5c10898ace8f"
};
test('existing Hub behavior is unchanged from Production 343c213',()=>{
 for(const [file,hash] of Object.entries(baselineFingerprints))assert.equal(behaviorFingerprint(read(hub+file)),hash,file);
});
