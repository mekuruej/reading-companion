import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyword = (searchParams.get("keyword") ?? "").trim();

  if (!keyword) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`;

  const res = await fetch(url, {
    // avoid caching weirdness during dev
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
  return NextResponse.json(json, { status: 200 });
}
