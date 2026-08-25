// About This Book
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getBookIdentity } from "@/lib/books/bookIdentity";
import { bookTypeLabel } from "@/lib/books/bookTypes";
import { supabase } from "@/lib/supabaseClient";

type Book = {
  id: string;
  title: string | null;
  title_reading: string | null;
  author: string | null;
  author_english_name: string | null;
  translator: string | null;
  translator_english_name: string | null;
  illustrator: string | null;
  illustrator_english_name: string | null;
  cover_url: string | null;
  genre: string | null;
  book_type: string | null;
  language_code: string | null;
  edition_format: string | null;
  edition_note: string | null;
  audience_category?: string | null;
  trigger_warnings: string | null;
  page_count: number | null;
  series_number: number | null;
  series_total?: number | null;
  isbn: string | null;
  isbn13: string | null;
  asin: string | null;
  publisher: string | null;
  publisher_id?: string | null;
  published_date: string | null;
  author_image_url: string | null;
  translator_image_url: string | null;
  illustrator_image_url: string | null;
  publisher_image_url: string | null;
  author_reading: string | null;
  translator_reading: string | null;
  illustrator_reading: string | null;
  publisher_reading: string | null;
  related_links: any | null;
  synopsis_en: string | null;
  author_bio_en: string | null;
  publisher_note_en: string | null;
  bookstore_hint_en: string | null;
  book_profile_source_label: string | null;
  book_profile_source_url: string | null;
};

type UserBook = {
  id: string;
  user_id: string;
  reader_level: string | null;
  recommended_level: string | null;
  format_type: string | null;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  books: Book | null;
};

type ProfileRow = {
  role: string | null;
  is_super_teacher: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
};

type PersonRecord = {
  role: "author" | "translator" | "illustrator";
  people:
    | {
        name_ja: string | null;
        name_en: string | null;
        reading: string | null;
        image_url: string | null;
      }
    | Array<{
        name_ja: string | null;
        name_en: string | null;
        reading: string | null;
        image_url: string | null;
      }>
    | null;
};

type BookRatingAverages = {
  signalCount: number;
  difficultyAverage: number | null;
  entertainmentAverage: number | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function formatReadingFormat(value: string | null | undefined) {
  switch (value) {
    case "paperback":
      return "Paperback";
    case "hardcover":
      return "Hardcover";
    case "ebook":
      return "eBook";
    case "audiobook":
      return "Audiobook";
    case "other":
      return "Other";
    default:
      return null;
  }
}

function formatEditionFormat(value: string | null | undefined) {
  switch (value) {
    case "bunko":
      return "文庫本";
    case "shinsho":
      return "新書";
    case "tankobon_hardcover":
      return "単行本 (hardcover)";
    case "tankobon_softcover":
      return "単行本 (softcover)";
    case "paperback":
      return "Paperback";
    case "hardcover":
      return "Hardcover";
    case "ebook":
      return "Ebook";
    case "other":
      return "Other";
    default:
      return null;
  }
}

function formatBookFormat(book: Book, row: UserBook) {
  return formatEditionFormat(book.edition_format) ?? formatReadingFormat(row.format_type);
}

function formatLanguage(value: string | null | undefined) {
  switch (value) {
    case "ja":
      return "Japanese";
    case "en":
      return "English";
    default:
      return value ? value.toUpperCase() : null;
  }
}

function publishedYear(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 4);
}

function formatSeriesBadge(book: Book) {
  if (!book.series_number) return null;
  return book.series_total
    ? `Series ${book.series_number} / ${book.series_total}`
    : `Series ${book.series_number}`;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverageRating(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

function cleanInitial(value: string | null | undefined) {
  return value?.trim().slice(0, 1).toUpperCase() || "M";
}

function firstPerson(record: PersonRecord | null | undefined) {
  const person = Array.isArray(record?.people) ? record?.people[0] : record?.people;
  return person ?? null;
}

function looksLikeUrl(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  return /^https?:\/\//i.test(clean) || /^www\./i.test(clean);
}

function friendlyExternalLinkLabel(href: string, preferredLabel?: string | null) {
  const cleanPreferred = preferredLabel?.trim();
  if (cleanPreferred && !looksLikeUrl(cleanPreferred)) return cleanPreferred;

  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "amazon.co.jp" || host.endsWith(".amazon.co.jp")) return "Amazon Japan";
    if (host === "amazon.com" || host.endsWith(".amazon.com")) return "Amazon";
    if (host === "ehon.alphapolis.co.jp" || host.endsWith(".ehon.alphapolis.co.jp")) return "Ehon Hiroba";
    if (host.includes("rakuten")) return "Rakuten";
    if (host.includes("honto")) return "Honto";
    if (host.includes("kinokuniya")) return "Kinokuniya";
    if (host.includes("bookwalker")) return "BookWalker";

    return host || "Source link";
  } catch {
    return "Source link";
  }
}

