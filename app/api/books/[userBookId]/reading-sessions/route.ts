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
      .select("id, user_id, started_at")
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

  return {
    ok: true as const,
    userBook: userBook as { id: string; user_id: string; started_at: string | null },
  };
}

async function requireAuthorizedBook(req: Request, userBookId: string) {
  const authResult = await getAuthenticatedUser(req);
  if (!("user" in authResult)) return authResult;

  return authorizeBookAccess(authResult.user.id, userBookId);
}

function normalizeSessionPayload(body: any) {
  const read_on = typeof body?.read_on === "string" ? body.read_on : null;
  const session_mode =
    body?.session_mode === "curiosity" ||
    body?.session_mode === "listening" ||
    body?.session_mode === "fluid"
      ? body.session_mode
      : "fluid";

  return {
    read_on,
    start_page:
      typeof body?.start_page === "number" && Number.isFinite(body.start_page)
        ? body.start_page
        : null,
    end_page:
      typeof body?.end_page === "number" && Number.isFinite(body.end_page)
        ? body.end_page
        : null,
    minutes_read:
      typeof body?.minutes_read === "number" && Number.isFinite(body.minutes_read)
        ? body.minutes_read
        : null,
    session_mode,
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const { userBookId } = await context.params;
    const access = await requireAuthorizedBook(req, userBookId);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const [{ data: sessions, error: sessionsError }, { count: wordCount, error: wordCountError }] =
      await Promise.all([
        supabaseAdmin
          .from("user_book_reading_sessions")
          .select("id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode")
          .eq("user_book_id", userBookId)
          .order("read_on", { ascending: false })
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("user_book_words")
          .select("id", { count: "exact", head: true })
          .eq("user_book_id", userBookId),
      ]);

    if (sessionsError) throw sessionsError;
    if (wordCountError) throw wordCountError;

    return NextResponse.json({
      sessions: sessions ?? [],
      wordCount: wordCount ?? 0,
    });
  } catch (error: any) {
    console.error("Error loading reading sessions:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load reading sessions." },
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
    const access = await requireAuthorizedBook(req, userBookId);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const payload = normalizeSessionPayload(body);

    if (!payload.read_on) {
      return NextResponse.json({ error: "Session date is required." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("user_book_reading_sessions")
      .insert({
        user_book_id: userBookId,
        ...payload,
      })
      .select("id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode")
      .single();

    if (sessionError) throw sessionError;

    let userBookPatch: { started_at: string | null; personal_tracking_status: "reading" } | null = null;
    if (!access.userBook.started_at) {
      const { data: updatedBook, error: updateError } = await supabaseAdmin
        .from("user_books")
        .update({
          status: "reading",
          personal_tracking_status: "reading",
          started_at: payload.read_on,
        })
        .eq("id", userBookId)
        .select("started_at, personal_tracking_status")
        .maybeSingle();

      if (updateError) throw updateError;
      userBookPatch = {
        started_at: (updatedBook as any)?.started_at ?? payload.read_on,
        personal_tracking_status: "reading",
      };
    }

    return NextResponse.json({ session, userBookPatch });
  } catch (error: any) {
    console.error("Error saving reading session:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not save reading session." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const { userBookId } = await context.params;
    const access = await requireAuthorizedBook(req, userBookId);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await req.json().catch(() => ({}));

    if (body?.kind === "book_dates") {
      const { data, error } = await supabaseAdmin
        .from("user_books")
        .update({
          status: body.status,
          started_at: body.started_at ?? null,
          finished_at: body.finished_at ?? null,
          dnf_at: body.dnf_at ?? null,
          dnf_reason: body.dnf_reason ?? null,
          dnf_note: body.dnf_note ?? null,
          would_retry: body.would_retry ?? null,
        })
        .eq("id", userBookId)
        .select("started_at, finished_at, dnf_at, dnf_reason, dnf_note, would_retry")
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ userBook: data });
    }

    const sessionId = typeof body?.id === "string" ? body.id : "";
    if (!sessionId) {
      return NextResponse.json({ error: "Session id is required." }, { status: 400 });
    }

    const payload = normalizeSessionPayload(body);
    if (!payload.read_on) {
      return NextResponse.json({ error: "Session date is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("user_book_reading_sessions")
      .update(payload)
      .eq("id", sessionId)
      .eq("user_book_id", userBookId)
      .select("id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode")
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (error: any) {
    console.error("Error updating reading sessions:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not update reading sessions." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const { userBookId } = await context.params;
    const access = await requireAuthorizedBook(req, userBookId);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.id === "string" ? body.id : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Session id is required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("user_book_reading_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_book_id", userBookId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting reading session:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not delete reading session." },
      { status: 500 }
    );
  }
}
