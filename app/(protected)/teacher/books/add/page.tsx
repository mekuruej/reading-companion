// Teacher Add / Edit Global Book

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BOOK_TYPE_OPTIONS = [
    { value: "", label: "Choose a book type" },
    { value: "picture_book", label: "Picture book" },
    { value: "early_reader", label: "Early reader" },
    { value: "chapter_book", label: "Chapter book" },
    { value: "middle_grade", label: "Middle grade" },
    { value: "young_adult", label: "Young adult" },
    { value: "novel", label: "Novel" },
    { value: "manga", label: "Manga" },
    { value: "graded_reader", label: "Graded reader" },
    { value: "other", label: "Other" },
];

type BookRow = {
    id: string;
    title: string | null;
    isbn13: string | null;
    cover_url: string | null;
    book_type: string | null;
    author: string | null;
    author_reading: string | null;
    author_image_url: string | null;
    translator: string | null;
    translator_reading: string | null;
    translator_image_url: string | null;
    illustrator: string | null;
    illustrator_reading: string | null;
    illustrator_image_url: string | null;
    publisher: string | null;
    publisher_reading: string | null;
    publisher_image_url: string | null;
    published_date: string | null;
    page_count: number | null;
};

type IsbnLookupPreview = {
    isbn13: string;
    title: string | null;
    author_display: string | null;
    authors: string[];
    cover_url: string | null;
    publisher: string | null;
    published_date: string | null;
    page_count: number | null;
    metadata_source: "mekuru" | "openbd" | "google_books" | "open_library" | "none";
    found_existing_book: boolean;
    existing_book_id: string | null;
    needs_review: boolean;
};

function cleanText(value: string) {
    return value.trim() || null;
}

function metadataSourceLabel(value: IsbnLookupPreview["metadata_source"]) {
    switch (value) {
        case "mekuru":
            return "Mekuru";
        case "openbd":
            return "openBD";
        case "google_books":
            return "Google Books";
        case "open_library":
            return "Open Library";
        case "none":
        default:
            return "None";
    }
}

