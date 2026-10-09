import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
function load(file, deps = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', source)((name) => deps[name] ?? require(name), exports);
  return exports;
}

const { ensureTeacherStudentRelationship } = load('lib/teacher/studentRelationshipManagement.ts');
const appAccess = load('lib/access/appAccess.ts');
const access = load('lib/access/complimentaryLegacyAccess.ts', { './appAccess': appAccess });
const targetUserAccess = load('lib/teacher/targetUserAccess.ts');
const studentIndex = load('lib/teacher/studentsIndex.ts', {
  '@/lib/access/appAccess': appAccess,
  './targetUserAccess': targetUserAccess,
});

function relationshipStore(initial = null) {
  let row = initial;
  let inserts = 0;
  let reactivations = 0;
  return {
    stats: () => ({ row, inserts, reactivations }),
    async find(teacherId, studentId) {
      return row && row.teacher_id === teacherId && row.student_id === studentId ? { ...row } : null;
    },
    async insert(teacherId, studentId) {
      inserts += 1;
      if (row) throw { code: '23505' };
      row = { teacher_id: teacherId, student_id: studentId, archived_at: null };
    },
    async reactivate() {
      reactivations += 1;
      row = { ...row, archived_at: null };
    },
  };
}

test('super teacher Make My Student creates one relationship for an unlinked learner', async () => {
  const store = relationshipStore();
  const result = await ensureTeacherStudentRelationship({ store, teacherId: 'teacher', studentId: 'learner' });
  assert.deepEqual(result, { created: true, reactivated: false });
  assert.deepEqual(store.stats(), {
    row: { teacher_id: 'teacher', student_id: 'learner', archived_at: null },
    inserts: 1,
    reactivations: 0,
  });
});

test('repeating Make My Student is idempotent and does not create a duplicate', async () => {
  const store = relationshipStore();
  const args = { store, teacherId: 'teacher', studentId: 'learner' };
  await ensureTeacherStudentRelationship(args);
  const second = await ensureTeacherStudentRelationship(args);
  assert.deepEqual(second, { created: false, reactivated: false });
  assert.equal(store.stats().inserts, 1);
});

test('Make My Student reactivates an archived relationship, retaining its row', async () => {
  const store = relationshipStore({ teacher_id: 'teacher', student_id: 'learner', archived_at: '2026-01-01' });
  const result = await ensureTeacherStudentRelationship({ store, teacherId: 'teacher', studentId: 'learner' });
  assert.deepEqual(result, { created: false, reactivated: true });
  assert.equal(store.stats().inserts, 0);
  assert.equal(store.stats().reactivations, 1);
  assert.equal(studentIndex.isActiveStudentRelationship(store.stats().row), true);
  const archived = { ...store.stats().row, archived_at: '2026-10-08' };
  assert.equal(studentIndex.isActiveStudentRelationship(archived), false);
});

test('complimentary legacy access is permanent reading access, distinct from trial and Stripe subscription', () => {
  const profile = { role: 'member', app_access_type: 'reading_access', app_access_expires_at: null };
  const status = appAccess.getAppAccessStatus(profile);
  assert.equal(status.hasFullAccess, true);
  assert.equal(status.isTrialActive, false);
  assert.equal(status.reason, 'active');
  assert.equal(access.DEFAULT_COMPLIMENTARY_LEGACY_REASON, 'Founding/legacy member — permanent complimentary access');
});

test('only eligible non-staff accounts without subscription-managed access can receive the grant', () => {
  for (const app_access_type of ['free', 'trial', 'reading_access']) {
    assert.equal(access.canGrantComplimentaryLegacyAccess({ role: 'member', app_access_type }, false), true);
  }
  for (const profile of [
    { role: 'teacher', app_access_type: 'free' },
    { role: 'member', app_access_type: 'lesson_access' },
    { role: 'member', app_access_type: 'inactive' },
    { role: 'member', app_access_type: 'reading_access', app_access_subscription_id: 'sub_1' },
  ]) assert.equal(access.canGrantComplimentaryLegacyAccess(profile, false), false);
  assert.equal(access.canGrantComplimentaryLegacyAccess({ role: 'member', app_access_type: 'free' }, true), false);
  assert.equal(access.isSuperTeacherAccount({ role: 'teacher' }), false);
  assert.equal(access.isSuperTeacherAccount({ role: 'super_teacher' }), true);
});

test('ordinary teachers cannot explicitly claim unlinked users; the workspace API keeps the action super-teacher-only', () => {
  const route = fs.readFileSync('app/api/teacher/student-workspace/route.ts', 'utf8');
  const makeStudentBranch = route.split('if (action === "make-student")')[1]?.split('if (action === "archive-relationship"')[0] ?? '';
  assert.match(makeStudentBranch, /if \(!isSuperTeacher\(authorization\.profile\)\)/);
  assert.match(makeStudentBranch, /Only learner accounts can be made students/);
  assert.equal(access.isSuperTeacherAccount({ role: 'teacher' }), false);
});

