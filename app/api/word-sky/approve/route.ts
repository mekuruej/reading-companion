import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeJlpt(value: unknown) {
  const text = cleanText(value).toUpperCase();
  if (text === "N5" || text === "N4" || text === "N3" || text === "N2" || text === "N1") {
    return text;
  }
  if (text === "NON-JLPT" || text === "UNLABELED") return text;
  return null;
}

function normalizeMeanings(value: unknown, fallback: string) {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const meanings = raw
    .map((item) => cleanText(item))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (fallback && !seen.has(fallback.toLowerCase())) meanings.unshift(fallback);
  return meanings;
}

function sensesFromMeanings(meanings: string[]) {
  return meanings.map((meaning) => ({
    english_definitions: meaning
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean),
  }));
}

function extractKanjiChars(surface: string): string[] {
  return Array.from(surface).filter((ch) => /\p{Script=Han}/u.test(ch));
}

async function generateKanjiMapRows(vocabularyCacheId: number, surface: string) {
  const kanjiChars = extractKanjiChars(surface);
  if (kanjiChars.length === 0) return { created: 0, skipped: 0 };

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("vocabulary_kanji_map")
    .select("kanji_position")
    .eq("vocabulary_cache_id", vocabularyCacheId);

  if (existingError) throw existingError;

  const existingPositions = new Set(
    (existingRows ?? []).map((row: any) => row.kanji_position)
  );

  const rowsToInsert = kanjiChars
    .map((kanji, index) => ({
      vocabulary_cache_id: vocabularyCacheId,
      kanji,
      kanji_position: index,
    }))
    .filter((row) => !existingPositions.has(row.kanji_position));

  if (rowsToInsert.length === 0) {
    return { created: 0, skipped: kanjiChars.length };
  }

  const { error: insertError } = await supabaseAdmin
    .from("vocabulary_kanji_map")
    .insert(rowsToInsert);

  if (insertError) throw insertError;

  return {
    created: rowsToInsert.length,
    skipped: kanjiChars.length - rowsToInsert.length,
  };
}

async function requireSuperTeacher(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: "Missing session.", status: 401 as const };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return { error: "Invalid session.", status: 401 as const };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_super_teacher")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, status: 500 as const };
  }

  if (profile?.role !== "super_teacher" && !profile?.is_super_teacher) {
    return { error: "Super teacher access required.", status: 403 as const };
  }

  return { user };
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperTeacher(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const surface = cleanText(body?.surface);
    const reading = cleanText(body?.reading);
    const meaning = cleanText(body?.meaning);
    const meanings = normalizeMeanings(body?.meanings, meaning);
    const jlptLevel = normalizeJlpt(body?.jlpt_level);
    const approveForWordSky = !!body?.approveForWordSky;

    if (!surface || !reading || !meaning) {
      return NextResponse.json(
        { error: "surface, reading, and meaning are required." },
        { status: 400 }
      );
    }

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("vocabulary_cache")
      .select("id")
      .eq("surface", surface)
      .eq("reading", reading)
      .limit(1);

    if (existingError) throw existingError;

    let vocabularyCacheId = existingRows?.[0]?.id as number | undefined;
    let vocabularyCacheCreated = false;
    let kanjiMapResult: { created: number; skipped: number } | null = null;

    if (!vocabularyCacheId) {
      const { data: insertedCache, error: insertError } = await supabaseAdmin
        .from("vocabulary_cache")
        .insert({
          surface,
          reading,
          lookup_key: surface,
          jlpt: jlptLevel,
          is_common: false,
          senses_json: sensesFromMeanings(meanings),
          raw_json: {
            source: "mekuru_super_teacher",
            meanings,
          },
          source: "mekuru_super_teacher",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      vocabularyCacheId = insertedCache.id;
      vocabularyCacheCreated = true;
      kanjiMapResult = await generateKanjiMapRows(vocabularyCacheId, surface);
    }

    let wordSkyUpdated = false;

    if (approveForWordSky) {
      const { error: wordSkyError } = await supabaseAdmin
        .from("word_sky_starter_words")
        .upsert(
          {
            surface,
            reading,
            meaning,
            meanings,
            jlpt_level: jlptLevel,
            source: "vocabulary_cache",
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "surface,reading" }
        );

      if (wordSkyError) throw wordSkyError;
      wordSkyUpdated = true;
    }

    return NextResponse.json({
      ok: true,
      vocabulary_cache_id: vocabularyCacheId,
      vocabulary_cache_created: vocabularyCacheCreated,
      kanji_map: kanjiMapResult,
      word_sky_updated: wordSkyUpdated,
    });
  } catch (err: any) {
    console.error("Error approving Word Sky word:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not update global word data." },
      { status: 500 }
    );
  }
}
