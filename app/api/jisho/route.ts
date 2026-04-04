import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = (searchParams.get("keyword") ?? "").trim();

  if (!keyword) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const { data: cached, error: cacheError } = await supabase
    .from("vocabulary_cache")
    .select("*")
    .eq("surface", keyword);

  if (cacheError) {
    console.error("Cache lookup error:", cacheError);
  }

  if (cached && cached.length > 0) {
    return NextResponse.json(
      {
        data: cached.map((row) => ({
          slug: row.surface,
          japanese: [
            {
              word: row.surface,
              reading: row.reading,
            },
          ],
          senses: row.senses_json,
          is_common: row.is_common,
          jlpt: row.jlpt ? [row.jlpt] : [],
        })),
        from_cache: true,
      },
      { status: 200 }
    );
  }

  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "reading-companion-dev",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Jisho request failed (${res.status})` },
      { status: 500 }
    );
  }

  const json = await res.json();

  const rows =
    (json.data ?? [])
      .map((entry: any) => {
        const japanese = Array.isArray(entry.japanese) ? entry.japanese[0] ?? {} : {};
        const surface = japanese.word ?? keyword;
        const reading = japanese.reading ?? null;

        if (!surface || !reading) return null;

        return {
          surface,
          reading,
          lookup_key: keyword,
          is_common: !!entry.is_common,
          jlpt: Array.isArray(entry.jlpt) && entry.jlpt.length > 0
            ? String(entry.jlpt[0]).replace(/^jlpt-/i, "").toUpperCase()
            : null,
          senses_json: Array.isArray(entry.senses) ? entry.senses : [],
          raw_json: entry,
          source: "jisho",
        };
      })
      .filter(Boolean) ?? [];

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("vocabulary_cache")
      .upsert(rows, { onConflict: "surface,reading" });

    if (upsertError) {
      console.error("Cache upsert error:", upsertError);
    }
  }

  return NextResponse.json(json, { status: 200 });
}