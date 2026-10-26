import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { execFileSync } from 'node:child_process';

const file = 'app/(protected)/users/[username]/books/components/LibraryHeader.tsx';
function load(source) {
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  const module = {exports:{}};
  const require = (id) => {
    if (id === 'next/link') return {default: ({children, ...props}) => React.createElement('a', props, children)};
    throw new Error(id);
  };
  // Use React's real JSX runtime, with only Next navigation replaced for static rendering.
  return import('react/jsx-runtime').then(runtime => {
    new Function('require','module','exports',compiled)(id => id === 'react/jsx-runtime' ? runtime : require(id),module,module.exports);
    return module.exports.default;
  });
}
const Header = await load(fs.readFileSync(file,'utf8'));
const ProductionHeader = await load(execFileSync('git',['show',`03b31dd:${file}`],{encoding:'utf8'}));
const render = (Component,label,children) => renderToStaticMarkup(React.createElement(Component,{libraryOwnerLabel:label},children));
test('personal Library recovers compact welcome wording and existing Library link',()=>{
 const html=render(Header,'My');
 assert.match(html,/<h1[^>]*>Welcome to MEKURU<\/h1>/);
 assert.match(html,/Your Reading Companion/);
 assert.match(html,/aria-label="My MEKURU Library"/);
 assert.match(html,/href="\/books"/);
 assert.match(html,/h-11 w-11/);
 assert.match(html,/sm:h-14 sm:w-14/);
 assert.match(html,/--appearance-text/);
 assert.match(html,/--appearance-muted-text/);
});
test('student Library headings, including long owner names, retain exact Production markup',()=>{
 for(const label of ['Student’s',`${'Long display name '.repeat(15)}’s`])
  assert.equal(render(Header,label),render(ProductionHeader,label));
});
test('logout and teacher context children remain unchanged',()=>{
 const child=React.createElement('button',{type:'button'},'Log out');
 assert.match(render(Header,'My',child),/<button type="button">Log out<\/button>/);
 assert.equal(render(Header,'Student’s',child),render(ProductionHeader,'Student’s',child));
});
