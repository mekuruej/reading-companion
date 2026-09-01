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

type ChapterSuggestion = {
  key: string;
  chapterNumber: number | null;
  chapterName: string | null;
  label: string;
  pageSummary: string;
  firstPage: number | null;
  lastPage: number | null;
  entryCount: number;
  pages: number[];
};

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

function firstRow<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeChapterName(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function suggestionLabel(chapterNumber: number | null, chapterName: string | null) {
  if (chapterNumber != null && chapterName) return `Chapter ${chapterNumber} · ${chapterName}`;
  if (chapterNumber != null) return `Chapter ${chapterNumber}`;
  return chapterName ?? "Chapter";
}

function pageSummaryForPages(pages: number[]) {
  if (pages.length === 0) return "No saved page";
  if (pages.length <= 4) return `Pages ${pages.join(", ")}`;
  return `Pages ${pages[0]}-${pages[pages.length - 1]}`;
}

async function loadTeacherChapterSuggestions(sourceUserBookId: string): Promise<ChapterSuggestion[]> {
  const { data, error } = await supabaseAdmin
    .from("user_book_words")
    .select("id, chapter_number, chapter_name, page_number, created_at")
    .eq("user_book_id", sourceUserBookId)
    .eq("hidden", false)
    .order("chapter_number", { ascending: true, nullsFirst: false })
    .order("page_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const grouped = new Map<
    string,
    {
      chapterNumber: number | null;
      chapterName: string | null;
      pages: Set<number>;
      entryCount: number;
    }
  >();

  for (const row of data ?? []) {
    const chapterNumber =
      row.chapter_number == null || !Number.isFinite(Number(row.chapter_number))
        ? null
        : Number(row.chapter_number);
    const chapterName = normalizeChapterName(row.chapter_name) || null;
    if (chapterNumber == null && !chapterName) continue;

    const key = `${chapterNumber ?? "null"}||${normalizeChapterName(chapterName).toLowerCase()}`;
    const existing =
      grouped.get(key) ??
      {
        chapterNumber,
        chapterName,
        pages: new Set<number>(),
        entryCount: 0,
      };

    if (row.page_number != null && Number.isFinite(Number(row.page_number))) {
      existing.pages.add(Number(row.page_number));
    }
    existing.entryCount += 1;
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .map(([key, suggestion]) => {
      const pages = Array.from(suggestion.pages).sort((a, b) => a - b);
      return {
        key,
        chapterNumber: suggestion.chapterNumber,
        chapterName: suggestion.chapterName,
        label: suggestionLabel(suggestion.chapterNumber, suggestion.chapterName),
        pageSummary: pageSummaryForPages(pages),
        firstPage: pages[0] ?? null,
        lastPage: pages[pages.length - 1] ?? null,
        entryCount: suggestion.entryCount,
        pages,
      };
    })
    .sort((a, b) => {
      const aChapter = a.chapterNumber ?? Number.MAX_SAFE_INTEGER;
      const bChapter = b.chapterNumber ?? Number.MAX_SAFE_INTEGER;
      if (aChapter !== bChapter) return aChapter - bChapter;

      const aPage = a.firstPage ?? Number.MAX_SAFE_INTEGER;
      const bPage = b.firstPage ?? Number.MAX_SAFE_INTEGER;
      if (aPage !== bPage) return aPage - bPage;

      return a.label.localeCompare(b.label);
    });
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

async function ensureTeacherBookRelationship({
  teacherId,
  bookId,
  userBookId,
}: {
  teacherId: string;
  bookId: string;
  userBookId: string;
}) {
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("teacher_books")
    .select("id, user_book_id")
    .eq("teacher_id", teacherId)
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  if (existingError) throw existingError;

  const rows = existingRows ?? [];
  if (rows.length > 1) {
    throw new Error("Multiple Teacher Book records match this book.");
  }

  const existing = rows[0];
  if (existing?.id) {
    if (!existing.user_book_id) {
      const { error: updateError } = await supabaseAdmin
        .from("teacher_books")
        .update({ user_book_id: userBookId })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    }

    if (existing.user_book_id && existing.user_book_id !== userBookId) {
      throw new Error("This Teacher Book is linked to a different Book Hub.");
    }

    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("teacher_books")
    .insert({
      teacher_id: teacherId,
      book_id: bookId,
      user_book_id: userBookId,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code !== "23505") throw insertError;

    const { data: raced, error: racedError } = await supabaseAdmin
      .from("teacher_books")
      .select("id, user_book_id")
      .eq("teacher_id", teacherId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (racedError) throw racedError;
    if (!raced?.id) throw insertError;
    return raced.id as string;
  }

  return inserted.id as string;
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

    const teacherBookId = await ensureTeacherBookRelationship({
      teacherId: auth.user.id,
      bookId: loadedSourceBook.book_id,
      userBookId,
    });

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

    const selectedStudentUserBookId = new URL(req.url).searchParams.get("studentUserBookId");
    const students = lessonRows
      .map((row) => ({
        lessonBookId: row.id,
        studentId: row.student_id,
        studentUserBookId: row.user_book_id,
        studentName: namesById.get(row.student_id) ?? "Student",
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    if (
      selectedStudentUserBookId &&
      !students.some((student) => student.studentUserBookId === selectedStudentUserBookId)
    ) {
      return NextResponse.json(
        { error: "This student is not actively connected to this book." },
        { status: 403 }
      );
    }

    const hasValidSelectedStudent =
      !selectedStudentUserBookId ||
      students.some((student) => student.studentUserBookId === selectedStudentUserBookId);
    const chapterSuggestions =
      selectedStudentUserBookId && hasValidSelectedStudent
        ? await loadTeacherChapterSuggestions(userBookId)
        : [];
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
      chapterSuggestions,
    });
  } catch (error: any) {
    console.error("Teaching lesson context error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load this teaching lesson." },
      { status: 500 }
    );
  }
}
