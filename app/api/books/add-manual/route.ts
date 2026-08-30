import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { normalizeBookLanguageCode } from "@/lib/books/bookLanguage";
import { isValidAsin, normalizeAsin } from "@/lib/books/asin";
import { normalizeIsbn13 } from "@/lib/books/isbn";
import {
  ensureStudentLessonBook,
  StudentLessonBookError,
} from "@/lib/teacher/studentLessonBooks";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EDITION_FORMATS = new Set([
  "bunko",
  "tankobon_hardcover",
  "tankobon_softcover",
  "paperback",
  "hardcover",
  "ebook",
  "audiobook",
  "other",
]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalText(value: unknown) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function cleanPageCount(value: unknown) {
  if (value == null || value === "") return { value: null };

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return { error: "Page count must be a positive whole number." };
  }

  return { value: numberValue };
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

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isElevatedCatalogUser(profile: { role?: string | null; is_super_teacher?: boolean | string | null } | null) {
  return (
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_super_teacher")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    role?: string | null;
    is_super_teacher?: boolean | string | null;
  } | null;
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

  if (isSuperTeacher) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }
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

async function addBookToLibrary({
  authUserId,
  targetUserId,
  bookId,
  actorProfile,
  isStudentLessonBookContext,
  studentId,
}: {
  authUserId: string;
  targetUserId: string;
  bookId: string;
  actorProfile: { role?: string | null; is_super_teacher?: boolean | string | null } | null;
  isStudentLessonBookContext: boolean;
  studentId: string;
}) {
  const { data: existingUserBook, error: existingUserBookError } =
    await supabaseAdmin
      .from("user_books")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("book_id", bookId)
      .maybeSingle();

  if (existingUserBookError) throw existingUserBookError;

  let userBookId = existingUserBook?.id ?? null;
  let alreadyInLibrary = Boolean(existingUserBook);

  if (!userBookId) {
    const { data: insertedUserBook, error: insertUserBookError } = await supabaseAdmin
      .from("user_books")
      .insert({
        user_id: targetUserId,
        book_id: bookId,
      })
      .select("id")
      .single();

    if (insertUserBookError) throw insertUserBookError;
    userBookId = insertedUserBook.id;
    alreadyInLibrary = false;
  }

  let lessonBook = null;

  if (isStudentLessonBookContext) {
    lessonBook = await ensureStudentLessonBook({
      supabase: supabaseAdmin,
      teacherId: authUserId,
      studentId,
      userBookId,
      teacherProfile: actorProfile,
    });
  }

  return {
    userBookId,
    alreadyInLibrary,
    lessonBook,
  };
}

async function addBookToTeacherAndStudentLibraries({
  authUserId,
  studentUserId,
  bookId,
  actorProfile,
}: {
  authUserId: string;
  studentUserId: string;
  bookId: string;
  actorProfile: { role?: string | null; is_super_teacher?: boolean | string | null } | null;
}) {
  const canAddToStudent = await canAddToTargetUser({
    actorId: authUserId,
    targetUserId: studentUserId,
    actorProfile,
  });

  if (!canAddToStudent) {
    const error = new Error("You do not have permission to add books to that student.");
    (error as any).status = 403;
    throw error;
  }

  const teacherResult = await addBookToLibrary({
    authUserId,
    targetUserId: authUserId,
    bookId,
    actorProfile,
    isStudentLessonBookContext: false,
    studentId: "",
  });
  const studentResult = await addBookToLibrary({
    authUserId,
    targetUserId: studentUserId,
    bookId,
    actorProfile,
    isStudentLessonBookContext: false,
    studentId: "",
  });

  return {
    teacherUserBookId: teacherResult.userBookId,
    studentUserBookId: studentResult.userBookId,
    userBookId: studentResult.userBookId,
    alreadyInTeacherLibrary: teacherResult.alreadyInLibrary,
    alreadyInStudentLibrary: studentResult.alreadyInLibrary,
    alreadyInLibrary: studentResult.alreadyInLibrary,
  };
}

async function findIdentifierBook({
  isbn13,
  asin,
}: {
  isbn13: string | null;
  asin: string | null;
}) {
  if (isbn13) {
    const { data, error } = await supabaseAdmin
      .from("books")
      .select("id")
      .eq("isbn13", isbn13)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  if (asin) {
    const { data, error } = await supabaseAdmin
      .from("books")
      .select("id")
      .eq("asin", asin)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  return null;
}

async function findPossibleMatches({
  title,
  author,
  languageCode,
  editionFormat,
}: {
  title: string;
  author: string;
  languageCode: string;
  editionFormat: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id, title, author, cover_url, book_type, isbn13, asin, publisher, published_date, page_count, language_code")
    .ilike("title", title)
    .eq("language_code", languageCode)
    .eq("edition_format", editionFormat)
    .limit(5);

  if (error) throw error;

  return (data ?? []).filter((book: any) => {
    if (!author) return true;
    return String(book.author ?? "").trim().toLowerCase() === author.toLowerCase();
  });
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json(
        { error: "You need to be logged in to add a book." },
        { status: auth.status }
      );
    }

    const body = await request.json().catch(() => null);
    const title = cleanText(body?.title);
    const author = cleanText(body?.author);
    const isbn13 = normalizeIsbn13(body?.isbn13 ?? body?.isbn ?? "") || null;
    const rawAsin = normalizeAsin(body?.asin);
    const asin = rawAsin || null;
    const languageCode = normalizeBookLanguageCode(body?.languageCode ?? body?.language_code);
    const editionFormat = cleanOptionalText(body?.editionFormat ?? body?.edition_format);
    const editionNote =
      editionFormat === "other"
        ? cleanOptionalText(body?.editionNote ?? body?.edition_note)
        : null;
    const pageCountResult = cleanPageCount(body?.pageCount ?? body?.page_count);
    const confirmDifferentEdition = body?.confirmDifferentEdition === true;
    const mode =
      body?.mode === "global_only"
        ? "global_only"
        : body?.mode === "teacher_and_student"
        ? "teacher_and_student"
        : "add_to_library";
    const context = cleanText(body?.context);
    const studentId = cleanText(body?.studentId);
    const targetUserId =
      cleanText(body?.targetUserId) || auth.user.id;
    const isStudentLessonBookContext = context === "student-lesson-book";

    if (pageCountResult.error) {
      return NextResponse.json({ error: pageCountResult.error }, { status: 400 });
    }

    if (asin && !isValidAsin(asin)) {
      return NextResponse.json(
        { error: "Amazon ASIN must be exactly 10 letters or numbers." },
        { status: 400 }
      );
    }

    if (isStudentLessonBookContext && (!studentId || targetUserId !== studentId)) {
      return NextResponse.json(
        { error: "Student lesson book context is incomplete." },
        { status: 400 }
      );
    }

    const actorProfile = await getProfile(auth.user.id);
    if (isStudentLessonBookContext && mode !== "add_to_library") {
      return NextResponse.json(
        { error: "Student lesson book context cannot use this add mode." },
        { status: 400 }
      );
    }

    if (mode === "global_only" && !isElevatedCatalogUser(actorProfile)) {
      return NextResponse.json(
        { error: "Only super teachers can create global catalog books without adding them to a library." },
        { status: 403 }
      );
    }

    if (mode === "teacher_and_student" && targetUserId === auth.user.id) {
      return NextResponse.json(
        { error: "Choose a student before adding this book." },
        { status: 400 }
      );
    }

    if (mode === "add_to_library") {
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

    const existingIdentifierBookId = await findIdentifierBook({ isbn13, asin });
    if (existingIdentifierBookId) {
      if (mode === "global_only") {
        return NextResponse.json({
          userBookId: null,
          bookId: existingIdentifierBookId,
          alreadyInLibrary: false,
          globalOnly: true,
        });
      }

      if (mode === "teacher_and_student") {
        const libraryResult = await addBookToTeacherAndStudentLibraries({
          authUserId: auth.user.id,
          studentUserId: targetUserId,
          bookId: existingIdentifierBookId,
          actorProfile,
        });

        return NextResponse.json({
          ...libraryResult,
          bookId: existingIdentifierBookId,
          teacherAndStudent: true,
        });
      }

      const libraryResult = await addBookToLibrary({
        authUserId: auth.user.id,
        targetUserId,
        bookId: existingIdentifierBookId,
        actorProfile,
        isStudentLessonBookContext,
        studentId,
      });

      return NextResponse.json({
        ...libraryResult,
        bookId: existingIdentifierBookId,
      });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!languageCode) {
      return NextResponse.json(
        { error: "Choose the language of this edition." },
        { status: 400 }
      );
    }

    const isIdentifierBacked = Boolean(isbn13 || asin);
    if (!isIdentifierBacked && !author) {
      return NextResponse.json({ error: "Author is required." }, { status: 400 });
    }

    if (!isIdentifierBacked && !editionFormat) {
      return NextResponse.json({ error: "Format is required." }, { status: 400 });
    }

    if (editionFormat && !EDITION_FORMATS.has(editionFormat)) {
      return NextResponse.json({ error: "Choose a valid edition format." }, { status: 400 });
    }

    if (!isIdentifierBacked && !confirmDifferentEdition) {
      const possibleMatches = await findPossibleMatches({
        title,
        author,
        languageCode,
        editionFormat: editionFormat as string,
      });

      if (possibleMatches.length > 0) {
        return NextResponse.json(
          {
            error: "We found a possible match.",
            possibleMatches,
            requiresConfirmation: true,
          },
          { status: 409 }
        );
      }
    }

    let { data: insertedBook, error: insertBookError } = await supabaseAdmin
      .from("books")
      .insert({
        title,
        author: author || null,
        isbn13,
        asin,
        language_code: languageCode,
        edition_format: editionFormat,
        edition_note: editionNote,
        page_count: pageCountResult.value,
        allow_missing_isbn: !isbn13 && !asin,
        needs_review: true,
      })
      .select("id")
      .single();

    if (insertBookError?.code === "42703" || insertBookError?.code === "PGRST204") {
      const retry = await supabaseAdmin
        .from("books")
        .insert({
          title,
          author: author || null,
          isbn13,
          asin,
          language_code: languageCode,
          edition_format: editionFormat,
          edition_note: editionNote,
          page_count: pageCountResult.value,
        })
        .select("id")
        .single();

      insertedBook = retry.data;
      insertBookError = retry.error;
    }

    let bookId = insertedBook?.id as string | undefined;

    if (insertBookError?.code === "23505") {
      bookId = await findIdentifierBook({ isbn13, asin }) ?? undefined;
    } else if (insertBookError) {
      console.error("Error creating manual book:", insertBookError);
      return NextResponse.json(
        { error: "Something went wrong while creating this book." },
        { status: 500 }
      );
    }

    if (!bookId) {
      return NextResponse.json(
        { error: "Something went wrong while creating this book." },
        { status: 500 }
      );
    }

    if (mode === "global_only") {
      return NextResponse.json({
        userBookId: null,
        bookId,
        alreadyInLibrary: false,
        globalOnly: true,
      });
    }

    if (mode === "teacher_and_student") {
      const libraryResult = await addBookToTeacherAndStudentLibraries({
        authUserId: auth.user.id,
        studentUserId: targetUserId,
        bookId,
        actorProfile,
      });

      return NextResponse.json({
        ...libraryResult,
        bookId,
        teacherAndStudent: true,
      });
    }

    const libraryResult = await addBookToLibrary({
      authUserId: auth.user.id,
      targetUserId,
      bookId,
      actorProfile,
      isStudentLessonBookContext,
      studentId,
    });

    return NextResponse.json({
      ...libraryResult,
      bookId,
    });
  } catch (error) {
    if (error instanceof StudentLessonBookError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if ((error as any)?.status) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: (error as any).status }
      );
    }

    console.error("Manual add failed:", error);
    return NextResponse.json(
      { error: "Something went wrong while adding this book." },
      { status: 500 }
    );
  }
}
