// Teacher Add / Edit Global Book

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BookInfoTab from "../../../books/[userBookId]/components/BookInfoTab";

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
    { value: "textbook", label: "Textbook" },
    { value: "other", label: "Other" },
];

type BookRow = {
    id: string;
    title: string | null;
    title_reading: string | null;
    isbn: string | null;
    isbn13: string | null;
    cover_url: string | null;
    genre: string | null;
    book_type: string | null;
    trigger_warnings: string | null;
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
    publisher_id: string | null;
    publisher_reading: string | null;
    publisher_image_url: string | null;
    published_date: string | null;
    page_count: number | null;
    series_number: number | null;
    related_links: any | null;
};

type EditingPanel = "bookInfoDetails" | "bookInfoPeople" | "bookInfoLinks" | null;

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

type BookRequestRow = {
    id: string;
    title: string | null;
    author: string | null;
    isbn13: string | null;
    status: string | null;
    created_at: string | null;
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

function bookTypeLabel(value: string | null | undefined) {
    return BOOK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "—";
}

function linksToText(links: any): string {
    if (!Array.isArray(links)) return "";

    return links
        .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
                const label = (item.label ?? item.url ?? "").toString();
                const url = (item.url ?? "").toString();
                return url ? `${label} | ${url}` : label;
            }
            return "";
        })
        .filter(Boolean)
        .join("\n");
}

function parseLinks(text: string) {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split("|").map((part) => part.trim());
            if (parts.length === 1) return { label: parts[0], url: parts[0] };
            return { label: parts[0], url: parts.slice(1).join("|") };
        });
}

function displayLinkLabel(link: any) {
    const rawLabel =
        typeof link === "object" && link != null ? (link.label ?? "").toString().trim() : "";
    const rawUrl =
        typeof link === "string"
            ? link
            : typeof link === "object" && link != null
                ? (link.url ?? "").toString()
                : "";

    if (rawLabel && rawLabel !== rawUrl) return rawLabel;
    return rawLabel || rawUrl || "Link";
}

function displayLinkUrl(link: any) {
    if (!link) return "";
    if (typeof link === "string") return link;
    if (typeof link === "object") return link.url ?? "";
    return "";
}

function requestTitleNeedsManualResearch(request: BookRequestRow | null) {
    if (!request) return false;
    const title = (request.title ?? "").trim();
    const isbn = (request.isbn13 ?? "").trim();
    return !title || title === `ISBN ${isbn}`;
}

