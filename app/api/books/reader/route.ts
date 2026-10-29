import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateUserBook } from "@/lib/books/userBookWorkspace";
import { readerFormat, readerIsbn, readerLanguage } from "@/lib/books/readerAddBook";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const positiveInteger = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2147483647 ? value : null;
const optionalCover = (value: unknown) => {
  try { const url = new URL(text(value)); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : null; }
  catch { return null; }
};

// Reader-only creation. The caller's JWT/RLS, never elevated credentials, authorizes all queries.
export async function POST(request: Request) {
  let createdBookId: string | null = null;
  try {
    const header = request.headers.get("authorization") ?? "";
    const token = header.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Enter the book details." }, { status: 400 });
    // Reject destination overrides rather than silently interpreting teacher/admin input.
    if (["targetUserId", "userId", "user_id", "destinations", "mode", "context", "studentId", "bookId"].some(key => key in body)) {
      return NextResponse.json({ error: "This action only adds a book to your own Library." }, { status: 403 });
    }
    const title = text(body.title);
    const language = readerLanguage(body.languageCode);
    const format = readerFormat(body.editionFormat);
    if (!title || title.length > 1000 || !language || !format) return NextResponse.json({ error: "Enter a title and choose a supported book language and format." }, { status: 400 });
    const rawIsbn = text(body.isbn13);
    const isbn13 = rawIsbn ? readerIsbn(rawIsbn) : null;
    const asin = text(body.asin).toUpperCase() || null;
    if ((rawIsbn && !isbn13) || (asin && !/^[A-Z0-9]{10}$/.test(asin)) || (isbn13 && asin)) return NextResponse.json({ error: "Check the book identifier." }, { status: 400 });
    async function findIdentifier() {
      if (!isbn13 && !asin) return null;
      let query = client.from("books").select("id,edition_format");
      query = isbn13 ? query.eq("isbn13", isbn13) : query.ilike("asin", asin!);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (data?.edition_format && data.edition_format !== format) throw Object.assign(new Error("This identifier belongs to another format. Add the existing edition, or use the correct identifier."), { status: 409 });
      return data?.id ?? null;
    }
    let bookId = await findIdentifier();
    if (!bookId && body.confirmDifferentEdition !== true) {
      // Literal title match (SQL wildcard characters are escaped), preserving distinct editions.
      const { data, error } = await client.from("books").select("id,title,author,cover_url,language_code,edition_format,edition_note")
        .ilike("title", title.replace(/[\\%_]/g, "\\$&")).eq("language_code", language).eq("edition_format", format).limit(5);
      if (error) throw error;
      if (data?.length) return NextResponse.json({ error: "Is one of these your edition?", possibleMatches: data, requiresConfirmation: true }, { status: 409 });
    }
    if (!bookId) {
      const metadata = body.metadata ?? {};
      const { data, error } = await client.from("books").insert({
        reader_created: true,
        title, language_code: language, edition_format: format, isbn13, asin,
        author: text(metadata.author).slice(0, 1000) || null,
        publisher: text(metadata.publisher).slice(0, 1000) || null,
        published_date: text(metadata.publishedDate).slice(0, 100) || null,
        cover_url: optionalCover(metadata.coverUrl), page_count: positiveInteger(metadata.pageCount),
      }).select("id").single();
      if (error?.code === "23505") bookId = await findIdentifier();
      else if (error) throw error;
      else { bookId = data?.id; createdBookId = bookId; }
      if (!bookId) throw new Error("Could not create this edition.");
    }
    const result = await getOrCreateUserBook({ supabase: client, userId: auth.user.id, bookId });
    return NextResponse.json({ ...result, bookId });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.status === 409 ? error.message : "Could not add this book. Your details have been kept; please retry.",
      ...(createdBookId ? { createdBookId } : {}),
    }, { status: error?.status === 409 ? 409 : 500 });
  }
}
