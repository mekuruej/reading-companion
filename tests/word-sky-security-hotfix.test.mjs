import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = fs.readFileSync("sql/20261015_word_sky_reference_pool_only.sql", "utf8");
const wordSkyPage = fs.readFileSync("app/(protected)/library-study/word-sky/page.tsx", "utf8");
const dashboard = fs.readFileSync("app/dashboard/page.tsx", "utf8");
const approvalRoute = fs.readFileSync("app/api/word-sky/approve/route.ts", "utf8");

async function setupDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE FUNCTION public.library_study_identity_key(p_surface text, p_reading text)
    RETURNS text LANGUAGE sql IMMUTABLE AS $$
      SELECT lower(btrim(coalesce(p_surface, ''))) || '||' || lower(btrim(coalesce(p_reading, '')))
    $$;

    CREATE TABLE public.word_sky_starter_words (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      surface text NOT NULL,
      reading text NOT NULL,
      meaning text NOT NULL,
      jlpt_level text NOT NULL,
      active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE public.user_library_word_summaries (
      user_id text NOT NULL,
      study_identity_key text NOT NULL,
      surface text,
      reading text,
      meaning text,
      jlpt text,
      total_encounter_count integer,
      book_count integer
    );

    INSERT INTO public.user_library_word_summaries VALUES
      ('private-user', '私語||しご', '私語', 'しご', 'private meaning', 'N5', 999, 42);
    INSERT INTO public.word_sky_starter_words (surface, reading, meaning, jlpt_level, active) VALUES
      ('会う', 'あう', 'to meet', 'N5', true),
      ('会う', 'あう', 'to encounter', 'N5', true),
      ('来る', 'くる', 'to come', 'N4', true),
      ('関係', 'かんけい', 'relationship', 'N3', true),
      ('専門語', 'せんもんご', 'specialist word', 'N2', true),
      ('無効', 'むこう', 'inactive', 'N5', false);

    CREATE FUNCTION public.get_word_sky_pool(p_limit integer DEFAULT 140)
    RETURNS TABLE (
      study_identity_key text,
      surface text,
      reading text,
      meaning text,
      jlpt text,
      total_encounter_count integer,
      book_count integer
    ) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT s.study_identity_key, s.surface, s.reading, s.meaning, s.jlpt,
             s.total_encounter_count, s.book_count
      FROM public.user_library_word_summaries AS s
      ORDER BY random()
      LIMIT greatest(1, least(coalesce(p_limit, 140), 300))
    $$;
    GRANT EXECUTE ON FUNCTION public.get_word_sky_pool(integer) TO authenticated, service_role;
  `);
  return db;
}

test("migration replaces the pool with active N5-N3 reference entries and removes public/anon execution", async () => {
  const db = await setupDatabase();
  try {
    await db.exec(migration);

    const result = await db.query(`SELECT * FROM public.get_word_sky_pool(300)`);
    assert.deepEqual(
      result.rows.map((row) => row.surface).sort(),
      ["会う", "来る", "関係"]
    );
    assert.ok(result.rows.every((row) => row.total_encounter_count === 0 && row.book_count === 0));
    assert.ok(result.rows.every((row) => row.study_identity_key === `${row.surface.toLowerCase()}||${row.reading.toLowerCase()}`));
    assert.ok(result.rows.every((row) => !JSON.stringify(row).includes("private-user")));
    assert.deepEqual(Object.keys(result.rows[0]).sort(), [
      "book_count",
      "jlpt",
      "meaning",
      "reading",
      "study_identity_key",
      "surface",
      "total_encounter_count",
    ]);
    assert.equal((await db.query(`SELECT * FROM public.get_word_sky_pool(0)`)).rows.length, 1);
    assert.ok((await db.query(`SELECT * FROM public.get_word_sky_pool(999)`)).rows.length <= 300);

    const { rows: privileges } = await db.query(`
      SELECT
        has_function_privilege('anon', 'public.get_word_sky_pool(integer)', 'EXECUTE') AS anon_can_execute,
        has_function_privilege('authenticated', 'public.get_word_sky_pool(integer)', 'EXECUTE') AS authenticated_can_execute,
        has_function_privilege('service_role', 'public.get_word_sky_pool(integer)', 'EXECUTE') AS service_role_can_execute
    `);
    assert.deepEqual(privileges[0], {
      anon_can_execute: false,
      authenticated_can_execute: true,
      service_role_can_execute: true,
    });

    const { rows: metadata } = await db.query(`
      SELECT prosecdef, proconfig
      FROM pg_catalog.pg_proc
      WHERE oid = 'public.get_word_sky_pool(integer)'::regprocedure
    `);
    assert.equal(metadata[0].prosecdef, true);
    assert.ok(metadata[0].proconfig.includes("search_path=pg_catalog, public"));
  } finally {
    await db.close();
  }
});

test("migration guards unknown overloads before replacing the installed function", async () => {
  const db = await setupDatabase();
  try {
    await db.exec(`
      CREATE FUNCTION public.get_word_sky_pool(p_level text)
      RETURNS text LANGUAGE sql AS $$ SELECT p_level $$;
    `);
    await assert.rejects(db.exec(migration), /Expected exactly public\.get_word_sky_pool\(integer\)/);
    await db.exec("ROLLBACK");
    const { rows } = await db.query(`
      SELECT pg_get_functiondef('public.get_word_sky_pool(integer)'::regprocedure) AS definition
    `);
    assert.match(rows[0].definition, /user_library_word_summaries/);
  } finally {
    await db.close();
  }
});

test("Word Sky and Dashboard use only the RPC pool for card content, retaining personal study state", () => {
  assert.match(wordSkyPage, /supabase\.rpc\("get_word_sky_pool", \{ p_limit: 180 \}\)/);
  assert.doesNotMatch(wordSkyPage, /personalPool|FALLBACK_SKY_WORDS|study_available_library_word_summaries/);
  assert.match(wordSkyPage, /\.from\("user_library_word_summaries"\)[\s\S]*?\.select\("study_identity_key, total_encounter_count"\)[\s\S]*?\.eq\("user_id", user\.id\)[\s\S]*?\.in\("study_identity_key", starterKeys\)/);
  assert.match(wordSkyPage, /\.from\("user_library_word_progress"\)[\s\S]*?\.eq\("user_id", user\.id\)/);
  assert.match(wordSkyPage, /\.from\("user_library_word_claims"\)[\s\S]*?\.eq\("user_id", userId\)/);
  assert.match(wordSkyPage, /loadPersonallyHiddenStudyKeys\(\)/);

  assert.match(dashboard, /supabase\.rpc\("get_word_sky_pool"/);
  assert.doesNotMatch(dashboard, /FALLBACK_WARMUP_WORDS/);
  assert.match(dashboard, /if \(words\.length === 0\)[\s\S]*?setWarmupWords\(\[\]\)/);
});

test("starter-table publication is gated by super-teacher approval, with active treated as publication status", () => {
  assert.match(approvalRoute, /profile\?\.role !== "super_teacher" && !profile\?\.is_super_teacher/);
  assert.match(approvalRoute, /if \(approveForWordSky\)/);
  assert.match(approvalRoute, /active: true/);
  assert.match(migration, /w\.active IS TRUE/);
  assert.doesNotMatch(migration, /user_library_word_summaries/);
});
