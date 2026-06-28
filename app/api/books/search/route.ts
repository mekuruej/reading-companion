import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOK_SELECT =
  "id, title, author, cover_url, book_type, isbn13, publisher, published_date, page_count, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at, needs_review";

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

  const escaped = query.replaceAll("%", "\\%").replaceAll("_", "\\_");

  const [titleResponse, authorResponse] = await Promise.all([
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
  ]);

  if (titleResponse.error || authorResponse.error) {
    console.error("Book search failed:", {
      titleError: titleResponse.error,
      authorError: authorResponse.error,
    });

    return NextResponse.json(
      { error: "Could not search books." },
      { status: 500 }
    );
  }

  const booksById = new Map<string, any>();
  for (const book of [...(titleResponse.data ?? []), ...(authorResponse.data ?? [])]) {
    booksById.set(book.id, book);
  }

  const books = Array.from(booksById.values())
    .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "ja"))
    .slice(0, 12);

  return NextResponse.json({ books });
}
