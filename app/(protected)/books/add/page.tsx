// ISBN Add Book
// 
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AddBookLookupCard from "./components/AddBookLookupCard";
import AddBookMessagePanel from "./components/AddBookMessagePanel";
import AddBookLibraryNotice from "./components/AddBookLibraryNotice";
import LookupBookPreviewCard from "./components/LookupBookPreviewCard";
import AddBookActionRow from "./components/AddBookActionRow";
import AddBookDestinationSummary from "./components/AddBookDestinationSummary";
import AddBookCatalogResult from "./components/AddBookCatalogResult";
import { isValidAsin, normalizeAsin } from "@/lib/books/asin";
import {
    COMMON_BOOK_LANGUAGE_OPTIONS,
    bookLanguageLabel,
    normalizeBookLanguageCode,
} from "@/lib/books/bookLanguage";

type LookupBook = {
    isbn13: string;
    title: string;
    subtitle?: string | null;

    // Support both possible shapes while this feature is still settling.
    authorDisplay?: string | null;
    author_display?: string | null;
    authors?: string[];

    coverUrl?: string | null;
    cover_url?: string | null;

    publisher?: string | null;

    publishedDate?: string | null;
    published_date?: string | null;

    pageCount?: number | null;
    page_count?: number | null;

    source?: string | null;
    metadata_source?: string | null;

    needs_review?: boolean;
    found_existing_book?: boolean;
    existing_book_id?: string | null;
    language_code?: string | null;
};

type BookSearchResult = {
    id: string;
    title: string | null;
    author: string | null;
    cover_url: string | null;
    book_type: string | null;
    isbn13: string | null;
    asin: string | null;
    publisher: string | null;
    published_date: string | null;
    page_count: number | null;
    allow_missing_isbn?: boolean | null;
    allow_missing_publisher?: boolean | null;
    missing_info_cleared_at?: string | null;
    needs_review?: boolean | null;
    language_code?: string | null;
};

type ManualAddMode = "isbn" | "asin" | "manual";

const EDITION_FORMAT_OPTIONS = [
    { value: "bunko", label: "Bunkobon" },
    { value: "tankobon_softcover", label: "Tankobon (softcover)" },
    { value: "tankobon_hardcover", label: "Tankobon (hardcover)" },
    { value: "paperback", label: "Paperback" },
    { value: "hardcover", label: "Hardcover" },
    { value: "ebook", label: "Ebook" },
    { value: "audiobook", label: "Audiobook" },
    { value: "other", label: "Other" },
];

function getDisplayAuthor(book: LookupBook) {
    return (
        book.authorDisplay ||
        book.author_display ||
        book.authors?.join("、") ||
        "Author information needs review"
    );
}

function getCoverUrl(book: LookupBook) {
    return book.coverUrl || book.cover_url || null;
}

function getPublishedDate(book: LookupBook) {
    return book.publishedDate || book.published_date || null;
}

function getPageCount(book: LookupBook) {
    return book.pageCount ?? book.page_count ?? null;
}

function missingGlobalBookFields(book: BookSearchResult) {
    if (book.missing_info_cleared_at) return [];

    const missing: string[] = [];
    if (!String(book.title ?? "").trim()) missing.push("title");
    if (!book.allow_missing_isbn && !String(book.isbn13 ?? "").trim() && !String(book.asin ?? "").trim()) {
        missing.push("ISBN-13 or ASIN");
    }
    if (!String(book.cover_url ?? "").trim()) missing.push("cover");
    if (!String(book.book_type ?? "").trim()) missing.push("book type");
    if (!String(book.author ?? "").trim()) missing.push("author");
    if (!book.allow_missing_publisher && !String(book.publisher ?? "").trim()) missing.push("publisher");
    if (!String(book.published_date ?? "").trim()) missing.push("published date");
    if (book.page_count == null) missing.push("page count");
    return missing;
}

function isExistingCatalogBookAddable(book: BookSearchResult) {
    return Boolean(book.id);
}