test('grant metadata is private and the migration creates no Stripe billing records', () => {
  const migration = fs.readFileSync('sql/20261008_complimentary_legacy_access.sql', 'utf8');
  assert.match(migration, /revoke all on public\.complimentary_legacy_access_grants from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.grant_complimentary_legacy_access[^;]+to service_role/i);
  assert.doesNotMatch(migration, /insert into public\.stripe_(customers|subscriptions|checkout_attempts)/i);
  const workspaceApi = fs.readFileSync('app/api/teacher/student-workspace/route.ts', 'utf8');
  assert.match(workspaceApi, /complimentaryLegacyGrant,\s*canGrantComplimentaryLegacyAccess/);
});

test('complimentary grant RPC is permanent, records its reason, preserves prior access for revoke, and creates no subscription', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.profiles (
        id uuid primary key,
        role text not null default 'member',
        is_super_teacher boolean not null default false,
        app_access_type text not null,
        app_access_expires_at timestamptz,
        trial_started_at timestamptz,
        app_access_subscription_id text
      );
      create table public.stripe_subscriptions (
        subscription_id text primary key,
        user_id uuid not null,
        status text not null,
        paid_through timestamptz
      );
      insert into public.profiles (id, app_access_type) values
        ('00000000-0000-0000-0000-000000000001', 'free'),
        ('00000000-0000-0000-0000-000000000002', 'trial');
      insert into public.profiles (id, role, app_access_type)
        values ('00000000-0000-0000-0000-000000000009', 'super_teacher', 'reading_access');
    `);
    await db.exec(fs.readFileSync('sql/20261008_complimentary_legacy_access.sql', 'utf8'));

    const memberId = '00000000-0000-0000-0000-000000000001';
    const actorId = '00000000-0000-0000-0000-000000000009';
    await db.query(`select public.grant_complimentary_legacy_access($1, $2, $3)`, [
      memberId, access.DEFAULT_COMPLIMENTARY_LEGACY_REASON, actorId,
    ]);
    const granted = await db.query(`select app_access_type, app_access_expires_at, trial_started_at, app_access_subscription_id from profiles where id=$1`, [memberId]);
    assert.deepEqual(granted.rows[0], {
      app_access_type: 'reading_access', app_access_expires_at: null,
      trial_started_at: null, app_access_subscription_id: null,
    });
    const grantRow = await db.query(`select reason, previous_app_access_type, revoked_at from complimentary_legacy_access_grants where user_id=$1`, [memberId]);
    assert.equal(grantRow.rows[0].reason, access.DEFAULT_COMPLIMENTARY_LEGACY_REASON);
    assert.equal(grantRow.rows[0].previous_app_access_type, 'free');
    assert.equal(grantRow.rows[0].revoked_at, null);
    const subscriptions = await db.query(`select count(*)::int as count from stripe_subscriptions where user_id=$1`, [memberId]);
    assert.equal(subscriptions.rows[0].count, 0);

    const trialId = '00000000-0000-0000-0000-000000000002';
    await db.exec(`update profiles set app_access_expires_at='2026-12-01T00:00:00Z', trial_started_at='2026-10-01T00:00:00Z' where id='${trialId}'`);
    await db.query(`select public.grant_complimentary_legacy_access($1, $2, $3)`, [trialId, 'Founding member', actorId]);
    await db.query(`select public.grant_complimentary_legacy_access($1, $2, $3)`, [trialId, 'Updated founding member reason', actorId]);
    let reason = await db.query(`select reason, previous_app_access_type from complimentary_legacy_access_grants where user_id=$1`, [trialId]);
    assert.equal(reason.rows[0].reason, 'Updated founding member reason');
    assert.equal(reason.rows[0].previous_app_access_type, 'trial');
    await db.query(`select public.revoke_complimentary_legacy_access($1, $2)`, [trialId, actorId]);
    const restored = await db.query(`select app_access_type, app_access_expires_at, trial_started_at from profiles where id=$1`, [trialId]);
    assert.equal(restored.rows[0].app_access_type, 'trial');
    assert.equal(restored.rows[0].app_access_expires_at.toISOString(), '2026-12-01T00:00:00.000Z');
    assert.equal(restored.rows[0].trial_started_at.toISOString(), '2026-10-01T00:00:00.000Z');
    reason = await db.query(`select revoked_at from complimentary_legacy_access_grants where user_id=$1`, [trialId]);
    assert.ok(reason.rows[0].revoked_at);
  } finally {
    await db.close();
  }
});
