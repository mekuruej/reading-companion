import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ensureStudentLessonBook,
  StudentLessonBookError,
} from "@/lib/teacher/studentLessonBooks";

const MAX_RESUME_AT_LENGTH = 500;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  role?: string | null;
  is_super_teacher?: boolean | string | null;
};

type LessonBookRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  user_book_id: string;
  status: string | null;
  added_at: string | null;
  updated_at: string | null;
  resume_at_text: string | null;
  resume_updated_at: string | null;
  user_books:
    | {
        id: string;
        user_id: string;
        book_id: string;
      }
    | { id: string; user_id: string; book_id: string }[]
    | null;
};

function isMissingResumeColumnError(error: any) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    text.includes("resume_at_text") ||
    text.includes("resume_updated_at")
  );
}

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isTeachingRole(profile: ProfileRow | null) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

function firstUserBook(row: LessonBookRow["user_books"]) {
  if (Array.isArray(row)) return row[0] ?? null;
  return row ?? null;
}

function cleanResumeAtText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
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

async function authorizeOwnTeachingBook(actorId: string, userBookId: string) {
  const [{ data: profile, error: profileError }, { data: userBook, error: userBookError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, role, is_super_teacher")
        .eq("id", actorId)
        .maybeSingle(),
      supabaseAdmin
        .from("user_books")
        .select("id, user_id, book_id")
        .eq("id", userBookId)
        .maybeSingle(),
    ]);

  if (profileError) throw profileError;
  if (userBookError) throw userBookError;

  if (!userBook) {
    return { ok: false as const, error: "This book could not be found.", status: 404 };
  }

  if ((userBook as any).user_id !== actorId || !isTeachingRole(profile as ProfileRow | null)) {
    return { ok: false as const, error: "Teacher access is required.", status: 403 };
  }

  return {
    ok: true as const,
    bookId: (userBook as any).book_id as string,
    profile: profile as ProfileRow | null,
  };
}

async function loadActiveStudentLinks(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .is("archived_at", null);

  if (error) throw error;
  return new Set((data ?? []).map((row: any) => row.student_id as string));
}

async function ensureStudentBook(studentId: string, userBookId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_books")
    .select("id, user_id")
    .eq("id", userBookId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data && (data as any).user_id === studentId);
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

async function loadLessonRows(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("teacher_student_lesson_books")
    .select(
      `
      id,
      teacher_id,
      student_id,
      user_book_id,
      status,
      added_at,
      updated_at,
      resume_at_text,
      resume_updated_at,
      user_books:user_book_id (
        id,
        user_id,
        book_id
      )
    `
    )
    .eq("teacher_id", teacherId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingResumeColumnError(error)) {
      return { migrationRequired: true as const, rows: [] };
    }
    throw error;
  }

  return {
    migrationRequired: false as const,
    rows: (data ?? []) as unknown as LessonBookRow[],
  };
}

