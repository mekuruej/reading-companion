"use client";

type SupabaseClientLike = any;
import { parseOptionalPageLocationInput } from "@/lib/pageLocation";

export type SharedVocabularyOrigin = "my_library" | "teaching";
export type SharedTeacherVocabularyWord = {
  id: string;
  source: "personal" | "teaching" | "both";
  personalWordId: string | null;
  teacherVocabularyId: string | null;
  surface: string;
  reading: string | null;
  meaning: string | null;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  pageNumber: number | null;
  pageOrder: number | null;
  chapterNumber: number | null;
  chapterName: string | null;
  jlpt: string | null;
  vocabularyCacheId: number | null;
  hiddenFromMyLibrary: boolean;
  hiddenFromTeaching: boolean;
  includedInFollowAlong: boolean;
  followAlongOrder: number | null;
  followAlongSupportNote: string | null;
  origins: SharedVocabularyOrigin[];
  createdAt: string | null;
};

export type TeacherBookContext = {
  teacherBookId: string;
  teacherId: string;
  bookId: string;
  linkedUserBookId: string | null;
  personalUserBookId: string | null;
  pageCount: number | null;
};

export type TeacherVocabularyCaptureInput = {
  surface: string;
  cacheSurface?: string;
  reading?: string;
  meaning?: string;
  meaningChoices?: string[];
  meaningChoiceIndex?: number | null;
  isManual?: boolean;
  pageNumber?: string;
  chapterNumber?: string;
  chapterName?: string;
  followAlongSupportNote?: string;
};

export type TeacherVocabularySaveResult = {
  id: string;
  status: "added" | "already-included" | "readded";
};

export function isTeacherProfile(profile: any) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

export function normalizeSharedVocabularyText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function asStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function dedupeKeyForParts(surface: string | null | undefined, reading: string | null | undefined, meaning: string | null | undefined) {
  const cleanSurface = normalizeSharedVocabularyText(surface);
  const cleanReading = normalizeSharedVocabularyText(reading);
  const cleanMeaning = normalizeSharedVocabularyText(meaning);
  if (!cleanSurface || !cleanMeaning) return "";
  return `${cleanSurface}||${cleanReading}||${cleanMeaning}`;
}

function isMissingTeacherVocabularyTable(error: any) {
  const text = String(error?.message ?? error?.details ?? error?.code ?? "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST205" ||
    text.includes("teacher_book_vocabulary")
  );
}

function isUniqueConstraintError(error: any) {
  return error?.code === "23505";
}

function toNullableInt(value: string | number | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return null;
  return Math.trunc(number);
}

function normalizedNullableText(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function arrayFromStrings(value: string[] | null | undefined) {
  return (value ?? []).map((item) => String(item).trim()).filter(Boolean);
}

function sameNullableText(a: string | null | undefined, b: string | null | undefined) {
  return normalizeSharedVocabularyText(a) === normalizeSharedVocabularyText(b);
}

function sameCapturedMeaning(a: string | null | undefined, b: string | null | undefined) {
  const cleanA = normalizeSharedVocabularyText(a);
  const cleanB = normalizeSharedVocabularyText(b);
  return !cleanA || !cleanB || cleanA === cleanB;
}

async function getOrCreateVocabularyCacheId(
  supabase: SupabaseClientLike,
  surface: string,
  reading: string | null,
  isManual: boolean
) {
  const cacheSurface = surface.trim();
  const cacheReading = String(reading ?? "").trim();
  if (!cacheSurface || isManual) return null;

  const { data: existing, error: lookupError } = await supabase
    .from("vocabulary_cache")
    .select("id")
    .eq("surface", cacheSurface)
    .eq("reading", cacheReading)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing?.id) return Number(existing.id);

  const { data: created, error: createError } = await supabase
    .from("vocabulary_cache")
    .insert({
      surface: cacheSurface,
      reading: cacheReading,
    })
    .select("id")
    .single();

  if (createError) {
    if (!isUniqueConstraintError(createError)) throw createError;

    const { data: retry, error: retryError } = await supabase
      .from("vocabulary_cache")
      .select("id")
      .eq("surface", cacheSurface)
      .eq("reading", cacheReading)
      .maybeSingle();

    if (retryError) throw retryError;
    if (retry?.id) return Number(retry.id);
  }

  return created?.id == null ? null : Number(created.id);
}

