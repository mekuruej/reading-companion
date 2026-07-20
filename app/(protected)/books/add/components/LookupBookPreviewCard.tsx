import type { ReactNode } from "react";

type LookupBookPreviewCardProps = {
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  displayAuthor: string;
  publisher?: string | null;
  publishedDate?: string | null;
  pageCount?: number | string | null;
  isbn13: string;
  languageCode?: string | null;
  isNewToMekuru: boolean;
  libraryLabel?: string;
  children?: ReactNode;
};

function languageLabel(value: string | null | undefined) {
  const code = (value ?? "").trim().toLowerCase();
  if (code === "ja") return "Japanese";
  if (code === "en") return "English";
  return code ? code.toUpperCase() : null;
}

export default function LookupBookPreviewCard({
  title,
  subtitle,
  coverUrl,
  displayAuthor,
  publisher,
  publishedDate,
  pageCount,
  isbn13,
  languageCode,
  isNewToMekuru,
  libraryLabel = "your library",
  children,
}: LookupBookPreviewCardProps) {
  const displayLanguage = languageLabel(languageCode);

  return (
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="w-full sm:w-32">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="mx-auto aspect-[2/3] w-32 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div className="mx-auto flex aspect-[2/3] w-32 items-center justify-center rounded-2xl bg-stone-100 px-3 text-center text-xs font-bold text-stone-500">
              No cover found
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            Preview
          </p>

          <h2 className="mt-2 text-2xl font-black text-stone-900">
            {title}
          </h2>

          {subtitle ? (
            <p className="mt-1 text-sm font-medium text-stone-600">
              {subtitle}
            </p>
          ) : null}

          <p className="mt-3 text-sm leading-6 text-stone-700">
            {displayAuthor}
          </p>

          <div className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            {publisher ? (
              <p>
                <span className="font-bold text-stone-800">Publisher:</span>{" "}
                {publisher}
              </p>
            ) : null}

            {publishedDate ? (
              <p>
                <span className="font-bold text-stone-800">Published:</span>{" "}
                {publishedDate}
              </p>
            ) : null}

            {pageCount ? (
              <p>
                <span className="font-bold text-stone-800">Pages:</span>{" "}
                {pageCount}
              </p>
            ) : null}

            <p>
              <span className="font-bold text-stone-800">ISBN:</span>{" "}
              {isbn13}
            </p>

            {displayLanguage ? (
              <p>
                <span className="font-bold text-stone-800">Language:</span>{" "}
                {displayLanguage}
              </p>
            ) : null}
          </div>

          {isNewToMekuru ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              This book is not in Mekuru’s database yet. You can still add it to{" "}
              {libraryLabel} now, but an admin may need to review it before all book
              details show up.
            </p>
          ) : null}

          {children}
        </div>
      </div>
    </section>
  );
}