export default function AddBookPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const destination = searchParams.get("destination") ?? "";
    const addBookContext = searchParams.get("context") ?? "";
    const targetUserIdParam = searchParams.get("targetUserId")?.trim() ?? "";

    const [isbn, setIsbn] = useState("");
    const [asin, setAsin] = useState("");
    const [asinEditionFormat, setAsinEditionFormat] = useState("");
    const [identifierRequestTitle, setIdentifierRequestTitle] = useState("");
    const [fallbackRequestFormat, setFallbackRequestFormat] = useState("");
    const [confirmedEditionLanguageCode, setConfirmedEditionLanguageCode] = useState("");
    const [manualAddMode, setManualAddMode] = useState<ManualAddMode | null>(null);
    const [manualTitle, setManualTitle] = useState("");
    const [manualAuthor, setManualAuthor] = useState("");
    const [manualEditionFormat, setManualEditionFormat] = useState("");
    const [manualLanguageCode, setManualLanguageCode] = useState("");
    const [manualPageCount, setManualPageCount] = useState("");
    const [manualAddError, setManualAddError] = useState("");
    const [manualAddLoading, setManualAddLoading] = useState(false);
    const [manualPossibleMatches, setManualPossibleMatches] = useState<BookSearchResult[]>([]);
    const [book, setBook] = useState<LookupBook | null>(null);
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);
    const [targetUsername, setTargetUsername] = useState<string | null>(null);
    const [targetDisplayName, setTargetDisplayName] = useState<string | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [asinLookupLoading, setAsinLookupLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestingBookId, setRequestingBookId] = useState<string | null>(null);
    const [bookSearch, setBookSearch] = useState("");
    const [bookSearchAuthor, setBookSearchAuthor] = useState("");
    const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult[]>([]);
    const [bookSearchLoading, setBookSearchLoading] = useState(false);
    const [addingExistingBookId, setAddingExistingBookId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [bookSearchError, setBookSearchError] = useState("");
    const [libraryNotice, setLibraryNotice] = useState<{
        message: string;
        detail?: string;
        userBookId?: string;
        bookId?: string;
        returnLabel?: string;
        returnHref?: string;
    } | null>(null);

    useEffect(() => {
        let alive = true;

        async function loadCurrentUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!alive || !user) return;

            setCurrentUserId(user.id);

            const { data: profile } = await supabase
                .from("profiles")
                .select("id, username")
                .eq("id", user.id)
                .maybeSingle();

            if (!alive) return;

            setCurrentUsername((profile as any)?.username ?? null);
        }

        void loadCurrentUser();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        let alive = true;

        async function loadTargetUser() {
            if (!targetUserIdParam) {
                setTargetUsername(null);
                setTargetDisplayName(null);
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("id, username, display_name")
                .eq("id", targetUserIdParam)
                .maybeSingle();

            if (!alive) return;

            if (profileError) {
                console.warn("Could not load target library profile:", profileError);
                setTargetUsername(null);
                setTargetDisplayName(null);
                return;
            }

            setTargetUsername((profile as any)?.username ?? null);
            setTargetDisplayName((profile as any)?.display_name || (profile as any)?.username || null);
        }

        void loadTargetUser();

        return () => {
            alive = false;
        };
    }, [targetUserIdParam]);

    const targetLibraryUserId = targetUserIdParam || currentUserId;
    const isStudentDestination =
        destination === "student" && !!targetUserIdParam && targetUserIdParam !== currentUserId;
    const isOtherUserDestination =
        !isStudentDestination && !!targetUserIdParam && targetUserIdParam !== currentUserId;
    const targetLibraryLabel = isStudentDestination
        ? `${targetDisplayName ?? "this student"}’s library`
        : isOtherUserDestination
        ? `${targetDisplayName ?? "this user"}’s library`
        : "your library";
    const targetLibraryShortLabel = isStudentDestination
        ? "student library"
        : isOtherUserDestination
        ? "user library"
        : "your library";
    const destinationKind = isStudentDestination
        ? "student"
        : isOtherUserDestination
        ? "user"
        : "self";
    const destinationDisplayName =
        isStudentDestination || isOtherUserDestination ? targetDisplayName : null;
    const isStudentLessonBookContext =
        addBookContext === "student-lesson-book" && isStudentDestination;
    const studentWorkspaceHref = `/teacher/students/${encodeURIComponent(
        targetUserIdParam
    )}/workspace`;
    const studentLessonContextDescription = isStudentLessonBookContext
        ? "This book will also be added to Active Lesson Books."
        : null;
    const targetLibraryHref = isStudentDestination || isOtherUserDestination
        ? targetUsername
            ? `/users/${targetUsername}/books`
            : "/teacher/students"
        : currentUsername
        ? `/users/${currentUsername}/books`
        : "/books";
    function studentLessonBookPayload() {
        if (!isStudentLessonBookContext) return {};
        return {
            context: "student-lesson-book",
            studentId: targetUserIdParam,
        };
    }

    function resetManualAdd() {
        setManualAddMode(null);
        setManualTitle("");
        setManualAuthor("");
        setManualEditionFormat("");
        setManualLanguageCode("");
        setManualPageCount("");
        setManualAddError("");
        setManualPossibleMatches([]);
    }

    function openManualAdd(mode: ManualAddMode, seed?: { title?: string; author?: string; format?: string }) {
        setManualAddMode(mode);
        setManualTitle(seed?.title ?? "");
        setManualAuthor(seed?.author ?? "");
        setManualEditionFormat(seed?.format ?? "");
        setManualLanguageCode("");
        setManualPageCount("");
        setManualAddError("");
        setManualPossibleMatches([]);
    }

    function handleSuccessfulAdd(data: any) {
        if (isStudentLessonBookContext) {
            const notice = data?.alreadyInLibrary
                ? "lesson-book-existing"
                : "lesson-book-added";
            router.push(`${studentWorkspaceHref}?notice=${notice}`);
            return;
        }

        if (data?.alreadyInLibrary) {
            setLibraryNotice({
                message: `This book is already in ${targetLibraryShortLabel}.`,
                detail: "We found the existing copy.",
                userBookId: data.userBookId,
            });
            return;
        }

        router.push(targetLibraryHref);
    }

    async function handleLookup() {
        setError("");
        setBookSearchError("");
        setBook(null);
        setConfirmedEditionLanguageCode("");
        resetManualAdd();
        setLibraryNotice(null);
        setLookupLoading(true);

        const lookupUrl = `/api/books/lookup-isbn?isbn=${encodeURIComponent(
            isbn.trim()
        )}`;

        try {
            const response = await fetch(lookupUrl, {
                cache: "no-store",
            });

            const text = await response.text();

            let data: any = null;

            try {
                data = JSON.parse(text);
            } catch {
                console.error("Lookup did not return JSON:", {
                    status: response.status,
                    url: lookupUrl,
                    text,
                });

                setError(
                    `Lookup route returned ${response.status}, but not JSON. Check the API route name.`
                );
                return;
            }

            if (!response.ok) {
                console.error("Lookup route returned an error:", data);
                openManualAdd("isbn", {
                    title: identifierRequestTitle || bookSearch,
                    author: bookSearchAuthor,
                    format: fallbackRequestFormat,
                });
                setError(
                    data.error ??
                    "We couldn’t retrieve this edition automatically. Add the details you know."
                );
                return;
            }

            const lookedUpBook = data.book;

            if (!lookedUpBook || typeof lookedUpBook !== "object") {
                console.error("Lookup response had no usable book object:", data);
                openManualAdd("isbn", {
                    title: identifierRequestTitle || bookSearch,
                    author: bookSearchAuthor,
                    format: fallbackRequestFormat,
                });
                setError(
                    "We couldn’t retrieve this edition automatically. Add the details you know."
                );
                return;
            }

            if (!lookedUpBook.title) {
                openManualAdd("isbn", {
                    title: identifierRequestTitle || bookSearch,
                    author: bookSearchAuthor,
                    format: fallbackRequestFormat,
                });
                setError(
                    "We couldn’t retrieve this edition automatically. Add the details you know."
                );
                return;
            }

            setError("");
            setBook(lookedUpBook);
            setConfirmedEditionLanguageCode("");
        } catch (lookupError) {
            console.error("Book lookup failed:", lookupError);
            setError("We couldn't complete the lookup. Please try again.");
        } finally {
            setLookupLoading(false);
        }
    }

    async function handleAsinLookup() {
        const normalizedAsin = normalizeAsin(asin);
        setError("");
        setBookSearchError("");
        setBook(null);
        setConfirmedEditionLanguageCode("");
        resetManualAdd();
        setBookSearchResults([]);
        setLibraryNotice(null);

        if (!normalizedAsin || !isValidAsin(normalizedAsin)) {
            setError("Amazon ASIN must be exactly 10 letters or numbers.");
            return;
        }

        setAsin(normalizedAsin);
        setAsinLookupLoading(true);

        try {
            const { data, error: asinSearchError } = await supabase
                .from("books")
                .select(
                    "id, title, author, cover_url, book_type, isbn13, asin, publisher, published_date, page_count, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at, language_code"
                )
                .ilike("asin", normalizedAsin)
                .limit(1)
                .maybeSingle();

            if (asinSearchError) throw asinSearchError;

            if (data) {
                setBookSearchResults([data as BookSearchResult]);
                return;
            }

            openManualAdd("asin", {
                title: identifierRequestTitle || bookSearch,
                author: bookSearchAuthor,
                format: asinEditionFormat || fallbackRequestFormat,
            });
            setError(
                "We do not have this Amazon edition yet. Add the details you know."
            );
        } catch (lookupError) {
            console.error("ASIN lookup failed:", lookupError);
            setError("Something went wrong while checking that ASIN.");
        } finally {
            setAsinLookupLoading(false);
        }
    }

    async function handleBookSearch() {
        const query = bookSearch.trim();
        setLibraryNotice(null);
        setBookSearchResults([]);
        setConfirmedEditionLanguageCode("");
        resetManualAdd();
        setBookSearchError("");
        setError("");

        if (!query) {
            setBookSearchError("Enter a title to search.");
            return;
        }

        setBookSearchLoading(true);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch(
                `/api/books/search?q=${encodeURIComponent(query)}`,
                {
                    headers: session?.access_token
                        ? { Authorization: `Bearer ${session.access_token}` }
                        : {},
                }
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setBookSearchError(data?.error ?? "Could not search books.");
                return;
            }

            const results = (data?.books ?? []) as BookSearchResult[];

            setBookSearchResults(results);

            if (results.length === 0) {
                openManualAdd("manual", {
                    title: query,
                    author: bookSearchAuthor,
                    format: fallbackRequestFormat,
                });
                setBookSearchError("No matching edition found. Add the details you know.");
            }
        } catch (searchError) {
            console.error("Book title/author search failed:", searchError);
            setBookSearchError("Something went wrong while searching books.");
        } finally {
            setBookSearchLoading(false);
        }
    }

    async function handleAddToLibrary() {
        if (!book?.isbn13) return;

        if (!targetLibraryUserId) {
            setError(`Sign in again before adding this book to ${targetLibraryShortLabel}.`);
            return;
        }

        if (needsEditionLanguageConfirmation && !selectedEditionLanguageCode) {
            setError("Choose the language of this edition before adding it.");
            return;
        }

        if (
            isNewToMekuru &&
            !window.confirm(
                `This book is new to Mekuru. An admin may need to review it before all book details show up. Add it to ${targetLibraryLabel}?`
            )
        ) {
            return;
        }

        setError("");
        setLibraryNotice(null);
        setAddLoading(true);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch("/api/books/add-by-isbn", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token
                        ? { Authorization: `Bearer ${session.access_token}` }
                        : {}),
                },
                body: JSON.stringify({
                    isbn13: book.isbn13,
                    mode: "add_to_library",
                    targetUserId: targetLibraryUserId,
                    languageCode: needsEditionLanguageConfirmation
                        ? selectedEditionLanguageCode
                        : undefined,
                    ...studentLessonBookPayload(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Add book route returned an error:", data);
                setError(data.error ?? `I couldn’t add this book to ${targetLibraryShortLabel}.`);
                return;
            }

            if (!data.userBookId) {
                console.error("Add book response had no userBookId:", data);
                setError("The book was added, but Mekuru could not open the Book Hub.");
                return;
            }

            handleSuccessfulAdd(data);
        } catch (addError) {
            console.error("Add book failed:", addError);
            setError(`Something went wrong while adding this book to ${targetLibraryShortLabel}.`);
        } finally {
            setAddLoading(false);
        }
    }

    async function handleAddExistingBook(bookId: string) {
        if (!targetLibraryUserId) {
            setBookSearchError(`Sign in again before adding this book to ${targetLibraryShortLabel}.`);
            return;
        }

        setAddingExistingBookId(bookId);
        setBookSearchError("");
        setLibraryNotice(null);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch("/api/books/add-existing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token
                        ? { Authorization: `Bearer ${session.access_token}` }
                        : {}),
                },
                body: JSON.stringify({
                    bookId,
                    targetUserId: targetLibraryUserId,
                    ...studentLessonBookPayload(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setBookSearchError(data.error ?? `I couldn’t add this book to ${targetLibraryShortLabel}.`);
                return;
            }

            handleSuccessfulAdd(data);
        } catch (addError) {
            console.error("Add existing book failed:", addError);
            setBookSearchError(`Something went wrong while adding this book to ${targetLibraryShortLabel}.`);
        } finally {
            setAddingExistingBookId(null);
        }
    }

    async function handleManualAdd(confirmDifferentEdition = false) {
        if (!manualAddMode) return;

        if (!targetLibraryUserId) {
            setManualAddError(`Sign in again before adding this book to ${targetLibraryShortLabel}.`);
            return;
        }

        setManualAddLoading(true);
        setManualAddError("");
        setLibraryNotice(null);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch("/api/books/add-manual", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token
                        ? { Authorization: `Bearer ${session.access_token}` }
                        : {}),
                },
                body: JSON.stringify({
                    isbn13: manualAddMode === "isbn" ? isbn.replace(/[\s-]/g, "").trim() : null,
                    asin: manualAddMode === "asin" ? normalizeAsin(asin) : null,
                    title: manualTitle,
                    author: manualAuthor,
                    editionFormat: manualEditionFormat || null,
                    languageCode: manualLanguageCode,
                    pageCount: manualPageCount || null,
                    targetUserId: targetLibraryUserId,
                    confirmDifferentEdition,
                    ...studentLessonBookPayload(),
                }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 409 && data?.possibleMatches?.length) {
                setManualPossibleMatches(data.possibleMatches as BookSearchResult[]);
                setManualAddError(data.error ?? "We found a possible match.");
                return;
            }

            if (!response.ok) {
                setManualAddError(data?.error ?? `I couldn’t add this book to ${targetLibraryShortLabel}.`);
                return;
            }

            resetManualAdd();
            handleSuccessfulAdd(data);
        } catch (manualError) {
            console.error("Manual add failed:", manualError);
            setManualAddError(`Something went wrong while adding this book to ${targetLibraryShortLabel}.`);
        } finally {
            setManualAddLoading(false);
        }
    }

    async function handleRequestBookDetails(bookToRequest: BookSearchResult) {
        const cleanIsbn = (bookToRequest.isbn13 ?? "").replace(/[\s-]/g, "").trim();
        const requestAsin = normalizeAsin(bookToRequest.asin);
        const requestTitle = (bookToRequest.title ?? "").trim();
        const requestAuthor = (bookToRequest.author ?? "").trim();

        if (!cleanIsbn && !requestAsin && !requestTitle) {
            setBookSearchError("There is not enough information to flag this edition yet.");
            return;
        }

        setRequestingBookId(bookToRequest.id);
        setRequestLoading(true);
        setBookSearchError("");
        setLibraryNotice(null);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setBookSearchError("You need to be signed in to flag book details.");
                return;
            }

            if (!targetLibraryUserId) {
                setBookSearchError("Sign in again before flagging book details.");
                return;
            }

            let existingPendingRequest: { id: string } | null = null;

            if (cleanIsbn || requestAsin) {
                const { data, error: existingPendingRequestError } = await supabase
                    .from("book_requests")
                    .select("id")
                    .eq("user_id", user.id)
                    .or("status.eq.pending,status.is.null")
                    .or([
                        cleanIsbn ? `isbn13.eq.${cleanIsbn}` : "",
                        requestAsin ? `asin.eq.${requestAsin}` : "",
                    ].filter(Boolean).join(","))
                    .limit(1)
                    .maybeSingle();

                if (existingPendingRequestError) throw existingPendingRequestError;
                existingPendingRequest = data;
            } else if (requestTitle) {
                let duplicateQuery = supabase
                    .from("book_requests")
                    .select("id")
                    .eq("user_id", user.id)
                    .or("status.eq.pending,status.is.null")
                    .eq("title", requestTitle);

                if (requestAuthor) {
                    duplicateQuery = duplicateQuery.eq("author", requestAuthor);
                }

                const { data, error: existingPendingRequestError } = await duplicateQuery
                    .limit(1)
                    .maybeSingle();

                if (existingPendingRequestError) throw existingPendingRequestError;
                existingPendingRequest = data;
            }

            if (existingPendingRequest) {
                setLibraryNotice({
                    message: "You've already sent a request for this edition.",
                    detail: "You can still add the book while the shared details are checked.",
                });
                return;
            }

            const { error: requestError } = await supabase.from("book_requests").insert({
                user_id: user.id,
                title: requestTitle || (requestAsin ? `Amazon ASIN ${requestAsin}` : null),
                author: requestAuthor || null,
                isbn13: cleanIsbn || null,
                asin: requestAsin,
                status: "pending",
            });

            if (requestError) throw requestError;

            setLibraryNotice({
                message: "Thanks — the book details were flagged for review.",
                detail: "You can still add the book now.",
            });
        } catch (requestError) {
            console.error("Book details request failed:", requestError);
            setBookSearchError("Could not flag these book details. You can still add the book.");
        } finally {
            setRequestLoading(false);
            setRequestingBookId(null);
        }
    }

    const coverUrl = book ? getCoverUrl(book) : null;
    const displayAuthor = book ? getDisplayAuthor(book) : "";
    const publishedDate = book ? getPublishedDate(book) : null;
    const pageCount = book ? getPageCount(book) : null;
    const normalizedPreviewLanguageCode = normalizeBookLanguageCode(book?.language_code);
    const needsEditionLanguageConfirmation =
        !!book && book.found_existing_book !== true && !normalizedPreviewLanguageCode;
    const selectedEditionLanguageCode = normalizeBookLanguageCode(confirmedEditionLanguageCode);
    const selectedEditionLanguageLabel = bookLanguageLabel(selectedEditionLanguageCode);
    const selectedCommonEditionLanguageCode = COMMON_BOOK_LANGUAGE_OPTIONS.some(
        (option) => option.code === selectedEditionLanguageCode
    )
        ? selectedEditionLanguageCode ?? ""
        : "";
    const normalizedManualLanguageCode = normalizeBookLanguageCode(manualLanguageCode);
    const manualLanguageLabel = bookLanguageLabel(normalizedManualLanguageCode);
    const selectedCommonManualLanguageCode = COMMON_BOOK_LANGUAGE_OPTIONS.some(
        (option) => option.code === normalizedManualLanguageCode
    )
        ? normalizedManualLanguageCode ?? ""
        : "";
    const manualAddTitle =
        manualAddMode === "isbn"
            ? "Add this ISBN edition"
            : manualAddMode === "asin"
            ? "Add this Amazon edition"
            : "Add this edition";
    const manualIdentifierLabel =
        manualAddMode === "isbn"
            ? `ISBN ${isbn.replace(/[\s-]/g, "").trim()}`
            : manualAddMode === "asin"
            ? `ASIN ${normalizeAsin(asin) ?? asin.trim()}`
            : "No ISBN or ASIN";
    const manualFormatRequired = manualAddMode === "manual";
    const isNewToMekuru =
        !!book &&
        book.found_existing_book !== true &&
        (book.needs_review === true ||
            book.existing_book_id == null ||
            book.metadata_source === "openbd" ||
            book.metadata_source === "google_books" ||
            book.metadata_source === "open_library" ||
            book.source === "openbd" ||
            book.source === "google_books" ||
            book.source === "open_library");

    return (
        <main className="mx-auto max-w-3xl px-4 py-8">
            <AddBookDestinationSummary
                destinationKind={destinationKind}
                displayName={destinationDisplayName}
                contextDescription={studentLessonContextDescription}
            />

            <AddBookLookupCard
                isbn={isbn}
                asin={asin}
                asinEditionFormat={asinEditionFormat}
                identifierRequestTitle={identifierRequestTitle}
                lookupLoading={lookupLoading}
                asinLookupLoading={asinLookupLoading}
                lookupDisabled={!isbn.trim()}
                asinLookupDisabled={!asin.trim()}
                libraryLabel={targetLibraryLabel}
                onIsbnChange={(value) => {
                    setIsbn(value);
                    setLibraryNotice(null);
                }}
                onAsinChange={(value) => {
                    setAsin(value);
                    setLibraryNotice(null);
                }}
                onAsinEditionFormatChange={setAsinEditionFormat}
                onIdentifierRequestTitleChange={(value) => {
                    setIdentifierRequestTitle(value);
                    setLibraryNotice(null);
                }}
                onLookup={handleLookup}
                onAsinLookup={handleAsinLookup}
            >
                <AddBookMessagePanel
                    message={error}
                />

                {libraryNotice ? (
                    <AddBookLibraryNotice
                        message={libraryNotice.message}
                        detail={libraryNotice.detail}
                        userBookId={libraryNotice.userBookId}
                        onOpenBook={(userBookId) => router.push(`/books/${userBookId}`)}
                        returnLabel={libraryNotice.returnLabel}
                        onReturn={
                            libraryNotice.returnHref
                                ? () => router.push(libraryNotice.returnHref as string)
                                : undefined
                        }
                    />
                ) : null}
            </AddBookLookupCard>

            {manualAddMode ? (
                <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        {manualIdentifierLabel}
                    </p>
                    <h2 className="mt-2 text-xl font-black text-stone-950">
                        {manualAddTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                        Add the details you know. Page count is recommended for pacing
                        and page-based stats, but it is optional.
                    </p>

                    <div className="mt-5 grid gap-3">
                        <input
                            value={manualTitle}
                            onChange={(event) => {
                                setManualTitle(event.target.value);
                                setManualAddError("");
                                setManualPossibleMatches([]);
                            }}
                            placeholder="Title"
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                        />

                        <input
                            value={manualAuthor}
                            onChange={(event) => {
                                setManualAuthor(event.target.value);
                                setManualAddError("");
                                setManualPossibleMatches([]);
                            }}
                            placeholder={manualAddMode === "manual" ? "Author" : "Author (optional)"}
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                            <select
                                value={manualEditionFormat}
                                onChange={(event) => {
                                    setManualEditionFormat(event.target.value);
                                    setManualAddError("");
                                    setManualPossibleMatches([]);
                                }}
                                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                            >
                                <option value="">
                                    {manualFormatRequired ? "Format" : "Format (optional)"}
                                </option>
                                {EDITION_FORMAT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <input
                                value={manualPageCount}
                                onChange={(event) => {
                                    setManualPageCount(event.target.value);
                                    setManualAddError("");
                                }}
                                inputMode="numeric"
                                placeholder="Page count (optional)"
                                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                            />
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                            <label className="block text-sm font-black text-stone-900">
                                What language is this edition?
                            </label>
                            <select
                                value={selectedCommonManualLanguageCode}
                                onChange={(event) => {
                                    setManualLanguageCode(event.target.value);
                                    setManualAddError("");
                                    setManualPossibleMatches([]);
                                }}
                                className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                            >
                                <option value="">Select edition language</option>
                                {COMMON_BOOK_LANGUAGE_OPTIONS.map((option) => (
                                    <option key={option.code} value={option.code}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                value={manualLanguageCode}
                                onChange={(event) => {
                                    setManualLanguageCode(event.target.value);
                                    setManualAddError("");
                                    setManualPossibleMatches([]);
                                }}
                                placeholder="Edition language code"
                                className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                            />
                            <p className="mt-2 text-xs leading-5 text-stone-600">
                                {manualLanguageLabel
                                    ? `This will be saved as ${manualLanguageLabel}.`
                                    : "Language is saved as book metadata for this edition."}
                            </p>
                        </div>
                    </div>

                    {manualAddError ? (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                            {manualAddError}
                        </div>
                    ) : null}

                    {manualPossibleMatches.length > 0 ? (
                        <div className="mt-5 space-y-3">
                            <p className="text-sm font-bold text-stone-800">
                                Choose an existing edition, or confirm this is different.
                            </p>
                            {manualPossibleMatches.map((result) => (
                                <AddBookCatalogResult
                                    key={result.id}
                                    result={result}
                                    missingFields={missingGlobalBookFields(result)}
                                    canAddExisting={true}
                                    adding={addingExistingBookId === result.id}
                                    requestLoading={false}
                                    addLabel="Use This Edition"
                                    onAdd={() => void handleAddExistingBook(result.id)}
                                    onRequestReview={() => void handleRequestBookDetails(result)}
                                />
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => void handleManualAdd(false)}
                            disabled={manualAddLoading}
                            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {manualAddLoading ? "Adding..." : "Add to Library"}
                        </button>
                        {manualPossibleMatches.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => void handleManualAdd(true)}
                                disabled={manualAddLoading}
                                className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                This Is a Different Edition
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={resetManualAdd}
                            className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
                        >
                            Cancel
                        </button>
                    </div>
                </section>
            ) : null}

            <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Fallback search
                </p>
                <h2 className="mt-2 text-xl font-black text-stone-950">
                    Search by title and author
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                    Use this when you do not have an ISBN or ASIN. If Mekuru already
                    has a complete record, you can add it to {targetLibraryLabel}. If
                    details are missing, include the author and format so the book can
                    be reviewed accurately.
                </p>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_220px_auto]">
                    <input
                        value={bookSearch}
                        onChange={(event) => {
                            setBookSearch(event.target.value);
                            setBookSearchError("");
                            setLibraryNotice(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") void handleBookSearch();
                        }}
                        placeholder="Title"
                        className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                    />

                    <input
                        value={bookSearchAuthor}
                        onChange={(event) => {
                            setBookSearchAuthor(event.target.value);
                            setBookSearchError("");
                            setLibraryNotice(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") void handleBookSearch();
                        }}
                        placeholder="Author (optional)"
                        className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                    />

                    <select
                        value={fallbackRequestFormat}
                        onChange={(event) => {
                            setFallbackRequestFormat(event.target.value);
                            setBookSearchError("");
                        }}
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                    >
                        <option value="">Format if requested</option>
                        {EDITION_FORMAT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={() => void handleBookSearch()}
                        disabled={bookSearchLoading || !bookSearch.trim()}
                        className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
                    >
                        {bookSearchLoading ? "Searching..." : "Search"}
                    </button>
                </div>

                <p className="mt-2 text-xs leading-5 text-stone-500">
                    Title and author are both hugely helpful for keeping book records accurate.
                </p>

                {bookSearchError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        <p>{bookSearchError}</p>

                        {bookSearch.trim() || normalizeAsin(asin) ? (
                            <button
                                type="button"
                                onClick={() =>
                                    openManualAdd(normalizeAsin(asin) ? "asin" : "manual", {
                                        title: identifierRequestTitle || bookSearch,
                                        author: bookSearchAuthor,
                                        format: fallbackRequestFormat,
                                    })
                                }
                                className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Add the details manually
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {bookSearchResults.length > 0 ? (
                    <div className="mt-5 space-y-3">
                        {bookSearchResults.map((result) => {
                            const missingFields = missingGlobalBookFields(result);
                            const canAddExisting = isExistingCatalogBookAddable(result);
                            const addLabel = isStudentDestination
                                ? "Add to Student Library"
                                : isOtherUserDestination
                                ? "Add to User Library"
                                : "Add to My Library";

                            return (
                                <AddBookCatalogResult
                                    key={result.id}
                                    result={result}
                                    missingFields={missingFields}
                                    canAddExisting={canAddExisting}
                                    adding={addingExistingBookId === result.id}
                                    requestLoading={requestLoading && requestingBookId === result.id}
                                    addLabel={addLabel}
                                    onAdd={() => void handleAddExistingBook(result.id)}
                                    onRequestReview={() => void handleRequestBookDetails(result)}
                                />
                            );
                        })}
                    </div>
                ) : null}

                <button
                    type="button"
                    onClick={() =>
                        openManualAdd("manual", {
                            title: bookSearch,
                            author: bookSearchAuthor,
                            format: fallbackRequestFormat,
                        })
                    }
                    className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
                >
                    Add a book without ISBN or ASIN
                </button>

            </section>

            {book ? (
                <LookupBookPreviewCard
                    title={book.title ?? "Untitled book"}
                    subtitle={book.subtitle}
                    coverUrl={coverUrl}
                    displayAuthor={displayAuthor}
                    publisher={book.publisher}
                    publishedDate={publishedDate}
                    pageCount={pageCount}
                    isbn13={book.isbn13}
                    languageCode={book.language_code}
                    isNewToMekuru={isNewToMekuru}
                    libraryLabel={targetLibraryLabel}
                >
                    {needsEditionLanguageConfirmation ? (
                        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                            <label className="block text-sm font-black text-stone-900">
                                What language is this edition?
                            </label>
                            <select
                                value={selectedCommonEditionLanguageCode}
                                onChange={(event) => {
                                    setConfirmedEditionLanguageCode(event.target.value);
                                    setError("");
                                }}
                                className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                            >
                                <option value="">Select edition language</option>
                                {COMMON_BOOK_LANGUAGE_OPTIONS.map((option) => (
                                    <option key={option.code} value={option.code}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                value={confirmedEditionLanguageCode}
                                onChange={(event) => {
                                    setConfirmedEditionLanguageCode(event.target.value);
                                    setError("");
                                }}
                                placeholder="Edition language code"
                                className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                            />
                            {selectedEditionLanguageLabel ? (
                                <p className="mt-2 text-xs leading-5 text-stone-600">
                                    This will be saved as the book edition language:{" "}
                                    <span className="font-bold text-stone-800">
                                        {selectedEditionLanguageLabel}
                                    </span>
                                    .
                                </p>
                            ) : (
                                <p className="mt-2 text-xs leading-5 text-stone-600">
                                    Language is saved as book metadata for this ISBN edition.
                                </p>
                            )}
                        </div>
                    ) : null}

                    <AddBookActionRow
                        addLoading={addLoading}
                        disabled={needsEditionLanguageConfirmation && !selectedEditionLanguageCode}
                        addLabel={
                            isStudentDestination
                                ? "Add to Student Library"
                                : isOtherUserDestination
                                ? "Add to User Library"
                                : "Add to My Library"
                        }
                        onAdd={handleAddToLibrary}
                        onCancel={() => router.push(targetLibraryHref)}
                    />
                </LookupBookPreviewCard>
            ) : null}
        </main >
    );
}
