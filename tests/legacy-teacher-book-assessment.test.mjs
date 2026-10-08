import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const exports = {};
const source = fs.readFileSync('lib/teacher/legacyTeacherBookAssessment.ts', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('exports', code)(exports);

const { buildCrossOwnerAssessmentPatch, buildRemoveFromTeacherLibraryPatch, getLegacyTeacherBookDestination } = exports;
const compatibilityRoute = fs.readFileSync('app/(protected)/teacher/library/[teacherBookId]/book-workspace/page.tsx', 'utf8');
const assessmentPage = fs.readFileSync('app/(protected)/teacher/library/[teacherBookId]/assessment/page.tsx', 'utf8');
const teachingTools = fs.readFileSync('app/(protected)/books/[userBookId]/components/BookHubTeachingTools.tsx', 'utf8');
const bookHubPage = fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8');

test('legacy workspace sends owners to their Book Hub and only elevated users to cross-owner assessment', () => {
  assert.equal(getLegacyTeacherBookDestination({ actorId: 'owner', ownerId: 'owner', profile: { role: 'teacher' } }), 'owner_book_hub');
  assert.equal(getLegacyTeacherBookDestination({ actorId: 'owner', ownerId: 'owner', profile: { role: 'super_teacher' } }), 'owner_book_hub');
  assert.equal(getLegacyTeacherBookDestination({ actorId: 'admin', ownerId: 'owner', profile: { role: 'admin' } }), 'cross_owner_assessment');
  assert.equal(getLegacyTeacherBookDestination({ actorId: 'super', ownerId: 'owner', profile: { role: 'teacher', is_super_teacher: true } }), 'cross_owner_assessment');
  assert.equal(getLegacyTeacherBookDestination({ actorId: 'teacher', ownerId: 'owner', profile: { role: 'teacher' } }), 'denied');
  assert.equal(getLegacyTeacherBookDestination({ actorId: 'member', ownerId: 'owner', profile: { role: 'member' } }), 'denied');
});

test('cross-owner assessment only changes assessment fields and preserves JLPT on non-Japanese books', () => {
  assert.deepEqual(buildCrossOwnerAssessmentPatch({
    status: 'usable', difficulty: 'n2', suitability: 'excellent', note: '  Keep for class  ',
    isJapaneseBook: true, existingDifficulty: null,
  }), {
    teacher_use_status: 'usable', teacher_jlpt_difficulty: 'n2',
    teaching_suitability: 'excellent', teacher_use_note: 'Keep for class',
  });
  assert.equal(buildCrossOwnerAssessmentPatch({
    status: 'do_not_use', difficulty: null, suitability: 'poor_fit', note: '',
    isJapaneseBook: false, existingDifficulty: 'n1',
  }).teacher_jlpt_difficulty, 'n1');
});

test('remove from Teacher Library preserves the row and uses the existing do-not-use note fallback', () => {
  assert.deepEqual(buildRemoveFromTeacherLibraryPatch('', null), {
    teacher_use_status: 'do_not_use',
    teacher_use_note: 'Removed from Teacher Library; reader data preserved.',
  });
  assert.deepEqual(buildRemoveFromTeacherLibraryPatch('  Admin note  ', 'Existing note'), {
    teacher_use_status: 'do_not_use',
    teacher_use_note: 'Admin note',
  });
});

test('compatibility route redirects owners and cross-owner admins without rendering the old landing UI', () => {
  assert.match(compatibilityRoute, /resolveTeacherBookHubUserBookId/);
  assert.match(compatibilityRoute, /\/books\/\$\{encodeURIComponent\(userBookId\)\}/);
  assert.match(compatibilityRoute, /\/assessment/);
  for (const legacyLabel of ['Teacher Book Workspace', 'My Reader Tools', 'Teacher Support', 'Teacher Vocabulary', 'Teacher Flashcards', 'Follow-Along Support', 'Teaching Prep']) {
    assert.ok(!compatibilityRoute.includes(legacyLabel), `old route still contains ${legacyLabel}`);
  }
});

test('dedicated assessment page stays narrow and keeps JLPT conditional on Japanese language', () => {
  assert.match(assessmentPage, /isJapaneseLearningBook/);
  assert.match(assessmentPage, /teacher_use_status/);
  assert.match(assessmentPage, /teaching_suitability/);
  assert.match(assessmentPage, /teacher_use_note/);
  for (const launcher of ['My Reader Tools', 'Teacher Support', 'Teacher Vocabulary', 'Teacher Flashcards', 'Follow-Along Support', 'Teaching Prep']) {
    assert.ok(!assessmentPage.includes(launcher), `assessment page includes ${launcher}`);
  }
});

test('Book Hub keeps only the four book-level teaching utilities and preserves student flashcards', () => {
  for (const label of ['Teaching Assessment', 'Reading Experiences', 'Teacher Journal', 'Bulk Add Lesson Words']) {
    assert.match(teachingTools, new RegExp(`title="${label}"`));
  }
  for (const removedLabel of ['Teacher Flashcards', 'Teaching Overview', 'Teacher Snapshot']) {
    assert.ok(!teachingTools.includes(removedLabel), `Book Hub still shows ${removedLabel}`);
  }
  assert.ok(!bookHubPage.includes('openTeacherFlashcards'));
  assert.ok(!bookHubPage.includes('onTeacherSnapshot'));
  assert.ok(!bookHubPage.includes('/teacher-snapshot'));
  assert.ok(!bookHubPage.includes('/teacher/library/${encodeURIComponent(relationship.id)}/flashcards'));
  assert.match(bookHubPage, /onStudentFlashcards=\{\(studentUserBookId\) =>/);
  assert.match(teachingTools, /onStudentFlashcards\(student\.userBookId as string\)/);
  assert.match(bookHubPage, /isJapaneseLearningBook\(book\.language_code/);
  assert.match(fs.readFileSync('app/(protected)/teacher/library/[teacherBookId]/flashcards/page.tsx', 'utf8'), /Teacher Flashcards/);
  assert.ok(fs.existsSync('app/(protected)/books/[userBookId]/teacher-snapshot/page.tsx'));
});
