import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOK_SELECT =
  "id, title, author, cover_url, book_type, isbn13, publisher, published_date, page_count";

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

async function searchBooksByTerm(term: string) {
  const escaped = escapeLikePattern(term.trim());

  const [titleResponse, authorResponse, titleReadingResponse] = await Promise.all([
    supabaseAdmin
      .from("books")
      .select(BOOK_SELECT)
      .ilike("title", `%${escaped}%`)
      .order("title", { ascending: true })
      .limit(12),
    supabaseAdmin
      .from("books")
      .select(BOOK_SELECT)
      .ilike("author", `%${escaped}%`)
      .order("title", { ascending: true })
      .limit(12),
    supabaseAdmin
      .from("books")
      .select(BOOK_SELECT)
      .ilike("title_reading", `%${escaped}%`)
      .order("title", { ascending: true })
      .limit(12),
  ]);

  const errors = [
    titleResponse.error,
    authorResponse.error,
    titleReadingResponse.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  return [
    ...(titleResponse.data ?? []),
    ...(authorResponse.data ?? []),
    ...(titleReadingResponse.data ?? []),
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

  const books = Array.from(booksById.values())
    .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "ja"))
    .slice(0, 12);

  return NextResponse.json({ books });
}
