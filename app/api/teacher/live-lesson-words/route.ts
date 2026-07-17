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

type AuthorizedBook = {
  id: string;
  user_id: string;
  book_id: string;
  books?: {
    title?: string | null;
    cover_url?: string | null;
    language_code?: string | null;
  } | null;
};

type LiveLessonSessionStatus =
  | "capturing"
  | "reviewing"
  | "deferred"
  | "completed"
  | "cancelled";

type LiveLessonSessionRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  user_book_id: string;
  status: LiveLessonSessionStatus;
  started_at: string | null;
  ended_adding_at: string | null;
  review_started_at: string | null;
  review_deferred_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  stopping_page_number: number | null;
  stopping_text: string | null;
  stopping_point_saved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LiveLessonWordUpdate = {
  id?: string;
  surface?: unknown;
  reading?: unknown;
  meaning?: unknown;
  meaning_choices?: unknown;
  meaningChoices?: unknown;
  meaning_choice_index?: unknown;
  meaningChoiceIndex?: unknown;
  page_number?: unknown;
  pageNumber?: unknown;
  chapter_number?: unknown;
  chapterNumber?: unknown;
  chapter_name?: unknown;
  chapterName?: unknown;
  target_language_code?: unknown;
  targetLanguageCode?: unknown;
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

function toNullableInt(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const numberValue = Number(text);
  if (!Number.isInteger(numberValue)) return null;
  return numberValue;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned || null;
}

function nullableLimitedText(value: unknown, maxLength: number) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
}

function nullableNonNegativeInt(value: unknown) {
  if (value == null) return null;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) return null;
  return numberValue;
}

