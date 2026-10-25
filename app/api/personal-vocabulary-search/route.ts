import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchOwnedFinalizedVocabulary } from "@/lib/personalVocabularySearchServer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Sign in to search your saved entries." }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ error: "Your session could not be verified." }, 401);
  }

  const params = new URL(request.url).searchParams;
  const userBookId = params.get("userBookId")?.trim() ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userBookId)) {
    return json({ error: "Choose a valid book." }, 400);
  }
  const { data: book, error: bookError } = await supabase.from("user_books")
    .select("id").eq("id", userBookId).eq("user_id", authData.user.id).maybeSingle();
  if (bookError) return json({ error: "Could not verify book access." }, 500);
  if (!book) return json({ error: "Book is not available." }, 404);

  const query = params.get("query")?.trim() ?? "";
  if (!query) return json({ data: [] });
  if (query.length > 100) return json({ error: "Search text is too long." }, 400);

  try {
    const data = await searchOwnedFinalizedVocabulary(supabase, authData.user.id, userBookId, query, params.get("previousLocation") === "1");
    return json({ data });
  } catch (error) {
    console.error("Personal vocabulary search failed:", error);
    return json({ error: "Could not search your saved entries." }, 500);
  }
}