export default function TeacherAddBookPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookId = searchParams.get("bookId");

    const isEditMode = !!bookId;

    const [loading, setLoading] = useState(true);
    const [canAccess, setCanAccess] = useState(false);
    const [currentBookId, setCurrentBookId] = useState<string | null>(bookId);

    const [title, setTitle] = useState("");
    const [isbn13, setIsbn13] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [bookType, setBookType] = useState("");

    const [author, setAuthor] = useState("");
    const [authorReading, setAuthorReading] = useState("");
    const [authorEnglishName, setAuthorEnglishName] = useState("");
    const [authorImageUrl, setAuthorImageUrl] = useState("");

    const [translator, setTranslator] = useState("");
    const [translatorReading, setTranslatorReading] = useState("");
    const [translatorEnglishName, setTranslatorEnglishName] = useState("");
    const [translatorImageUrl, setTranslatorImageUrl] = useState("");

    const [illustrator, setIllustrator] = useState("");
    const [illustratorReading, setIllustratorReading] = useState("");
    const [illustratorEnglishName, setIllustratorEnglishName] = useState("");
    const [illustratorImageUrl, setIllustratorImageUrl] = useState("");

    const [publisher, setPublisher] = useState("");
    const [publisherReading, setPublisherReading] = useState("");
    const [publisherEnglishName, setPublisherEnglishName] = useState("");
    const [publisherImageUrl, setPublisherImageUrl] = useState("");

    const [publishedDate, setPublishedDate] = useState("");
    const [pageCount, setPageCount] = useState("");

    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [isbnLookupLoading, setIsbnLookupLoading] = useState(false);
    const [isbnLookupError, setIsbnLookupError] = useState("");
    const [isbnLookupPreview, setIsbnLookupPreview] = useState<IsbnLookupPreview | null>(null);

    const missingFields = useMemo(() => {
        const missing: string[] = [];

        if (!isbn13.trim()) missing.push("ISBN-13");
        if (!coverUrl.trim()) missing.push("Cover");
        if (!bookType.trim()) missing.push("Book type");
        if (!author.trim()) missing.push("Author");
        if (!publisher.trim()) missing.push("Publisher");
        if (!publishedDate.trim()) missing.push("Published date");
        if (!pageCount.trim()) missing.push("Page count");

        return missing;
    }, [isbn13, coverUrl, bookType, author, publisher, publishedDate, pageCount]);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setMessage("");

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, is_super_teacher")
                .eq("id", user.id)
                .single();

            const isTeacher =
                profile?.role === "teacher" ||
                profile?.role === "super_teacher" ||
                !!profile?.is_super_teacher;

            setCanAccess(isTeacher);

            if (!isTeacher) {
                setMessage("Teacher access is required.");
                setLoading(false);
                return;
            }

            if (bookId) {
                await loadBook(bookId);
            }

            setLoading(false);
        }

        load();
    }, [bookId, router]);

    async function loadBook(id: string) {
        const { data, error } = await supabase
            .from("books")
            .select(
                `
        id,
        title,
        isbn13,
        cover_url,
        book_type,
        author,
        author_reading,
        author_image_url,
        translator,
        translator_reading,
        translator_image_url,
        illustrator,
        illustrator_reading,
        illustrator_image_url,
        publisher,
        publisher_reading,
        publisher_image_url,
        published_date,
        page_count
      `
            )
            .eq("id", id)
            .single<BookRow>();

        if (error) {
            setMessage(error.message ?? "Failed to load book.");
            return;
        }

        setCurrentBookId(data.id);
        setTitle(data.title ?? "");
        setIsbn13(data.isbn13 ?? "");
        setCoverUrl(data.cover_url ?? "");
        setBookType(data.book_type ?? "");

        setAuthor(data.author ?? "");
        setAuthorReading(data.author_reading ?? "");
        setAuthorImageUrl(data.author_image_url ?? "");

        setTranslator(data.translator ?? "");
        setTranslatorReading(data.translator_reading ?? "");
        setTranslatorImageUrl(data.translator_image_url ?? "");

        setIllustrator(data.illustrator ?? "");
        setIllustratorReading(data.illustrator_reading ?? "");
        setIllustratorImageUrl(data.illustrator_image_url ?? "");

        setPublisher(data.publisher ?? "");
        setPublisherReading(data.publisher_reading ?? "");
        setPublisherImageUrl(data.publisher_image_url ?? "");

        setPublishedDate(data.published_date ?? "");
        setPageCount(data.page_count == null ? "" : String(data.page_count));
    }

    function clearForm() {
        setCurrentBookId(null);
        setTitle("");
        setIsbn13("");
        setCoverUrl("");
        setBookType("");

        setAuthor("");
        setAuthorReading("");
        setAuthorEnglishName("");
        setAuthorImageUrl("");

        setTranslator("");
        setTranslatorReading("");
        setTranslatorEnglishName("");
        setTranslatorImageUrl("");

        setIllustrator("");
        setIllustratorReading("");
        setIllustratorEnglishName("");
        setIllustratorImageUrl("");

        setPublisher("");
        setPublisherReading("");
        setPublisherEnglishName("");
        setPublisherImageUrl("");

        setPublishedDate("");
        setPageCount("");
        setIsbnLookupError("");
        setIsbnLookupPreview(null);
    }

    async function lookupIsbnPreview() {
        setMessage("");
        setIsbnLookupError("");
        setIsbnLookupPreview(null);

        const cleanIsbn13 = isbn13.replace(/[\s-]/g, "").trim();

        if (!/^\d{13}$/.test(cleanIsbn13)) {
            setIsbnLookupError("Please enter a valid ISBN-13. Hyphens are okay.");
            return;
        }

        setIsbnLookupLoading(true);

        try {
            const response = await fetch(
                `/api/books/lookup-isbn?isbn=${encodeURIComponent(cleanIsbn13)}`,
                { cache: "no-store" }
            );
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(payload?.error ?? "ISBN lookup failed.");
            }

            setIsbnLookupPreview(payload as IsbnLookupPreview);
        } catch (error: any) {
            setIsbnLookupError(error?.message ?? "ISBN lookup failed.");
        } finally {
            setIsbnLookupLoading(false);
        }
    }

    async function createOrLoadByIsbn() {
        setMessage("");

        if (!title.trim()) {
            setMessage("Please enter a title.");
            return;
        }

        const cleanIsbn13 = isbn13.replace(/[^0-9Xx]/g, "");

        if (cleanIsbn13.length !== 13) {
            setMessage("Please enter a valid ISBN-13. Hyphens are okay.");
            return;
        }

        setSaving(true);

        try {
            const { data: existingBook, error: existingError } = await supabase
                .from("books")
                .select("id, title")
                .eq("isbn13", cleanIsbn13)
                .maybeSingle();

            if (existingError) throw existingError;

            if (existingBook) {
                await loadBook(existingBook.id);
                setMessage(`Loaded existing book: ${existingBook.title}`);
                router.replace(`/teacher/books/add?bookId=${existingBook.id}`);
                setSaving(false);
                return;
            }

            const { data, error } = await supabase
                .from("books")
                .insert({
                    title: title.trim(),
                    isbn13: cleanIsbn13,
                })
                .select("id")
                .single();

            if (error) throw error;

            setCurrentBookId(data.id);
            setMessage("Catalog book created. Add details below.");
            router.replace(`/teacher/books/add?bookId=${data.id}`);
        } catch (error: any) {
            console.error("Create/load global book error:", JSON.stringify(error, null, 2));
            setMessage(error?.message ?? "Failed to create or load book.");
        }

        setSaving(false);
    }

    async function createOrLoadFromIsbnPreview() {
        setMessage("");
        setIsbnLookupError("");

        if (!isbnLookupPreview) {
            setIsbnLookupError("Look up an ISBN before creating a global book from metadata.");
            return;
        }

        if (!isbnLookupPreview.isbn13 || !/^\d{13}$/.test(isbnLookupPreview.isbn13)) {
            setIsbnLookupError("The preview is missing a valid ISBN-13.");
            return;
        }

        if (isbnLookupPreview.found_existing_book && isbnLookupPreview.existing_book_id) {
            setSaving(true);
            try {
                await loadBook(isbnLookupPreview.existing_book_id);
                setMessage("This ISBN already exists in Mekuru. Loaded the existing global book.");
                router.replace(`/teacher/books/add?bookId=${isbnLookupPreview.existing_book_id}`);
            } catch (error: any) {
                setIsbnLookupError(error?.message ?? "Could not load the existing global book.");
            } finally {
                setSaving(false);
            }
            return;
        }

        if (!isbnLookupPreview.title?.trim()) {
            setIsbnLookupError(
                "This lookup did not return a title. Please review and create the book manually."
            );
            return;
        }

        setSaving(true);

        try {
            const { data: existingBook, error: existingError } = await supabase
                .from("books")
                .select("id, title")
                .eq("isbn13", isbnLookupPreview.isbn13)
                .maybeSingle();

            if (existingError) throw existingError;

            if (existingBook) {
                await loadBook(existingBook.id);
                setMessage("This ISBN already exists in Mekuru. Loaded the existing global book.");
                router.replace(`/teacher/books/add?bookId=${existingBook.id}`);
                setSaving(false);
                return;
            }

            const cleanPageCount =
                isbnLookupPreview.page_count != null && Number.isFinite(isbnLookupPreview.page_count)
                    ? isbnLookupPreview.page_count
                    : null;

            const { data, error } = await supabase
                .from("books")
                .insert({
                    title: isbnLookupPreview.title.trim(),
                    isbn13: isbnLookupPreview.isbn13,
                    author: cleanText(isbnLookupPreview.author_display ?? ""),
                    cover_url: cleanText(isbnLookupPreview.cover_url ?? ""),
                    publisher: cleanText(isbnLookupPreview.publisher ?? ""),
                    published_date: cleanText(isbnLookupPreview.published_date ?? ""),
                    page_count: cleanPageCount,
                })
                .select("id")
                .single();

            if (error) throw error;

            await loadBook(data.id);
            setMessage("Global book created from ISBN metadata. Review and edit details below.");
            router.replace(`/teacher/books/add?bookId=${data.id}`);
        } catch (error: any) {
            console.error("Create global book from ISBN metadata error:", JSON.stringify(error, null, 2));
            setIsbnLookupError(error?.message ?? "Failed to create global book from metadata.");
        } finally {
            setSaving(false);
        }
    }

    async function saveBookInfo() {
        setMessage("");

        if (!currentBookId) {
            setMessage("Create or load a book first.");
            return;
        }

        if (!title.trim()) {
            setMessage("Please enter a title.");
            return;
        }

        const cleanIsbn13 = isbn13.replace(/[^0-9Xx]/g, "");

        if (cleanIsbn13.length !== 13) {
            setMessage("Please enter a valid ISBN-13. Hyphens are okay.");
            return;
        }

        const cleanPageCount = pageCount.trim()
            ? Number(pageCount.replace(/[^0-9]/g, ""))
            : null;

        setSaving(true);

        try {
            const { error } = await supabase
                .from("books")
                .update({
                    title: title.trim(),
                    isbn13: cleanIsbn13,
                    cover_url: cleanText(coverUrl),
                    book_type: cleanText(bookType),

                    author: cleanText(author),
                    author_reading: cleanText(authorReading),
                    author_image_url: cleanText(authorImageUrl),

                    translator: cleanText(translator),
                    translator_reading: cleanText(translatorReading),
                    translator_image_url: cleanText(translatorImageUrl),

                    illustrator: cleanText(illustrator),
                    illustrator_reading: cleanText(illustratorReading),
                    illustrator_image_url: cleanText(illustratorImageUrl),

                    publisher: cleanText(publisher),
                    publisher_reading: cleanText(publisherReading),
                    publisher_image_url: cleanText(publisherImageUrl),

                    published_date: cleanText(publishedDate),
                    page_count: cleanPageCount,
                })
                .eq("id", currentBookId);

            if (error) throw error;

            setMessage("Book info saved.");
        } catch (error: any) {
            console.error("Save global book info error:", JSON.stringify(error, null, 2));
            setMessage(error?.message ?? "Failed to save book info.");
        }

        setSaving(false);
    }

    if (loading) {
        return (
            <main className="p-6">
                <p>Loading...</p>
            </main>
        );
    }

    if (!canAccess) {
        return (
            <main className="p-6">
                <p>{message}</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-4xl p-6">
            <Link
                href="/teacher/books"
                className="text-sm font-medium text-stone-600 underline"
            >
                ← Books Needing My Attention
            </Link>

            <h1 className="mt-4 text-3xl font-black text-stone-900">
                {isEditMode || currentBookId ? "Edit Global Book" : "Add Global Book"}
            </h1>

            <p className="mt-2 text-stone-600">
                Create or update a shared catalog book. This does not add the book to a
                student library.
            </p>

            <section className="mt-8 rounded-3xl border border-stone-500 bg-stone-100 p-5">
                <h2 className="text-lg font-black text-stone-900">
                    Find or Create Book
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-semibold">Title *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-slate-500 px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            ISBN-13 * <span className="font-normal text-stone-500">(Hyphens are okay.)</span>
                        </label>
                        <input
                            value={isbn13}
                            onChange={(e) => {
                                setIsbn13(e.target.value);
                                setIsbnLookupError("");
                                setIsbnLookupPreview(null);
                            }}
                            className="w-full rounded-xl border border-slate-500 px-4 py-3"
                        />
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        onClick={lookupIsbnPreview}
                        disabled={isbnLookupLoading || !isbn13.trim()}
                        type="button"
                        className="rounded-2xl border border-sky-300 bg-white px-5 py-3 font-semibold text-sky-900 hover:bg-sky-50 disabled:opacity-50"
                    >
                        {isbnLookupLoading ? "Looking up..." : "Look up ISBN"}
                    </button>

                    <button
                        onClick={createOrLoadByIsbn}
                        disabled={saving}
                        className="rounded-2xl bg-stone-900 px-5 py-3 font-semibold text-white hover:bg-black disabled:opacity-50"
                    >
                        {saving ? "Working..." : "Create / Load by ISBN"}
                    </button>

                    <button
                        onClick={clearForm}
                        type="button"
                        className="rounded-2xl border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-700 hover:bg-stone-50"
                    >
                        Clear
                    </button>
                </div>

                {isbnLookupError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {isbnLookupError}
                    </div>
                ) : null}

                {isbnLookupPreview ? (
                    <div className="mt-5 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
                        {isbnLookupPreview.found_existing_book ? (
                            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                                This ISBN already exists in the global library. Do not create a duplicate.
                            </div>
                        ) : (
                            <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                                Metadata preview only. Nothing has been saved to Mekuru yet.
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                            {isbnLookupPreview.cover_url ? (
                                <img
                                    src={isbnLookupPreview.cover_url}
                                    alt=""
                                    className="h-40 w-28 rounded-xl object-cover shadow-sm"
                                />
                            ) : (
                                <div className="flex h-40 w-28 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-xs text-stone-500">
                                    No cover
                                </div>
                            )}

                            <div className="min-w-0">
                                <div className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                                    ISBN Lookup Preview
                                </div>
                                <h3 className="mt-1 text-xl font-black text-stone-950">
                                    {isbnLookupPreview.title ?? "Untitled book"}
                                </h3>
                                <p className="mt-1 text-sm text-stone-600">
                                    {isbnLookupPreview.author_display ?? "Author unknown"}
                                </p>

                                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="font-semibold text-stone-500">Publisher</dt>
                                        <dd className="text-stone-900">
                                            {isbnLookupPreview.publisher ?? "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-stone-500">Published date</dt>
                                        <dd className="text-stone-900">
                                            {isbnLookupPreview.published_date ?? "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-stone-500">ISBN-13</dt>
                                        <dd className="text-stone-900">{isbnLookupPreview.isbn13}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-stone-500">Metadata source</dt>
                                        <dd className="text-stone-900">
                                            {metadataSourceLabel(isbnLookupPreview.metadata_source)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-stone-500">Existing book</dt>
                                        <dd className="text-stone-900">
                                            {isbnLookupPreview.found_existing_book
                                                ? `Yes (${isbnLookupPreview.existing_book_id ?? "ID unavailable"})`
                                                : "No"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-stone-500">Needs review</dt>
                                        <dd className="text-stone-900">
                                            {isbnLookupPreview.needs_review ? "Yes" : "No"}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={createOrLoadFromIsbnPreview}
                                        disabled={saving}
                                        className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
                                    >
                                        {saving
                                            ? "Working..."
                                            : isbnLookupPreview.found_existing_book
                                                ? "Load existing global book"
                                                : "Create global book from this metadata"}
                                    </button>

                                    {!isbnLookupPreview.title ? (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                            This preview has no title, so it needs manual/admin review before creating.
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            {currentBookId ? (
                <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-stone-900">
                                Book Info Editor
                            </h2>
                            <p className="mt-1 text-sm text-stone-500">
                                Fill in the shared catalog details readers will see later.
                            </p>
                        </div>

                        {missingFields.length > 0 ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <span className="font-bold">Missing:</span>{" "}
                                {missingFields.join(", ")}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                                Core info complete
                            </div>
                        )}
                    </div>

                    <div className="mt-6 grid gap-8">
                        <div className="grid gap-5">
                            <div>
                                <label className="mb-1 block text-sm font-semibold">
                                    Book Type
                                </label>
                                <select
                                    value={bookType}
                                    onChange={(e) => setBookType(e.target.value)}
                                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                                >
                                    {BOOK_TYPE_OPTIONS.map((option) => (
                                        <option key={option.value || "empty"} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-semibold">
                                    Cover URL
                                </label>
                                <input
                                    value={coverUrl}
                                    onChange={(e) => setCoverUrl(e.target.value)}
                                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold">
                                        Published Date / Year
                                    </label>
                                    <input
                                        value={publishedDate}
                                        onChange={(e) => setPublishedDate(e.target.value)}
                                        placeholder="2024 or 2024-03-15"
                                        className="w-full rounded-xl border border-stone-300 px-4 py-3"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold">
                                        Page Count
                                    </label>
                                    <input
                                        value={pageCount}
                                        onChange={(e) => setPageCount(e.target.value)}
                                        inputMode="numeric"
                                        className="w-full rounded-xl border border-stone-300 px-4 py-3"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-200 p-4">
                            <h3 className="font-black text-stone-900">Author</h3>
                            <div className="mt-4 grid gap-4">
                                <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={authorReading} onChange={(e) => setAuthorReading(e.target.value)} placeholder="Author reading" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={authorEnglishName} onChange={(e) => setAuthorEnglishName(e.target.value)} placeholder="Author English name" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={authorImageUrl} onChange={(e) => setAuthorImageUrl(e.target.value)} placeholder="Author image URL" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-200 p-4">
                            <h3 className="font-black text-stone-900">Translator</h3>
                            <div className="mt-4 grid gap-4">
                                <input value={translator} onChange={(e) => setTranslator(e.target.value)} placeholder="Translator" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={translatorReading} onChange={(e) => setTranslatorReading(e.target.value)} placeholder="Translator reading" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={translatorEnglishName} onChange={(e) => setTranslatorEnglishName(e.target.value)} placeholder="Translator English name" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={translatorImageUrl} onChange={(e) => setTranslatorImageUrl(e.target.value)} placeholder="Translator image URL" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-200 p-4">
                            <h3 className="font-black text-stone-900">Illustrator</h3>
                            <div className="mt-4 grid gap-4">
                                <input value={illustrator} onChange={(e) => setIllustrator(e.target.value)} placeholder="Illustrator" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={illustratorReading} onChange={(e) => setIllustratorReading(e.target.value)} placeholder="Illustrator reading" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={illustratorEnglishName} onChange={(e) => setIllustratorEnglishName(e.target.value)} placeholder="Illustrator English name" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={illustratorImageUrl} onChange={(e) => setIllustratorImageUrl(e.target.value)} placeholder="Illustrator image URL" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-200 p-4">
                            <h3 className="font-black text-stone-900">Publisher</h3>
                            <div className="mt-4 grid gap-4">
                                <input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Publisher" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={publisherReading} onChange={(e) => setPublisherReading(e.target.value)} placeholder="Publisher reading" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={publisherEnglishName} onChange={(e) => setPublisherEnglishName(e.target.value)} placeholder="Publisher English name" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                                <input value={publisherImageUrl} onChange={(e) => setPublisherImageUrl(e.target.value)} placeholder="Publisher image URL" className="w-full rounded-xl border border-stone-300 px-4 py-3" />
                            </div>
                        </div>

                        <button
                            onClick={saveBookInfo}
                            disabled={saving}
                            className="rounded-2xl bg-stone-900 px-5 py-3 font-semibold text-white hover:bg-black disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Book Info"}
                        </button>
                    </div>
                </section>
            ) : null}

            {message ? (
                <p className="mt-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
                    {message}
                </p>
            ) : null}
        </main>
    );
}
