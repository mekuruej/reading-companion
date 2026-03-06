// app/api/book-lookup/route.ts
import { NextResponse } from "next/server";

function digitsOnly(s: string) {
  return (s ?? "").replace(/[^0-9]/g, "").trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const isbnRaw = url.searchParams.get("isbn") ?? "";
  const isbn = digitsOnly(isbnRaw);

  if (!isbn) {
    return NextResponse.json({ error: "Missing isbn" }, { status: 400 });
  }

  // openBD supports ISBN-10/13, but we mainly use 13
  const openbdUrl = `https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn)}`;

  try {
    const res = await fetch(openbdUrl, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `openBD error: ${res.status}` }, { status: 502 });
    }

    const arr = (await res.json()) as any[];
    const item = Array.isArray(arr) ? arr[0] : null;

    if (!item) {
      return NextResponse.json({ found: false, isbn });
    }

    const summary = item?.summary ?? {};
    const title = (summary?.title ?? "").toString().trim();
    const author = (summary?.author ?? "").toString().trim();
    const publisher = (summary?.publisher ?? "").toString().trim();
    const cover_url = (summary?.cover ?? "").toString().trim();
    const pubdate = (summary?.pubdate ?? "").toString().trim(); // sometimes useful later

    return NextResponse.json({
      found: true,
      isbn,
      title: title || null,
      author: author || null,
      publisher: publisher || null,
      cover_url: cover_url || null,
      pubdate: pubdate || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Lookup failed" },
      { status: 500 }
    );
  }
}