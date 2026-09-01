import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { parseOptionalPageLocationInput } from "@/lib/pageLocation";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
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
        books?: { page_count?: number | null } | { page_count?: number | null }[] | null;
      }
    | {
        id: string;
        user_id: string;
        book_id: string;
        books?: { page_count?: number | null } | { page_count?: number | null }[] | null;
      }[]
    | null;
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

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeJlpt(val: string): string {
  if (!val) return "NON-JLPT";
  const v = val.toUpperCase();

  if (v.includes("N5")) return "N5";
  if (v.includes("N4")) return "N4";
  if (v.includes("N3")) return "N3";
  if (v.includes("N2")) return "N2";
  if (v.includes("N1")) return "N1";

  return "NON-JLPT";
}

function toNullableInt(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function booleanValue(value: unknown) {
  return value === true;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
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

async function authorizeSourceBook(actorId: string, sourceUserBookId: string) {
  const [{ data: profile, error: profileError }, { data: sourceBook, error: sourceError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, role, is_super_teacher, app_access_type, app_access_expires_at")
        .eq("id", actorId)
        .maybeSingle(),
      supabaseAdmin
        .from("user_books")
        .select("id, user_id, book_id, books:book_id(page_count)")
        .eq("id", sourceUserBookId)
        .maybeSingle(),
    ]);

  if (profileError) throw profileError;
  if (sourceError) throw sourceError;

  if (!sourceBook) {
    return { ok: false as const, error: "This book could not be found.", status: 404 };
  }

  const loadedProfile = profile as ProfileRow | null;
  const roleForAccess = loadedProfile?.is_super_teacher
    ? "super_teacher"
    : loadedProfile?.role;
  const appStatus = getAppAccessStatus({
    role: roleForAccess,
    app_access_type: loadedProfile?.app_access_type ?? null,
    app_access_expires_at: loadedProfile?.app_access_expires_at ?? null,
  });
  const featureAccess = getFeatureAccess({
    role: roleForAccess,
    hasFullAccess: appStatus.hasFullAccess,
    isTrialActive: appStatus.reason === "trial",
  });

  if (
    (sourceBook as any).user_id !== actorId ||
    !isTeachingRole(loadedProfile) ||
    !featureAccess.canUseBulkAdd
  ) {
    return { ok: false as const, error: "Teacher Bulk Add access is required.", status: 403 };
  }

  const book = firstRow((sourceBook as any).books);
  return {
    ok: true as const,
    bookId: (sourceBook as any).book_id as string,
    sourceUserBookId: (sourceBook as any).id as string,
    sourcePageCount: book?.page_count ?? null,
  };
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

async function loadStudentDestinations(teacherId: string, bookId: string) {
  const [activeStudentIds, lessonResult] = await Promise.all([
    loadActiveStudentIds(teacherId),
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
          book_id,
          books:book_id (
            page_count
          )
        )
      `
      )
      .eq("teacher_id", teacherId)
      .eq("status", "active"),
  ]);

  const { data, error } = lessonResult;
  if (error) throw error;

  const rows = ((data ?? []) as unknown as LessonBookRow[])
    .filter((row) => {
      if (row.status !== "active") return false;
      if (!activeStudentIds.has(row.student_id)) return false;
      if (row.student_id === teacherId) return false;
      const userBook = firstRow(row.user_books);
      return (
        userBook?.id === row.user_book_id &&
        userBook.user_id === row.student_id &&
        userBook.book_id === bookId
      );
    })
    .sort((a, b) => `${a.student_id}|${a.id}`.localeCompare(`${b.student_id}|${b.id}`));

  const studentIds = [...new Set(rows.map((row) => row.student_id))];
  const { data: profiles, error: profileError } =
    studentIds.length === 0
      ? { data: [], error: null }
      : await supabaseAdmin
          .from("profiles")
          .select("id, display_name, username")
          .in("id", studentIds);

  if (profileError) throw profileError;

  const namesById = new Map(
    (profiles ?? []).map((profile: any) => [
      profile.id as string,
      (profile.display_name || profile.username || "Student") as string,
    ])
  );

  return rows.map((row) => {
    const userBook = firstRow(row.user_books);
    const book = firstRow(userBook?.books);
    return {
      type: "student" as const,
      lessonBookId: row.id,
      userBookId: row.user_book_id,
      studentId: row.student_id,
      label: namesById.get(row.student_id) ?? "Student",
      pageCount: book?.page_count ?? null,
    };
  });
}

async function authorizeStudentDestination({
  teacherId,
  sourceUserBookId,
  lessonBookId,
}: {
  teacherId: string;
  sourceUserBookId: string;
  lessonBookId: string;
}) {
  const source = await authorizeSourceBook(teacherId, sourceUserBookId);
  if (!source.ok) {
    return { ok: false as const, error: source.error, status: source.status };
  }

  const { data, error } = await supabaseAdmin
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
        book_id,
        books:book_id (
          page_count
        )
      )
    `
    )
    .eq("id", lessonBookId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { ok: false as const, error: "This student destination could not be found.", status: 404 };
  }

  const row = data as unknown as LessonBookRow;
  const activeStudentIds = await loadActiveStudentIds(teacherId);
  const userBook = firstRow(row.user_books);

  if (
    row.status !== "active" ||
    row.student_id === teacherId ||
    !activeStudentIds.has(row.student_id) ||
    userBook?.id !== row.user_book_id ||
    userBook.user_id !== row.student_id ||
    userBook.book_id !== source.bookId
  ) {
    return { ok: false as const, error: "This student is not actively connected to this book.", status: 403 };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("display_name, username")
    .eq("id", row.student_id)
    .maybeSingle();

  if (profileError) throw profileError;

  const book = firstRow(userBook.books);
  return {
    ok: true as const,
    userBookId: row.user_book_id,
    pageCount: book?.page_count ?? null,
    destinationName: profile?.display_name || profile?.username || "Student",
  };
}

async function maxPageOrder({
  userBookId,
  chapterNumber,
  pageNumber,
}: {
  userBookId: string;
  chapterNumber: number | null;
  pageNumber: number | null;
}) {
  let query = supabaseAdmin
    .from("user_book_words")
    .select("page_order")
    .eq("user_book_id", userBookId);

  query =
    chapterNumber == null
      ? query.is("chapter_number", null)
      : query.eq("chapter_number", chapterNumber);

  query =
    pageNumber == null
      ? query.is("page_number", null)
      : query.eq("page_number", pageNumber);

  const { data, error } = await query;
  if (error) throw error;

  return Math.max(0, ...(data ?? []).map((row: any) => Number(row.page_order) || 0));
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const sourceUserBookId = cleanString(url.searchParams.get("sourceUserBookId"));
    if (!sourceUserBookId) {
      return NextResponse.json({ error: "sourceUserBookId is required." }, { status: 400 });
    }

    const source = await authorizeSourceBook(auth.user.id, sourceUserBookId);
    if (!source.ok) {
      return NextResponse.json({ error: source.error }, { status: source.status });
    }

    const students = await loadStudentDestinations(auth.user.id, source.bookId);
    return NextResponse.json({
      destinations: [
        {
          type: "teacher",
          userBookId: source.sourceUserBookId,
          label: "My Teaching Vocabulary",
        },
        ...students,
      ],
    });
  } catch (error: any) {
    console.error("Teaching Bulk Add destinations error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load Teaching Bulk Add destinations." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const sourceUserBookId = cleanString(body?.sourceUserBookId);
    const lessonBookId = cleanString(body?.lessonBookId);
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!sourceUserBookId || !lessonBookId) {
      return NextResponse.json(
        { error: "sourceUserBookId and lessonBookId are required." },
        { status: 400 }
      );
    }

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Add at least one word." }, { status: 400 });
    }

    const destination = await authorizeStudentDestination({
      teacherId: auth.user.id,
      sourceUserBookId,
      lessonBookId,
    });

    if ("error" in destination) {
      return NextResponse.json(
        { error: destination.error },
        { status: destination.status }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const itemsWithPages = rawItems.map((item: any, index: number) => {
      const parsedPage = parseOptionalPageLocationInput(item?.page, destination.pageCount);
      if (parsedPage.error) {
        throw new Error(`Word ${index + 1}: ${parsedPage.error}`);
      }
      return { item, pageNumber: parsedPage.value };
    });

    const comboKeys: string[] = Array.from(
      new Set(
        itemsWithPages.map(({ item, pageNumber }: any) => {
          const chapterNumber = toNullableInt(item?.chapterNumber);
          return `${chapterNumber ?? "null"}||${pageNumber ?? "null"}`;
        })
      )
    );
    const nextOrderByCombo = new Map<string, number>();

    for (const key of comboKeys) {
      const [chapterRaw, pageRaw] = key.split("||");
      const chapterNumber = chapterRaw === "null" ? null : Number(chapterRaw);
      const pageNumber = pageRaw === "null" ? null : Number(pageRaw);
      nextOrderByCombo.set(
        key,
        await maxPageOrder({
          userBookId: destination.userBookId,
          chapterNumber,
          pageNumber,
        })
      );
    }

    const payload = itemsWithPages.map(({ item, pageNumber }: any) => {
      const chapterNumber = toNullableInt(item?.chapterNumber);
      const comboKey = `${chapterNumber ?? "null"}||${pageNumber ?? "null"}`;
      const nextPageOrder = (nextOrderByCombo.get(comboKey) ?? 0) + 1;
      nextOrderByCombo.set(comboKey, nextPageOrder);

      const meaning = cleanString(item?.meaning);
      return {
        user_book_id: destination.userBookId,
        surface: cleanString(item?.surface),
        reading: cleanString(item?.reading) || null,
        meaning: meaning || null,
        other_definition:
          item?.meaningChoiceIndex == null && meaning ? meaning : null,
        meaning_choices: stringArray(item?.meaningChoices),
        meaning_choice_index:
          item?.meaningChoiceIndex == null ? null : Number(item.meaningChoiceIndex),
        jlpt: normalizeJlpt(cleanString(item?.jlpt)),
        is_common: booleanValue(item?.isCommon),
        page_number: pageNumber,
        page_order: nextPageOrder,
        chapter_number: chapterNumber,
        chapter_name: cleanString(item?.chapterName) || null,
        hide_kanji_in_reading_support: booleanValue(item?.hideKanjiInReadingSupport),
        kanji_meta: Array.isArray(item?.kanjiMeta) ? item.kanjiMeta : [],
        seen_on: today,
      };
    });

    const incompleteIndex = payload.findIndex((item) => !item.surface);
    if (incompleteIndex >= 0) {
      return NextResponse.json(
        { error: `Word ${incompleteIndex + 1}: word is required.` },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("user_book_words").upsert(payload);
    if (error) throw error;

    return NextResponse.json({
      savedCount: payload.length,
      destinationName: destination.destinationName,
    });
  } catch (error: any) {
    console.error("Teaching Bulk Add save error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not save Teaching Bulk Add words." },
      { status: 500 }
    );
  }
}