function SafeProfileImage({
  src,
  alt,
  initials,
  className,
  imageClassName = "object-cover",
}: {
  src: string | null | undefined;
  alt: string;
  initials: string;
  className: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = src?.trim();

  if (cleanSrc && !failed) {
    return (
      <img
        src={cleanSrc}
        alt={alt}
        className={`${className} ${imageClassName}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center bg-stone-200 text-stone-700`}>
      <span className="text-2xl font-black">{initials}</span>
    </div>
  );
}

function FormatHighlightCard({
  label,
  value,
  tone = "stone",
}: {
  label: string;
  value: string | number | null | undefined;
  tone?: "amber" | "rose" | "sky" | "violet" | "stone";
}) {
  if (value == null || String(value).trim().length === 0) return null;

  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-950"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-950"
          : "border-stone-200 bg-white text-stone-950";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">{label}</p>
      <p className="mt-2 text-2xl font-black leading-tight">{value}</p>
    </div>
  );
}

function AverageRatingCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "amber" | "sky";
}) {
  const hasValue = value != null && Number.isFinite(value);
  const safeValue = hasValue ? Math.max(0, Math.min(5, value)) : 0;
  const roundedValue = hasValue ? Math.round(safeValue) : 0;
  const colorClass = tone === "amber" ? "text-amber-500" : "text-sky-500";

  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-stone-950">
            {formatAverageRating(value)}
            <span className="text-base text-stone-400"> / 5</span>
          </p>
        </div>
        <div className={`text-lg leading-none tracking-[0.08em] ${hasValue ? colorClass : "text-stone-200"}`}>
          {"*".repeat(roundedValue)}
          <span className="text-stone-200">{"*".repeat(5 - roundedValue)}</span>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-sm ${className}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-stone-950">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CreatorCard({
  eyebrow,
  name,
  reading,
  imageUrl,
  fallbackInitial,
  imageAlt,
  note,
  imageClassName,
}: {
  eyebrow: string;
  name: string;
  reading?: string | null;
  imageUrl?: string | null;
  fallbackInitial: string;
  imageAlt: string;
  note?: string | null;
  imageClassName?: string;
}) {
  return (
    <article className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SafeProfileImage
          src={imageUrl}
          alt={imageAlt}
          initials={fallbackInitial}
          className="h-20 w-20 shrink-0 rounded-3xl"
          imageClassName={imageClassName}
        />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-stone-950">{name}</h2>
          {reading ? (
            <p className="mt-1 text-sm font-semibold text-stone-500">{reading}</p>
          ) : null}
        </div>
      </div>
      {note ? (
        <p className="mt-5 text-sm leading-6 text-stone-600">{note}</p>
      ) : null}
    </article>
  );
}

function statusLabel(row: UserBook) {
  if (row.dnf_at) return "Did not finish";
  if (row.finished_at) return "Finished";
  if (row.started_at) return "Reading";
  return "In library";
}

