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

    const { data: mapRows, error: mapError } = await supabaseAdmin
      .from("vocabulary_kanji_map")
      .select("kanji, excluded_from_kanji_practice, flagged_for_review")
      .not("kanji", "is", null)
      .limit(10000);

    if (mapError) throw mapError;

    const countsByKanji = new Map<string, number>();
    for (const row of (mapRows ?? []) as KanjiMapRadicalSourceRow[]) {
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
      const [radicalResult, componentResult] = await Promise.all([
        supabaseAdmin
          .from("kanji_radicals")
          .select("kanji, radical, radical_name, stroke_count, notes, source, updated_at")
          .in("kanji", chunk),
        supabaseAdmin
          .from("kanji_components")
          .select("kanji, component, component_name, sort_order")
          .in("kanji", chunk)
          .order("sort_order", { ascending: true }),
      ]);

      if (radicalResult.error) throw radicalResult.error;
      if (componentResult.error) throw componentResult.error;

      for (const row of (radicalResult.data ?? []) as KanjiRadicalRow[]) {
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
    const notes = cleanText(body?.notes) || null;
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

    const { data, error } = await supabaseAdmin
      .from("kanji_radicals")
      .upsert(
        {
          kanji,
          radical,
          radical_name: radicalName,
          stroke_count: strokeCount,
          notes,
          source: "mekuru_teacher",
          updated_at: new Date().toISOString(),
          updated_by: auth.user.id,
        },
        { onConflict: "kanji" }
      )
      .select("kanji, radical, radical_name, stroke_count, notes, source, updated_at")
      .single();

    if (error) throw error;

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
