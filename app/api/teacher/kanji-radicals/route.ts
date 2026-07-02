import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type KanjiMapRadicalSourceRow = {
  kanji: string | null;
  excluded_from_kanji_practice?: boolean | null;
  flagged_for_review?: boolean | null;
};

type KanjiRadicalRow = {
  kanji: string;
  radical: string;
  radical_name: string | null;
  radical_english_name: string | null;
  jlpt_level: string | null;
  is_jouyou: boolean | null;
  school_grade: number | null;
  stroke_count: number | null;
  notes: string | null;
  source: string | null;
  updated_at: string | null;
};

type KanjiComponentRow = {
  kanji: string;
  component: string;
  component_name: string | null;
  sort_order: number | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstKanjiChar(value: unknown) {
  const text = cleanText(value);
  return Array.from(text).find((char) => /\p{Script=Han}/u.test(char)) ?? "";
}

function firstChar(value: unknown) {
  const text = cleanText(value);
  return Array.from(text)[0] ?? "";
}

function normalizeJlptLevel(value: unknown) {
  const normalized = cleanText(value).toUpperCase().replace(/^JLPT[-_\s]?/, "");
  return normalized === "N5" ||
    normalized === "N4" ||
    normalized === "N3" ||
    normalized === "N2" ||
    normalized === "N1"
    ? normalized
    : null;
}

function normalizeNullableBoolean(value: unknown) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function normalizeSchoolGrade(value: unknown) {
  if (value === "" || value == null) return null;
  const grade = Number(value);
  return Number.isInteger(grade) && grade >= 1 && grade <= 8 ? grade : null;
}

function missingColumnName(error: unknown) {
  const message = typeof (error as any)?.message === "string" ? (error as any).message : "";
  if (message.includes("jlpt_level") && message.includes("does not exist")) return "jlpt_level";
  if (message.includes("radical_english_name") && message.includes("does not exist")) return "radical_english_name";
  if (message.includes("is_jouyou") && message.includes("does not exist")) return "is_jouyou";
  if (message.includes("school_grade") && message.includes("does not exist")) return "school_grade";
  return null;
}

function radicalSelectColumns(includeJlptLevel: boolean, includeEnglishName: boolean, includeJouyou: boolean, includeSchoolGrade: boolean) {
  return [
    "kanji",
    "radical",
    "radical_name",
    includeEnglishName ? "radical_english_name" : null,
    includeJlptLevel ? "jlpt_level" : null,
    includeJouyou ? "is_jouyou" : null,
    includeSchoolGrade ? "school_grade" : null,
    "stroke_count",
    "notes",
    "source",
    "updated_at",
  ].filter(Boolean).join(", ");
}

function withMissingRadicalDefaults(row: Partial<KanjiRadicalRow>): KanjiRadicalRow {
  return {
    kanji: row.kanji ?? "",
    radical: row.radical ?? "",
    radical_name: row.radical_name ?? null,
    radical_english_name: row.radical_english_name ?? null,
    jlpt_level: row.jlpt_level ?? null,
    is_jouyou: row.is_jouyou ?? null,
    school_grade: row.school_grade ?? null,
    stroke_count: row.stroke_count ?? null,
    notes: row.notes ?? null,
    source: row.source ?? null,
    updated_at: row.updated_at ?? null,
  };
}

async function loadRadicalsForKanji(chunk: string[]) {
  let includeJlptLevel = true;
  let includeEnglishName = true;
  let includeJouyou = true;
  let includeSchoolGrade = true;

  while (true) {
    const result = await supabaseAdmin
      .from("kanji_radicals")
      .select(radicalSelectColumns(includeJlptLevel, includeEnglishName, includeJouyou, includeSchoolGrade))
      .in("kanji", chunk);

    if (!result.error) {
      return ((result.data ?? []) as Partial<KanjiRadicalRow>[]).map(withMissingRadicalDefaults);
    }

    const missing = missingColumnName(result.error);
    if (missing === "jlpt_level" && includeJlptLevel) {
      includeJlptLevel = false;
      continue;
    }
    if (missing === "radical_english_name" && includeEnglishName) {
      includeEnglishName = false;
      continue;
    }
    if (missing === "is_jouyou" && includeJouyou) {
      includeJouyou = false;
      continue;
    }
    if (missing === "school_grade" && includeSchoolGrade) {
      includeSchoolGrade = false;
      continue;
    }

    throw result.error;
  }
}

async function upsertKanjiRadical({
  kanji,
  radical,
  radicalName,
  radicalEnglishName,
  jlptLevel,
  isJouyou,
  schoolGrade,
  strokeCount,
  notes,
  source,
  userId,
}: {
  kanji: string;
  radical: string;
  radicalName: string | null;
  radicalEnglishName: string | null;
  jlptLevel: string | null;
  isJouyou: boolean | null;
  schoolGrade: number | null;
  strokeCount: number | null;
  notes: string | null;
  source: string;
  userId: string;
}) {
  const payload = {
    kanji,
    radical,
    radical_name: radicalName,
    radical_english_name: radicalEnglishName,
    jlpt_level: jlptLevel,
    is_jouyou: isJouyou,
    school_grade: schoolGrade,
    stroke_count: strokeCount,
    notes,
    source,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  let includeJlptLevel = true;
  let includeEnglishName = true;
  let includeJouyou = true;
  let includeSchoolGrade = true;

  while (true) {
    const fallbackPayload = { ...payload } as Partial<typeof payload>;
    if (!includeJlptLevel) delete fallbackPayload.jlpt_level;
    if (!includeEnglishName) delete fallbackPayload.radical_english_name;
    if (!includeJouyou) delete fallbackPayload.is_jouyou;
    if (!includeSchoolGrade) delete fallbackPayload.school_grade;

    const result = await supabaseAdmin
      .from("kanji_radicals")
      .upsert(fallbackPayload, { onConflict: "kanji" })
      .select(radicalSelectColumns(includeJlptLevel, includeEnglishName, includeJouyou, includeSchoolGrade))
      .single();

    if (!result.error) return withMissingRadicalDefaults(result.data as Partial<KanjiRadicalRow>);

    const missing = missingColumnName(result.error);
    if (missing === "jlpt_level" && includeJlptLevel) {
      includeJlptLevel = false;
      continue;
    }
    if (missing === "radical_english_name" && includeEnglishName) {
      includeEnglishName = false;
      continue;
    }
    if (missing === "is_jouyou" && includeJouyou) {
      includeJouyou = false;
      continue;
    }
    if (missing === "school_grade" && includeSchoolGrade) {
      includeSchoolGrade = false;
      continue;
    }

    throw result.error;
  }
}

async function loadKanjiMapSourceRows() {
  const rows: KanjiMapRadicalSourceRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("vocabulary_kanji_map")
      .select("kanji, excluded_from_kanji_practice, flagged_for_review")
      .not("kanji", "is", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const pageRows = (data ?? []) as KanjiMapRadicalSourceRow[];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function normalizeComponents(value: unknown, mainRadical: string) {
  const raw = Array.isArray(value)
    ? value
    : cleanText(value)
        .split(/[\s,、/]+/u)
        .filter(Boolean);

  const seen = new Set<string>();
  const components: { component: string; component_name: string | null; sort_order: number }[] = [];

  for (const item of raw) {
    const component = firstChar(typeof item === "string" ? item : (item as any)?.component);
    if (!component || seen.has(component)) continue;
    seen.add(component);
    components.push({
      component,
      component_name:
        typeof item === "object" && item != null ? cleanText((item as any).component_name) || null : null,
      sort_order: components.length,
    });
  }

  if (mainRadical && !seen.has(mainRadical)) {
    components.unshift({ component: mainRadical, component_name: null, sort_order: 0 });
  }

  return components.map((component, index) => ({ ...component, sort_order: index }));
}

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

async function requireSuperTeacher(req: Request) {
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

  const isSuperTeacher =
    profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

  if (!isSuperTeacher) return { error: "Super teacher access required.", status: 403 as const };

  return { user };
}

export async function GET(req: Request) {
  try {
    const auth = await requireSuperTeacher(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const keyword = cleanText(url.searchParams.get("keyword"));

    const mapRows = await loadKanjiMapSourceRows();

    const countsByKanji = new Map<string, number>();
    for (const row of mapRows) {
      if (row.excluded_from_kanji_practice && !row.flagged_for_review) continue;
      const kanji = firstKanjiChar(row.kanji);
      if (!kanji) continue;
      if (keyword && !kanji.includes(keyword)) continue;
      countsByKanji.set(kanji, (countsByKanji.get(kanji) ?? 0) + 1);
    }

    const kanjiList = Array.from(countsByKanji.keys());
    const radicalsByKanji = new Map<string, KanjiRadicalRow>();
    const componentsByKanji = new Map<string, KanjiComponentRow[]>();

    for (let i = 0; i < kanjiList.length; i += 400) {
      const chunk = kanjiList.slice(i, i + 400);
      const [radicalRows, componentResult] = await Promise.all([
        loadRadicalsForKanji(chunk),
        supabaseAdmin
          .from("kanji_components")
          .select("kanji, component, component_name, sort_order")
          .in("kanji", chunk)
          .order("sort_order", { ascending: true }),
      ]);

      if (componentResult.error) throw componentResult.error;

      for (const row of radicalRows) {
        radicalsByKanji.set(row.kanji, row);
      }

      for (const row of (componentResult.data ?? []) as KanjiComponentRow[]) {
        const existing = componentsByKanji.get(row.kanji) ?? [];
        existing.push(row);
        componentsByKanji.set(row.kanji, existing);
      }
    }

    const results = kanjiList
      .map((kanji) => {
        const radical = radicalsByKanji.get(kanji) ?? null;
        return {
          kanji,
          count: countsByKanji.get(kanji) ?? 0,
          has_radical: !!radical,
          radical: radical?.radical ?? null,
          radical_name: radical?.radical_name ?? null,
          radical_english_name: radical?.radical_english_name ?? null,
          jlpt_level: radical?.jlpt_level ?? null,
          is_jouyou: radical?.is_jouyou ?? null,
          school_grade: radical?.school_grade ?? null,
          stroke_count: radical?.stroke_count ?? null,
          notes: radical?.notes ?? null,
          source: radical?.source ?? null,
          updated_at: radical?.updated_at ?? null,
          components: componentsByKanji.get(kanji) ?? [],
        };
      })
      .sort((a, b) => {
        if (a.has_radical !== b.has_radical) return a.has_radical ? 1 : -1;
        if (b.count !== a.count) return b.count - a.count;
        return a.kanji.localeCompare(b.kanji, "ja");
      })
      .slice(0, 120);

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("Error loading kanji radicals:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not load kanji radicals." },
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
    const kanji = firstKanjiChar(body?.kanji);
    const radical = firstChar(body?.radical);
    const radicalName = cleanText(body?.radical_name ?? body?.radicalName) || null;
    const radicalEnglishName = cleanText(body?.radical_english_name ?? body?.radicalEnglishName) || null;
    const jlptLevel = normalizeJlptLevel(body?.jlpt_level ?? body?.jlptLevel);
    const isJouyou = normalizeNullableBoolean(body?.is_jouyou ?? body?.isJouyou);
    const schoolGrade = normalizeSchoolGrade(body?.school_grade ?? body?.schoolGrade);
    const notes = cleanText(body?.notes) || null;
    const source = cleanText(body?.source) || "jisho+kakimashou";
    const rawStrokeCount = body?.stroke_count ?? body?.strokeCount;
    const strokeCount = rawStrokeCount === "" || rawStrokeCount == null ? null : Number(rawStrokeCount);
    const components = normalizeComponents(body?.components, radical);

    if (!kanji) {
      return NextResponse.json({ error: "Choose one kanji first." }, { status: 400 });
    }

    if (!radical) {
      return NextResponse.json({ error: "Add the radical character." }, { status: 400 });
    }

    if (strokeCount != null && (!Number.isInteger(strokeCount) || strokeCount <= 0)) {
      return NextResponse.json({ error: "Stroke count must be a positive whole number." }, { status: 400 });
    }

    const data = await upsertKanjiRadical({
      kanji,
      radical,
      radicalName,
      radicalEnglishName,
      jlptLevel,
      isJouyou,
      schoolGrade,
      strokeCount,
      notes,
      source,
      userId: auth.user.id,
    });

    const { error: deleteComponentsError } = await supabaseAdmin
      .from("kanji_components")
      .delete()
      .eq("kanji", kanji);

    if (deleteComponentsError) throw deleteComponentsError;

    if (components.length > 0) {
      const { error: insertComponentsError } = await supabaseAdmin
        .from("kanji_components")
        .insert(
          components.map((component) => ({
            kanji,
            component: component.component,
            component_name: component.component_name,
            sort_order: component.sort_order,
            updated_by: auth.user.id,
          }))
        );

      if (insertComponentsError) throw insertComponentsError;
    }

    return NextResponse.json({ ok: true, radical: data, components });
  } catch (err: any) {
    console.error("Error saving kanji radical:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not save kanji radical." },
      { status: 500 }
    );
  }
}
