import { loadTeachingEdition, validateTeachingSourceContext } from "@/lib/teacher/teachingSource";
import { validateStudentToolContext, StudentContextError } from "@/lib/teacher/studentToolContext";
import { loadContextualWordTargets } from "@/lib/teacher/contextualWordTargets";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  role?: string | null;
  is_super_teacher?: boolean | string | null;
};

type SourceBookRow = {
  id: string;
  user_id: string;
  book_id: string;
  books:
    | {
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }
    | {
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }[]
    | null;
};

type LessonBookRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  user_book_id: string;
  status: string | null;
  user_books:
    | {
        id: string;
        user_id: string;
        book_id: string;
      }
    | {
        id: string;
        user_id: string;
        book_id: string;
      }[]
    | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isTeachingRole(profile: ProfileRow | null) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

function firstRow<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) return { error: "Missing session.", status: 401 as const };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { error: "Invalid session.", status: 401 as const };

  return { user: data.user };
}

async function loadActiveStudentIds(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .is("archived_at", null);

  if (error) throw error;
  return new Set((data ?? []).map((row: any) => row.student_id as string));
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

    const [{ data: profile, error: profileError }, { data: sourceBook, error: sourceError }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, role, is_super_teacher")
          .eq("id", auth.user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("user_books")
          .select("id, user_id, book_id, books:book_id(title, author, cover_url)")
          .eq("id", userBookId)
          .maybeSingle(),
      ]);

    if (profileError) throw profileError;
    if (sourceError) throw sourceError;

    if (!sourceBook) {
      return NextResponse.json({ error: "This book could not be found." }, { status: 404 });
    }

    const loadedSourceBook = sourceBook as SourceBookRow;
    if (loadedSourceBook.user_id !== auth.user.id || !isTeachingRole(profile as ProfileRow | null)) {
      return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });
    }

    // Navigation never creates or repairs a Teacher Book relationship.
    const { data: teacherBooks, error: teacherBooksError } = await supabaseAdmin.from("teacher_books")
      .select("id,user_book_id").eq("teacher_id", auth.user.id).eq("book_id", loadedSourceBook.book_id);
    if (teacherBooksError) throw teacherBooksError;
    if ((teacherBooks?.length ?? 0) > 1) throw new Error("Multiple Teacher Books match this edition.");
    const candidateTeacherBook = teacherBooks?.[0];
    const teacherBookId = !candidateTeacherBook?.user_book_id || candidateTeacherBook.user_book_id === userBookId
      ? candidateTeacherBook?.id ?? null : null;

    const [activeStudentIds, lessonRowsResult] = await Promise.all([
      loadActiveStudentIds(auth.user.id),
      supabaseAdmin
        .from("teacher_student_lesson_books")
        .select(
          `
          id,
          teacher_id,
          student_id,
          user_book_id,
          status,
          user_books:user_book_id (
            id,
            user_id,
            book_id
          )
        `
        )
        .eq("teacher_id", auth.user.id)
        .eq("status", "active"),
    ]);

    if (lessonRowsResult.error) throw lessonRowsResult.error;

    const lessonRows = ((lessonRowsResult.data ?? []) as unknown as LessonBookRow[]).filter(
      (row) => {
        if (row.status !== "active") return false;
        if (row.student_id === auth.user.id) return false;
        if (!activeStudentIds.has(row.student_id)) return false;
        const userBook = firstRow(row.user_books);
        return (
          userBook?.id === row.user_book_id &&
          userBook.user_id === row.student_id &&
          userBook.book_id === loadedSourceBook.book_id
        );
      }
    );

    const studentIds = [...new Set(lessonRows.map((row) => row.student_id))];
    const { data: profiles, error: profilesError } =
      studentIds.length === 0
        ? { data: [], error: null }
        : await supabaseAdmin
            .from("profiles")
            .select("id, display_name, username")
            .in("id", studentIds);

    if (profilesError) throw profilesError;

    const namesById = new Map(
      (profiles ?? []).map((row: any) => [
        row.id as string,
        (row.display_name || row.username || "Student") as string,
      ])
    );

    const queryParams = new URL(req.url).searchParams;
    const isSaveWords = queryParams.get("view") === "curiosity";
    const selectedStudentUserBookId = queryParams.get("studentUserBookId");
    const selectedStudentId = queryParams.get("studentId");
    let lockedTarget = null;
    if (queryParams.has("studentId") || queryParams.has("studentUserBookId")) {
      if (!selectedStudentUserBookId) throw new StudentContextError("The exact student book is required.", 400);
      // Legacy URLs carry only the exact copy; derive its owner, never a remembered selection.
      const owner = await supabaseAdmin.from("user_books").select("user_id").eq("id", selectedStudentUserBookId).maybeSingle();
      if (owner.error) throw owner.error;
      lockedTarget = await (isSaveWords ? validateStudentToolContext : validateTeachingSourceContext)(supabaseAdmin, auth.user.id, { studentId: selectedStudentId ?? owner.data?.user_id ?? "", userBookId: selectedStudentUserBookId, sourceUserBookId: userBookId });
    }
    const saveWordTargets = isSaveWords
      ? await loadContextualWordTargets(supabaseAdmin, loadedSourceBook.book_id, profile as ProfileRow, activeStudentIds)
      : [];
    const students = lessonRows
      .map((row) => ({
        lessonBookId: row.id as string | null,
        studentId: row.student_id,
        studentUserBookId: row.user_book_id,
        studentName: namesById.get(row.student_id) ?? "Student",
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    if (!isSaveWords) {
      const trialTargets = await loadContextualWordTargets(supabaseAdmin, loadedSourceBook.book_id, profile as ProfileRow, new Set());
      for (const target of trialTargets) {
        if (!students.some(student => student.studentId === target.studentId)) {
          students.push({ ...target, lessonBookId: null });
        }
      }
      students.sort((a, b) => a.studentName.localeCompare(b.studentName));
    }

    if (lockedTarget) {
      const target = { ...lockedTarget, lessonBookId: null };
      students.splice(0, students.length, target);
      saveWordTargets.splice(0, saveWordTargets.length, target);
    }

    if (
      selectedStudentUserBookId &&
      !(isSaveWords ? saveWordTargets : students).some((student) => student.studentUserBookId === selectedStudentUserBookId)
    ) {
      return NextResponse.json(
        { error: "This student is not actively connected to this book." },
        { status: 403 }
      );
    }

    const sourceEdition = await loadTeachingEdition(supabaseAdmin, loadedSourceBook.book_id);
    const targetEdition = lockedTarget ? await loadTeachingEdition(supabaseAdmin, lockedTarget.bookId) : null;
    const book = firstRow(loadedSourceBook.books);
    return NextResponse.json({
      teacherBookId,
      sourceUserBookId: userBookId,
      book: {
        title: book?.title ?? null,
        author: book?.author ?? null,
        coverUrl: book?.cover_url ?? null,
      },
      students,
      ...(isSaveWords ? { saveWordTargets } : {}),
      sourceEdition, targetEdition,
    });
  } catch (error: any) {
    console.error("Teaching lesson context error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load this teaching lesson." },
      { status: error instanceof StudentContextError ? error.status : 500 }
    );
  }
}
