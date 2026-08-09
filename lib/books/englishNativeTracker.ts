export function normalizeLanguageCode(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "en" || normalized === "eng" || normalized === "english" || normalized === "英語") {
    return "en";
  }
  if (normalized === "ja" || normalized === "jp" || normalized === "japanese" || normalized === "日本語") {
    return "ja";
  }
  if (normalized === "fr" || normalized === "fre" || normalized === "fra" || normalized === "french") {
    return "fr";
  }
  return normalized;
}

export function isEnglishLanguage(value: string | null | undefined) {
  return normalizeLanguageCode(value) === "en";
}

export function isNativeLanguageBook({
  bookLanguageCode,
  ownerNativeLanguage,
}: {
  bookLanguageCode: string | null | undefined;
  ownerNativeLanguage: string | null | undefined;
}) {
  const normalizedBookLanguage = normalizeLanguageCode(bookLanguageCode);
  const normalizedNativeLanguage = normalizeLanguageCode(ownerNativeLanguage);
  return Boolean(
    normalizedBookLanguage &&
      normalizedNativeLanguage &&
      normalizedBookLanguage === normalizedNativeLanguage
  );
}

export function isEnglishNativeTrackerBook({
  bookLanguageCode,
  ownerNativeLanguage,
}: {
  bookLanguageCode: string | null | undefined;
  ownerNativeLanguage: string | null | undefined;
}) {
  return isNativeLanguageBook({ bookLanguageCode, ownerNativeLanguage });
}

export async function getNativeLanguageBookMode({
  supabase,
  userBookId,
}: {
  supabase: any;
  userBookId: string;
}) {
  const { data: userBook, error: userBookError } = await supabase
    .from("user_books")
    .select(
      `
        id,
        user_id,
        books:book_id (
          language_code
        )
      `
    )
    .eq("id", userBookId)
    .maybeSingle();

  if (userBookError || !userBook) {
    return {
      isEnglishNativeTrackerBook: false,
      isNativeLanguageBook: false,
      error: userBookError ?? null,
      ownerUserId: null,
      bookLanguageCode: null,
      ownerNativeLanguage: null,
    };
  }

  const ownerUserId = userBook.user_id ?? null;
  const book = Array.isArray(userBook.books) ? userBook.books[0] : userBook.books;
  const bookLanguageCode = book?.language_code ?? null;

  if (!ownerUserId || !normalizeLanguageCode(bookLanguageCode)) {
    return {
      isEnglishNativeTrackerBook: false,
      isNativeLanguageBook: false,
      error: null,
      ownerUserId,
      bookLanguageCode,
      ownerNativeLanguage: null,
    };
  }

  const { data: ownerProfile, error: ownerProfileError } = await supabase
    .from("profiles")
    .select("native_language")
    .eq("id", ownerUserId)
    .maybeSingle();

  return {
    isEnglishNativeTrackerBook: !ownerProfileError &&
      isNativeLanguageBook({
        bookLanguageCode,
        ownerNativeLanguage: ownerProfile?.native_language ?? null,
      }),
    isNativeLanguageBook: !ownerProfileError &&
      isNativeLanguageBook({
        bookLanguageCode,
        ownerNativeLanguage: ownerProfile?.native_language ?? null,
      }),
    error: ownerProfileError ?? null,
    ownerUserId,
    bookLanguageCode,
    ownerNativeLanguage: ownerProfile?.native_language ?? null,
  };
}

export async function getEnglishNativeTrackerBookMode({
  supabase,
  userBookId,
}: {
  supabase: any;
  userBookId: string;
}) {
  return getNativeLanguageBookMode({ supabase, userBookId });
}
