import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractKanjiChars(surface: string): string[] {
  return Array.from(surface).filter((ch) => /\p{Script=Han}/u.test(ch));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const vocabularyCacheId = body?.vocabulary_cache_id;

    if (!vocabularyCacheId) {
      return NextResponse.json(
        { error: "vocabulary_cache_id is required" },
        { status: 400 }
      );
    }

    const { data: vocabRow, error: vocabError } = await supabase
      .from("vocabulary_cache")
      .select("id, surface")
      .eq("id", vocabularyCacheId)
      .single();

    if (vocabError || !vocabRow) {
      return NextResponse.json(
        { error: "Vocabulary cache row not found", details: vocabError },
        { status: 404 }
      );
    }

    const kanjiChars = extractKanjiChars(vocabRow.surface ?? "");

    if (kanjiChars.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          created: 0,
          skipped: 0,
          message: "No kanji found in surface",
        },
        { status: 200 }
      );
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("vocabulary_kanji_map")
      .select("kanji_position")
      .eq("vocabulary_cache_id", vocabularyCacheId);

    if (existingError) {
      return NextResponse.json(
        { error: "Failed checking existing map rows", details: existingError },
        { status: 500 }
      );
    }

    const existingPositions = new Set(
      (existingRows ?? []).map((r: any) => r.kanji_position)
    );

    const rowsToInsert = kanjiChars
      .map((kanji, index) => ({
        vocabulary_cache_id: vocabularyCacheId,
        kanji,
        kanji_position: index,
      }))
      .filter((row) => !existingPositions.has(row.kanji_position));

    if (rowsToInsert.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          created: 0,
          skipped: kanjiChars.length,
          message: "All kanji-map rows already exist",
        },
        { status: 200 }
      );
    }

    const { error: insertError } = await supabase
      .from("vocabulary_kanji_map")
      .insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json(
        { error: "Failed inserting kanji-map rows", details: insertError },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        created: rowsToInsert.length,
        skipped: kanjiChars.length - rowsToInsert.length,
        rows: rowsToInsert,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}