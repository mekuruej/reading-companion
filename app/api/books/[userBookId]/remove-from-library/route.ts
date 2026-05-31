import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

async function deleteRows(table: string, column: string, value: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
  return error;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userBookId } = await context.params;

  if (!userBookId) {
    return NextResponse.json(
      { error: "Missing user book id." },
      { status: 400 }
    );
  }

  const { data: userBook, error: userBookError } = await supabaseAdmin
    .from("user_books")
    .select("id, user_id")
    .eq("id", userBookId)
    .maybeSingle();

  if (userBookError) {
    console.error("Error checking user book ownership:", userBookError);
    return NextResponse.json(
      { error: "Could not check this book yet." },
      { status: 500 }
    );
  }

  if (!userBook) {
    return NextResponse.json(
      { error: "This book is not in your library." },
      { status: 404 }
    );
  }

  if (userBook.user_id !== auth.user.id) {
    return NextResponse.json(
      { error: "You can only remove books from your own library." },
      { status: 403 }
    );
  }

  const deleteSteps: Array<[table: string, column: string, value: string]> = [
    ["user_word_collocations", "user_book_id", userBookId],
    ["study_logs", "user_book_id", userBookId],
    ["user_study_events", "user_book_id", userBookId],
    ["user_alerts", "user_book_id", userBookId],
    ["user_book_characters", "user_book_id", userBookId],
    ["user_book_chapter_summaries", "user_book_id", userBookId],
    ["user_book_reading_sessions", "user_book_id", userBookId],
    ["learning_tasks", "user_book_id", userBookId],
    ["user_book_words", "user_book_id", userBookId],
  ];

  for (const [table, column, value] of deleteSteps) {
    const error = await deleteRows(table, column, value);
    if (error) {
      console.error(`Error deleting ${table} for removed library book:`, error);
      return NextResponse.json(
        { error: "Could not safely remove this book from your library yet." },
        { status: 500 }
      );
    }
  }

  const { error: deleteUserBookError } = await supabaseAdmin
    .from("user_books")
    .delete()
    .eq("id", userBookId)
    .eq("user_id", auth.user.id);

  if (deleteUserBookError) {
    console.error("Error deleting user_books row:", deleteUserBookError);
    return NextResponse.json(
      { error: "Could not remove this book from your library yet." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
