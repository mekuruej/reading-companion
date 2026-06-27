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

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_super_teacher")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; role?: string | null; is_super_teacher?: boolean | string | null } | null;
}

async function canAddToTargetUser({
  actorId,
  targetUserId,
  actorProfile,
}: {
  actorId: string;
  targetUserId: string;
  actorProfile: { role?: string | null; is_super_teacher?: boolean | string | null } | null;
}) {
  if (actorId === targetUserId) return true;

  const isSuperTeacher =
    actorProfile?.role === "super_teacher" ||
    isSuperTeacherFlag(actorProfile?.is_super_teacher);

  if (isSuperTeacher) return true;
  if (actorProfile?.role !== "teacher") return false;

  const { data, error } = await supabaseAdmin
    .from("teacher_students")
    .select("teacher_id")
    .eq("teacher_id", actorId)
    .eq("student_id", targetUserId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

function missingGlobalBookFields(book: any) {
  if (book?.missing_info_cleared_at) return [];

  const missing: string[] = [];
  if (!String(book?.title ?? "").trim()) missing.push("title");
  if (!book?.allow_missing_isbn && !String(book?.isbn13 ?? "").trim()) missing.push("ISBN-13");
  if (!String(book?.cover_url ?? "").trim()) missing.push("cover");
  if (!String(book?.book_type ?? "").trim()) missing.push("book type");
  if (!String(book?.author ?? "").trim()) missing.push("author");
  if (!book?.allow_missing_publisher && !String(book?.publisher ?? "").trim()) missing.push("publisher");
  if (!String(book?.published_date ?? "").trim()) missing.push("published date");
  if (book?.page_count == null) missing.push("page count");
  return missing;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "You need to be logged in to add a book." },
      { status: auth.status }
    );
  }

  const body = await request.json().catch(() => null);
  const bookId = typeof body?.bookId === "string" ? body.bookId.trim() : "";
  const targetUserId =
    typeof body?.targetUserId === "string" && body.targetUserId.trim()
      ? body.targetUserId.trim()
      : auth.user.id;

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required." }, { status: 400 });
  }

  const actorProfile = await getProfile(auth.user.id);
  const canAdd = await canAddToTargetUser({
    actorId: auth.user.id,
    targetUserId,
    actorProfile,
  });

  if (!canAdd) {
    return NextResponse.json(
      { error: "You do not have permission to add books to that user." },
      { status: 403 }
    );
  }

  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select(
      "id, title, author, cover_url, book_type, isbn13, publisher, published_date, page_count, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at, needs_review"
    )
    .eq("id", bookId)
    .maybeSingle();

  if (bookError) {
    console.error("Error loading existing book:", bookError);
    return NextResponse.json(
      { error: "Something went wrong while checking this book." },
      { status: 500 }
    );
  }

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const missingFields = missingGlobalBookFields(book);
  if (book.needs_review || missingFields.length > 0) {
    return NextResponse.json(
      {
        error: "This book needs review before it can be added directly.",
        missingFields,
      },
      { status: 409 }
    );
  }

  const { data: existingUserBook, error: existingUserBookError } =
    await supabaseAdmin
      .from("user_books")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("book_id", bookId)
      .maybeSingle();

  if (existingUserBookError) {
    console.error("Error checking user library:", existingUserBookError);
    return NextResponse.json(
      { error: "Something went wrong while checking the library." },
      { status: 500 }
    );
  }

  if (existingUserBook) {
    return NextResponse.json({
      userBookId: existingUserBook.id,
      bookId,
      alreadyInLibrary: true,
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: insertedUserBook, error: insertUserBookError } = await supabaseAdmin
    .from("user_books")
    .insert({
      user_id: targetUserId,
      book_id: bookId,
      started_at: today,
    })
    .select("id")
    .single();

  if (insertUserBookError) {
    console.error("Error adding existing book to user library:", insertUserBookError);
    return NextResponse.json(
      { error: "Something went wrong while adding this book to the library." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    userBookId: insertedUserBook.id,
    bookId,
    alreadyInLibrary: false,
  });
}
