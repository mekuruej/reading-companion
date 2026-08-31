import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ensureStudentLessonBook,
  StudentLessonBookError,
} from "@/lib/teacher/studentLessonBooks";
import { applyAddBookDestinations } from "@/lib/books/addBookDestinations";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOK_BASE_SELECT =
  "id, title, author, cover_url, book_type, isbn13, asin, publisher, published_date, page_count, language_code";
const BOOK_REVIEW_SELECT = `${BOOK_BASE_SELECT}, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at`;

function isMissingColumnError(error: any) {
  return error?.code === "42703" || error?.code === "PGRST204";
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
    profile?.role === "admin" ||
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

async function getBookForDirectAdd(bookId: string) {
  const fullResponse = await supabaseAdmin
    .from("books")
    .select(BOOK_REVIEW_SELECT)
    .eq("id", bookId)
    .maybeSingle();

  if (!isMissingColumnError(fullResponse.error)) {
    return fullResponse;
  }

  return supabaseAdmin
    .from("books")
    .select(BOOK_BASE_SELECT)
    .eq("id", bookId)
    .maybeSingle();
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
        personal_tracking_status: "want_to_read",
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
  const bookId = typeof body?.bookId === "string" ? body.bookId.trim() : "";
  const mode =
    body?.mode === "global_only"
      ? "global_only"
      : body?.mode === "teacher_and_student"
      ? "teacher_and_student"
      : "add_to_library";
  const context = typeof body?.context === "string" ? body.context.trim() : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
  const targetUserId =
    typeof body?.targetUserId === "string" && body.targetUserId.trim()
      ? body.targetUserId.trim()
      : auth.user.id;
  const isStudentLessonBookContext = context === "student-lesson-book";

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required." }, { status: 400 });
  }

  if (isStudentLessonBookContext && (!studentId || targetUserId !== studentId)) {
    return NextResponse.json(
      { error: "Student lesson book context is incomplete." },
      { status: 400 }
    );
  }

  if (isStudentLessonBookContext && mode !== "add_to_library") {
    return NextResponse.json(
      { error: "Student lesson book context cannot use this add mode." },
      { status: 400 }
    );
  }

  const actorProfile = await getProfile(auth.user.id);

  if (mode === "global_only" && !isElevatedCatalogUser(actorProfile)) {
    return NextResponse.json(
      { error: "Only super teachers and admins can add to the MEKURU Catalog only." },
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

  const { data: book, error: bookError } = await getBookForDirectAdd(bookId);

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

  const libraryResult = await applyAddBookDestinations({
    supabase: supabaseAdmin,
    authUserId: auth.user.id,
    actorProfile,
    bookId,
    input: {
      mode,
      destinations: body?.destinations,
      targetUserId,
      context,
      studentId,
    },
    createStudentLessonBook: (userBookId) =>
      ensureStudentLessonBook({
        supabase: supabaseAdmin,
        teacherId: auth.user.id,
        studentId,
        userBookId,
        teacherProfile: actorProfile,
      }),
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

    console.error("Add existing book failed:", error);
    return NextResponse.json(
      { error: "Something went wrong while adding this book." },
      { status: 500 }
    );
  }
}
