import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MetadataSource = "mekuru" | "openbd" | "google_books" | "open_library" | "none";

type LookupResponse = {
  isbn13: string;
  title: string | null;
  author_display: string | null;
  authors: string[];
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  metadata_source: MetadataSource;
  found_existing_book: boolean;
  existing_book_id: string | null;
  needs_review: boolean;
  language_code: string | null;
};

type ExternalMetadata = Omit<
  LookupResponse,
  "isbn13" | "found_existing_book" | "existing_book_id" | "needs_review" | "language_code"
>;

const EMPTY_EXTERNAL_METADATA: ExternalMetadata = {
  title: null,
  author_display: null,
  authors: [],
  cover_url: null,
  publisher: null,
  published_date: null,
  page_count: null,
  metadata_source: "none",
};

function normalizeIsbn13(value: string | null | undefined) {
  return (value ?? "").replace(/[\s-]/g, "").trim();
}

function isValidIsbn13(value: string) {
  return /^\d{13}$/.test(value);
}

function cleanString(value: unknown) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

function cleanNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function compactAuthors(values: unknown[]) {
  return values
    .flatMap((value) => String(value ?? "").split(/[、,;]/))
    .map((value) => value.trim())
    .filter((value) => !/^\(?\d{4}\s*-?\s*(?:\d{4})?\)?$/.test(value))
    .filter(Boolean);
}

function normalizeAuthorDisplay(authors: string[]) {
  return authors.length > 0 ? authors.join(", ") : null;
}

function hasAnyMetadata(metadata: ExternalMetadata) {
  return Boolean(
    metadata.title ||
      metadata.author_display ||
      metadata.cover_url ||
      metadata.publisher ||
      metadata.published_date ||
      metadata.page_count
  );
}

async function isbnFromRequest(request: Request) {
  const url = new URL(request.url);
  const queryIsbn = url.searchParams.get("isbn") ?? url.searchParams.get("isbn13");

  if (queryIsbn != null) {
    return normalizeIsbn13(queryIsbn);
  }

  if (request.method !== "POST") {
    return "";
  }

  const body = await request.json().catch(() => null);
  return normalizeIsbn13(body?.isbn13 ?? body?.isbn);
}

async function lookupMekuruBook(isbn13: string): Promise<LookupResponse | null> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select(
      "id, title, author, cover_url, publisher, published_date, page_count, isbn13, book_type, language_code"
    )
    .eq("isbn13", isbn13)
    .maybeSingle();

  if (error) {
    throw new Error(`Mekuru lookup failed: ${error.message}`);
  }

  if (!data) return null;

  const authorDisplay = cleanString(data.author);
  const authors = authorDisplay ? compactAuthors([authorDisplay]) : [];

  return {
    isbn13,
    title: cleanString(data.title),
    author_display: authorDisplay,
    authors,
    cover_url: cleanString(data.cover_url),
    publisher: cleanString(data.publisher),
    published_date: cleanString(data.published_date),
    page_count: cleanNumber(data.page_count),
    metadata_source: "mekuru",
    found_existing_book: true,
    existing_book_id: cleanString(data.id),
    needs_review: false,
    language_code: cleanString(data.language_code),
  };
}

