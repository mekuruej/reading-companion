import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { lookupBookByIsbn13 } from "@/lib/books/bookLookup";
import { normalizeIsbn13 } from "@/lib/books/isbn";

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

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "You need to be logged in to add a book." },
      { status: auth.status }
    );
  }

  const body = await request.json().catch(() => null);
  const isbn13 = normalizeIsbn13(body?.isbn13 ?? body?.isbn ?? "");
  const mode = body?.mode === "global_only" ? "global_only" : "add_to_library";
  const targetUserId =
    typeof body?.targetUserId === "string" && body.targetUserId.trim()
      ? body.targetUserId.trim()
      : auth.user.id;

  if (!isbn13) {
    return NextResponse.json(
      { error: "Please enter a valid ISBN-13." },
      { status: 400 }
    );
  }

  const actorProfile = await getProfile(auth.user.id);
  const actorIsSuperTeacher =
    actorProfile?.role === "super_teacher" ||
    isSuperTeacherFlag(actorProfile?.is_super_teacher);

  if (mode === "global_only" && !actorIsSuperTeacher) {
    return NextResponse.json(
      { error: "Only super teachers can create global catalog books without adding them to a library." },
      { status: 403 }
    );
  }

  if (mode !== "global_only") {
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
  }

  const { data: existingBook, error: existingBookError } = await supabaseAdmin
    .from("books")
    .select("id")
    .eq("isbn13", isbn13)
    .maybeSingle();

  if (existingBookError) {
    console.error("Error checking existing book:", existingBookError);

    return NextResponse.json(
      { error: "Something went wrong while checking this book." },
      { status: 500 }
    );
  }

  let bookId = existingBook?.id ?? null;

  if (!bookId) {
    const lookupResult = await lookupBookByIsbn13(isbn13);

    if (!lookupResult) {
      return NextResponse.json(
        {
          error:
            "We couldn’t find enough information for that ISBN yet. Please request this book for review.",
        },
        { status: 404 }
      );
    }

    const authorDisplay =
      lookupResult.authors.length > 0
        ? lookupResult.authors.join("、")
        : null;

    let { data: insertedBook, error: insertBookError } = await supabaseAdmin
      .from("books")
      .insert({
        isbn13: lookupResult.isbn13,
        title: lookupResult.title,
        author: authorDisplay,
        cover_url: lookupResult.coverUrl,
        publisher: lookupResult.publisher,
        published_date: lookupResult.publishedDate,
        page_count: lookupResult.pageCount,
        metadata_source: lookupResult.source,
        needs_review: true,
      })
      .select("id")
      .single();

    if (insertBookError?.code === "42703" || insertBookError?.code === "PGRST204") {
      const retry = await supabaseAdmin
        .from("books")
        .insert({
          isbn13: lookupResult.isbn13,
          title: lookupResult.title,
          author: authorDisplay,
          cover_url: lookupResult.coverUrl,
          publisher: lookupResult.publisher,
          published_date: lookupResult.publishedDate,
          page_count: lookupResult.pageCount,
        })
        .select("id")
        .single();

      insertedBook = retry.data;
      insertBookError = retry.error;
    }

    if (insertBookError) {
      console.error("Error creating imported book:", insertBookError);

      return NextResponse.json(
        { error: "Something went wrong while creating this book." },
        { status: 500 }
      );
    }

    bookId = insertedBook.id;
  }

  if (mode === "global_only") {
    return NextResponse.json({
      userBookId: null,
      bookId,
      alreadyInLibrary: false,
      globalOnly: true,
    });
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
      { error: "Something went wrong while checking your library." },
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
    console.error("Error adding book to user library:", insertUserBookError);

    return NextResponse.json(
      { error: "Something went wrong while adding this book to your library." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    userBookId: insertedUserBook.id,
    bookId,
    alreadyInLibrary: false,
  });
}
