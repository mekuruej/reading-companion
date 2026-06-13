// Teacher Add / Edit Global Book

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BookInfoTab from "../../../books/[userBookId]/components/BookInfoTab";
import { TeacherBookAddLoadingState } from "./components/TeacherBookAddLoadingState";
import { TeacherBookAddAccessState } from "./components/TeacherBookAddAccessState";
import { TeacherBookAddHeader } from "./components/TeacherBookAddHeader";
import { TeacherBookAddMessageBanner } from "./components/TeacherBookAddMessageBanner";
import { TeacherBookInfoSectionHeader } from "./components/TeacherBookInfoSectionHeader";
import { TeacherBookRequestPanel } from "./components/TeacherBookRequestPanel";
import { TeacherBookIsbnPreviewCard } from "./components/TeacherBookIsbnPreviewCard";
import { TeacherBookAddHelpCard } from "./components/TeacherBookAddHelpCard";
import { TeacherBookFindCreateActions } from "./components/TeacherBookFindCreateActions";
import { TeacherBookFindCreateFields } from "./components/TeacherBookFindCreateFields";
import { TeacherBookFindCreatePanel } from "./components/TeacherBookFindCreatePanel";
import { TeacherBookInfoSection } from "./components/TeacherBookInfoSection";
import { TeacherBookAddPageShell } from "./components/TeacherBookAddPageShell";

