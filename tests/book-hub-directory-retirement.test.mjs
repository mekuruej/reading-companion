import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', code)(exports, require);
  return exports;
}
test('legacy directory uses a temporary Next.js redirect to the canonical current-user Library', () => {
  const Page = load('app/(protected)/library/book-hubs/page.tsx').default;
  assert.throws(() => Page(), error => error.digest === 'NEXT_REDIRECT;replace;/books;307;');
});
test('header and Library Home no longer link to the retired directory', () => {
  for (const file of ['components/Header.tsx', 'app/(protected)/library/page.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(!source.includes('/library/book-hubs'));
  }
  assert.ok(fs.existsSync('components/library/LibraryBookActionIndex.tsx'));
  for (const file of ['app/(protected)/library/japanese-books/page.tsx', 'app/(protected)/library/just-reading-index/page.tsx', 'app/(protected)/library/vocab-list-index/page.tsx']) {
    assert.match(fs.readFileSync(file, 'utf8'), /LibraryBookActionIndex/);
  }
});
const { resolveStudentWorkspaceBackContext } = load('lib/teacher/studentWorkspaceContext.ts');
function client(linked) {
  return { from(table) {
    const query = { select() { return query; }, eq() { return query; }, is() { return query; }, async maybeSingle() { return { data: table === 'teacher_students' ? linked ? { teacher_id: 'teacher' } : null : { display_name: 'Synthetic Student' }, error: null }; } };
    return query;
  } };
}
test('student-owned Book Hub and regular Follow-Along preserve validated Student Workspace back context', async () => {
  const args = { supabase: client(true), from: 'student-workspace', requestedStudentId: 'student', currentUserId: 'teacher', profile: { role: 'teacher' }, ownerUserId: 'student' };
  const context = await resolveStudentWorkspaceBackContext(args);
  assert.equal(context.href, '/teacher/students/student/workspace');
  assert.equal(context.studentId, 'student');
  assert.equal(await resolveStudentWorkspaceBackContext({ ...args, supabase: client(false) }), null);
  assert.equal(await resolveStudentWorkspaceBackContext({ ...args, requestedStudentId: 'different-student' }), null);
  assert.equal(await resolveStudentWorkspaceBackContext({ ...args, profile: { role: 'member' } }), null);
  for (const file of ['app/(protected)/books/[userBookId]/page.tsx', 'app/(protected)/books/[userBookId]/readalong/page.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /resolveStudentWorkspaceBackContext/);
    assert.match(source, /studentWorkspaceBackContext.href/);
    assert.ok(!source.includes('/library/book-hubs'));
  }
});
test('Student Workspace and teaching Follow-Along retain explicit target student/book IDs and Quick Add fallback', () => {
  const workspace = fs.readFileSync('app/(protected)/teacher/students/[studentId]/workspace/page.tsx', 'utf8');
  assert.match(workspace, /from=student-workspace&studentId=\$\{encodeURIComponent\(studentId\)\}/);
  assert.match(workspace, /\/books\/\$\{encodedUserBookId\}\/follow/);
  const follow = fs.readFileSync('app/(protected)/teacher/students/[studentId]/books/[userBookId]/follow/page.tsx', 'utf8');
  assert.match(follow, /studentUserBookId: targetUserBookId/);
  assert.match(follow, /Back to Student Workspace/);
  assert.match(follow, /Open student Quick Add without a teaching source/);
  assert.ok(!follow.includes('/library/book-hubs'));
  const library = fs.readFileSync('app/(protected)/users/[username]/books/page.tsx', 'utf8');
  assert.match(library, /secondaryActionLabel="Open Workspace"/);
});