async function getNextFollowAlongOrder(
  supabase: SupabaseClientLike,
  teacherBookId: string
) {
  const { data, error } = await supabase
    .from("teacher_book_vocabulary")
    .select("follow_along_order")
    .eq("teacher_book_id", teacherBookId)
    .eq("included_in_follow_along", true);

  if (error) throw error;

  return Math.max(
    0,
    ...((data ?? []).map((row: any) => Number(row.follow_along_order) || 0))
  ) + 1;
}

async function findMatchingPersonalWord(
  supabase: SupabaseClientLike,
  context: TeacherBookContext,
  values: {
    surface: string;
    reading: string | null;
    meaning: string | null;
    vocabularyCacheId: number | null;
  }
) {
  const personalUserBookId = context.personalUserBookId ?? context.linkedUserBookId;
  if (!personalUserBookId) return null;

  const { data, error } = await supabase
    .from("user_book_words")
    .select("id, surface, reading, meaning, meaning_choices, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, vocabulary_cache_id, created_at")
    .eq("user_book_id", personalUserBookId);

  if (error) throw error;

  return (
    (data ?? []).find((row: any) => {
      const cacheMatches =
        values.vocabularyCacheId != null &&
        row.vocabulary_cache_id != null &&
        Number(row.vocabulary_cache_id) === values.vocabularyCacheId;
      const textMatches =
        sameNullableText(row.surface, values.surface) &&
        sameNullableText(row.reading, values.reading) &&
        sameCapturedMeaning(row.meaning, values.meaning);

      return cacheMatches || textMatches;
    }) ?? null
  );
}

async function findMatchingTeachingVocabulary(
  supabase: SupabaseClientLike,
  context: TeacherBookContext,
  values: {
    linkedUserBookWordId: string | null;
    surface: string;
    reading: string | null;
    meaning: string | null;
    vocabularyCacheId: number | null;
  }
) {
  if (values.linkedUserBookWordId) {
    const { data: linked, error: linkedError } = await supabase
      .from("teacher_book_vocabulary")
      .select("id, origin_my_library, origin_teaching, hidden_from_teaching, included_in_follow_along, follow_along_order, follow_along_support_note")
      .eq("teacher_book_id", context.teacherBookId)
      .eq("linked_user_book_word_id", values.linkedUserBookWordId)
      .limit(1)
      .maybeSingle();

    if (linkedError) throw linkedError;
    if (linked?.id) return linked;
  }

  const { data, error } = await supabase
    .from("teacher_book_vocabulary")
    .select("id, linked_user_book_word_id, vocabulary_cache_id, surface, reading, meaning, origin_my_library, origin_teaching, hidden_from_teaching, included_in_follow_along, follow_along_order, follow_along_support_note")
    .eq("teacher_book_id", context.teacherBookId);

  if (error) throw error;

  return (
    (data ?? []).find((row: any) => {
      if (row.linked_user_book_word_id) return false;
      if (!sameNullableText(row.surface, values.surface)) return false;
      if (!sameNullableText(row.reading, values.reading)) return false;

      if (values.vocabularyCacheId != null || row.vocabulary_cache_id != null) {
        return Number(row.vocabulary_cache_id ?? -1) === Number(values.vocabularyCacheId ?? -1);
      }

      return sameCapturedMeaning(row.meaning, values.meaning);
    }) ?? null
  );
}

