import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractKanjiChars(surface: string): string[] {
  return Array.from(surface).filter((ch) => /\p{Script=Han}/u.test(ch));
}

async function getAuthenticatedUser(req: Request) {
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

  return { user };
}

async function canGenerateKanjiMapRows(userId: string, vocabularyCacheId: number) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_super_teacher")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Error loading profile for kanji-map generation:", profileError);
    return { ok: false, error: "Failed checking authorization.", status: 500 as const };
  }

  const isSuperTeacher = profile?.role === "super_teacher" || !!profile?.is_super_teacher;
  if (isSuperTeacher) return { ok: true };

  const { data: ownedRows, error: ownedError } = await supabaseAdmin
    .from("user_book_words")
    .select(
      `
      id,
      user_books!inner (
        user_id
      )
    `
    )
    .eq("vocabulary_cache_id", vocabularyCacheId)
    .eq("user_books.user_id", userId)
    .limit(1);

  if (ownedError) {
    console.error("Error checking owned kanji-map vocabulary access:", ownedError);
    return { ok: false, error: "Failed checking authorization.", status: 500 as const };
  }

  if ((ownedRows ?? []).length > 0) return { ok: true };

  if (profile?.role !== "teacher") {
    return { ok: false, error: "You do not have access to this vocabulary item.", status: 403 as const };
  }

  const { data: linkedRows, error: linkedError } = await supabaseAdmin
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", userId);

  if (linkedError) {
    console.error("Error checking linked students for kanji-map generation:", linkedError);
    return { ok: false, error: "Failed checking authorization.", status: 500 as const };
  }

  const linkedStudentIds = Array.from(
    new Set((linkedRows ?? []).map((row: any) => row.student_id).filter(Boolean))
  );

  if (linkedStudentIds.length === 0) {
    return { ok: false, error: "You do not have access to this vocabulary item.", status: 403 as const };
  }

  const { data: studentRows, error: studentError } = await supabaseAdmin
    .from("user_book_words")
    .select(
      `
      id,
      user_books!inner (
        user_id
      )
    `
    )
    .eq("vocabulary_cache_id", vocabularyCacheId)
    .in("user_books.user_id", linkedStudentIds)
    .limit(1);

  if (studentError) {
    console.error("Error checking linked-student kanji-map vocabulary access:", studentError);
    return { ok: false, error: "Failed checking authorization.", status: 500 as const };
  }

  if ((studentRows ?? []).length > 0) return { ok: true };

  return { ok: false, error: "You do not have access to this vocabulary item.", status: 403 as const };
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    const rawVocabularyCacheId =
      body?.vocabulary_cache_id ?? body?.vocabularyCacheId ?? null;

    const vocabularyCacheId =
      rawVocabularyCacheId == null ? null : Number(rawVocabularyCacheId);

    if (!vocabularyCacheId || Number.isNaN(vocabularyCacheId)) {
      return NextResponse.json(
        { error: "vocabulary_cache_id is required" },
        { status: 400 }
      );
    }

    const access = await canGenerateKanjiMapRows(auth.user.id, vocabularyCacheId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const { data: vocabRow, error: vocabError } = await supabaseAdmin
      .from("vocabulary_cache")
      .select("id, surface")
      .eq("id", vocabularyCacheId)
      .maybeSingle();

    if (vocabError) {
      console.error("Error loading vocabulary cache row for kanji-map generation:", vocabError);
      return NextResponse.json(
        { error: "Vocabulary cache row not found" },
        { status: 404 }
      );
    }

    if (!vocabRow) {
      return NextResponse.json(
        { error: "Vocabulary cache row not found" },
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

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("vocabulary_kanji_map")
      .select("kanji_position")
      .eq("vocabulary_cache_id", vocabularyCacheId);

    if (existingError) {
      console.error("Error checking existing kanji-map rows:", existingError);
      return NextResponse.json(
        { error: "Failed checking existing map rows" },
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

    const { error: insertError } = await supabaseAdmin
      .from("vocabulary_kanji_map")
      .insert(rowsToInsert);

    if (insertError) {
      console.error("Error inserting kanji-map rows:", insertError);
      return NextResponse.json(
        { error: "Failed inserting kanji-map rows" },
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
    console.error("Unexpected error generating kanji-map rows:", e);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
