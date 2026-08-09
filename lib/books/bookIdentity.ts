type BookIdentitySource = {
  title?: string | null;
  title_reading?: string | null;
  author?: string | null;
  author_english_name?: string | null;
  author_reading?: string | null;
  language_code?: string | null;
};

function cleanText(value: string | null | undefined) {
  return value?.trim() || null;
}

export function isEnglishLanguageBook(book: BookIdentitySource | null | undefined) {
  return cleanText(book?.language_code)?.toLowerCase() === "en";
}

export function displayBookTitle(
  book: BookIdentitySource | null | undefined,
  fallback = "Untitled book"
) {
  return cleanText(book?.title) ?? fallback;
}

export function displayBookTitleReading(book: BookIdentitySource | null | undefined) {
  if (isEnglishLanguageBook(book)) return null;
  return cleanText(book?.title_reading);
}

export function displayBookAuthor(book: BookIdentitySource | null | undefined) {
  if (isEnglishLanguageBook(book)) {
    return cleanText(book?.author_english_name) ?? cleanText(book?.author);
  }

  return cleanText(book?.author);
}

export function displayBookAuthorReading(book: BookIdentitySource | null | undefined) {
  if (isEnglishLanguageBook(book)) return null;
  return cleanText(book?.author_reading);
}

export function getBookIdentity(
  book: BookIdentitySource | null | undefined,
  titleFallback = "Untitled book"
) {
  return {
    title: displayBookTitle(book, titleFallback),
    titleReading: displayBookTitleReading(book),
    author: displayBookAuthor(book),
    authorReading: displayBookAuthorReading(book),
  };
}