function personalToShared(row: any): SharedTeacherVocabularyWord {
  return {
    id: `personal:${row.id}`,
    source: "personal",
    personalWordId: row.id,
    teacherVocabularyId: null,
    surface: row.surface ?? "",
    reading: row.reading ?? null,
    meaning: row.meaning ?? null,
    meaningChoices: asStringArray(row.meaning_choices),
    meaningChoiceIndex: typeof row.meaning_choice_index === "number" ? row.meaning_choice_index : null,
    pageNumber: row.page_number ?? null,
    pageOrder: row.page_order ?? null,
    chapterNumber: row.chapter_number ?? null,
    chapterName: row.chapter_name ?? null,
    jlpt: row.jlpt ?? null,
    vocabularyCacheId: row.vocabulary_cache_id ?? null,
    hiddenFromMyLibrary: Boolean(row.hidden),
    hiddenFromTeaching: false,
    includedInFollowAlong: false,
    followAlongOrder: null,
    followAlongSupportNote: null,
    origins: ["my_library"],
    createdAt: row.created_at ?? null,
  };
}

function teachingToShared(row: any): SharedTeacherVocabularyWord {
  return {
    id: `teaching:${row.id}`,
    source: "teaching",
    personalWordId: row.linked_user_book_word_id ?? null,
    teacherVocabularyId: row.id,
    surface: row.surface ?? "",
    reading: row.reading ?? null,
    meaning: row.meaning ?? null,
    meaningChoices: asStringArray(row.meaning_choices),
    meaningChoiceIndex: typeof row.meaning_choice_index === "number" ? row.meaning_choice_index : null,
    pageNumber: row.page_number ?? null,
    pageOrder: row.page_order ?? null,
    chapterNumber: row.chapter_number ?? null,
    chapterName: row.chapter_name ?? null,
    jlpt: null,
    vocabularyCacheId: row.vocabulary_cache_id ?? null,
    hiddenFromMyLibrary: Boolean(row.hidden_from_my_library),
    hiddenFromTeaching: Boolean(row.hidden_from_teaching),
    includedInFollowAlong: Boolean(row.included_in_follow_along),
    followAlongOrder: row.follow_along_order ?? null,
    followAlongSupportNote: row.follow_along_support_note ?? null,
    origins: [
      ...(row.origin_my_library ? ["my_library" as const] : []),
      ...(row.origin_teaching ? ["teaching" as const] : []),
    ],
    createdAt: row.created_at ?? null,
  };
}

