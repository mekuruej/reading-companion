// Book lookup helpers
//
// This file only looks up book metadata from outside sources.
// It does not write to Mekuru's database.
//
// Normal user flow should be:
// 1. User enters ISBN-13.
// 2. Mekuru looks up metadata.
// 3. User previews the result.
// 4. User confirms "Add to my library."
// 5. A separate server-controlled route creates/uses the global book row.

export type BookMetadataSource = "mekuru" | "openbd" | "google_books" | "open_library" | "none";

export type BookLookupResult = {
  isbn13: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  description: string | null;
  coverUrl: string | null;
  source: "openbd" | "google_books" | "open_library";
  sourceId: string | null;
};

export type NormalizedBookLookupResult = {
  isbn13: string;
  title: string | null;
  subtitle: string | null;
  author_display: string | null;
  authors: string[];
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  description: string | null;
  metadata_source: BookMetadataSource;
  source_id: string | null;
  found_existing_book: boolean;
  existing_book_id: string | null;
  needs_review: boolean;
  language_code: string | null;
};

type GoogleBooksResponse = {
  items?: Array<{
    id?: string;
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      publisher?: string;
      publishedDate?: string;
      description?: string;
      pageCount?: number;
      imageLinks?: {
        smallThumbnail?: string;
        thumbnail?: string;
      };
    };
  }>;
};

type OpenBdResponse = Array<{
  summary?: {
    title?: string;
    author?: string;
    publisher?: string;
    pubdate?: string;
    cover?: string;
  };
  onix?: {
    PublishingDetail?: {
      PublishingDate?: Array<{ Date?: string }>;
    };
    DescriptiveDetail?: {
      Extent?: Array<{ ExtentType?: string; ExtentValue?: string | number }>;
    };
  };
} | null>;

type OpenLibraryIsbnResponse = {
  title?: string;
  subtitle?: string;
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  description?: string | { value?: string };
  authors?: Array<{
    key?: string;
  }>;
};

type OpenLibraryAuthorResponse = {
  name?: string;
};

function stripHtml(value: string | null | undefined) {
  if (!value) return null;

  return value.replace(/<[^>]*>/g, "").trim() || null;
}

