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
  const text = cleanText(value).toUpperCase().replace(/^JLPT[-_\s]?/, "");
  if (text === "N5" || text === "N4" || text === "N3" || text === "N2" || text === "N1") return text;
  if (text === "NON-JLPT" || text === "UNLABELED" || text === "") return null;
  return null;
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

function isTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function splitMeaningParts(meaning: string) {
  return meaning
    .split(/[;；]/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sensesFromMeaning(meaning: string) {
  const definitions = splitMeaningParts(meaning);
  return definitions.length > 0 ? [{ english_definitions: definitions }] : [];
}

function extractKanjiChars(surface: string) {
  return Array.from(surface).filter((char) => /\p{Script=Han}/u.test(char));
}

async function ensureKanjiMapRows(vocabularyCacheId: number, surface: string) {
  const kanjiChars = extractKanjiChars(surface);
  if (kanjiChars.length === 0) return { created: 0, skipped: 0 };

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("vocabulary_kanji_map")
    .select("kanji_position")
    .eq("vocabulary_cache_id", vocabularyCacheId);

  if (existingError) throw existingError;

  const existingPositions = new Set((existingRows ?? []).map((row: any) => row.kanji_position));
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

async function requireTeacher(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) return { error: "Missing session.", status: 401 as const };

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) return { error: "Invalid session.", status: 401 as const };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_super_teacher")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return { error: profileError.message, status: 500 as const };

  const canUse =
    profile?.role === "teacher" ||
    profile?.role === "super_teacher" ||
    isTeacherFlag(profile?.is_super_teacher);

  if (!canUse) return { error: "Teacher access required.", status: 403 as const };

  return { user };
}

export async function POST(req: Request) {
  try {
    const auth = await requireTeacher(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const surface = cleanText(body?.surface);
    const reading = cleanText(body?.reading);
    const meaning = cleanText(body?.meaning ?? body?.meaningNote);
    const entryType = cleanText(body?.entry_type ?? body?.entryType) || "vocabulary";
    const contextNote = cleanText(body?.context_note ?? body?.contextNote);
    const jlpt = normalizeJlpt(body?.jlpt);
    const isCommon = normalizeBoolean(body?.is_common ?? body?.isCommon);

    if (!surface) {
      return NextResponse.json({ error: "Surface is required." }, { status: 400 });
    }

    if (!reading) {
      return NextResponse.json({ error: "Reading is required." }, { status: 400 });
    }

    if (!meaning) {
      return NextResponse.json({ error: "Meaning or note is required." }, { status: 400 });
    }

    const manualRaw = {
      source: "mekuru_teacher",
      entry_type: entryType,
      meaning,
      context_note: contextNote || null,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    };

    const payload = {
      surface,
      reading,
      lookup_key: surface,
      jlpt,
      is_common: isCommon,
      senses_json: sensesFromMeaning(meaning),
      raw_json: manualRaw,
      source: "mekuru_teacher",
    };

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("vocabulary_cache")
      .select("id")
      .eq("surface", surface)
      .eq("reading", reading)
      .limit(1);

    if (existingError) throw existingError;

    const existingId = existingRows?.[0]?.id as number | undefined;
    let vocabularyCacheId = existingId ?? null;
    let created = false;

    if (existingId) {
      const { error: updateError } = await supabaseAdmin
        .from("vocabulary_cache")
        .update(payload)
        .eq("id", existingId);

      if (updateError) throw updateError;
    } else {
      const { data: insertedRow, error: insertError } = await supabaseAdmin
        .from("vocabulary_cache")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;
      vocabularyCacheId = insertedRow.id;
      created = true;
    }

    if (!vocabularyCacheId) {
      throw new Error("Vocabulary cache row was not saved.");
    }

    const kanjiMap = await ensureKanjiMapRows(vocabularyCacheId, surface);

    return NextResponse.json({
      ok: true,
      vocabulary_cache_id: vocabularyCacheId,
      created,
      updated: !created,
      kanji_map: kanjiMap,
    });
  } catch (error: any) {
    console.error("Error saving global word:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not save global word." },
      { status: 500 }
    );
  }
}