function mergeSharedVocabulary(personalRows: any[], teachingRows: any[]) {
  const merged = new Map<string, SharedTeacherVocabularyWord>();

  for (const row of personalRows) {
    const word = personalToShared(row);
    const key = word.personalWordId ? `personal:${word.personalWordId}` : dedupeKeyForParts(word.surface, word.reading, word.meaning);
    if (!key) continue;
    merged.set(key, word);
  }

  for (const row of teachingRows) {
    const word = teachingToShared(row);
    const key =
      word.personalWordId && merged.has(`personal:${word.personalWordId}`)
        ? `personal:${word.personalWordId}`
        : dedupeKeyForParts(word.surface, word.reading, word.meaning) || `teaching:${word.teacherVocabularyId}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, word);
      continue;
    }

    merged.set(key, {
      ...existing,
      source: existing.source === "personal" ? "both" : existing.source,
      teacherVocabularyId: word.teacherVocabularyId,
      hiddenFromMyLibrary: word.hiddenFromMyLibrary,
      hiddenFromTeaching: word.hiddenFromTeaching,
      includedInFollowAlong: word.includedInFollowAlong,
      followAlongOrder: word.followAlongOrder,
      followAlongSupportNote: word.followAlongSupportNote,
      origins: Array.from(new Set([...existing.origins, ...word.origins])),
    });
  }

  return Array.from(merged.values()).sort((a, b) => {
    const aOrder = a.followAlongOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.followAlongOrder ?? Number.MAX_SAFE_INTEGER;
    if (a.includedInFollowAlong !== b.includedInFollowAlong) return a.includedInFollowAlong ? -1 : 1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aPage = a.pageNumber ?? Number.MAX_SAFE_INTEGER;
    const bPage = b.pageNumber ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;
    return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
  });
}

export async function loadTeacherBookContext(
  supabase: SupabaseClientLike,
  teacherBookId: string,
  currentUserId: string
): Promise<TeacherBookContext> {
  const { data, error } = await supabase
    .from("teacher_books")
    .select("id, teacher_id, book_id, user_book_id, books:book_id ( page_count )")
    .eq("id", teacherBookId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("This Teacher Book could not be found.");
  if (data.teacher_id !== currentUserId) throw new Error("You do not have access to this Teacher Book vocabulary.");

  const { data: personalRows, error: personalError } = await supabase
    .from("user_books")
    .select("id")
    .eq("user_id", currentUserId)
    .eq("book_id", data.book_id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (personalError) throw personalError;

  return {
    teacherBookId: data.id,
    teacherId: data.teacher_id,
    bookId: data.book_id,
    linkedUserBookId: data.user_book_id ?? null,
    personalUserBookId: data.user_book_id ?? personalRows?.[0]?.id ?? null,
    pageCount: Array.isArray((data as any).books)
      ? (data as any).books[0]?.page_count ?? null
      : (data as any).books?.page_count ?? null,
  };
}

export async function loadSharedTeacherVocabulary(
  supabase: SupabaseClientLike,
  context: TeacherBookContext,
  options: { view: "teaching" | "my_library"; showHidden?: boolean; followAlongOnly?: boolean } = { view: "teaching" }
) {
  const personalUserBookId = context.personalUserBookId ?? context.linkedUserBookId;
  const personalRows = personalUserBookId
    ? await supabase
        .from("user_book_words")
        .select("id, user_book_id, surface, reading, meaning, jlpt, page_number, page_order, chapter_number, chapter_name, created_at, hidden, meaning_choices, meaning_choice_index, target_language_code, vocabulary_cache_id")
        .eq("user_book_id", personalUserBookId)
        .or("target_language_code.is.null,target_language_code.eq.ja")
        .then((result: any) => {
          if (result.error) throw result.error;
          return result.data ?? [];
        })
    : [];

  const teachingResult = await supabase
    .from("teacher_book_vocabulary")
    .select("id, linked_user_book_word_id, source_teacher_book_item_id, vocabulary_cache_id, surface, reading, meaning, meaning_choices, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, origin_my_library, origin_teaching, hidden_from_my_library, hidden_from_teaching, included_in_follow_along, follow_along_order, follow_along_support_note, created_at")
    .eq("teacher_book_id", context.teacherBookId);

  if (teachingResult.error) {
    if (!isMissingTeacherVocabularyTable(teachingResult.error)) throw teachingResult.error;
    return mergeSharedVocabulary(personalRows, []);
  }

  return mergeSharedVocabulary(personalRows, teachingResult.data ?? []).filter((word) => {
    if (options.followAlongOnly && !word.includedInFollowAlong) return false;
    if (options.showHidden) return true;
    if (options.view === "my_library") return !word.hiddenFromMyLibrary;
    return !word.hiddenFromTeaching;
  });
}

export async function createTeachingVocabularyWord(
  supabase: SupabaseClientLike,
  context: TeacherBookContext,
  values: {
    surface: string;
    reading?: string;
    meaning?: string;
    pageNumber?: string;
    followAlong?: boolean;
  }
) {
  const surface = values.surface.trim();
  if (!surface) throw new Error("Add a word first.");
  const parsedPageNumber = parseOptionalPageLocationInput(values.pageNumber, context.pageCount);
  if (parsedPageNumber.error) throw new Error(parsedPageNumber.error);

  const { data, error } = await supabase
    .from("teacher_book_vocabulary")
    .insert({
      teacher_book_id: context.teacherBookId,
      teacher_id: context.teacherId,
      book_id: context.bookId,
      surface,
      reading: values.reading?.trim() || null,
      meaning: values.meaning?.trim() || null,
      page_number: parsedPageNumber.value,
      origin_teaching: true,
      origin_my_library: false,
      included_in_follow_along: Boolean(values.followAlong),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id as string;
}

export async function saveTeacherVocabularyAndInclude(
  supabase: SupabaseClientLike,
  context: TeacherBookContext,
  values: TeacherVocabularyCaptureInput
): Promise<TeacherVocabularySaveResult> {
  const surface = normalizedNullableText(values.surface);
  if (!surface) throw new Error("Add a word first.");

  const reading = normalizedNullableText(values.reading);
  const meaning = normalizedNullableText(values.meaning);
  const meaningChoices = arrayFromStrings(values.meaningChoices);
  const meaningChoiceIndex =
    values.meaningChoiceIndex != null && values.meaningChoiceIndex >= 0
      ? values.meaningChoiceIndex
      : null;
  const parsedPageNumber = parseOptionalPageLocationInput(values.pageNumber, context.pageCount);
  if (parsedPageNumber.error) throw new Error(parsedPageNumber.error);
  const pageNumber = parsedPageNumber.value;
  const chapterNumber = toNullableInt(values.chapterNumber);
  const chapterName = normalizedNullableText(values.chapterName);
  const supportNote = normalizedNullableText(values.followAlongSupportNote);
  const cacheSurface = normalizedNullableText(values.cacheSurface) ?? surface;
  const vocabularyCacheId = await getOrCreateVocabularyCacheId(
    supabase,
    cacheSurface,
    reading,
    Boolean(values.isManual)
  );
  const personalWord = await findMatchingPersonalWord(supabase, context, {
    surface,
    reading,
    meaning,
    vocabularyCacheId,
  });
  const existing = await findMatchingTeachingVocabulary(supabase, context, {
    linkedUserBookWordId: personalWord?.id ?? null,
    surface,
    reading,
    meaning,
    vocabularyCacheId,
  });
  const wasIncluded = Boolean(existing?.included_in_follow_along);
  const wasHiddenFromTeaching = Boolean(existing?.hidden_from_teaching);
  const nextOrder = wasIncluded
    ? existing?.follow_along_order ?? null
    : await getNextFollowAlongOrder(supabase, context.teacherBookId);
  const nextSupportNote = supportNote ?? existing?.follow_along_support_note ?? null;

  const updatePayload = {
    vocabulary_cache_id: vocabularyCacheId,
    surface,
    reading,
    meaning,
    meaning_choices: meaningChoices,
    meaning_choice_index: meaningChoiceIndex,
    page_number: pageNumber,
    chapter_number: chapterNumber,
    chapter_name: chapterName,
    origin_my_library: Boolean(existing?.origin_my_library) || Boolean(personalWord?.id),
    origin_teaching: true,
    hidden_from_teaching: false,
    included_in_follow_along: true,
    follow_along_order: nextOrder,
    follow_along_support_note: nextSupportNote,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("teacher_book_vocabulary")
      .update(updatePayload)
      .eq("id", existing.id);

    if (error) throw error;
    return {
      id: existing.id as string,
      status: wasIncluded && !wasHiddenFromTeaching ? "already-included" : "readded",
    };
  }

  const insertPayload = {
    ...updatePayload,
    teacher_book_id: context.teacherBookId,
    teacher_id: context.teacherId,
    book_id: context.bookId,
    linked_user_book_word_id: personalWord?.id ?? null,
    page_order: null,
  };

  const { data, error } = await supabase
    .from("teacher_book_vocabulary")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const retry = await findMatchingTeachingVocabulary(supabase, context, {
      linkedUserBookWordId: personalWord?.id ?? null,
      surface,
      reading,
      meaning,
      vocabularyCacheId,
    });

    if (!retry?.id) throw error;

    const retryWasIncluded = Boolean(retry.included_in_follow_along);
    const { error: retryUpdateError } = await supabase
      .from("teacher_book_vocabulary")
      .update({
        ...updatePayload,
        follow_along_order: retryWasIncluded
          ? retry.follow_along_order ?? null
          : await getNextFollowAlongOrder(supabase, context.teacherBookId),
      })
      .eq("id", retry.id);

    if (retryUpdateError) throw retryUpdateError;
    return {
      id: retry.id as string,
      status: retryWasIncluded ? "already-included" : "readded",
    };
  }

  return { id: data?.id as string, status: "added" };
}

export async function ensureTeachingVocabularyAssociationForPersonalWord(
  supabase: SupabaseClientLike,
  context: TeacherBookContext,
  word: SharedTeacherVocabularyWord
) {
  if (word.teacherVocabularyId) return word.teacherVocabularyId;
  if (!word.personalWordId) {
    throw new Error("This word cannot be associated with Teaching yet.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("teacher_book_vocabulary")
    .select("id")
    .eq("teacher_book_id", context.teacherBookId)
    .eq("linked_user_book_word_id", word.personalWordId)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("teacher_book_vocabulary")
    .insert({
      teacher_book_id: context.teacherBookId,
      teacher_id: context.teacherId,
      book_id: context.bookId,
      linked_user_book_word_id: word.personalWordId,
      vocabulary_cache_id: word.vocabularyCacheId,
      surface: word.surface,
      reading: word.reading,
      meaning: word.meaning,
      meaning_choices: word.meaningChoices,
      meaning_choice_index: word.meaningChoiceIndex,
      page_number: word.pageNumber,
      page_order: word.pageOrder,
      chapter_number: word.chapterNumber,
      chapter_name: word.chapterName,
      origin_my_library: true,
      origin_teaching: false,
      included_in_follow_along: true,
    })
    .select("id")
    .single();

  if (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const { data: retry, error: retryError } = await supabase
      .from("teacher_book_vocabulary")
      .select("id")
      .eq("teacher_book_id", context.teacherBookId)
      .eq("linked_user_book_word_id", word.personalWordId)
      .limit(1)
      .maybeSingle();

    if (retryError) throw retryError;
    if (retry?.id) return retry.id as string;

    const { data: conflicting, error: conflictLookupError } = await supabase
      .from("teacher_book_vocabulary")
      .select("id, teacher_book_id")
      .eq("linked_user_book_word_id", word.personalWordId)
      .limit(1)
      .maybeSingle();

    if (conflictLookupError) throw conflictLookupError;
    if (conflicting?.id && conflicting.teacher_book_id !== context.teacherBookId) {
      throw new Error("This personal word is already linked to a different Teacher Book vocabulary.");
    }

    throw error;
  }
  return data?.id as string;
}

export async function updateTeachingVocabularyVisibility(
  supabase: SupabaseClientLike,
  word: SharedTeacherVocabularyWord,
  patch: Partial<{
    hidden_from_my_library: boolean;
    hidden_from_teaching: boolean;
    included_in_follow_along: boolean;
    follow_along_order: number | null;
    follow_along_support_note: string | null;
  }>,
  context?: TeacherBookContext
) {
  let teacherVocabularyId = word.teacherVocabularyId;

  if (!teacherVocabularyId && context) {
    teacherVocabularyId = await ensureTeachingVocabularyAssociationForPersonalWord(
      supabase,
      context,
      word
    );
  }

  if (!teacherVocabularyId) {
    throw new Error("This personal word needs a teaching association before it can be curated here.");
  }

  const { error } = await supabase
    .from("teacher_book_vocabulary")
    .update(patch)
    .eq("id", teacherVocabularyId);

  if (error) throw error;
}