async function loadStudentNames(studentIds: string[]) {
  if (studentIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, username")
    .in("id", studentIds);

  if (error) throw error;

  return new Map(
    (data ?? []).map((row: any) => [
      row.id as string,
      (row.display_name || row.username || "Student") as string,
    ])
  );
}

function filteredStudentRows({
  lessonRows,
  activeStudentIds,
  bookId,
  teacherId,
}: {
  lessonRows: LessonBookRow[];
  activeStudentIds: Set<string>;
  bookId: string;
  teacherId: string;
}) {
  return lessonRows
    .filter((row) => {
      if (row.status !== "active") return false;
      if (row.student_id === teacherId) return false;
      if (!activeStudentIds.has(row.student_id)) return false;
      const userBook = firstUserBook(row.user_books);
      return (
        userBook?.id === row.user_book_id &&
        userBook.user_id === row.student_id &&
        userBook.book_id === bookId
      );
    })
    .sort((a, b) => {
      const left = `${a.student_id}|${a.added_at ?? ""}|${a.id}`;
      const right = `${b.student_id}|${b.added_at ?? ""}|${b.id}`;
      return left.localeCompare(right);
    });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const { userBookId } = await context.params;
    const auth = await getAuthenticatedUser(req);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const access = await authorizeOwnTeachingBook(auth.user.id, userBookId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const [activeStudentIds, lessonResult] = await Promise.all([
      loadActiveStudentLinks(auth.user.id),
      loadLessonRows(auth.user.id),
    ]);

    if (lessonResult.migrationRequired) {
      return NextResponse.json(
        {
          error:
            "Students' Progress needs the resume bookmark migration before it can load.",
          migrationRequired: true,
        },
        { status: 409 }
      );
    }

    const rows = filteredStudentRows({
      lessonRows: lessonResult.rows,
      activeStudentIds,
      bookId: access.bookId,
      teacherId: auth.user.id,
    });
    const activeStudentIdList = [...activeStudentIds].sort();
    const namesByStudentId = await loadStudentNames(activeStudentIdList);

    const duplicateCounts = new Map<string, number>();
    for (const row of rows) {
      const key = `${row.teacher_id}|${row.student_id}|${access.bookId}`;
      duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
    }
    const activeRowsByStudentId = new Map<string, LessonBookRow>();
    for (const row of rows) {
      if (!activeRowsByStudentId.has(row.student_id)) {
        activeRowsByStudentId.set(row.student_id, row);
      }
    }

    const students = activeStudentIdList
      .map((studentId) => {
        const row = activeRowsByStudentId.get(studentId);
        const duplicateKey = `${auth.user.id}|${studentId}|${access.bookId}`;
        return {
          lessonBookId: row?.id ?? null,
          studentId,
          studentName: namesByStudentId.get(studentId) ?? "Student",
          userBookId: row?.user_book_id ?? null,
          isAttached: Boolean(row),
          resumeAtText: row?.resume_at_text ?? null,
          resumeUpdatedAt: row?.resume_updated_at ?? null,
          hasDuplicateActiveBook: (duplicateCounts.get(duplicateKey) ?? 0) > 1,
        };
      })
      .sort((a, b) => {
        if (a.isAttached !== b.isAttached) return a.isAttached ? -1 : 1;
        return a.studentName.localeCompare(b.studentName);
      });

    return NextResponse.json({
      students,
      migrationRequired: false,
    });
  } catch (error: any) {
    console.error("Teaching student progress load error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load Students' Progress." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const { userBookId } = await context.params;
    const auth = await getAuthenticatedUser(req);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const access = await authorizeOwnTeachingBook(auth.user.id, userBookId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await req.json().catch(() => null);
    const studentId =
      typeof body?.studentId === "string" ? body.studentId.trim() : "";

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required." },
        { status: 400 }
      );
    }

    const studentBook = await findOrCreateStudentBook(studentId, access.bookId);
    if ("error" in studentBook) {
      return NextResponse.json(
        { error: studentBook.error },
        { status: studentBook.status }
      );
    }

    const lessonBook = await ensureStudentLessonBook({
      supabase: supabaseAdmin,
      teacherId: auth.user.id,
      studentId,
      userBookId: studentBook.userBookId,
      teacherProfile: access.profile,
    });

    return NextResponse.json({
      ok: true,
      lessonBookId: lessonBook.relationshipId,
      userBookId: lessonBook.userBookId,
      createdUserBook: studentBook.createdUserBook,
    });
  } catch (error: any) {
    console.error("Teaching student progress add error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not add this student book." },
      { status: error instanceof StudentLessonBookError ? error.status : 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const { userBookId } = await context.params;
    const auth = await getAuthenticatedUser(req);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const access = await authorizeOwnTeachingBook(auth.user.id, userBookId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await req.json().catch(() => null);
    const lessonBookId =
      typeof body?.lessonBookId === "string" ? body.lessonBookId.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
    const removeUserBookId =
      typeof body?.userBookId === "string" ? body.userBookId.trim() : "";
    const resumeAtText = cleanResumeAtText(body?.resumeAtText);

    if (action === "remove") {
      if (!studentId || !removeUserBookId) {
        return NextResponse.json(
          { error: "studentId and userBookId are required." },
          { status: 400 }
        );
      }

      const belongsToStudent = await ensureStudentBook(studentId, removeUserBookId);
      if (!belongsToStudent) {
        return NextResponse.json(
          { error: "This book does not belong to that student." },
          { status: 403 }
        );
      }

      const activeStudentIds = await loadActiveStudentLinks(auth.user.id);
      if (!activeStudentIds.has(studentId)) {
        return NextResponse.json(
          { error: "This student is not actively connected to this teacher." },
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
        .eq("user_book_id", removeUserBookId);

      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    if (!lessonBookId) {
      return NextResponse.json(
        { error: "lessonBookId is required." },
        { status: 400 }
      );
    }

    if (resumeAtText.length > MAX_RESUME_AT_LENGTH) {
      return NextResponse.json(
        { error: "Resume point must be 500 characters or fewer." },
        { status: 400 }
      );
    }

    const { data: lessonRow, error: lessonError } = await supabaseAdmin
      .from("teacher_student_lesson_books")
      .select(
        `
        id,
        teacher_id,
        student_id,
        user_book_id,
        status,
        added_at,
        updated_at,
        resume_at_text,
        resume_updated_at,
        user_books:user_book_id (
          id,
          user_id,
          book_id
        )
      `
      )
      .eq("id", lessonBookId)
      .eq("teacher_id", auth.user.id)
      .maybeSingle();

    if (lessonError) {
      if (isMissingResumeColumnError(lessonError)) {
        return NextResponse.json(
          {
            error:
              "Students' Progress needs the resume bookmark migration before it can save.",
            migrationRequired: true,
          },
          { status: 409 }
        );
      }
      throw lessonError;
    }

    if (!lessonRow) {
      return NextResponse.json(
        { error: "This student lesson book could not be found." },
        { status: 404 }
      );
    }

    const row = lessonRow as unknown as LessonBookRow;
    const userBook = firstUserBook(row.user_books);
    const activeStudentIds = await loadActiveStudentLinks(auth.user.id);

    if (
      row.status !== "active" ||
      row.student_id === auth.user.id ||
      !activeStudentIds.has(row.student_id) ||
      userBook?.id !== row.user_book_id ||
      userBook.user_id !== row.student_id ||
      userBook.book_id !== access.bookId
    ) {
      return NextResponse.json(
        { error: "This student is not actively connected to this book." },
        { status: 403 }
      );
    }

    const nextTimestamp = resumeAtText ? new Date().toISOString() : null;
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("teacher_student_lesson_books")
      .update({
        resume_at_text: resumeAtText || null,
        resume_updated_at: nextTimestamp,
      })
      .eq("id", row.id)
      .eq("teacher_id", auth.user.id)
      .eq("student_id", row.student_id)
      .eq("user_book_id", row.user_book_id)
      .eq("status", "active")
      .select("id, resume_at_text, resume_updated_at")
      .single();

    if (updateError) {
      if (isMissingResumeColumnError(updateError)) {
        return NextResponse.json(
          {
            error:
              "Students' Progress needs the resume bookmark migration before it can save.",
            migrationRequired: true,
          },
          { status: 409 }
        );
      }
      throw updateError;
    }

    return NextResponse.json({
      lessonBookId: (updatedRow as any).id,
      resumeAtText: (updatedRow as any).resume_at_text ?? null,
      resumeUpdatedAt: (updatedRow as any).resume_updated_at ?? null,
    });
  } catch (error: any) {
    console.error("Teaching student progress save error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not save this resume point." },
      { status: 500 }
    );
  }
}
