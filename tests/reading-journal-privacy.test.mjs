import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationPath = 'sql/20261014_private_reading_journal_ownership.sql';
const journalTables = [
  'user_book_chapter_summaries',
  'user_book_characters',
  'user_book_cultural_items',
  'user_book_detective_entries',
  'user_book_reviews',
  'user_book_setting_items',
];
const owner = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const linkedTeacher = '00000000-0000-4000-8000-000000000003';
const ordinary = '00000000-0000-4000-8000-000000000004';
const superTeacher = '00000000-0000-4000-8000-000000000005';
const admin = '00000000-0000-4000-8000-000000000006';
const studentBook = '00000000-0000-4000-8000-000000000011';
const ownerBook = '00000000-0000-4000-8000-000000000012';

test('privacy migration moves legacy notes and quotes, replaces all journal policies, and preserves reflections', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      create table public.profiles(id uuid primary key, role text, is_super_teacher boolean);
      create table public.user_books(
        id uuid primary key, user_id uuid not null, notes text, favorite_quotes text,
        reader_advice text, rating_difficulty numeric, reader_level text, rating_overall numeric
      );
      -- Simulate private content that already exists before a migration retry.
      create table public.user_book_private_journals(
        user_book_id uuid primary key references public.user_books(id) on delete cascade,
        notes text, favorite_quotes text, created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table public.teacher_students(teacher_id uuid, student_id uuid, archived_at timestamptz);
      grant select on public.profiles, public.teacher_students to authenticated;
      grant select on public.user_books to authenticated;
      alter table public.user_books enable row level security;
      create policy "fixture permits student workspace access" on public.user_books
        for all to authenticated using (true) with check (true);

      insert into auth.users values
        ('${owner}'), ('${student}'), ('${linkedTeacher}'), ('${ordinary}'), ('${superTeacher}'), ('${admin}');
      insert into profiles values
        ('${owner}','member',false), ('${student}','member',false),
        ('${linkedTeacher}','teacher',false), ('${ordinary}','member',false),
        ('${superTeacher}','super_teacher',true), ('${admin}','admin',false);
      insert into teacher_students values ('${linkedTeacher}','${student}',null);
      insert into user_books values
        ('${studentBook}','${student}','Student private note','Student private quote','Community reflection',2,'Level 4',4),
        ('${ownerBook}','${owner}','Owner journal note','Owner quote','Owner reflection',3,'Level 5',5);
      insert into user_book_private_journals(user_book_id, notes)
        values ('${ownerBook}', 'Already private; preserve this value');
    `);

    for (const table of journalTables) {
      await db.exec(`create table public.${table}(
        id uuid primary key, user_book_id uuid not null${table === 'user_book_detective_entries' ? ', user_id uuid not null' : ''}, text_value text
      ); alter table public.${table} enable row level security;
      create policy "historical permissive policy" on public.${table}
        for all to authenticated using (true) with check (true);`);
      if (table === 'user_book_detective_entries') {
        await db.query(`insert into public.${table} values ($1,$2,$3,'entry')`, [
          '00000000-0000-4000-8000-000000000101', studentBook, student,
        ]);
      } else {
        await db.query(`insert into public.${table} values ($1,$2,'entry')`, [
          '00000000-0000-4000-8000-000000000101', studentBook,
        ]);
      }
    }

    const migration = fs.readFileSync(migrationPath, 'utf8');
    await db.exec(migration);

    const migrated = await db.query(
      'select notes, favorite_quotes from public.user_book_private_journals where user_book_id=$1',
      [studentBook],
    );
    assert.deepEqual(migrated.rows, [{ notes: 'Student private note', favorite_quotes: 'Student private quote' }]);
    const privateColumns = await db.query(`select column_name from information_schema.columns
      where table_schema='public' and table_name='user_books' and column_name in ('notes','favorite_quotes')`);
    assert.deepEqual(privateColumns.rows, []);
    const reflection = await db.query('select reader_advice, rating_difficulty, reader_level, rating_overall from user_books where id=$1', [studentBook]);
    assert.deepEqual(reflection.rows, [{ reader_advice: 'Community reflection', rating_difficulty: '2', reader_level: 'Level 4', rating_overall: '4' }]);

    for (const table of journalTables) {
      const policies = await db.query('select policyname from pg_policies where schemaname=$1 and tablename=$2', ['public', table]);
      assert.equal(policies.rows.length, 4, `${table} must have exactly four owner policies`);
      assert.ok(policies.rows.every(({ policyname }) => policyname.startsWith('Reading Journal owner ')));
    }

    await db.exec('set role authenticated');
    const setActor = async (id) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    const countFor = async (table) => (await db.query(`select count(*)::int as n from public.${table} where user_book_id=$1`, [studentBook])).rows[0].n;

    await setActor(student);
    for (const table of journalTables) assert.equal(await countFor(table), 1, `${table} owner read`);
    for (const [index, table] of journalTables.entries()) {
      const id = `00000000-0000-4000-8000-${String(300 + index).padStart(12, '0')}`;
      if (table === 'user_book_detective_entries') {
        await db.query(`insert into public.${table}(id,user_book_id,user_id,text_value) values ($1,$2,$3,$4)`, [id, studentBook, student, 'new owner entry']);
      } else {
        await db.query(`insert into public.${table}(id,user_book_id,text_value) values ($1,$2,$3)`, [id, studentBook, 'new owner entry']);
      }
      await db.query(`update public.${table} set text_value=$1 where id=$2`, ['edited by owner', id]);
      assert.equal((await db.query(`select text_value from public.${table} where id=$1`, [id])).rows[0].text_value, 'edited by owner');
      await db.query(`delete from public.${table} where id=$1`, [id]);
    }
    await db.query('insert into user_book_private_journals(user_book_id, notes) values ($1,$2) on conflict (user_book_id) do update set notes=excluded.notes', [studentBook, 'Owner edit']);
    assert.deepEqual((await db.query('select notes from user_book_private_journals where user_book_id=$1', [studentBook])).rows, [{ notes: 'Owner edit' }]);
    await db.query('insert into user_book_characters(id,user_book_id,text_value) values ($1,$2,$3)', ['00000000-0000-4000-8000-000000000202', studentBook, 'new owner entry']);
    await db.query('update user_book_characters set text_value=$1 where user_book_id=$2', ['edited by owner', studentBook]);
    assert.equal((await db.query('select text_value from user_book_characters where user_book_id=$1', [studentBook])).rows[0].text_value, 'edited by owner');
    await db.query('delete from user_book_characters where user_book_id=$1', [studentBook]);
    assert.equal((await db.query('select count(*)::int as n from user_book_characters where user_book_id=$1', [studentBook])).rows[0].n, 0);
    await assert.rejects(
      db.query('insert into user_book_detective_entries(id,user_book_id,user_id,text_value) values ($1,$2,$3,$4)', ['00000000-0000-4000-8000-000000000203', studentBook, owner, 'mismatch']),
      /owner|check|policy/i,
    );

    for (const actor of [ordinary, linkedTeacher, superTeacher, admin]) {
      await setActor(actor);
      for (const table of journalTables) assert.equal(await countFor(table), 0, `${actor} must not read ${table}`);
      assert.equal((await db.query('select count(*)::int as n from user_book_private_journals where user_book_id=$1', [studentBook])).rows[0].n, 0);
      await assert.rejects(
        db.query('insert into user_book_private_journals(user_book_id, notes) values ($1,$2)', [studentBook, 'unauthorized']),
        /policy|row-level/i,
      );
      assert.equal((await db.query('delete from user_book_reviews where user_book_id=$1', [studentBook])).rowCount, 0);
    }

    // Linked teachers retain their separate teacher assessment note workflow;
    // the same teacher still cannot see the student's private Reading Journal.
    await setActor(linkedTeacher);
    assert.equal((await db.query('select reader_advice from user_books where id=$1', [studentBook])).rows[0].reader_advice, 'Community reflection');
    await db.query("insert into public.teacher_user_book_assessment_notes(teacher_id,user_book_id,notes) values ($1,$2,$3)", [linkedTeacher, studentBook, 'Teacher assessment note']);
    assert.equal((await db.query('select notes from public.teacher_user_book_assessment_notes where user_book_id=$1', [studentBook])).rows[0].notes, 'Teacher assessment note');
    await setActor(superTeacher);
    await db.query("insert into public.teacher_user_book_assessment_notes(teacher_id,user_book_id,notes) values ($1,$2,$3)", [superTeacher, studentBook, 'Super teacher assessment note']);
    assert.equal((await db.query('select count(*)::int as n from user_book_private_journals where user_book_id=$1', [studentBook])).rows[0].n, 0);

    await setActor(owner);
    assert.deepEqual(
      (await db.query('select notes, favorite_quotes from user_book_private_journals where user_book_id=$1', [ownerBook])).rows,
      [{ notes: 'Already private; preserve this value', favorite_quotes: 'Owner quote' }],
      'migration must preserve existing private content while backfilling missing legacy fields',
    );

    // A second execution must fail before destructive statements. Keep a
    // private edit in place to prove the failed rerun cannot replace it.
    await setActor(student);
    await db.query('update user_book_private_journals set notes=$1 where user_book_id=$2', ['Private edit after migration', studentBook]);
    await db.exec('reset role');
    await assert.rejects(db.exec(migration), /already recorded; no changes were applied/i);
    await db.exec('rollback').catch(() => {});
    assert.deepEqual(
      (await db.query('select notes, favorite_quotes from user_book_private_journals where user_book_id=$1', [studentBook])).rows,
      [{ notes: 'Private edit after migration', favorite_quotes: 'Student private quote' }],
    );
    assert.equal((await db.query('select count(*)::int as n from user_book_private_journals where user_book_id=$1', [studentBook])).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int as n from mekuru_migration_state where migration_name=$1', ['20261014_private_reading_journal_ownership'])).rows[0].n, 1);
  } finally {
    await db.close();
  }
});

test('journal routes use private storage and do not mount student journals in teacher views', () => {
  const read = fs.readFileSync('app/(protected)/books/[userBookId]/read/page.tsx', 'utf8');
  const listening = fs.readFileSync('app/(protected)/books/[userBookId]/listening/page.tsx', 'utf8');
  const curiosity = fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/page.tsx', 'utf8');
  const justReading = fs.readFileSync('app/(protected)/books/[userBookId]/just-reading/page.tsx', 'utf8');
  const followAlong = fs.readFileSync('app/(protected)/books/[userBookId]/readalong/page.tsx', 'utf8');
  const story = fs.readFileSync('app/(protected)/books/[userBookId]/story/StoryNotesExperience.tsx', 'utf8');
  const teacherReview = fs.readFileSync('app/(protected)/teacher/books/[userBookId]/page.tsx', 'utf8');
  const bookHub = fs.readFileSync('app/(protected)/books/[userBookId]/page.tsx', 'utf8');

  for (const [name, source] of Object.entries({ read, listening, curiosity, justReading, followAlong })) {
    assert.match(source, /loadPrivateJournalFields/, `${name} must load private journal data through its RLS-protected table`);
    assert.doesNotMatch(source, /favorite_quotes,\s*books|notes,\s*my_review/);
  }
  assert.match(story, /!isTeachingJournal && loadedRow\.user_id !== user\.id/);
  assert.match(bookHub, /r\.user_id === user\.id/);
  assert.match(teacherReview, /teacher_user_book_assessment_notes/);
  assert.doesNotMatch(teacherReview, /notes,\s*recommended_level/);
  assert.match(bookHub, /reader_advice/);
  assert.match(bookHub, /rating_difficulty/);
  assert.match(bookHub, /rating_overall/);
});
