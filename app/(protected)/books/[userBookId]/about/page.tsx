// About This Book
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
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

function inferBookstoreSection(book: Book) {
  const format = book.edition_format;
  const type = book.book_type;

  if (format === "bunko") return "文庫 / paperback fiction shelves";
  if (format === "shinsho") return "新書 shelves";
  if (format === "tankobon_hardcover" || format === "tankobon_softcover") {
    return "単行本 / general fiction shelves";
  }
  if (type === "light_novel") return "ライトノベル shelves";
  if (type === "manga") return "漫画 shelves";
  if (type === "picture_book") return "絵本 shelves";
  if (type === "nonfiction" || type === "essay" || type === "memoir") return "nonfiction / essay shelves";
  return null;
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

function cleanInitial(value: string | null | undefined) {
  return value?.trim().slice(0, 1).toUpperCase() || "M";
}

function firstPerson(record: PersonRecord | null | undefined) {
  const person = Array.isArray(record?.people) ? record?.people[0] : record?.people;
  return person ?? null;
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

function DetailCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || String(value).trim().length === 0) return null;

  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-2 text-lg font-black text-stone-950">{value}</p>
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
  tone?: "amber" | "rose" | "sky" | "stone";
}) {
  if (value == null || String(value).trim().length === 0) return null;

  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-950"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : "border-stone-200 bg-white text-stone-950";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">{label}</p>
      <p className="mt-2 text-2xl font-black leading-tight">{value}</p>
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
  note: string;
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
      <p className="mt-5 text-sm leading-6 text-stone-600">{note}</p>
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
          .select("role, is_super_teacher")
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
            related_links
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
            .select("logo_url")
            .eq("id", book.publisher_id)
            .maybeSingle<{ logo_url: string | null }>();

          nextPublisherImage = publisher?.logo_url ?? nextPublisherImage;
        }

        if (!cancelled) {
          setRow(loadedRow);
          setAuthorImageUrl(nextAuthorImage);
          setPublisherImageUrl(nextPublisherImage);
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

  const heroFacts = [
    bookTypeLabel(book.book_type),
    formatBookFormat(book, row),
    formatLanguage(book.language_code),
    book.page_count ? `${book.page_count} pages` : null,
    publishedYear(book.published_date),
  ].filter(Boolean);

  const bookFormat = formatBookFormat(book, row);
  const isbn = book.isbn13 || book.isbn;
  const bookstoreSection = inferBookstoreSection(book);
  const synopsis = null;
  const learnerReadingNotes: string[] = [];
  const similarBooks: Array<{ title: string; href: string }> = [];

  const details = [
    { label: "Book Type", value: bookTypeLabel(book.book_type) },
    { label: "Book Format", value: bookFormat },
    { label: "Language", value: formatLanguage(book.language_code) },
    { label: "Pages", value: book.page_count },
    { label: "Published", value: book.published_date },
    { label: "ISBN", value: isbn },
    { label: "Reading Format", value: formatReadingFormat(row.format_type) },
    { label: "Reader Level", value: row.reader_level },
    { label: "Recommended Level", value: row.recommended_level },
    { label: "Series", value: book.series_number ? `${book.series_number}${book.series_total ? ` / ${book.series_total}` : ""}` : null },
  ];

  return (
    <main className="min-h-screen bg-[#f5efe7] px-5 py-8 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/books/${row.id}`}
          className="inline-flex text-sm font-black text-stone-600 transition hover:text-stone-950"
        >
          &larr; Back to Book Hub
        </Link>

        <section className="mt-5 overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-amber-100 via-rose-50 to-sky-100 p-6 md:p-10">
            <div className="grid gap-8 md:grid-cols-[230px_minmax(0,1fr)] md:items-end">
              <div className="mx-auto w-48 md:w-full">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={`${book.title ?? "Book"} cover`}
                    className="aspect-[2/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-black/10"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-3xl bg-stone-200 text-center text-sm font-black text-stone-500 shadow-xl">
                    No cover yet
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-stone-600 shadow-sm">
                    About This Book
                  </span>
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-black text-white shadow-sm">
                    {statusLabel(row)}
                  </span>
                </div>

                <h1 className="text-4xl font-black leading-tight text-stone-950 md:text-6xl">
                  {book.title ?? "Untitled book"}
                </h1>

                {book.title_reading ? (
                  <p className="mt-3 text-lg font-semibold text-stone-600">{book.title_reading}</p>
                ) : null}

                <p className="mt-5 text-2xl font-black text-stone-800">
                  {book.author || book.author_english_name || "Author not listed yet"}
                </p>

                {heroFacts.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {heroFacts.map((fact) => (
                      <span key={fact} className="rounded-full bg-white/75 px-4 py-2 text-sm font-black text-stone-700 shadow-sm">
                        {fact}
                      </span>
                    ))}
                  </div>
                ) : null}
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
            label="Edition Note"
            value={book.edition_note}
            tone="sky"
          />
          <FormatHighlightCard
            label="ISBN"
            value={isbn}
            tone="stone"
          />
        </section>

        <section className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Bookstore hint
          </p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <h2 className="text-2xl font-black text-stone-950">
                Look for this format when searching in Japanese bookstores.
              </h2>
              <div className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-stone-700 sm:grid-cols-2">
                <p>Title: {book.title ?? "Untitled book"}</p>
                {book.author ? <p>Author: {book.author}</p> : null}
                {book.publisher ? <p>Publisher: {book.publisher}</p> : null}
                {isbn ? <p>ISBN: {isbn}</p> : null}
                {bookFormat ? <p>Format: {bookFormat}</p> : null}
                {bookstoreSection ? <p>Likely section: {bookstoreSection}</p> : null}
              </div>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-white/80 p-5">
              <p className="text-sm font-black text-stone-950">
                Search cue
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Try the title with the author, ISBN, or format label. Japanese editions can move between 文庫本, 単行本, 新書, and ebook listings.
              </p>
            </div>
          </div>
        </section>

        {synopsis ? (
          <ProfileSection
            eyebrow="Synopsis"
            title="What This Book Is About"
            description="A learner-facing overview can live here once MEKURU has a stored synopsis."
          >
            <p className="text-sm leading-7 text-stone-700">{synopsis}</p>
          </ProfileSection>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <CreatorCard
            eyebrow="Author"
            name={book.author || book.author_english_name || "Author not listed yet"}
            reading={book.author_reading}
            imageUrl={authorImageUrl}
            fallbackInitial={cleanInitial(book.author || book.author_english_name)}
            imageAlt={book.author ? `${book.author} photo` : "Author photo"}
            note="Author bio can be added later. For now, this profile shows the stored author metadata already in MEKURU."
          />

          <CreatorCard
            eyebrow="Publisher"
            name={book.publisher || "Publisher not listed yet"}
            reading={book.publisher_reading}
            imageUrl={publisherImageUrl}
            fallbackInitial={cleanInitial(book.publisher)}
            imageAlt={book.publisher ? `${book.publisher} logo` : "Publisher logo"}
            imageClassName="object-contain bg-white p-2"
            note="Publisher or imprint description can be added later. Stored publisher images are shown here when available."
          />
        </section>

        <ProfileSection
          eyebrow="Book Details"
          title="Edition and Reading Details"
          description="These details use the current stored book metadata and reader copy information."
          className="mt-6"
        >
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {details.map((detail) => (
              <DetailCard key={detail.label} label={detail.label} value={detail.value} />
            ))}
          </div>

          {book.edition_note ? (
            <div className="mt-5 rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Edition Note</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{book.edition_note}</p>
            </div>
          ) : null}
        </ProfileSection>

        {learnerReadingNotes.length > 0 ? (
          <ProfileSection
            eyebrow="Reading Notes"
            title="Learner-Facing Notes"
            description="Notes for readers can live here later without mixing them into private Story Notes."
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
                    const label = typeof link === "string" ? `Link ${index + 1}` : link?.label || link?.title || `Link ${index + 1}`;
                    if (!href) return null;
                    return (
                      <a
                        key={`${href}-${index}`}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-black text-stone-700 transition hover:bg-stone-100"
                      >
                        {label}
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