async function lookupOpenBd(isbn13: string): Promise<ExternalMetadata | null> {
  const url = `https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn13)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`openBD lookup failed: ${response.status}`);
  }

  const json = (await response.json()) as unknown[];
  const item = Array.isArray(json) ? json[0] : null;
  if (!item) return null;

  const summary = (item as any)?.summary ?? {};
  const onix = (item as any)?.onix ?? {};
  const title = cleanString(summary.title);
  const authors = compactAuthors([summary.author]);
  const publisher = cleanString(summary.publisher);
  const publishedDate =
    cleanString(summary.pubdate) ??
    cleanString(onix?.PublishingDetail?.PublishingDate?.[0]?.Date);
  const pageCount = cleanNumber(
    onix?.DescriptiveDetail?.Extent?.find?.((extent: any) =>
      String(extent?.ExtentType ?? "") === "11"
    )?.ExtentValue
  );

  return {
    title,
    author_display: normalizeAuthorDisplay(authors),
    authors,
    cover_url: cleanString(summary.cover),
    publisher,
    published_date: publishedDate,
    page_count: pageCount,
    metadata_source: "openbd",
  };
}

async function lookupGoogleBooks(isbn13: string): Promise<ExternalMetadata | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
    isbn13
  )}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Google Books lookup failed: ${response.status}`);
  }

  const json = await response.json();
  const volumeInfo = json?.items?.[0]?.volumeInfo;
  if (!volumeInfo) return null;

  const authors = compactAuthors(volumeInfo.authors ?? []);

  return {
    title: cleanString(volumeInfo.title),
    author_display: normalizeAuthorDisplay(authors),
    authors,
    cover_url:
      cleanString(volumeInfo.imageLinks?.thumbnail)?.replace(/^http:\/\//, "https://") ??
      cleanString(volumeInfo.imageLinks?.smallThumbnail)?.replace(/^http:\/\//, "https://"),
    publisher: cleanString(volumeInfo.publisher),
    published_date: cleanString(volumeInfo.publishedDate),
    page_count: cleanNumber(volumeInfo.pageCount),
    metadata_source: "google_books",
  };
}

function openLibraryCoverUrl(isbn13: string) {
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn13)}-L.jpg`;
}

async function lookupOpenLibraryCover(isbn13: string): Promise<ExternalMetadata | null> {
  const coverUrl = openLibraryCoverUrl(isbn13);
  const response = await fetch(coverUrl, { method: "HEAD", cache: "no-store" });

  if (!response.ok) return null;

  return {
    ...EMPTY_EXTERNAL_METADATA,
    cover_url: coverUrl,
    metadata_source: "open_library",
  };
}

function responseFromExternal(isbn13: string, metadata: ExternalMetadata): LookupResponse {
  return {
    isbn13,
    title: metadata.title,
    author_display: metadata.author_display,
    authors: metadata.authors,
    cover_url: metadata.cover_url,
    publisher: metadata.publisher,
    published_date: metadata.published_date,
    page_count: metadata.page_count,
    metadata_source: metadata.metadata_source,
    found_existing_book: false,
    existing_book_id: null,
    needs_review: true,
    language_code: null,
  };
}

async function handleLookup(request: Request) {
  const isbn13 = await isbnFromRequest(request);

  if (!isValidIsbn13(isbn13)) {
    return NextResponse.json(
      { error: "Invalid ISBN-13. Use 13 digits, with optional spaces or hyphens." },
      { status: 400 }
    );
  }

  const existing = await lookupMekuruBook(isbn13);
  if (existing) {
    return NextResponse.json({ book: existing });
  }

  const externalErrors: string[] = [];
  let metadata = await lookupOpenBd(isbn13).catch((error) => {
    externalErrors.push(error?.message ?? "openBD lookup failed.");
    return null;
  });

  if (!metadata || !hasAnyMetadata(metadata)) {
    metadata = await lookupGoogleBooks(isbn13).catch((error) => {
      externalErrors.push(error?.message ?? "Google Books lookup failed.");
      return null;
    });
  }

  if (metadata && !metadata.cover_url) {
    const coverFallback = await lookupOpenLibraryCover(isbn13).catch((error) => {
      externalErrors.push(error?.message ?? "Open Library cover lookup failed.");
      return null;
    });

    if (coverFallback?.cover_url) {
      metadata = { ...metadata, cover_url: coverFallback.cover_url };
    }
  }

  if (!metadata || !hasAnyMetadata(metadata)) {
    const coverOnly = await lookupOpenLibraryCover(isbn13).catch((error) => {
      externalErrors.push(error?.message ?? "Open Library cover lookup failed.");
      return null;
    });

    if (coverOnly?.cover_url) {
      return NextResponse.json({ book: responseFromExternal(isbn13, coverOnly) });
    }

    return NextResponse.json(
      {
        error: "No metadata found for this ISBN-13.",
        isbn13,
        metadata_source: "none",
        external_errors: externalErrors,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ book: responseFromExternal(isbn13, metadata) });
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