function cleanCoverUrl(value: string | null | undefined) {
  if (!value) return null;

  // Google sometimes returns http image URLs.
  return value.replace(/^http:\/\//, "https://");
}

function cleanAuthorName(value: string | null | undefined) {
  const parts = (value ?? "")
    .split(/[、,;]/)
    .map((part) => part.trim())
    .filter(Boolean);

  while (parts.length > 0 && /^\(?\d{4}\s*-?\s*(?:\d{4})?\)?$/.test(parts[parts.length - 1])) {
    parts.pop();
  }

  return parts.join(", ");
}

function cleanAuthors(values: Array<string | null | undefined>) {
  return values
    .map((value) => cleanAuthorName(value))
    .filter(Boolean);
}

async function fetchJson<T>(url: string | URL) {
  const response = await fetch(url, {
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

function cleanNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function authorDisplay(authors: string[]) {
  return authors.length > 0 ? authors.join("、") : null;
}

function openLibraryCoverUrl(isbn13: string) {
  return `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`;
}

function normalizedFromExternalLookup(
  result: BookLookupResult
): NormalizedBookLookupResult {
  return {
    isbn13: result.isbn13,
    title: result.title,
    subtitle: result.subtitle,
    author_display: authorDisplay(result.authors),
    authors: result.authors,
    cover_url: result.coverUrl,
    publisher: result.publisher,
    published_date: result.publishedDate,
    page_count: result.pageCount,
    description: result.description,
    metadata_source: result.source,
    source_id: result.sourceId,
    found_existing_book: false,
    existing_book_id: null,
    needs_review: true,
    language_code: null,
  };
}

export function normalizedLookupFromExistingBook({
  id,
  isbn13,
  title,
  subtitle = null,
  author,
  cover_url,
  publisher,
  published_date,
  page_count,
  language_code,
}: {
  id: string | null | undefined;
  isbn13: string;
  title: string | null | undefined;
  subtitle?: string | null | undefined;
  author: string | null | undefined;
  cover_url: string | null | undefined;
  publisher: string | null | undefined;
  published_date: string | null | undefined;
  page_count: number | string | null | undefined;
  language_code: string | null | undefined;
}): NormalizedBookLookupResult {
  const authors = cleanAuthors([author]);

  return {
    isbn13,
    title: title?.trim() || null,
    subtitle: subtitle?.trim() || null,
    author_display: author?.trim() || null,
    authors,
    cover_url: cleanCoverUrl(cover_url),
    publisher: publisher?.trim() || null,
    published_date: published_date?.trim() || null,
    page_count: cleanNumber(page_count),
    description: null,
    metadata_source: "mekuru",
    source_id: id ?? null,
    found_existing_book: true,
    existing_book_id: id ?? null,
    needs_review: false,
    language_code: language_code?.trim() || null,
  };
}

async function lookupOpenBdByIsbn13(isbn13: string): Promise<BookLookupResult | null> {
  const data = await fetchJson<OpenBdResponse>(
    `https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn13)}`
  );

  const item = Array.isArray(data) ? data[0] : null;
  const summary = item?.summary;

  if (!summary?.title) {
    return null;
  }

  const pageCount = cleanNumber(
    item?.onix?.DescriptiveDetail?.Extent?.find?.(
      (extent) => String(extent?.ExtentType ?? "") === "11"
    )?.ExtentValue
  );

  return {
    isbn13,
    title: summary.title,
    subtitle: null,
    authors: cleanAuthors([summary.author]),
    publisher: summary.publisher ?? null,
    publishedDate:
      summary.pubdate ??
      item?.onix?.PublishingDetail?.PublishingDate?.[0]?.Date ??
      null,
    pageCount,
    description: null,
    coverUrl: cleanCoverUrl(summary.cover),
    source: "openbd",
    sourceId: isbn13,
  };
}

async function lookupGoogleBooksByIsbn13(
  isbn13: string
): Promise<BookLookupResult | null> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");

  url.searchParams.set("q", `isbn:${isbn13}`);
  url.searchParams.set("printType", "books");
  url.searchParams.set("maxResults", "1");

  // Optional. You can add this later in Vercel if quota becomes an issue.
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const data = await fetchJson<GoogleBooksResponse>(url);

  const firstItem = data?.items?.[0];
  const volumeInfo = firstItem?.volumeInfo;

  if (!volumeInfo?.title) {
    return null;
  }

  return {
    isbn13,
    title: volumeInfo.title,
    subtitle: volumeInfo.subtitle ?? null,
    authors: cleanAuthors(volumeInfo.authors ?? []),
    publisher: volumeInfo.publisher ?? null,
    publishedDate: volumeInfo.publishedDate ?? null,
    pageCount: volumeInfo.pageCount ?? null,
    description: stripHtml(volumeInfo.description),
    coverUrl: cleanCoverUrl(
      volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail
    ),
    source: "google_books",
    sourceId: firstItem?.id ?? null,
  };
}

async function lookupOpenLibraryAuthorName(authorKey: string) {
  const authorUrl = `https://openlibrary.org${authorKey}.json`;
  const authorData = await fetchJson<OpenLibraryAuthorResponse>(authorUrl);

  return authorData?.name ?? null;
}

async function getOpenLibraryCoverUrl(isbn13: string) {
  const coverUrl = openLibraryCoverUrl(isbn13);
  const response = await fetch(coverUrl, {
    method: "HEAD",
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    return null;
  }

  return coverUrl;
}

async function lookupOpenLibraryByIsbn13(
  isbn13: string
): Promise<BookLookupResult | null> {
  const url = `https://openlibrary.org/isbn/${isbn13}.json`;
  const data = await fetchJson<OpenLibraryIsbnResponse>(url);

  if (!data?.title) {
    return null;
  }

  const authorKeys =
    data.authors
      ?.map((author) => author.key)
      .filter((key): key is string => Boolean(key))
      .slice(0, 5) ?? [];

  const authorNames = await Promise.all(
    authorKeys.map((key) => lookupOpenLibraryAuthorName(key))
  );

  const description =
    typeof data.description === "string"
      ? data.description
      : data.description?.value ?? null;

  const coverUrl = await getOpenLibraryCoverUrl(isbn13);

  return {
    isbn13,
    title: data.title,
    subtitle: data.subtitle ?? null,
    authors: cleanAuthors(authorNames),
    publisher: data.publishers?.[0] ?? null,
    publishedDate: data.publish_date ?? null,
    pageCount: data.number_of_pages ?? null,
    description: stripHtml(description),
    coverUrl,
    source: "open_library",
    sourceId: `/isbn/${isbn13}`,
  };
}

export async function lookupBookByIsbn13(isbn13: string) {
  const openBdResult = await lookupOpenBdByIsbn13(isbn13);

  if (openBdResult) {
    return openBdResult;
  }

  const googleResult = await lookupGoogleBooksByIsbn13(isbn13);

  if (googleResult) {
    return googleResult;
  }

  return lookupOpenLibraryByIsbn13(isbn13);
}

async function lookupOpenLibraryCoverOnlyByIsbn13(
  isbn13: string
): Promise<NormalizedBookLookupResult | null> {
  const coverUrl = await getOpenLibraryCoverUrl(isbn13);
  if (!coverUrl) return null;

  return {
    isbn13,
    title: null,
    subtitle: null,
    author_display: null,
    authors: [],
    cover_url: coverUrl,
    publisher: null,
    published_date: null,
    page_count: null,
    description: null,
    metadata_source: "open_library",
    source_id: `/isbn/${isbn13}`,
    found_existing_book: false,
    existing_book_id: null,
    needs_review: true,
    language_code: null,
  };
}

export async function lookupNormalizedExternalBookByIsbn13(isbn13: string) {
  const lookupResult = await lookupBookByIsbn13(isbn13);
  if (lookupResult) {
    return normalizedFromExternalLookup(lookupResult);
  }

  return lookupOpenLibraryCoverOnlyByIsbn13(isbn13);
}