export default function AboutBookPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<UserBook | null>(null);
  const [authorImageUrl, setAuthorImageUrl] = useState<string | null>(null);
  const [publisherImageUrl, setPublisherImageUrl] = useState<string | null>(null);
  const [publisherEnglishName, setPublisherEnglishName] = useState<string | null>(null);
  const [ratingAverages, setRatingAverages] = useState<BookRatingAverages | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user || !userBookId) {
          if (!cancelled) {
            setError("You do not have access to this book.");
            setLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        const role = profile?.role ?? "member";
        const isStaff = role === "admin" || role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);
        const isTeacher = role === "teacher";

        const selectClause = `
          id,
          user_id,
          reader_level,
          recommended_level,
          format_type,
          started_at,
          finished_at,
          dnf_at,
          books (
            id,
            title,
            title_reading,
            author,
            author_english_name,
            translator,
            translator_english_name,
            illustrator,
            illustrator_english_name,
            cover_url,
            genre,
            book_type,
            language_code,
            edition_format,
            edition_note,
            audience_category,
            trigger_warnings,
            page_count,
            series_number,
            series_total,
            isbn,
            isbn13,
            asin,
            publisher,
            publisher_id,
            published_date,
            author_image_url,
            translator_image_url,
            illustrator_image_url,
            publisher_image_url,
            author_reading,
            translator_reading,
            illustrator_reading,
            publisher_reading,
            related_links,
            synopsis_en,
            author_bio_en,
            publisher_note_en,
            bookstore_hint_en,
            book_profile_source_label,
            book_profile_source_url
          )
        `;

        const bookResult = await supabase
          .from("user_books")
          .select(selectClause)
          .eq("id", userBookId)
          .maybeSingle();
        let data: any = bookResult.data;
        let bookError = bookResult.error;

        if (bookError && String(bookError.message ?? "").includes("series_total")) {
          const retry = await supabase
            .from("user_books")
            .select(selectClause.replace(/\n\s*series_total,/u, ""))
            .eq("id", userBookId)
            .maybeSingle();

          data = retry.data;
          bookError = retry.error;
        }

        if (bookError) throw bookError;
        if (!data) {
          if (!cancelled) {
            setError("This book could not be found.");
            setLoading(false);
          }
          return;
        }

        const loadedRow = data as unknown as UserBook;
        let canAccessBook = loadedRow.user_id === user.id || isStaff;

        if (!canAccessBook && isTeacher) {
          const { data: teacherStudentLink } = await supabase
            .from("teacher_students")
            .select("id")
            .eq("teacher_id", user.id)
            .eq("student_id", loadedRow.user_id)
            .is("archived_at", null)
            .limit(1)
            .maybeSingle();

          canAccessBook = !!teacherStudentLink;
        }

        if (!canAccessBook) {
          if (!cancelled) {
            setError("You do not have access to this book.");
            setLoading(false);
          }
          return;
        }

        const book = loadedRow.books;
        let nextAuthorImage = book?.author_image_url ?? null;
        let nextPublisherImage = book?.publisher_image_url ?? null;
        let nextPublisherEnglishName: string | null = null;

        if (book?.id) {
          const { data: contributors } = await supabase
            .from("book_contributors")
            .select("role, people(name_ja, name_en, reading, image_url)")
            .eq("book_id", book.id)
            .in("role", ["author", "translator", "illustrator"])
            .returns<PersonRecord[]>();

          const author = (contributors ?? []).find((item) => item.role === "author");
          nextAuthorImage = firstPerson(author)?.image_url ?? nextAuthorImage;
        }

        if (book?.publisher_id) {
          const { data: publisher } = await supabase
            .from("publishers")
            .select("logo_url, name_en")
            .eq("id", book.publisher_id)
            .maybeSingle<{ logo_url: string | null; name_en: string | null }>();

          nextPublisherImage = publisher?.logo_url ?? nextPublisherImage;
          nextPublisherEnglishName = publisher?.name_en ?? null;
        }

        let nextRatingAverages: BookRatingAverages | null = null;
        if (book?.id) {
          const { data: ratingSignals, error: ratingSignalsError } = await supabase
            .from("public_book_recommendation_signals")
            .select("difficulty_rating, entertainment_rating")
            .eq("book_id", book.id);

          if (ratingSignalsError) {
            console.warn("Could not load book rating averages:", ratingSignalsError);
          } else {
            const rows = (ratingSignals ?? []) as Array<{
              difficulty_rating: number | null;
              entertainment_rating: number | null;
            }>;

            nextRatingAverages = {
              signalCount: rows.length,
              difficultyAverage: average(
                rows
                  .map((signal) => signal.difficulty_rating)
                  .filter((value): value is number => value != null)
              ),
              entertainmentAverage: average(
                rows
                  .map((signal) => signal.entertainment_rating)
                  .filter((value): value is number => value != null)
              ),
            };
          }
        }

        if (!cancelled) {
          setRow(loadedRow);
          setAuthorImageUrl(nextAuthorImage);
          setPublisherImageUrl(nextPublisherImage);
          setPublisherEnglishName(nextPublisherEnglishName);
          setRatingAverages(nextRatingAverages);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading About This Book:", err);
        if (!cancelled) {
          setError("This book profile could not be loaded.");
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  const book = row?.books ?? null;
  const relatedLinks = useMemo(() => {
    return Array.isArray(book?.related_links) ? book.related_links : [];
  }, [book?.related_links]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-100 px-5 py-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-black text-stone-600">Loading book profile...</p>
        </div>
      </main>
    );
  }

  if (error || !row || !book) {
    return <AccessDeniedMessage message={error ?? "This book could not be found."} />;
  }

  const usesEnglishReadingTerminology = book.language_code === "en";
  const bookIdentity = getBookIdentity(book);
  const bookFormat = formatBookFormat(book, row);
  const publisherDisplayName = usesEnglishReadingTerminology
    ? publisherEnglishName || book.publisher
    : book.publisher;
  const isbn = book.isbn13 || book.isbn;
  const synopsis = book.synopsis_en?.trim() || null;
  const authorBio = book.author_bio_en?.trim() || null;
  const publisherNote = book.publisher_note_en?.trim() || null;
  const bookstoreHint = book.bookstore_hint_en?.trim() || null;
  const sourceLabel = book.book_profile_source_label?.trim() || null;
  const sourceUrl = book.book_profile_source_url?.trim() || null;
  const profileSourceLabel = sourceUrl
    ? friendlyExternalLinkLabel(sourceUrl, sourceLabel)
    : sourceLabel;
  const learnerReadingNotes: string[] = [];
  const similarBooks: Array<{ title: string; href: string }> = [];

  return (
    <main className="min-h-screen bg-[#f5efe7] px-5 py-8 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/books/${row.id}`}
          className="inline-flex text-sm font-black text-stone-600 transition hover:text-stone-950"
        >
          &larr; Back to Book Hub
        </Link>

        <section className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="grid gap-0 md:grid-cols-[140px_1fr]">
            <div className="bg-stone-200">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={`${bookIdentity.title} cover`}
                  className="h-full min-h-[190px] w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[190px] items-center justify-center px-4 text-center text-xs font-semibold text-stone-500">
                  No cover
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
                    About This Book
                  </p>
                </div>

                <h1 className="mt-2 text-3xl font-black leading-tight text-stone-950 sm:text-4xl">
                  {bookIdentity.title}
                </h1>

                {bookIdentity.titleReading ? (
                  <p className="mt-2 text-sm font-semibold text-stone-500">
                    {bookIdentity.titleReading}
                  </p>
                ) : null}

                <p className="mt-3 text-base font-semibold text-stone-700">
                  {bookIdentity.author || book.author_english_name || "Author not listed yet"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {formatLanguage(book.language_code) ? (
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-600">
                      {formatLanguage(book.language_code)}
                    </span>
                  ) : null}
                  {publishedYear(book.published_date) ? (
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-600">
                      {publishedYear(book.published_date)}
                    </span>
                  ) : null}
                  {formatSeriesBadge(book) ? (
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-600">
                      {formatSeriesBadge(book)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormatHighlightCard
            label="Book Type"
            value={bookTypeLabel(book.book_type)}
            tone="amber"
          />
          <FormatHighlightCard
            label="Book Format"
            value={bookFormat}
            tone="rose"
          />
          <FormatHighlightCard
            label="Pages"
            value={book.page_count ? `${book.page_count} pages` : null}
            tone="sky"
          />
          <FormatHighlightCard
            label="ISBN"
            value={isbn}
            tone="stone"
          />
          <FormatHighlightCard
            label="Amazon ASIN"
            value={book.asin}
            tone="violet"
          />
        </section>

        {ratingAverages && ratingAverages.signalCount > 0 ? (
          <ProfileSection
            eyebrow="Reader Averages"
            title="How Readers Rated This Book"
            description={`Average from ${ratingAverages.signalCount} reader signal${ratingAverages.signalCount === 1 ? "" : "s"}.`}
            className="mt-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AverageRatingCard
                label={`${bookTypeLabel(book.book_type)} Difficulty`}
                value={ratingAverages.difficultyAverage}
                tone="sky"
              />
              <AverageRatingCard
                label="Entertainment"
                value={ratingAverages.entertainmentAverage}
                tone="amber"
              />
            </div>
          </ProfileSection>
        ) : null}

        {bookstoreHint ? (
          <section className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              Find This Book
            </p>
            <h2 className="mt-3 text-2xl font-black text-stone-950">
              Bookstore hint
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-stone-700">
              {bookstoreHint}
            </p>
          </section>
        ) : null}

        <ProfileSection
          eyebrow="Synopsis"
          title="What This Book Is About"
          className="mt-6"
        >
          <p className="text-sm leading-7 text-stone-700">
            {synopsis ?? "A synopsis can be added later."}
          </p>
        </ProfileSection>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <CreatorCard
            eyebrow="Author"
            name={bookIdentity.author || book.author_english_name || "Author not listed yet"}
            reading={bookIdentity.authorReading}
            imageUrl={authorImageUrl}
            fallbackInitial={cleanInitial(bookIdentity.author || book.author_english_name)}
            imageAlt={bookIdentity.author ? `${bookIdentity.author} photo` : "Author photo"}
            note={authorBio ?? "Author information can be added later."}
          />

          <CreatorCard
            eyebrow="Publisher"
            name={publisherDisplayName || "Publisher not listed yet"}
            reading={usesEnglishReadingTerminology ? null : book.publisher_reading}
            imageUrl={publisherImageUrl}
            fallbackInitial={cleanInitial(publisherDisplayName)}
            imageAlt={publisherDisplayName ? `${publisherDisplayName} logo` : "Publisher logo"}
            imageClassName="object-contain bg-white p-2"
            note={publisherNote ?? "Publisher or imprint information can be added later."}
          />
        </section>

        {learnerReadingNotes.length > 0 ? (
          <ProfileSection
            eyebrow={usesEnglishReadingTerminology ? "Reader Notes" : "Reading Notes"}
            title={usesEnglishReadingTerminology ? "Reader Notes" : "Learner-Facing Notes"}
            description="Notes for readers can live here later without mixing them into the private Reading Journal."
            className="mt-6"
          >
            <div className="space-y-3">
              {learnerReadingNotes.map((note) => (
                <p key={note} className="rounded-3xl border border-white/70 bg-white/85 p-5 text-sm leading-7 text-stone-700 shadow-sm">
                  {note}
                </p>
              ))}
            </div>
          </ProfileSection>
        ) : null}

        {similarBooks.length > 0 ? (
          <ProfileSection
            eyebrow="Similar Books"
            title="Books With a Similar Feel"
            description="This section is ready for future book recommendations once MEKURU has a stored source."
            className="mt-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similarBooks.map((similar) => (
                <Link
                  key={similar.href}
                  href={similar.href}
                  className="rounded-3xl border border-white/70 bg-white/85 p-5 text-sm font-black text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {similar.title}
                </Link>
              ))}
            </div>
          </ProfileSection>
        ) : null}

        {(book.translator || book.illustrator || book.genre || book.audience_category || relatedLinks.length > 0) ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">More Credits</p>
              <div className="mt-4 space-y-3 text-sm font-semibold text-stone-700">
                {book.translator ? <p>Translator: {book.translator}</p> : null}
                {book.illustrator ? <p>Illustrator: {book.illustrator}</p> : null}
                {book.genre ? <p>Genre: {book.genre}</p> : null}
                {book.audience_category ? <p>Audience: {book.audience_category}</p> : null}
              </div>
            </div>

            {relatedLinks.length > 0 ? (
              <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Links</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {relatedLinks.map((link: any, index: number) => {
                    const href = typeof link === "string" ? link : link?.url;
                    if (!href) return null;
                    const rawLabel = typeof link === "string" ? null : link?.label || link?.title;
                    const label = friendlyExternalLinkLabel(href, href === sourceUrl ? sourceLabel : rawLabel);
                    return (
                      <a
                        key={`${href}-${index}`}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-black text-stone-700 transition hover:bg-stone-100"
                      >
                        <span className="truncate">{label} ↗</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {(sourceLabel || sourceUrl) ? (
          <p className="mt-6 text-center text-xs font-semibold text-stone-500">
            Profile source:{" "}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center rounded-full border border-stone-200 bg-white/70 px-3 py-1 font-black text-stone-700 transition hover:bg-white"
              >
                <span className="truncate">{profileSourceLabel || "Source link"} ↗</span>
              </a>
            ) : (
              <span className="font-black text-stone-700">{profileSourceLabel}</span>
            )}
          </p>
        ) : null}
      </div>
    </main>
  );
}