const BOOK_TYPE_OPTIONS = [
    { value: "", label: "Choose a book type" },
    { value: "picture_book", label: "Picture book" },
    { value: "early_reader", label: "Early reader" },
    { value: "chapter_book", label: "Chapter book" },
    { value: "middle_grade", label: "Middle grade" },
    { value: "ya", label: "YA" },
    { value: "novel", label: "Novel" },
    { value: "short_story", label: "Short Story" },
    { value: "manga", label: "Manga" },
    { value: "nonfiction", label: "Nonfiction" },
    { value: "essay", label: "Essay" },
    { value: "memoir", label: "Memoir" },
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

function normalizeName(value: string) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
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

function messageTone(message: string): "neutral" | "success" | "error" {
    if (!message) return "neutral";

    const lowerMessage = message.toLowerCase();

    if (
        lowerMessage.includes("failed") ||
        lowerMessage.includes("could not") ||
        lowerMessage.includes("please enter") ||
        lowerMessage.includes("required") ||
        lowerMessage.includes("not found") ||
        lowerMessage.includes("error") ||
        lowerMessage.includes("violates")
    ) {
        return "error";
    }

    if (
        lowerMessage.includes("saved") ||
        lowerMessage.includes("created") ||
        lowerMessage.includes("loaded") ||
        lowerMessage.includes("marked as rejected")
    ) {
        return "success";
    }

    return "neutral";
}

function isErrorMessage(message: string) {
    return messageTone(message) === "error";
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

async function rejectBookRequestWithSession(requestId: string) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (sessionError || !token) {
        throw new Error("Please sign in again before rejecting this request.");
    }

    const response = await fetch("/api/book-requests/reject", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error ?? "Could not reject this book request.");
    }

    return data;
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
        setPublisherEnglishName("");
        if (data.publisher_id) {
            const { data: publisherRecord, error: publisherError } = await supabase
                .from("publishers")
                .select("name_ja, name_en, reading, logo_url")
                .eq("id", data.publisher_id)
                .maybeSingle();

            if (publisherError) {
                console.warn("Could not load linked publisher record:", publisherError);
            } else if (publisherRecord) {
                setPublisher(publisherRecord.name_ja ?? data.publisher ?? "");
                setPublisherEnglishName(publisherRecord.name_en ?? "");
                setPublisherReading(publisherRecord.reading ?? data.publisher_reading ?? "");
                setPublisherImageUrl(publisherRecord.logo_url ?? data.publisher_image_url ?? "");
            }
        }

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

    async function upsertPublisherRecord() {
        const cleanedName = publisher.trim().replace(/\s+/g, " ");
        if (!cleanedName) return null;

        const payload = {
            name_ja: cleanedName,
            name_en: cleanText(publisherEnglishName),
            reading: cleanText(publisherReading),
            logo_url: cleanText(publisherImageUrl),
        };

        if (selectedPublisherId) {
            const { data, error } = await supabase
                .from("publishers")
                .update(payload)
                .eq("id", selectedPublisherId)
                .select("id, name_ja")
                .single();

            if (error) {
                console.warn("Could not update linked publisher record:", error);
                return { id: selectedPublisherId, name_ja: cleanedName };
            }

            return data;
        }

        const { data, error } = await supabase
            .from("publishers")
            .upsert(
                {
                    ...payload,
                    normalized_name: normalizeName(cleanedName),
                },
                {
                    onConflict: "normalized_name",
                    ignoreDuplicates: false,
                }
            )
            .select("id, name_ja")
            .single();

        if (error) {
            console.warn("Could not upsert publisher record:", error);
            return null;
        }

        return data;
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
            await rejectBookRequestWithSession(bookRequest.id);
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
            const publisherRecord = await upsertPublisherRecord();

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

                    publisher: publisherRecord?.name_ja ?? cleanText(publisher),
                    publisher_id: publisherRecord?.id ?? null,
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
        return <TeacherBookAddLoadingState />;
    }

    if (!canAccess) {
        return <TeacherBookAddAccessState message={message} />;
    }

    const showFindOrCreatePanel = !currentBookId || !!bookRequest;

    return (
        <TeacherBookAddPageShell>
            <TeacherBookAddHeader isEditing={isEditMode || !!currentBookId} />

            {bookRequest ? (
                <TeacherBookRequestPanel
                    title={bookRequest.title}
                    author={bookRequest.author}
                    isbn13={bookRequest.isbn13}
                    status={bookRequest.status}
                    saving={saving}
                    onReject={rejectBookRequest}
                />
            ) : null}

            {showFindOrCreatePanel ? (
                <TeacherBookFindCreatePanel>
                    {bookRequest ? <TeacherBookAddHelpCard /> : null}

                    <TeacherBookFindCreateFields
                        title={title}
                        isbn13={isbn13}
                        isBookRequest={Boolean(bookRequest)}
                        titleNeedsManualResearch={requestTitleNeedsManualResearch(bookRequest)}
                        onTitleChange={setTitle}
                        onIsbn13Change={(value) => {
                            setIsbn13(value);
                            setIsbnLookupError("");
                            setIsbnLookupPreview(null);
                        }}
                    />

                    <TeacherBookFindCreateActions
                        isbnLookupLoading={isbnLookupLoading}
                        hasIsbnValue={Boolean(isbn13.trim())}
                        saving={saving}
                        isBookRequest={Boolean(bookRequest)}
                        isbnLookupError={isbnLookupError}
                        onLookupIsbn={lookupIsbnPreview}
                        onCreateOrLoad={createOrLoadByIsbn}
                        onClear={clearForm}
                    />

                    {isbnLookupPreview ? (
                        <TeacherBookIsbnPreviewCard
                            preview={isbnLookupPreview}
                            saving={saving}
                            metadataSourceLabel={metadataSourceLabel}
                            onCreateOrLoad={createOrLoadFromIsbnPreview}
                        />
                    ) : null}
                </TeacherBookFindCreatePanel>
            ) : null}

            {currentBookId && currentBook ? (
                <TeacherBookInfoSection missingFields={missingFields}>

                    <BookInfoTab
                        book={currentBook as any}
                        canEditBookInfo={true}
                        isEditingBookInfo={editingPanel === "bookInfoDetails"}
                        isEditingPeople={editingPanel === "bookInfoPeople"}
                        isEditingLinks={editingPanel === "bookInfoLinks"}
                        isEditingMyCopy={false}
                        saving={saving}
                        errorMessage={isErrorMessage(message) ? message : null}
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
                </TeacherBookInfoSection>
            ) : null}

            <TeacherBookAddMessageBanner message={message} tone={messageTone(message)} />
        </TeacherBookAddPageShell>
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
