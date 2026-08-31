import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOK_BASE_SELECT =
  "id, title, author, cover_url, book_type, isbn13, asin, publisher, published_date, page_count, language_code, edition_format, edition_note";
const BOOK_REVIEW_SELECT = `${BOOK_BASE_SELECT}, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at`;

function isMissingColumnError(error: any) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

async function runBookSearch(column: string, escapedTerm: string) {
  const fullResponse = await supabaseAdmin
    .from("books")
    .select(BOOK_REVIEW_SELECT)
    .ilike(column, `%${escapedTerm}%`)
    .order("title", { ascending: true })
    .limit(12);

  if (!isMissingColumnError(fullResponse.error)) {
    return fullResponse;
  }

  return supabaseAdmin
    .from("books")
    .select(BOOK_BASE_SELECT)
    .ilike(column, `%${escapedTerm}%`)
    .order("title", { ascending: true })
    .limit(12);
}

function escapeLikePattern(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function searchTermsForQuery(query: string) {
  const compactQuery = query.replace(/[\s　]+/g, "").trim();
  const particleParts = compactQuery
    .split(/[のなとをにはがでへもや・]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);

  return Array.from(new Set([query, ...particleParts])).filter(
    (term) => term.trim().length >= 2
  );
}

function normalizeDuplicateText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[「」『』"']/g, "")
    .trim()
    .toLowerCase();
}

function primaryTitleForDuplicate(value: string | null | undefined) {
  return normalizeDuplicateText((value ?? "").split(/[=＝]/)[0]);
}

function duplicateKey(book: any) {
  const title = primaryTitleForDuplicate(book.title);
  const author = normalizeDuplicateText(book.author);
  if (!title || !author) return `id:${book.id}`;
  return `title-author:${title}:${author}`;
}

function bookCompletenessScore(book: any) {
  let score = 0;
  if (String(book.cover_url ?? "").trim()) score += 8;
  if (String(book.book_type ?? "").trim()) score += 6;
  if (String(book.language_code ?? "").trim()) score += 4;
  if (String(book.author ?? "").trim()) score += 4;
  if (String(book.publisher ?? "").trim()) score += 3;
  if (String(book.published_date ?? "").trim()) score += 3;
  if (book.page_count != null) score += 3;
  if (String(book.isbn13 ?? "").trim()) score += 2;
  if (String(book.asin ?? "").trim()) score += 2;
  if (String(book.edition_format ?? "").trim()) score += 1;
  if (String(book.edition_note ?? "").trim()) score += 1;
  if (book.missing_info_cleared_at) score += 2;
  if (book.needs_review) score -= 4;
  return score;
}

function preferBookResult(current: any, candidate: any) {
  const currentScore = bookCompletenessScore(current);
  const candidateScore = bookCompletenessScore(candidate);
  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  return String(candidate.title ?? "").length < String(current.title ?? "").length
    ? candidate
    : current;
}

async function searchBooksByTerm(term: string) {
  const escaped = escapeLikePattern(term.trim());

  const [titleResponse, authorResponse, publisherResponse] = await Promise.all([
    runBookSearch("title", escaped),
    runBookSearch("author", escaped),
    runBookSearch("publisher", escaped),
  ]);

  const titleReadingResponse = await runBookSearch("title_reading", escaped);
  const asinResponse = /^[A-Za-z0-9]{10}$/.test(term.trim())
    ? await runBookSearch("asin", escaped.toUpperCase())
    : { data: [], error: null };

  const errors = [titleResponse.error, authorResponse.error, publisherResponse.error].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  return [
    ...(titleResponse.data ?? []),
    ...(authorResponse.data ?? []),
    ...(publisherResponse.data ?? []),
    ...(titleReadingResponse.error ? [] : titleReadingResponse.data ?? []),
    ...(asinResponse.error ? [] : asinResponse.data ?? []),
  ];
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

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "You need to be logged in to search books." },
      { status: auth.status }
    );
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const preserveEditions = url.searchParams.get("preserveEditions") === "1";

  if (!query) {
    return NextResponse.json({ books: [] });
  }

  let foundBooks: any[] = [];

  try {
    const resultGroups = await Promise.all(
      searchTermsForQuery(query).map((term) => searchBooksByTerm(term))
    );
    foundBooks = resultGroups.flat();
  } catch (searchError) {
    console.error("Book search failed:", searchError);
    return NextResponse.json(
      { error: "Could not search books." },
      { status: 500 }
    );
  }

  const booksById = new Map<string, any>();
  for (const book of foundBooks) {
    booksById.set(book.id, book);
  }

  const booksForDisplay = preserveEditions
    ? Array.from(booksById.values())
    : (() => {
        const booksByDuplicateKey = new Map<string, any>();
        for (const book of booksById.values()) {
          const key = duplicateKey(book);
          const existing = booksByDuplicateKey.get(key);
          booksByDuplicateKey.set(key, existing ? preferBookResult(existing, book) : book);
        }
        return Array.from(booksByDuplicateKey.values());
      })();

  const books = booksForDisplay
    .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "ja"))
    .slice(0, 12);

  return NextResponse.json({ books });
}
