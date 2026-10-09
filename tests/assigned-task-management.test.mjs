import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const workspace = fs.readFileSync('app/(protected)/teacher/students/[studentId]/workspace/page.tsx', 'utf8');
const modal = fs.readFileSync('app/(protected)/teacher/students/components/TeacherLearningTaskModal.tsx', 'utf8');

test('assigned task cards keep book navigation conditional and manage the selected assignment', () => {
  const section = workspace.slice(workspace.indexOf('>Assigned Tasks</summary>'), workspace.indexOf('>Other student follow-up</summary>'));
  assert.match(section, /activeLearningTasks.map/);
  assert.match(section, /taskHref \? \([\s\S]*?Open Book[\s\S]*?\) : null/);
  assert.match(section, /manageLearningTask\(task.id\)/);
  assert.doesNotMatch(section, /data.bookRequests.map|data.ratingFollowUps.map/);
  assert.match(workspace, /setManagedTaskId\(taskId\)[\s\S]*?loadActiveLearningTasks\(\)/);
  assert.match(modal, /activeTasks.filter\(\(task\) => task.id === managedTaskId\)/);
  assert.match(modal, /onCancelTask\(task.id\)/);
});

test('existing cancellation preserves records and only removes the cancelled assignment locally', async () => {
  const source = workspace.slice(workspace.indexOf('  async function cancelLearningTask('), workspace.indexOf('  async function createLearningTask('));
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let tasks = [{ id: 'read', task_type: 'reread_pages' }, { id: 'cards', task_type: 'review_book_words' }];
  const filters = [];
  let update;
  const query = { eq(key, value) { filters.push([key, value]); return this; }, then(resolve) { return Promise.resolve({ error: null }).then(resolve); } };
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'creator' } } } }) },
    from(table) { assert.equal(table, 'learning_tasks'); return { update(value) { update = value; return query; } }; },
  };
  const cancel = new Function('supabase', 'window', 'setTaskMessage', 'setCancellingTaskId', 'setActiveLearningTasks', code + '; return cancelLearningTask;')(
    supabase, { confirm: () => true }, () => {}, () => {}, (fn) => { tasks = fn(tasks); },
  );
  await cancel('read');
  assert.equal(update.status, 'cancelled');
  assert.ok(Number.isFinite(Date.parse(update.cancelled_at)));
  assert.equal(Object.hasOwn(update, 'completed_at'), false);
  assert.deepEqual(filters, [['id', 'read'], ['created_by', 'creator'], ['status', 'assigned']]);
  assert.deepEqual(tasks.map(task => task.id), ['cards']);
  assert.doesNotMatch(source, /\.delete\(|\.from\("user_books"\)|\.from\("user_book_words"\)/);
});
