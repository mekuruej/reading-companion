import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  canTeacherAccessStudent,
  ensureStudentLessonBook,
  StudentLessonBookError,
} from "@/lib/teacher/studentLessonBooks";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  role?: string | null;
  is_super_teacher?: boolean | string | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isSuperTeacher(profile: ProfileRow | null) {
  return (
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

function isTeacher(profile: ProfileRow | null) {
  return profile?.role === "teacher" || isSuperTeacher(profile);
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: "Missing session.", status: 401 as const };
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return { error: "Invalid session.", status: 401 as const };
  }

  return { user };
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_super_teacher")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow | null;
}

async function authorizeTeacherForStudent(actorId: string, studentId: string) {
  const profile = await getProfile(actorId);

  if (!isTeacher(profile)) {
    return {
      ok: false as const,
      error: "Teacher access is required.",
      status: 403,
    };
  }

  const canAccess = await canTeacherAccessStudent({
    supabase: supabaseAdmin,
    teacherId: actorId,
    studentId,
    teacherProfile: profile,
  });

  if (!canAccess) {
    return {
      ok: false as const,
      error: "You do not have access to this student.",
      status: 403,
    };
  }

  return { ok: true as const, profile };
}

async function ensureStudentBook(studentId: string, userBookId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_books")
    .select("id, user_id")
    .eq("id", userBookId)
    .maybeSingle();

  if (error) throw error;

  if (!data || (data as any).user_id !== studentId) {
    return false;
  }

  return true;
}

async function findOrCreateStudentBook(studentId: string, bookId: string) {
  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id")
    .eq("id", bookId)
    .maybeSingle();

  if (bookError) throw bookError;
  if (!book) {
    return { error: "Book could not be found.", status: 404 as const };
  }

  const { data: existingUserBook, error: existingUserBookError } = await supabaseAdmin
    .from("user_books")
    .select("id")
    .eq("user_id", studentId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existingUserBookError) throw existingUserBookError;
  if (existingUserBook?.id) {
    return { userBookId: existingUserBook.id as string, createdUserBook: false };
  }

  const { data: insertedUserBook, error: insertUserBookError } = await supabaseAdmin
    .from("user_books")
    .insert({
      user_id: studentId,
      book_id: bookId,
    })
    .select("id")
    .single();

  if (insertUserBookError) throw insertUserBookError;

  return { userBookId: insertedUserBook.id as string, createdUserBook: true };
}

function readingStatus(row: any) {
  if (row?.dnf_at) return "DNF";
  if (row?.finished_at) return "Finished";
  if (row?.started_at) return "Reading";
  return "Not started";
}

