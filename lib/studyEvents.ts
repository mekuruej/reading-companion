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

export async function recordStudyEvent(input: RecordStudyEventInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Could not record study event: no user found", userError);
    return { ok: false, error: userError ?? new Error("No user found") };
  }

  const { error } = await supabase.from("user_study_events").insert({
    user_id: user.id,
    user_book_id: input.userBookId ?? null,
    user_book_word_id: input.userBookWordId ?? null,
    study_mode: input.studyMode ?? "study_flashcards",
    card_type: input.cardType ?? null,
    result: input.result ?? "reviewed",
    is_correct: input.isCorrect ?? null,
    surface: input.surface ?? null,
    reading: input.reading ?? null,
    meaning: input.meaning ?? null,
  });

  if (error) {
    console.error("Error recording study event:", error);
    return { ok: false, error };
  }

  return { ok: true, error: null };
}