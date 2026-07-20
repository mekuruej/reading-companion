import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  lookupNormalizedExternalBookByIsbn13,
  normalizedLookupFromExistingBook,
} from "@/lib/books/bookLookup";
import { normalizeIsbn13 } from "@/lib/books/isbn";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isbnFromRequest(request: Request) {
  const url = new URL(request.url);
  const queryIsbn = url.searchParams.get("isbn") ?? url.searchParams.get("isbn13");

  if (queryIsbn != null) {
    return normalizeIsbn13(queryIsbn);
  }

  if (request.method !== "POST") {
    return null;
  }

  const body = await request.json().catch(() => null);
  return normalizeIsbn13(body?.isbn13 ?? body?.isbn ?? "");
}

async function lookupExistingMekuruBook(isbn13: string) {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select(
      "id, title, author, cover_url, publisher, published_date, page_count, isbn13, language_code"
    )
    .eq("isbn13", isbn13)
    .maybeSingle();

  if (error) {
    throw new Error(`Mekuru lookup failed: ${error.message}`);
  }

  if (!data) return null;

  return normalizedLookupFromExistingBook({
    id: data.id,
    isbn13,
    title: data.title,
    subtitle: null,
    author: data.author,
    cover_url: data.cover_url,
    publisher: data.publisher,
    published_date: data.published_date,
    page_count: data.page_count,
    language_code: data.language_code,
  });
}

async function handleLookup(request: Request) {
  const isbn13 = await isbnFromRequest(request);

  if (!isbn13) {
    return NextResponse.json(
      { error: "Invalid ISBN-13. Use 13 digits, with optional spaces or hyphens." },
      { status: 400 }
    );
  }

  const existing = await lookupExistingMekuruBook(isbn13);
  if (existing) {
    return NextResponse.json({ book: existing });
  }

  const external = await lookupNormalizedExternalBookByIsbn13(isbn13);
  if (external) {
    return NextResponse.json({ book: external });
  }

  return NextResponse.json(
    {
      error: "No metadata found for this ISBN-13.",
      isbn13,
      metadata_source: "none",
    },
    { status: 404 }
  );
}

export async function GET(request: Request) {
  try {
    return await handleLookup(request);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "ISBN lookup failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    return await handleLookup(request);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "ISBN lookup failed." },
      { status: 500 }
    );
  }
}
