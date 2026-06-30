import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type KanjiReadingType = "on" | "kun" | "other";

type FastPassRow = {
  kanji: string;
  kanji_position: number;
  reading_type: KanjiReadingType;
  base_reading: string;
  realized_reading: string;
};

type VocabularyCacheRow = {
  id: number;
  surface: string | null;
  reading: string | null;
  jlpt?: string | null;
  senses_json?: unknown;
};

type KanjiMapRow = FastPassRow & {
  id: number;
  vocabulary_cache_id: number;
  flagged_for_review?: boolean | null;
  excluded_from_kanji_practice?: boolean | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractKanjiChars(value: string) {
  return Array.from(value).filter((char) => /\p{Script=Han}/u.test(char));
}

function normalizeReadingType(value: unknown): KanjiReadingType {
  return value === "kun" || value === "other" ? value : "on";
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

function meaningPreviewFromSenses(senses: unknown) {
  if (!Array.isArray(senses)) return null;
  const firstSense = senses[0] as Record<string, unknown> | undefined;
  const definitions = firstSense?.english_definitions;
  if (!Array.isArray(definitions)) return null;

  return definitions
    .map((item) => cleanText(item))
    .filter(Boolean)
    .slice(0, 3)
    .join(", ") || null;
}

function normalizeRows(rawRows: unknown, surface: string): FastPassRow[] {
  const kanjiChars = extractKanjiChars(surface);
  const rows = Array.isArray(rawRows) ? rawRows : [];

  return rows
    .map((row, fallbackIndex) => {
      const item = row as Record<string, unknown>;
      const kanji = cleanText(item.kanji);
      const rawPosition = item.kanji_position ?? item.kanjiPosition ?? fallbackIndex;
      const kanjiPosition = Number(rawPosition);
      const baseReading = cleanText(item.base_reading ?? item.baseReading);
      const realizedReading = cleanText(item.realized_reading ?? item.realizedReading) || baseReading;

      if (!kanji || !Number.isInteger(kanjiPosition) || kanjiPosition < 0) return null;
      if (!baseReading || !realizedReading) return null;

      return {
        kanji,
        kanji_position: kanjiPosition,
        reading_type: normalizeReadingType(item.reading_type ?? item.readingType),
        base_reading: baseReading,
        realized_reading: realizedReading,
      };
    })
    .filter((row): row is FastPassRow => {
      if (!row) return false;
      return kanjiChars[row.kanji_position] === row.kanji;
    });
}

export async function GET(req: Request) {
  try {
    const auth = await requireSuperTeacher(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const keyword = cleanText(url.searchParams.get("keyword"));

    if (!keyword) {
      return NextResponse.json(
        { error: "Search word is required." },
        { status: 400 }
      );
    }

    const [surfaceResult, readingResult] = await Promise.all([
      supabaseAdmin
        .from("vocabulary_cache")
        .select("id, surface, reading, jlpt, senses_json")
        .eq("surface", keyword)
        .limit(20),
      supabaseAdmin
        .from("vocabulary_cache")
        .select("id, surface, reading, jlpt, senses_json")
        .eq("reading", keyword)
        .limit(20),
    ]);

    if (surfaceResult.error) throw surfaceResult.error;
    if (readingResult.error) throw readingResult.error;

    const cacheRowsById = new Map<number, VocabularyCacheRow>();
    for (const row of [
      ...((surfaceResult.data ?? []) as VocabularyCacheRow[]),
      ...((readingResult.data ?? []) as VocabularyCacheRow[]),
    ]) {
      cacheRowsById.set(Number(row.id), row);
    }

    const cacheRows = Array.from(cacheRowsById.values()).filter((row) =>
      extractKanjiChars(row.surface ?? "").length > 0
    );
    const cacheIds = cacheRows.map((row) => Number(row.id));

    const mapRowsByCacheId = new Map<number, KanjiMapRow[]>();
    if (cacheIds.length > 0) {
      const { data: mapRows, error: mapError } = await supabaseAdmin
        .from("vocabulary_kanji_map")
        .select(
          "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, excluded_from_kanji_practice"
        )
        .in("vocabulary_cache_id", cacheIds)
        .order("kanji_position", { ascending: true });

      if (mapError) throw mapError;

      for (const row of (mapRows ?? []) as KanjiMapRow[]) {
        const cacheId = Number(row.vocabulary_cache_id);
        const existing = mapRowsByCacheId.get(cacheId) ?? [];
        existing.push(row);
        mapRowsByCacheId.set(cacheId, existing);
      }
    }

    return NextResponse.json({
      ok: true,
      results: cacheRows.map((row) => ({
        id: Number(row.id),
        surface: row.surface ?? "",
        reading: row.reading ?? "",
        jlpt: row.jlpt ?? null,
        meaning_preview: meaningPreviewFromSenses(row.senses_json),
        kanji_count: extractKanjiChars(row.surface ?? "").length,
        map_rows: mapRowsByCacheId.get(Number(row.id)) ?? [],
      })),
    });
  } catch (err: any) {
    console.error("Error searching kanji fast-pass cache:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not search vocabulary cache." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperTeacher(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const rawVocabularyCacheId = body?.vocabulary_cache_id ?? body?.vocabularyCacheId;
    const vocabularyCacheId = Number(rawVocabularyCacheId);

    if (!Number.isFinite(vocabularyCacheId)) {
      return NextResponse.json(
        { error: "Choose an existing vocabulary cache word first." },
        { status: 400 }
      );
    }

    const { data: cacheRow, error: cacheError } = await supabaseAdmin
      .from("vocabulary_cache")
      .select("id, surface, reading")
      .eq("id", vocabularyCacheId)
      .maybeSingle();

    if (cacheError) throw cacheError;
    if (!cacheRow) {
      return NextResponse.json(
        { error: "Vocabulary cache word not found." },
        { status: 404 }
      );
    }

    const surface = cleanText((cacheRow as VocabularyCacheRow).surface);
    const kanjiChars = extractKanjiChars(surface);
    const rows = normalizeRows(body?.rows, surface);

    if (kanjiChars.length === 0) {
      return NextResponse.json(
        { error: "The surface word needs at least one kanji." },
        { status: 400 }
      );
    }

    if (rows.length !== kanjiChars.length) {
      return NextResponse.json(
        { error: "Add a complete reading row for each kanji in the word." },
        { status: 400 }
      );
    }

    const seenPositions = new Set<number>();
    for (const row of rows) {
      if (seenPositions.has(row.kanji_position)) {
        return NextResponse.json(
          { error: "Each kanji position can only be saved once." },
          { status: 400 }
        );
      }
      seenPositions.add(row.kanji_position);
    }

    const { data: existingMapRows, error: existingMapError } = await supabaseAdmin
      .from("vocabulary_kanji_map")
      .select("id, kanji_position")
      .eq("vocabulary_cache_id", vocabularyCacheId);

    if (existingMapError) throw existingMapError;

    const existingByPosition = new Map<number, number>();
    for (const row of existingMapRows ?? []) {
      existingByPosition.set(Number((row as any).kanji_position), Number((row as any).id));
    }

    let insertedMapRows = 0;
    let updatedMapRows = 0;

    for (const row of rows) {
      const payload = {
        vocabulary_cache_id: vocabularyCacheId,
        kanji: row.kanji,
        kanji_position: row.kanji_position,
        reading_type: row.reading_type,
        base_reading: row.base_reading,
        realized_reading: row.realized_reading,
        excluded_from_kanji_practice: false,
        flagged_for_review: false,
        flagged_at: null,
      };

      const existingId = existingByPosition.get(row.kanji_position);

      if (existingId) {
        const { error: updateError } = await supabaseAdmin
          .from("vocabulary_kanji_map")
          .update(payload)
          .eq("id", existingId);

        if (updateError) throw updateError;
        updatedMapRows += 1;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("vocabulary_kanji_map")
          .insert(payload);

        if (insertError) throw insertError;
        insertedMapRows += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      vocabulary_cache_id: vocabularyCacheId,
      kanji_map_inserted: insertedMapRows,
      kanji_map_updated: updatedMapRows,
    });
  } catch (err: any) {
    console.error("Error fast-passing kanji reading:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not fast-pass kanji reading." },
      { status: 500 }
    );
  }
}
