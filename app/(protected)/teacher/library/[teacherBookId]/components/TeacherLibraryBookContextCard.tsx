import Link from "next/link";

type TeacherLibraryBookContextBook = {
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
  isbn13?: string | null;
  page_count?: number | null;
  related_links?: any[] | null;
};

type TeacherLibraryBookContextCardProps = {
  book: TeacherLibraryBookContextBook | null;
  teacherBookId: string;
  showAddMore: boolean;
  onAddMore: () => void;
};

type FindLink = {
  label: string;
  url: string;
};

function displayLinkLabel(value: any) {
  const rawLabel =
    typeof value === "object" && value != null ? (value.label ?? "").toString().trim() : "";
  const rawUrl =
    typeof value === "string"
      ? value
      : typeof value === "object" && value != null
        ? (value.url ?? "").toString()
        : "";

  if (rawLabel && rawLabel !== rawUrl) return rawLabel;

  const safeUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : rawUrl
      ? `https://${rawUrl}`
      : "";

  if (safeUrl) {
    try {
      const hostname = new URL(safeUrl).hostname.replace(/^www\./, "").toLowerCase();

      if (hostname.includes("amazon.")) return "Amazon";
      if (hostname.includes("bookwalker.")) return "BookWalker";
      if (hostname.includes("kinokuniya.")) return "Kinokuniya";
      if (hostname.includes("rakuten.")) return "Rakuten Books";
      if (hostname.includes("ebookjapan.")) return "ebookjapan";
      if (hostname.includes("honto.")) return "honto";

      const [firstPart] = hostname.split(".");
      if (firstPart) return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    } catch {
      // Fall through to raw label or URL.
    }
  }

  return rawLabel || rawUrl || "Link";
}

function displayLinkUrl(value: any) {
  const rawUrl =
    typeof value === "string"
      ? value
      : typeof value === "object" && value != null
        ? (value.url ?? "").toString().trim()
        : "";

  if (!rawUrl) return "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  return `https://${rawUrl}`;
}

function whereToFindLinks(book: TeacherLibraryBookContextBook | null): FindLink[] {
  const relatedLinks = Array.isArray(book?.related_links) ? book.related_links : [];

  if (relatedLinks.length > 0) {
    return relatedLinks
      .map((item) => ({
        label: displayLinkLabel(item),
        url: displayLinkUrl(item),
      }))
      .filter((item) => item.label || item.url);
  }

  const isbn13 = book?.isbn13?.trim();
  if (!isbn13) return [];

  return [
    {
      label: "Amazon",
      url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(isbn13)}`,
    },
  ];
}

export default function TeacherLibraryBookContextCard({
  book,
  teacherBookId,
  showAddMore,
  onAddMore,
}: TeacherLibraryBookContextCardProps) {
  const typeLabel = book?.book_type
    ? book.book_type
      .split(/[_-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
    : "Book";
  const findLinks = whereToFindLinks(book);

  return (
    <div className="mb-4 mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:mb-8 sm:mt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          {book?.cover_url ? (
            <img
              src={book.cover_url}
              alt=""
              className="h-32 w-24 shrink-0 rounded-md object-cover shadow-sm"
            />
          ) : (
            <div className="h-32 w-24 shrink-0 rounded-md bg-stone-200" />
          )}

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Book info
            </p>
            <div className="mt-1 text-2xl font-black leading-tight text-stone-900">
              {book?.title ?? "Untitled book"}
            </div>
            {book?.author ? (
              <p className="mt-1 text-base text-stone-600">{book.author}</p>
            ) : null}
            <div className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Type
                </div>
                <div className="mt-1 font-medium text-stone-800">{typeLabel}</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  ISBN
                </div>
                <div className="mt-1 font-medium text-stone-800">
                  {book?.isbn13 || "Not listed"}
                </div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Pages
                </div>
                <div className="mt-1 font-medium text-stone-800">
                  {book?.page_count ?? "Not listed"}
                </div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Link
                </div>
                {findLinks.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {findLinks.map((item, index) => (
                      item.url ? (
                        <a
                          key={`${item.label}-${index}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span key={`${item.label}-${index}`} className="font-medium text-stone-800">
                          {item.label}
                        </span>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 font-medium text-stone-800">Not listed</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {showAddMore ? (
            <button
              type="button"
              onClick={onAddMore}
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
            >
              Add More Items
            </button>
          ) : null}

          <Link
            href={`/teacher/library/${teacherBookId}/follow`}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Follow-Along
          </Link>
        </div>
      </div>
    </div>
  );
}
