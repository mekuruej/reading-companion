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
  source: "google_books" | "open_library";
  sourceId: string | null;
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
    authors: volumeInfo.authors ?? [],
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
  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`;

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
    authors: authorNames.filter((name): name is string => Boolean(name)),
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
  const googleResult = await lookupGoogleBooksByIsbn13(isbn13);

  if (googleResult) {
    return googleResult;
  }

  return lookupOpenLibraryByIsbn13(isbn13);
}