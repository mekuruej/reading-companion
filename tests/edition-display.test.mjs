import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
 const mod={exports:{}};
 const source=fs.readFileSync(file,'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(name=>{
  if(mocks[name])return mocks[name];
  if(name.startsWith('@/')||name.startsWith('.')) {
   const base=name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name);
   return load([base+'.ts',base+'.tsx'].find(fs.existsSync),mocks);
  }
  return require(name);
 },mod,mod.exports);
 return mod.exports;
}
const {formatEditionLabel:format}=load('lib/books/editionDisplay.ts');
const Line=load('components/books/BookEditionLine.tsx').default;
const teacher={edition_format:'paperback',page_count:224,isbn13:'9780000000001'};
const kindle={edition_format:'ebook',page_count:null,edition_note:'Digital edition',isbn13:'9780000000002'};
const bunko={edition_format:'bunko',page_count:312};
test('formatter uses existing canonical labels and real positive page totals only',()=>{
 assert.equal(format(teacher),'Paperback · 224 pages');
 assert.equal(format(kindle),'Kindle / eBook');
 assert.equal(format(bunko),'Bunko · 312 pages');
 assert.equal(format({edition_format:'tankobon_hardcover',page_count:248}),'Tankobon hardcover · 248 pages');
 for(const page_count of [null,undefined,0,-1,NaN,Infinity,2.5]) assert.equal(format({edition_format:'hardcover',page_count}),'Hardcover');
 assert.equal(format({edition_format:'audiobook',page_count:300}),'Audiobook');
 for(const book of [null,undefined,{}, {edition_format:'unknown'}, {isbn13:'9780000000001'}]) assert.equal(format(book),null);
 assert.equal(format({page_count:120}),'120 pages');
});
test('compact component omits missing metadata and keeps ISBN/notes quiet',()=>{
 assert.equal(renderToStaticMarkup(React.createElement(Line,{book:{}})),'');
 const html=renderToStaticMarkup(React.createElement(Line,{book:kindle}));
 assert.ok(html.includes('>Kindle / eBook</p>'));assert.ok(html.includes('title="Kindle / eBook · Digital edition · ISBN: 9780000000002"'));
});
test('Reader and Teaching Hub hero render only their current copy edition',()=>{
 const Hero=load('app/(protected)/books/[userBookId]/components/BookHubHero.tsx').default;
 for(const context of ['Reader Book Hub','Teaching Book Hub']) {
  const html=renderToStaticMarkup(React.createElement(Hero,{book:{title:'Same title',author:'Author',...teacher},displayedCoverUrl:null,bookHubContextLabel:context,isViewingStudentBookHub:false}));
  assert.ok(html.includes('Paperback · 224 pages'));assert.ok(!html.includes('Kindle / eBook'));
 }
});
test('Teaching Hub student cards render each provided student copy independently without using teacher edition',()=>{
 let cursor=0;
 const rows=[{studentId:'a',studentName:'A',userBookId:'kindle-copy',isAttached:true,edition:kindle},{studentId:'b',studentName:'B',userBookId:'bunko-copy',isAttached:true,edition:bunko},{studentId:'c',studentName:'C',userBookId:null,isAttached:false}];
 const component=load('app/(protected)/books/[userBookId]/components/BookHubTeachingTools.tsx',{'react':{...React,useEffect(){},useMemo:fn=>fn(),useState(initial){const i=cursor++;return [i===0?rows:i===2?false:initial,()=>{}];}},'@/lib/supabaseClient':{supabase:{}}}).default;
 const html=renderToStaticMarkup(React.createElement(component,{userBookId:'teacher-copy',canUseBulkAdd:true}));
 assert.ok(html.includes('Kindle / eBook'));assert.ok(html.includes('Bunko · 312 pages'));assert.ok(!html.includes('Paperback'));
 assert.deepEqual(rows[0].edition,kindle);
});
test('workspace display wiring uses exact student books and read queries fetch canonical metadata',()=>{
 const workspace=fs.readFileSync('app/(protected)/teacher/students/[studentId]/workspace/page.tsx','utf8');
 assert.ok(workspace.includes('<BookEditionLine book={lessonBook.book.edition} />'));
 const bookWorkspace=fs.readFileSync('app/(protected)/teacher/students/[studentId]/books/[userBookId]/workspace/page.tsx','utf8');
 assert.ok(bookWorkspace.includes('<BookEditionLine book={book} />'));assert.ok(bookWorkspace.includes('.eq("id", userBookId)'));
 const api=fs.readFileSync('app/api/teacher/student-workspace/route.ts','utf8');
 assert.ok(api.includes('edition_format: book.edition_format'));assert.ok(api.includes('page_count, edition_format, edition_note, isbn13, isbn'));
 const cards=fs.readFileSync('app/api/books/[userBookId]/teaching-student-progress/route.ts','utf8');
 assert.ok(cards.includes('firstUserBook(row.user_books)'));assert.ok(cards.includes('books:book_id(edition_format, edition_note, page_count, isbn13, isbn)'));
});
