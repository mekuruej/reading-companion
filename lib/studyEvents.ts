import { supabase } from "@/lib/supabaseClient";

export type StudyMode =
  | "study_flashcards"
  | "reading_flashcards"
  | "kanji_reading_flashcards"
  | "other";

export type StudyResult = "reviewed" | "correct" | "incorrect" | "skipped";

type RecordStudyEventInput = {
  userBookId?: string | null;
  userBookWordId?: string | null;
  studyMode?: StudyMode;
  cardType?: string | null;
  result?: StudyResult;
  isCorrect?: boolean | null;
  surface?: string | null;
  reading?: string | null;
  meaning?: string | null;
};

function cleanUuid(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    text
  )
    ? text
    : null;
}

function describeSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") return error;

  const err = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    name?: string;
  };

  return {
    message: err.message ?? null,
    details: err.details ?? null,
    hint: err.hint ?? null,
    code: err.code ?? null,
    name: err.name ?? null,
  };
}

export async function recordStudyEvent(input: RecordStudyEventInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn("Could not record study event: no user found", describeSupabaseError(userError));
    return { ok: false, error: userError ?? new Error("No user found") };
  }

  const { error } = await supabase.from("user_study_events").insert({
    user_id: user.id,
    user_book_id: cleanUuid(input.userBookId),
    user_book_word_id: cleanUuid(input.userBookWordId),
    study_mode: input.studyMode ?? "study_flashcards",
    card_type: input.cardType ?? null,
    result: input.result ?? "reviewed",
    is_correct: input.isCorrect ?? null,
    surface: input.surface ?? null,
    reading: input.reading ?? null,
    meaning: input.meaning ?? null,
  });

  if (error) {
    console.warn("Error recording study event:", describeSupabaseError(error), {
      studyMode: input.studyMode ?? "study_flashcards",
      cardType: input.cardType ?? null,
      hasUserBookId: Boolean(cleanUuid(input.userBookId)),
      hasUserBookWordId: Boolean(cleanUuid(input.userBookWordId)),
    });
    return { ok: false, error };
  }

  return { ok: true, error: null };
}
