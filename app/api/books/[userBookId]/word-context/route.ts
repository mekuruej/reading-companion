import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canTeacherAccessStudent } from "@/lib/teacher/studentLessonBooks";

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
    profile?.role === "admin" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
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

async function authorizeBookAccess(actorId: string, userBookId: string) {
  const [{ data: userBook, error: userBookError }, profile] = await Promise.all([
    supabaseAdmin
      .from("user_books")
      .select("id, user_id")
      .eq("id", userBookId)
      .maybeSingle(),
    getProfile(actorId),
  ]);

  if (userBookError) throw userBookError;

  const ownerUserId = (userBook as any)?.user_id as string | undefined;
  if (!ownerUserId) {
    return { ok: false as const, error: "This book could not be found.", status: 404 };
  }

  const canAccess =
    ownerUserId === actorId ||
    isSuperTeacher(profile) ||
    (await canTeacherAccessStudent({
      supabase: supabaseAdmin,
      teacherId: actorId,
      studentId: ownerUserId,
      teacherProfile: profile,
    }));

  if (!canAccess) {
    return { ok: false as const, error: "You do not have access to this book.", status: 403 };
  }

  return { ok: true as const, ownerUserId };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(req);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userBookId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const surface = typeof body?.surface === "string" ? body.surface.trim() : "";

    if (!userBookId || !surface) {
      return NextResponse.json({ repeatCount: 0, seenInstances: [] });
    }

    const access = await authorizeBookAccess(authResult.user.id, userBookId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const [{ count: repeatCount, error: repeatError }, { data: seen, error: seenError }] =
      await Promise.all([
        supabaseAdmin
          .from("user_book_words")
          .select("id", { count: "exact", head: true })
          .eq("user_book_id", userBookId)
          .eq("surface", surface),
        supabaseAdmin
          .from("user_book_words")
          .select(
            `
            id,
            user_book_id,
            surface,
            reading,
            meaning,
            meaning_choice_index,
            page_number,
            chapter_number,
            chapter_name,
            created_at,
            user_books!inner (
              user_id,
              books:book_id (
                title,
                cover_url
              )
            )
          `
          )
          .eq("surface", surface)
          .eq("user_books.user_id", access.ownerUserId)
          .order("created_at", { ascending: false }),
      ]);

    if (repeatError) throw repeatError;
    if (seenError) throw seenError;

    const seenInstances = (seen ?? []).map((row: any) => ({
      id: row.id,
      user_book_id: row.user_book_id,
      surface: row.surface,
      reading: row.reading ?? null,
      meaning: row.meaning ?? null,
      meaning_choice_index: row.meaning_choice_index ?? null,
      page_number: row.page_number ?? null,
      chapter_number: row.chapter_number ?? null,
      chapter_name: row.chapter_name ?? null,
      created_at: row.created_at,
      books_title: row.user_books?.books?.title ?? "(unknown book)",
      books_cover_url: row.user_books?.books?.cover_url ?? null,
    }));

    return NextResponse.json({
      repeatCount: repeatCount ?? 0,
      seenInstances,
    });
  } catch (error: any) {
    console.error("Error loading book word context:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load word context." },
      { status: 500 }
    );
  }
}