const LESSON_DAY_VALUES = new Set([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

async function loadReadingSummaries(userBookIds: string[]) {
  if (userBookIds.length === 0) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from("user_book_reading_sessions")
    .select("user_book_id, read_on, start_page, end_page")
    .in("user_book_id", userBookIds)
    .order("read_on", { ascending: false });

  if (error) {
    console.error("Error loading workspace reading summaries:", error);
    return new Map<string, any>();
  }

  const summaries = new Map<string, any>();

  for (const row of data ?? []) {
    const userBookId = (row as any).user_book_id as string | null;
    if (!userBookId) continue;

    const current = summaries.get(userBookId) ?? {
      lastReadOn: null,
      furthestPage: null,
    };

    if (!current.lastReadOn && (row as any).read_on) {
      current.lastReadOn = (row as any).read_on;
    }

    const endPage = Number((row as any).end_page);
    if (Number.isFinite(endPage)) {
      current.furthestPage =
        current.furthestPage == null ? endPage : Math.max(current.furthestPage, endPage);
    }

    summaries.set(userBookId, current);
  }

  return summaries;
}

function normalizeUserBook(row: any, readingSummary: any = null) {
  const userBook = row?.user_books ?? row;
  const book = Array.isArray(userBook?.books) ? userBook.books[0] : userBook?.books;

  return {
    id: userBook?.id,
    bookId: userBook?.book_id ?? book?.id ?? null,
    title: book?.title ?? "Untitled book",
    author: book?.author ?? null,
    coverUrl: book?.cover_url ?? null,
    bookType: book?.book_type ?? null,
    languageCode: book?.language_code ?? null,
    pageCount: book?.page_count ?? null,
    startedAt: userBook?.started_at ?? null,
    finishedAt: userBook?.finished_at ?? null,
    dnfAt: userBook?.dnf_at ?? null,
    statusLabel: readingStatus(userBook),
    lastReadOn: readingSummary?.lastReadOn ?? null,
    furthestPage: readingSummary?.furthestPage ?? null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim() ?? "";

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required." }, { status: 400 });
    }

    const authorization = await authorizeTeacherForStudent(auth.user.id, studentId);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, level, lesson_day, app_access_type, app_access_expires_at")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) throw studentError;

    if (!student) {
      return NextResponse.json({ error: "Student could not be found." }, { status: 404 });
    }

    const { data: relationship, error: relationshipError } = await supabaseAdmin
      .from("teacher_students")
      .select("relationship_status, archived_at")
      .eq("student_id", studentId)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (relationshipError) throw relationshipError;

    const { data: lessonRows, error: lessonError } = await supabaseAdmin
      .from("teacher_student_lesson_books")
      .select(
        `
        id,
        teacher_id,
        student_id,
        user_book_id,
        status,
        added_at,
        removed_at,
        updated_at,
        user_books:user_book_id (
          id,
          user_id,
          book_id,
          started_at,
          finished_at,
          dnf_at,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type,
            language_code,
            page_count
          )
        )
      `
      )
      .eq("teacher_id", auth.user.id)
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (lessonError) throw lessonError;

    const activeUserBookIds = ((lessonRows ?? []) as any[])
      .map((row) => row.user_book_id as string | null)
      .filter(Boolean) as string[];
    const readingSummaries = await loadReadingSummaries(activeUserBookIds);

    const activeLessonBooks = ((lessonRows ?? []) as any[]).map((row) => ({
      id: row.id,
      userBookId: row.user_book_id,
      status: row.status,
      addedAt: row.added_at,
      removedAt: row.removed_at,
      updatedAt: row.updated_at,
      book: normalizeUserBook(row, readingSummaries.get(row.user_book_id)),
    }));

    const { data: libraryRows, error: libraryError } = await supabaseAdmin
      .from("user_books")
      .select(
        `
        id,
        user_id,
        book_id,
        started_at,
        finished_at,
        dnf_at,
        books:book_id (
          id,
          title,
          author,
          cover_url,
          book_type,
          language_code,
          page_count
        )
      `
      )
      .eq("user_id", studentId)
      .order("created_at", { ascending: false });

    if (libraryError) throw libraryError;

    const activeSet = new Set(activeUserBookIds);
    const allReadingSummaries = await loadReadingSummaries(
      ((libraryRows ?? []) as any[]).map((row) => row.id as string)
    );
    const lastEngagedAt =
      Array.from(allReadingSummaries.values())
        .map((summary) => summary.lastReadOn as string | null)
        .filter(Boolean)
        .sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null;

    const eligibleBooks = ((libraryRows ?? []) as any[])
      .filter((row) => !activeSet.has(row.id))
      .map((row) => normalizeUserBook(row));

    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("live_lesson_capture_sessions")
      .select(
        `
        id,
        status,
        user_book_id,
        started_at,
        ended_adding_at,
        review_deferred_at,
        updated_at,
        user_books:user_book_id (
          id,
          books:book_id (
            title,
            cover_url
          )
        )
      `
      )
      .eq("teacher_id", auth.user.id)
      .eq("student_id", studentId)
      .in("status", ["reviewing", "deferred"])
      .order("updated_at", { ascending: false });

    if (sessionsError) throw sessionsError;

    const sessionIds = ((sessions ?? []) as any[]).map((row) => row.id as string);
    const wordCounts = new Map<string, number>();

    for (const sessionId of sessionIds) {
      const { count, error: countError } = await supabaseAdmin
        .from("live_lesson_capture_session_words")
        .select("session_id", { count: "exact", head: true })
        .eq("session_id", sessionId);

      if (countError) {
        console.error("Error counting Live Lesson session words:", countError);
      } else {
        wordCounts.set(sessionId, count ?? 0);
      }
    }

    const needsAttention = ((sessions ?? []) as any[]).map((session) => {
      const userBook = Array.isArray(session.user_books)
        ? session.user_books[0]
        : session.user_books;
      const book = Array.isArray(userBook?.books) ? userBook.books[0] : userBook?.books;

      return {
        id: session.id,
        status: session.status,
        userBookId: session.user_book_id,
        bookTitle: book?.title ?? "Student book",
        bookCoverUrl: book?.cover_url ?? null,
        startedAt: session.started_at,
        endedAddingAt: session.ended_adding_at,
        reviewDeferredAt: session.review_deferred_at,
        updatedAt: session.updated_at,
        wordCount: wordCounts.get(session.id) ?? 0,
      };
    });

    const { data: bookRequests, error: bookRequestsError } = await supabaseAdmin
      .from("book_requests")
      .select(
        `
        id,
        title,
        author,
        isbn13,
        status,
        created_at,
        user_id
      `
      )
      .eq("user_id", studentId)
      .or("status.eq.pending,status.is.null")
      .order("created_at", { ascending: false });

    if (bookRequestsError) throw bookRequestsError;

    const { data: missingRatingRows, error: missingRatingError } = await supabaseAdmin
      .from("user_books")
      .select(
        `
        id,
        user_id,
        finished_at,
        dnf_at,
        rating_overall,
        rating_difficulty,
        teacher_review_cleared_at,
        books:book_id (
          title,
          cover_url
        )
      `
      )
      .eq("user_id", studentId)
      .not("finished_at", "is", null)
      .is("dnf_at", null)
      .is("teacher_review_cleared_at", null)
      .order("finished_at", { ascending: false });

    if (missingRatingError) throw missingRatingError;

    const ratingFollowUps = ((missingRatingRows ?? []) as any[])
      .map((row) => {
        const book = Array.isArray(row.books) ? row.books[0] : row.books;
        const missingRatings = [
          row.rating_overall == null ? "entertainment" : null,
          row.rating_difficulty == null ? "difficulty" : null,
        ].filter(Boolean) as string[];

        return {
          id: row.id,
          userBookId: row.id,
          bookTitle: book?.title ?? "Untitled book",
          bookCoverUrl: book?.cover_url ?? null,
          finishedAt: row.finished_at ?? null,
          missingRatings,
        };
      })
      .filter((item) => item.missingRatings.length > 0);

    return NextResponse.json({
      student,
      relationship: relationship ?? null,
      lastEngagedAt,
      activeLessonBooks,
      eligibleBooks,
      needsAttention,
      bookRequests: ((bookRequests ?? []) as any[]).map((request) => ({
        id: request.id,
        title: request.title ?? null,
        author: request.author ?? null,
        isbn13: request.isbn13 ?? null,
        status: request.status ?? null,
        createdAt: request.created_at ?? null,
        userId: request.user_id ?? null,
      })),
      ratingFollowUps,
    });
  } catch (error: any) {
    console.error("Student Workspace load error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load the Student Workspace." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
    let userBookId = typeof body?.userBookId === "string" ? body.userBookId.trim() : "";
    const bookId = typeof body?.bookId === "string" ? body.bookId.trim() : "";

    if (!studentId || (!userBookId && !bookId)) {
      return NextResponse.json(
        { error: "studentId and userBookId or bookId are required." },
        { status: 400 }
      );
    }

    const authorization = await authorizeTeacherForStudent(auth.user.id, studentId);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    let createdUserBook = false;
    if (!userBookId && bookId) {
      const studentBook = await findOrCreateStudentBook(studentId, bookId);

      if ("error" in studentBook) {
        return NextResponse.json(
          { error: studentBook.error },
          { status: studentBook.status }
        );
      }

      userBookId = studentBook.userBookId;
      createdUserBook = studentBook.createdUserBook;
    }

    const lessonBook = await ensureStudentLessonBook({
      supabase: supabaseAdmin,
      teacherId: auth.user.id,
      studentId,
      userBookId,
      teacherProfile: authorization.profile,
    });

    return NextResponse.json({
      ok: true,
      relationshipId: lessonBook.relationshipId,
      userBookId: lessonBook.userBookId,
      createdUserBook,
    });
  } catch (error: any) {
    console.error("Student Workspace add error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not add this lesson book." },
      { status: error instanceof StudentLessonBookError ? error.status : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
    const userBookId = typeof body?.userBookId === "string" ? body.userBookId.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";

    if (!studentId || !action) {
      return NextResponse.json(
        { error: "studentId and action are required." },
        { status: 400 }
      );
    }

    const authorization = await authorizeTeacherForStudent(auth.user.id, studentId);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    if (action === "update-lesson-day") {
      const rawLessonDay =
        typeof body?.lessonDay === "string" ? body.lessonDay.trim().toLowerCase() : "";
      const lessonDay = rawLessonDay || null;

      if (lessonDay && !LESSON_DAY_VALUES.has(lessonDay)) {
        return NextResponse.json(
          { error: "Lesson day must be a weekday." },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ lesson_day: lessonDay })
        .eq("id", studentId)
        .select("id, lesson_day")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          { error: "Student could not be found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        lessonDay: (data as any).lesson_day ?? null,
      });
    }

    if (!userBookId || action !== "remove") {
      return NextResponse.json(
        { error: "userBookId and action=remove are required for this request." },
        { status: 400 }
      );
    }

    const belongsToStudent = await ensureStudentBook(studentId, userBookId);
    if (!belongsToStudent) {
      return NextResponse.json(
        { error: "This book does not belong to that student." },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("teacher_student_lesson_books")
      .update({
        status: "removed",
        removed_at: new Date().toISOString(),
      })
      .eq("teacher_id", auth.user.id)
      .eq("student_id", studentId)
      .eq("user_book_id", userBookId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Student Workspace remove error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not remove this lesson book." },
      { status: 500 }
    );
  }
}