function supportLanguageForTarget(targetLanguageCode: string) {
  return targetLanguageCode === "en" ? "ja" : "en";
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function isReadyForFlashcards(word: any) {
  const targetLanguageCode = cleanString(
    word?.target_language_code ?? word?.targetLanguageCode
  );
  const surface = cleanString(word?.surface);
  const reading = cleanString(word?.reading);
  const meaning = cleanString(word?.meaning);

  if (!surface || !meaning) return false;
  if (targetLanguageCode === "en") return true;
  return !!reading;
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

async function authorizeTeacherForStudentBook({
  actorId,
  studentId,
  userBookId,
}: {
  actorId: string;
  studentId: string;
  userBookId: string;
}) {
  const profile = await getProfile(actorId);

  if (!isTeacher(profile)) {
    return {
      ok: false as const,
      error: "Teacher access is required.",
      status: 403,
    };
  }

  const { data: userBook, error: userBookError } = await supabaseAdmin
    .from("user_books")
    .select(
      `
      id,
      user_id,
      book_id,
      books:book_id (
        title,
        cover_url,
        language_code
      )
    `
    )
    .eq("id", userBookId)
    .maybeSingle();

  if (userBookError) throw userBookError;

  if (!userBook) {
    return {
      ok: false as const,
      error: "This student book could not be found.",
      status: 404,
    };
  }

  const loadedUserBook = userBook as AuthorizedBook;
  if (loadedUserBook.user_id !== studentId) {
    return {
      ok: false as const,
      error: "This book does not belong to that student.",
      status: 403,
    };
  }

  if (!isSuperTeacher(profile)) {
    const { data: link, error: linkError } = await supabaseAdmin
      .from("teacher_students")
      .select("teacher_id")
      .eq("teacher_id", actorId)
      .eq("student_id", studentId)
      .is("archived_at", null)
      .maybeSingle();

    if (linkError) throw linkError;

    if (!link) {
      return {
        ok: false as const,
        error: "You do not have access to this student's book.",
        status: 403,
      };
    }
  }

  return {
    ok: true as const,
    profile,
    userBook: loadedUserBook,
  };
}

async function nextPageOrder(
  userBookId: string,
  chapterNumber: number | null,
  pageNumber: number | null
) {
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

  return (
    Math.max(0, ...(data ?? []).map((row: any) => Number(row.page_order) || 0)) +
    1
  );
}

function wordSelect() {
  return `
    id,
    vocabulary_cache_id,
    surface,
    reading,
    meaning,
    page_number,
    page_order,
    chapter_number,
    chapter_name,
    target_language_code,
    support_language_code,
    item_type,
    meaning_choices,
    meaning_choice_index,
    jlpt,
    is_common,
    excluded_from_flashcards,
    hidden,
    created_at
  `;
}

function sessionSelect() {
  return `
    id,
    teacher_id,
    student_id,
    user_book_id,
    status,
    started_at,
    ended_adding_at,
    review_started_at,
    review_deferred_at,
    completed_at,
    cancelled_at,
    stopping_page_number,
    stopping_text,
    stopping_point_saved_at,
    created_at,
    updated_at
  `;
}

async function loadLatestStoppingPoint({
  actorId,
  studentId,
  userBookId,
}: {
  actorId: string;
  studentId: string;
  userBookId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("live_lesson_capture_sessions")
    .select(
      "id, stopping_page_number, stopping_text, stopping_point_saved_at, status"
    )
    .eq("teacher_id", actorId)
    .eq("student_id", studentId)
    .eq("user_book_id", userBookId)
    .not("stopping_point_saved_at", "is", null)
    .neq("status", "cancelled")
    .order("stopping_point_saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    sessionId: (data as any).id as string,
    pageNumber: (data as any).stopping_page_number as number | null,
    endingText: (data as any).stopping_text as string | null,
    savedAt: (data as any).stopping_point_saved_at as string | null,
    status: (data as any).status as string | null,
  };
}

async function loadSession({
  sessionId,
  actorId,
  studentId,
  userBookId,
}: {
  sessionId: string;
  actorId: string;
  studentId: string;
  userBookId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("live_lesson_capture_sessions")
    .select(sessionSelect())
    .eq("id", sessionId)
    .eq("teacher_id", actorId)
    .eq("student_id", studentId)
    .eq("user_book_id", userBookId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as LiveLessonSessionRow | null;
}

async function getLatestUnfinishedSession({
  actorId,
  studentId,
  userBookId,
}: {
  actorId: string;
  studentId: string;
  userBookId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("live_lesson_capture_sessions")
    .select(sessionSelect())
    .eq("teacher_id", actorId)
    .eq("student_id", studentId)
    .eq("user_book_id", userBookId)
    .in("status", ["capturing", "reviewing", "deferred"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as LiveLessonSessionRow | null;
}

async function createSession({
  actorId,
  studentId,
  userBookId,
  startedAt,
}: {
  actorId: string;
  studentId: string;
  userBookId: string;
  startedAt?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("live_lesson_capture_sessions")
    .insert({
      teacher_id: actorId,
      student_id: studentId,
      user_book_id: userBookId,
      status: "capturing",
      started_at: startedAt ?? new Date().toISOString(),
    })
    .select(sessionSelect())
    .single();

  if (error) throw error;
  return data as unknown as LiveLessonSessionRow;
}

async function ensureCaptureSession({
  requestedSessionId,
  actorId,
  studentId,
  userBookId,
}: {
  requestedSessionId?: string | null;
  actorId: string;
  studentId: string;
  userBookId: string;
}) {
  if (requestedSessionId) {
    const requested = await loadSession({
      sessionId: requestedSessionId,
      actorId,
      studentId,
      userBookId,
    });
    if (requested && ["capturing", "reviewing", "deferred"].includes(requested.status)) {
      return requested;
    }
  }

  const existing = await getLatestUnfinishedSession({ actorId, studentId, userBookId });
  if (existing?.status === "capturing") return existing;

  return createSession({ actorId, studentId, userBookId });
}

async function loadSessionWords(sessionId: string) {
  const { data: links, error: linkError } = await supabaseAdmin
    .from("live_lesson_capture_session_words")
    .select("user_book_word_id, position, captured_at")
    .eq("session_id", sessionId)
    .order("position", { ascending: true })
    .order("captured_at", { ascending: true });

  if (linkError) throw linkError;

  const ids = (links ?? [])
    .map((link: any) => link.user_book_word_id)
    .filter(Boolean);

  if (ids.length === 0) return [];

  const { data: words, error: wordError } = await supabaseAdmin
    .from("user_book_words")
    .select(wordSelect())
    .in("id", ids);

  if (wordError) throw wordError;

  const wordById = new Map((words ?? []).map((word: any) => [word.id, word]));
  return (links ?? [])
    .map((link: any) => {
      const word = wordById.get(link.user_book_word_id);
      return word
        ? {
            ...word,
            live_lesson_position: link.position,
            live_lesson_captured_at: link.captured_at,
          }
        : null;
    })
    .filter(Boolean);
}

async function nextSessionPosition(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("live_lesson_capture_session_words")
    .select("position")
    .eq("session_id", sessionId)
    .order("position", { ascending: false })
    .limit(1);

  if (error) throw error;
  const current = Number(data?.[0]?.position);
  return Number.isFinite(current) ? current + 1 : 1;
}

async function attachWordToSession({
  sessionId,
  wordId,
  position,
}: {
  sessionId: string;
  wordId: string;
  position: number;
}) {
  const { error } = await supabaseAdmin
    .from("live_lesson_capture_session_words")
    .upsert(
      {
        session_id: sessionId,
        user_book_word_id: wordId,
        position,
      },
      { onConflict: "session_id,user_book_word_id" }
    );

  if (error) throw error;
}

async function saveReviewWords({
  sessionId,
  userBookId,
  words,
  finalizeReadiness,
}: {
  sessionId: string;
  userBookId: string;
  words: LiveLessonWordUpdate[];
  finalizeReadiness: boolean;
}) {
  if (words.length === 0) return;

  const { data: links, error: linkError } = await supabaseAdmin
    .from("live_lesson_capture_session_words")
    .select("user_book_word_id")
    .eq("session_id", sessionId);

  if (linkError) throw linkError;

  const allowedIds = new Set(
    (links ?? []).map((link: any) => String(link.user_book_word_id))
  );

  for (const word of words) {
    const id = cleanString(word.id);
    if (!id || !allowedIds.has(id)) continue;

    const surface = cleanString(word.surface);
    const targetLanguageCode = cleanString(
      word.target_language_code ?? word.targetLanguageCode
    );
    const payload: Record<string, unknown> = {
      surface,
      encountered_surface: surface,
      base_form: surface,
      lookup_surface: surface,
      reading: nullableText(word.reading),
      meaning: nullableText(word.meaning),
      meaning_choices: stringArray(word.meaning_choices ?? word.meaningChoices),
      meaning_choice_index: nullableNonNegativeInt(
        word.meaning_choice_index ?? word.meaningChoiceIndex
      ),
      page_number: toNullableInt(word.page_number ?? word.pageNumber),
      chapter_number: toNullableInt(word.chapter_number ?? word.chapterNumber),
      chapter_name: nullableText(word.chapter_name ?? word.chapterName),
    };

    if (finalizeReadiness) {
      payload.excluded_from_flashcards = !isReadyForFlashcards({
        ...word,
        surface,
        target_language_code: targetLanguageCode,
      });
    }

    const { error } = await supabaseAdmin
      .from("user_book_words")
      .update(payload)
      .eq("id", id)
      .eq("user_book_id", userBookId);

    if (error) throw error;
  }
}

function normalizeTransition(action: unknown): LiveLessonSessionStatus | null {
  if (action === "end-adding") return "reviewing";
  if (action === "review-later") return "deferred";
  if (action === "finish-review") return "completed";
  return null;
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const studentId = cleanString(url.searchParams.get("studentId"));
    const userBookId = cleanString(url.searchParams.get("userBookId"));
    const sessionId = cleanString(url.searchParams.get("sessionId"));
    const ids = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 100);

    if (!studentId || !userBookId) {
      return NextResponse.json(
        { error: "studentId and userBookId are required." },
        { status: 400 }
      );
    }

    const access = await authorizeTeacherForStudentBook({
      actorId: auth.user.id,
      studentId,
      userBookId,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    if (ids.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("user_book_words")
        .select(wordSelect())
        .eq("user_book_id", userBookId)
        .in("id", ids)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return NextResponse.json({ words: data ?? [] });
    }

    const latestStoppingPoint = await loadLatestStoppingPoint({
      actorId: auth.user.id,
      studentId,
      userBookId,
    });

    const session = sessionId
      ? await loadSession({
          sessionId,
          actorId: auth.user.id,
          studentId,
          userBookId,
        })
      : await getLatestUnfinishedSession({
          actorId: auth.user.id,
          studentId,
          userBookId,
        });

    if (!session) {
      return NextResponse.json({
        session: null,
        words: [],
        latestStoppingPoint,
      });
    }

    const words = await loadSessionWords(session.id);
    return NextResponse.json({ session, words, latestStoppingPoint });
  } catch (error: any) {
    console.error("Live Lesson restore error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not restore Live Lesson words." },
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
    const action = cleanString(body?.action);
    const studentId = cleanString(body?.studentId);
    const userBookId = cleanString(body?.userBookId);

    if (!studentId || !userBookId) {
      return NextResponse.json(
        { error: "studentId and userBookId are required." },
        { status: 400 }
      );
    }

    const access = await authorizeTeacherForStudentBook({
      actorId: auth.user.id,
      studentId,
      userBookId,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    if (action === "migrate-local-session") {
      const rawStartedAt = Number(body?.startedAt);
      const startedAt =
        Number.isFinite(rawStartedAt) && rawStartedAt > 0
          ? new Date(rawStartedAt).toISOString()
          : null;
      const rowIds = Array.isArray(body?.rowIds)
        ? body.rowIds.map((id: unknown) => cleanString(id)).filter(Boolean).slice(0, 100)
        : [];

      const session = await createSession({
        actorId: auth.user.id,
        studentId,
        userBookId,
        startedAt,
      });

      if (rowIds.length > 0) {
        const { data: rows, error: rowsError } = await supabaseAdmin
          .from("user_book_words")
          .select("id")
          .eq("user_book_id", userBookId)
          .in("id", rowIds);

        if (rowsError) throw rowsError;

        const validIds = new Set((rows ?? []).map((row: any) => String(row.id)));
        for (let index = 0; index < rowIds.length; index += 1) {
          const rowId = rowIds[index];
          if (!validIds.has(rowId)) continue;
          await attachWordToSession({
            sessionId: session.id,
            wordId: rowId,
            position: index + 1,
          });
        }
      }

      return NextResponse.json({
        session,
        words: await loadSessionWords(session.id),
      });
    }

    const surface = cleanString(body?.surface);

    if (!surface) {
      return NextResponse.json({ error: "Word is required." }, { status: 400 });
    }

    const session = await ensureCaptureSession({
      requestedSessionId: cleanString(body?.sessionId),
      actorId: auth.user.id,
      studentId,
      userBookId,
    });

    const targetLanguageCode =
      access.userBook.books?.language_code?.trim() || "ja";
    const supportLanguageCode = supportLanguageForTarget(targetLanguageCode);
    const pageNumber = toNullableInt(body?.page);
    const chapterNumber = toNullableInt(body?.chapterNumber);
    const chapterName = cleanString(body?.chapterName) || null;

    const payload = {
      user_book_id: userBookId,
      vocabulary_cache_id: null,
      surface,
      encountered_surface: surface,
      base_form: surface,
      lookup_surface: surface,
      target_language_code: targetLanguageCode,
      support_language_code: supportLanguageCode,
      item_type: "word",
      reading: null,
      meaning: null,
      other_definition: null,
      meaning_choices: [],
      meaning_choice_index: null,
      jlpt: null,
      is_common: null,
      page_number: pageNumber,
      page_order: await nextPageOrder(userBookId, chapterNumber, pageNumber),
      chapter_number: chapterNumber,
      chapter_name: chapterName,
      hidden: false,
      excluded_from_flashcards: true,
      seen_on: todayYmd(),
    };

    const { data, error } = await supabaseAdmin
      .from("user_book_words")
      .insert(payload)
      .select(wordSelect())
      .single();

    if (error) throw error;

    const insertedWord = data as any;

    await attachWordToSession({
      sessionId: session.id,
      wordId: insertedWord.id,
      position: await nextSessionPosition(session.id),
    });

    return NextResponse.json({
      session,
      word: insertedWord,
      words: await loadSessionWords(session.id),
    });
  } catch (error: any) {
    console.error("Live Lesson capture error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not save this word." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const studentId = cleanString(body?.studentId);
    const userBookId = cleanString(body?.userBookId);
    const sessionId = cleanString(body?.sessionId);
    const nextStatus = normalizeTransition(body?.action);
    const shouldSaveStoppingPoint =
      body?.action === "end-adding" && body?.saveStoppingPoint === true;

    if (!studentId || !userBookId || !sessionId) {
      return NextResponse.json(
        { error: "studentId, userBookId, and sessionId are required." },
        { status: 400 }
      );
    }

    const access = await authorizeTeacherForStudentBook({
      actorId: auth.user.id,
      studentId,
      userBookId,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const session = await loadSession({
      sessionId,
      actorId: auth.user.id,
      studentId,
      userBookId,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Live Lesson session could not be found." },
        { status: 404 }
      );
    }

    const words = Array.isArray(body?.words) ? body.words : [];
    await saveReviewWords({
      sessionId,
      userBookId,
      words,
      finalizeReadiness: nextStatus === "completed",
    });

    const timestamp = new Date().toISOString();
    const payload: Record<string, unknown> = {};

    if (nextStatus) {
      payload.status = nextStatus;
      if (nextStatus === "reviewing") {
        payload.ended_adding_at = timestamp;
        payload.review_started_at = session.review_started_at ?? timestamp;
        if (shouldSaveStoppingPoint) {
          const stoppingPageNumber = toNullableInt(body?.stoppingPageNumber);
          const stoppingText = nullableLimitedText(body?.stoppingText, 500);

          if (stoppingPageNumber == null && !stoppingText) {
            return NextResponse.json(
              { error: "Add a stopping page or ending text, or choose Skip." },
              { status: 400 }
            );
          }

          payload.stopping_page_number = stoppingPageNumber;
          payload.stopping_text = stoppingText;
          payload.stopping_point_saved_at = timestamp;
        }
      }
      if (nextStatus === "deferred") {
        payload.review_deferred_at = timestamp;
      }
      if (nextStatus === "completed") {
        payload.completed_at = timestamp;
      }
    }

    const { data: updatedSession, error } = await supabaseAdmin
      .from("live_lesson_capture_sessions")
      .update(payload)
      .eq("id", sessionId)
      .eq("teacher_id", auth.user.id)
      .eq("student_id", studentId)
      .eq("user_book_id", userBookId)
      .select(sessionSelect())
      .single();

    if (error) throw error;

    const savedSession = updatedSession as unknown as LiveLessonSessionRow;

    return NextResponse.json({
      session: savedSession,
      words: await loadSessionWords(sessionId),
      latestStoppingPoint: await loadLatestStoppingPoint({
        actorId: auth.user.id,
        studentId,
        userBookId,
      }),
    });
  } catch (error: any) {
    console.error("Live Lesson session update error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not update this Live Lesson session." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const studentId = cleanString(body?.studentId);
    const userBookId = cleanString(body?.userBookId);
    const wordId = cleanString(body?.wordId);

    if (!studentId || !userBookId || !wordId) {
      return NextResponse.json(
        { error: "studentId, userBookId, and wordId are required." },
        { status: 400 }
      );
    }

    const access = await authorizeTeacherForStudentBook({
      actorId: auth.user.id,
      studentId,
      userBookId,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    await supabaseAdmin
      .from("live_lesson_capture_session_words")
      .delete()
      .eq("user_book_word_id", wordId);

    const { error } = await supabaseAdmin
      .from("user_book_words")
      .delete()
      .eq("id", wordId)
      .eq("user_book_id", userBookId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Live Lesson delete error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not delete this word." },
      { status: 500 }
    );
  }
}