export default function TeacherAddBookPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookId = searchParams.get("bookId");
    const requestId = searchParams.get("requestId");

    const isEditMode = !!bookId;

    const [loading, setLoading] = useState(true);
    const [canAccess, setCanAccess] = useState(false);
    const [currentBookId, setCurrentBookId] = useState<string | null>(bookId);
    const [currentBook, setCurrentBook] = useState<BookRow | null>(null);
    const [editingPanel, setEditingPanel] = useState<EditingPanel>(null);

    const [title, setTitle] = useState("");
    const [isbn, setIsbn] = useState("");
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
    const [seriesNumber, setSeriesNumber] = useState("");
    const [linksText, setLinksText] = useState("");
    const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
    const [selectedTranslatorId, setSelectedTranslatorId] = useState<string | null>(null);
    const [selectedIllustratorId, setSelectedIllustratorId] = useState<string | null>(null);
    const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
    const [requireSharedAuthorRecord, setRequireSharedAuthorRecord] = useState(false);
    const [requireSharedTranslatorRecord, setRequireSharedTranslatorRecord] = useState(false);
    const [requireSharedIllustratorRecord, setRequireSharedIllustratorRecord] = useState(false);
    const [requireSharedPublisherRecord, setRequireSharedPublisherRecord] = useState(false);

    const [message, setMessage] = useState("");
    const [bookRequest, setBookRequest] = useState<BookRequestRow | null>(null);
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
            } else if (requestId) {
                await loadBookRequest(requestId);
            }

            setLoading(false);
        }

        load();
    }, [bookId, requestId, router]);

    async function loadBook(id: string) {
        const { data, error } = await supabase
            .from("books")
            .select(
                `
        id,
        title,
        title_reading,
        isbn,
        isbn13,
        cover_url,
        genre,
        book_type,
        trigger_warnings,
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
        publisher_id,
        publisher_reading,
        publisher_image_url,
        published_date,
        page_count,
        series_number,
        related_links
      `
            )
            .eq("id", id)
            .single<BookRow>();

        if (error) {
            setMessage(error.message ?? "Failed to load book.");
            return;
        }

        setCurrentBookId(data.id);
        setCurrentBook(data);
        setTitle(data.title ?? "");
        setIsbn(data.isbn ?? "");
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
        setSelectedPublisherId(data.publisher_id ?? null);

        setPublishedDate(data.published_date ?? "");
        setPageCount(data.page_count == null ? "" : String(data.page_count));
        setSeriesNumber(data.series_number == null ? "" : String(data.series_number));
        setLinksText(linksToText(data.related_links));
        setSelectedAuthorId(null);
        setSelectedTranslatorId(null);
        setSelectedIllustratorId(null);
        setRequireSharedAuthorRecord(false);
        setRequireSharedTranslatorRecord(false);
        setRequireSharedIllustratorRecord(false);
        setRequireSharedPublisherRecord(false);
    }

    async function loadBookRequest(id: string) {
        const { data, error } = await supabase
            .from("book_requests")
            .select("id, title, author, isbn13, status, created_at")
            .eq("id", id)
            .maybeSingle<BookRequestRow>();

        if (error) {
            setMessage(error.message ?? "Failed to load book request.");
            return;
        }

        if (!data) {
            setMessage("This book request could not be found.");
            return;
        }

        setBookRequest(data);

        const requestTitle = (data.title ?? "").trim();
        const requestIsbn = (data.isbn13 ?? "").trim();

        if (requestTitle && requestTitle !== `ISBN ${requestIsbn}`) {
            setTitle(requestTitle);
        }

        if (requestIsbn) setIsbn13(requestIsbn);
        if (data.author) setAuthor(data.author);
    }

    function clearForm() {
        setCurrentBookId(null);
        setCurrentBook(null);
        setEditingPanel(null);
        setTitle("");
        setIsbn("");
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
        setSeriesNumber("");
        setLinksText("");
        setSelectedAuthorId(null);
        setSelectedTranslatorId(null);
        setSelectedIllustratorId(null);
        setSelectedPublisherId(null);
        setRequireSharedAuthorRecord(false);
        setRequireSharedTranslatorRecord(false);
        setRequireSharedIllustratorRecord(false);
        setRequireSharedPublisherRecord(false);
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

            setIsbnLookupPreview((payload?.book ?? payload) as IsbnLookupPreview);
        } catch (error: any) {
            setIsbnLookupError(error?.message ?? "ISBN lookup failed.");
        } finally {
            setIsbnLookupLoading(false);
        }
    }

    async function createOrLoadByIsbn() {
        setMessage("");

        if (!title.trim()) {
            setMessage(
                bookRequest
                    ? "Please enter the researched book title before creating the manual global book entry."
                    : "Please enter a title."
            );
            return;
        }

        const cleanIsbn13 = isbn13.replace(/[^0-9Xx]/g, "");
        const isManualRequest = Boolean(bookRequest);

        if (cleanIsbn13 && cleanIsbn13.length !== 13) {
            setMessage("Please enter a valid ISBN-13, or leave ISBN blank for a manual entry.");
            return;
        }

        setSaving(true);

        try {
            const existingLookup = cleanIsbn13
                ? await supabase
                    .from("books")
                    .select("id, title")
                    .eq("isbn13", cleanIsbn13)
                    .maybeSingle()
                : { data: null, error: null };
            const existingBook = existingLookup.data;
            const existingError = existingLookup.error;

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
                    author: cleanText(author),
                    isbn13: cleanIsbn13 || null,
                })
                .select("id")
                .single();

            if (error) throw error;

            setCurrentBookId(data.id);
            if (bookRequest?.id) {
                const { error: requestUpdateError } = await supabase
                    .from("book_requests")
                    .update({ status: "reviewed" })
                    .eq("id", bookRequest.id);

                if (requestUpdateError) {
                    console.warn("Could not mark book request as reviewed:", requestUpdateError);
                }
            }
            setMessage(
                isManualRequest
                    ? "Manual catalog book created. Add shared book details below."
                    : "Catalog book created. Add shared book details below."
            );
            router.replace(`/teacher/books/add?bookId=${data.id}`);
        } catch (error: any) {
            console.error("Create/load global book error:", JSON.stringify(error, null, 2));
            setMessage(error?.message ?? "Failed to create or load book.");
        }

        setSaving(false);
    }

    async function rejectBookRequest() {
        if (!bookRequest?.id) return;

        const confirmed = window.confirm(
            "Reject this book request? It will leave the pending list, but the request history will stay in Mekuru."
        );

        if (!confirmed) return;

        setMessage("");
        setSaving(true);

        try {
            const { error } = await supabase
                .from("book_requests")
                .update({ status: "rejected" })
                .eq("id", bookRequest.id);

            if (error) throw error;

            setMessage("Book request marked as rejected.");
            router.replace("/teacher/books");
        } catch (error: any) {
            console.error("Reject book request error:", error);
            setMessage(error?.message ?? "Could not reject this book request.");
        } finally {
            setSaving(false);
        }
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
        const cleanSeriesNumber = seriesNumber.trim()
            ? Number(seriesNumber.replace(/[^0-9]/g, ""))
            : null;
        const relatedLinks = linksText.trim() ? parseLinks(linksText) : null;

        setSaving(true);

        try {
            const { error } = await supabase
                .from("books")
                .update({
                    title: title.trim(),
                    isbn: cleanText(isbn),
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
                    publisher_id: selectedPublisherId,
                    publisher_reading: cleanText(publisherReading),
                    publisher_image_url: cleanText(publisherImageUrl),

                    published_date: cleanText(publishedDate),
                    page_count: cleanPageCount,
                    series_number: cleanSeriesNumber,
                    related_links: relatedLinks,
                })
                .eq("id", currentBookId);

            if (error) throw error;

            setMessage("Book info saved.");
            setEditingPanel(null);
            await loadBook(currentBookId);
        } catch (error: any) {
            console.error("Save global book info error:", JSON.stringify(error, null, 2));
            setMessage(error?.message ?? "Failed to save book info.");
        }

        setSaving(false);
    }

    async function cancelBookInfoEdits() {
        setEditingPanel(null);
        setMessage("");
        if (currentBookId) {
            await loadBook(currentBookId);
        }
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

            {bookRequest ? (
                <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                        Pending Book Request
                    </p>
                    <h2 className="mt-2 text-xl font-black text-stone-900">
                        This request needs manual book entry.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-stone-700">
                        Mekuru could not find enough metadata automatically. Research the
                        book from any clue below. ISBN is helpful when available, but it is
                        not required for manual entry.
                    </p>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="font-semibold text-stone-600">Requested title</dt>
                            <dd className="text-stone-900">{bookRequest.title || "—"}</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-600">Author</dt>
                            <dd className="text-stone-900">{bookRequest.author || "—"}</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-600">ISBN</dt>
                            <dd className="text-stone-900">{bookRequest.isbn13 || "—"}</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-600">Status</dt>
                            <dd className="text-stone-900">{bookRequest.status || "pending"}</dd>
                        </div>
                    </dl>

                    <div className="mt-5 border-t border-amber-200 pt-4">
                        <button
                            type="button"
                            onClick={rejectBookRequest}
                            disabled={saving}
                            className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                            {saving ? "Updating..." : "Reject Request"}
                        </button>
                        <p className="mt-2 text-xs leading-5 text-amber-800">
                            Use this if this request should not become a global book. Mekuru will keep the request history.
                        </p>
                    </div>
                </section>
            ) : null}

            <section className="mt-8 rounded-3xl border border-stone-500 bg-stone-100 p-5">
                <h2 className="text-lg font-black text-stone-900">
                    {bookRequest ? "Manual Book Entry" : "Find or Create Book"}
                </h2>

                {bookRequest ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700">
                        <span className="font-black text-stone-900">Manual entry:</span>{" "}
                        1. Research the real title. 2. Type the title below. 3. Add ISBN only if you have it.
                        4. Create the global book. 5. Fill in the shared Book Info details.
                    </div>
                ) : null}

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-semibold">Title *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={
                                bookRequest
                                    ? "Enter the researched book title"
                                    : "Book title"
                            }
                            className="w-full rounded-xl border border-slate-500 px-4 py-3"
                        />
                        {bookRequest && requestTitleNeedsManualResearch(bookRequest) ? (
                            <p className="mt-2 text-xs font-medium text-amber-800">
                                The request only gave an ISBN, so the real title needs to be entered here.
                            </p>
                        ) : null}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            ISBN-13{" "}
                            <span className="font-normal text-stone-500">
                                {bookRequest ? "(optional for manual entry)" : "*(Hyphens are okay.)"}
                            </span>
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
                        {saving
                            ? "Working..."
                            : bookRequest
                                ? "Create Manual Book Entry"
                                : "Create / Load by ISBN"}
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

            {currentBookId && currentBook ? (
                <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-stone-900">
                                Shared Book Info
                            </h2>
                            <p className="mt-1 text-sm text-stone-500">
                                This uses the same editing surface as the Book Hub Book Info tab.
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

                    <BookInfoTab
                        book={currentBook as any}
                        canEditBookInfo={true}
                        isEditingBookInfo={editingPanel === "bookInfoDetails"}
                        isEditingPeople={editingPanel === "bookInfoPeople"}
                        isEditingLinks={editingPanel === "bookInfoLinks"}
                        isEditingMyCopy={false}
                        saving={saving}
                        errorMessage={message || null}
                        canCreateSharedRecords={false}
                        onEditBookInfo={() => setEditingPanel("bookInfoDetails")}
                        onEditPeople={() => setEditingPanel("bookInfoPeople")}
                        onEditLinks={() => setEditingPanel("bookInfoLinks")}
                        onEditMyCopy={() => null}
                        onCancel={cancelBookInfoEdits}
                        onSave={saveBookInfo}
                        bookType={bookType}
                        setBookType={setBookType}
                        publishedDate={publishedDate}
                        setPublishedDate={setPublishedDate}
                        pageCount={pageCount}
                        setPageCount={setPageCount}
                        seriesNumber={seriesNumber}
                        setSeriesNumber={setSeriesNumber}
                        isbn={isbn}
                        setIsbn={setIsbn}
                        isbn13={isbn13}
                        setIsbn13={setIsbn13}
                        authorName={author}
                        authorEnglishName={authorEnglishName}
                        setAuthorEnglishName={setAuthorEnglishName}
                        setAuthorName={setAuthor}
                        translatorName={translator}
                        translatorEnglishName={translatorEnglishName}
                        setTranslatorEnglishName={setTranslatorEnglishName}
                        setTranslatorName={setTranslator}
                        illustratorName={illustrator}
                        illustratorEnglishName={illustratorEnglishName}
                        setIllustratorEnglishName={setIllustratorEnglishName}
                        setIllustratorName={setIllustrator}
                        publisherName={publisher}
                        setPublisherName={setPublisher}
                        publisherEnglishName={publisherEnglishName}
                        setPublisherEnglishName={setPublisherEnglishName}
                        publisherReading={publisherReading}
                        setPublisherReading={setPublisherReading}
                        selectedAuthorId={selectedAuthorId}
                        setSelectedAuthorId={setSelectedAuthorId}
                        requireSharedAuthorRecord={requireSharedAuthorRecord}
                        setRequireSharedAuthorRecord={setRequireSharedAuthorRecord}
                        selectedTranslatorId={selectedTranslatorId}
                        setSelectedTranslatorId={setSelectedTranslatorId}
                        requireSharedTranslatorRecord={requireSharedTranslatorRecord}
                        setRequireSharedTranslatorRecord={setRequireSharedTranslatorRecord}
                        selectedIllustratorId={selectedIllustratorId}
                        setSelectedIllustratorId={setSelectedIllustratorId}
                        requireSharedIllustratorRecord={requireSharedIllustratorRecord}
                        setRequireSharedIllustratorRecord={setRequireSharedIllustratorRecord}
                        selectedPublisherId={selectedPublisherId}
                        setSelectedPublisherId={setSelectedPublisherId}
                        requireSharedPublisherRecord={requireSharedPublisherRecord}
                        setRequireSharedPublisherRecord={setRequireSharedPublisherRecord}
                        coverUrl={coverUrl}
                        setCoverUrl={setCoverUrl}
                        authorImg={authorImageUrl}
                        setAuthorImg={setAuthorImageUrl}
                        translatorImg={translatorImageUrl}
                        setTranslatorImg={setTranslatorImageUrl}
                        illustratorImg={illustratorImageUrl}
                        setIllustratorImg={setIllustratorImageUrl}
                        publisherImg={publisherImageUrl}
                        setPublisherImg={setPublisherImageUrl}
                        authorReading={authorReading}
                        setAuthorReading={setAuthorReading}
                        translatorReading={translatorReading}
                        setTranslatorReading={setTranslatorReading}
                        illustratorReading={illustratorReading}
                        setIllustratorReading={setIllustratorReading}
                        relatedLinksArr={Array.isArray(currentBook.related_links) ? currentBook.related_links : []}
                        linksText={linksText}
                        setLinksText={setLinksText}
                        bookTypeLabel={bookTypeLabel}
                        displayLinkLabel={displayLinkLabel}
                        displayLinkUrl={displayLinkUrl}
                        BOOK_TYPE_OPTIONS={BOOK_TYPE_OPTIONS}
                        Detail={Detail}
                        PersonRow={PersonRow}
                    />
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

function Detail({
    label,
    value,
    editing,
    inputValue,
    setInputValue,
    placeholder,
}: {
    label: string;
    value: any;
    editing: boolean;
    inputValue: string;
    setInputValue: (value: string) => void;
    placeholder?: string;
}) {
    const display =
        value === null || value === undefined || value === "" ? "—" : String(value);

    return (
        <div className="rounded border bg-white p-3">
            <div className="text-stone-600">{label}</div>
            {!editing ? (
                <div className="font-medium">{display}</div>
            ) : (
                <input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder={placeholder}
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                />
            )}
        </div>
    );
}

function PersonRow({
    label,
    name,
    reading,
    img,
    editing,
    nameValue,
    setNameValue,
    englishNameValue,
    setEnglishNameValue,
    imgValue,
    setImgValue,
    readingValue,
    setReadingValue,
}: {
    label: string;
    name: string | null | undefined;
    reading: string | null | undefined;
    img: string | null | undefined;
    editing: boolean;
    nameValue: string;
    setNameValue: (value: string) => void;
    englishNameValue: string;
    setEnglishNameValue: (value: string) => void;
    imgValue: string;
    setImgValue: (value: string) => void;
    readingValue: string;
    setReadingValue: (value: string) => void;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-stone-100">
                {img ? (
                    <img src={img} alt={name || label} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
                        No image
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                {!editing ? (
                    <>
                        <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
                        <div className="mt-1 text-sm font-medium text-stone-900">{name || "—"}</div>
                        {englishNameValue ? (
                            <div className="text-sm text-stone-700">{englishNameValue}</div>
                        ) : null}
                        <div className="text-sm text-stone-500">{reading || "—"}</div>
                    </>
                ) : (
                    <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
                        <input
                            value={nameValue}
                            onChange={(event) => setNameValue(event.target.value)}
                            placeholder={`${label} name`}
                            className="w-full rounded border px-3 py-2 text-sm"
                        />
                        <input
                            value={englishNameValue}
                            onChange={(event) => setEnglishNameValue(event.target.value)}
                            placeholder={`${label} English name`}
                            className="w-full rounded border px-3 py-2 text-sm"
                        />
                        <input
                            value={readingValue}
                            onChange={(event) => setReadingValue(event.target.value)}
                            placeholder={`${label} reading`}
                            className="w-full rounded border px-3 py-2 text-sm"
                        />
                        <input
                            value={imgValue}
                            onChange={(event) => setImgValue(event.target.value)}
                            placeholder={`${label} image URL`}
                            className="w-full rounded border px-3 py-2 text-sm"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
