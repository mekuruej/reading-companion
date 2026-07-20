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
    publisher: string | null;
    published_date: string | null;
    page_count: number | null;
    allow_missing_isbn?: boolean | null;
    allow_missing_publisher?: boolean | null;
    missing_info_cleared_at?: string | null;
    needs_review?: boolean | null;
    language_code?: string | null;
};

function normalizeLanguageCode(value: string | null | undefined) {
    const normalized = (value ?? "").trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "ja" || normalized === "japanese" || normalized === "日本語") return "ja";
    if (normalized === "en" || normalized === "english" || normalized === "英語") return "en";
    return null;
}

function languageLabel(value: string | null | undefined) {
    const code = normalizeLanguageCode(value);
    if (code === "ja") return "Japanese";
    if (code === "en") return "English";
    return "";
}

function isSuperTeacherFlag(value: unknown) {
    return value === true || value === "true";
}

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
    if (!book.allow_missing_isbn && !String(book.isbn13 ?? "").trim()) missing.push("ISBN-13");
    if (!String(book.cover_url ?? "").trim()) missing.push("cover");
    if (!String(book.book_type ?? "").trim()) missing.push("book type");
    if (!String(book.author ?? "").trim()) missing.push("author");
    if (!book.allow_missing_publisher && !String(book.publisher ?? "").trim()) missing.push("publisher");
    if (!String(book.published_date ?? "").trim()) missing.push("published date");
    if (book.page_count == null) missing.push("page count");
    return missing;
}

function isBookCompleteEnoughToAdd(book: BookSearchResult) {
    return !book.needs_review && missingGlobalBookFields(book).length === 0;
}

export default function AddBookPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const destination = searchParams.get("destination") ?? "";
    const addBookContext = searchParams.get("context") ?? "";
    const targetUserIdParam = searchParams.get("targetUserId")?.trim() ?? "";

    const [isbn, setIsbn] = useState("");
    const [book, setBook] = useState<LookupBook | null>(null);
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);
    const [currentRole, setCurrentRole] = useState<string | null>(null);
    const [currentIsSuperTeacher, setCurrentIsSuperTeacher] = useState(false);
    const [currentTargetLanguage, setCurrentTargetLanguage] = useState<string | null>(null);
    const [targetUsername, setTargetUsername] = useState<string | null>(null);
    const [targetDisplayName, setTargetDisplayName] = useState<string | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestingBookId, setRequestingBookId] = useState<string | null>(null);
    const [bookSearch, setBookSearch] = useState("");
    const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult[]>([]);
    const [bookSearchLoading, setBookSearchLoading] = useState(false);
    const [addingExistingBookId, setAddingExistingBookId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [bookSearchError, setBookSearchError] = useState("");
    const [canRequestBook, setCanRequestBook] = useState(false);
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
                .select("id, username, role, is_super_teacher, target_language")
                .eq("id", user.id)
                .maybeSingle();

            if (!alive) return;

            setCurrentUsername((profile as any)?.username ?? null);
            setCurrentRole((profile as any)?.role ?? null);
            setCurrentIsSuperTeacher(isSuperTeacherFlag((profile as any)?.is_super_teacher));
            setCurrentTargetLanguage((profile as any)?.target_language ?? null);
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
    const targetLibraryHref = isStudentDestination
        ? targetUsername
            ? `/users/${targetUsername}/books`
            : "/teacher/students"
        : currentUsername
        ? `/users/${currentUsername}/books`
        : "/books";
    const isTeacherFacingUser = currentRole === "teacher" || currentRole === "super_teacher" || currentIsSuperTeacher;
    const learnerTargetLanguageCode = normalizeLanguageCode(currentTargetLanguage);
    const learnerTargetLanguageLabel = languageLabel(currentTargetLanguage);
    const learnerLanguageMissing = !isTeacherFacingUser && !learnerTargetLanguageCode;

    function isMismatchedForLearner(languageCode: string | null | undefined) {
        if (isTeacherFacingUser) return false;
        if (!learnerTargetLanguageCode) return true;
        return normalizeLanguageCode(languageCode) !== learnerTargetLanguageCode;
    }

    function studentLessonBookPayload() {
        if (!isStudentLessonBookContext) return {};
        return {
            context: "student-lesson-book",
            studentId: targetUserIdParam,
        };
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
        setCanRequestBook(false);
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
                setCanRequestBook(true);
                setError(
                    data.error ??
                    "We couldn’t find enough information for that ISBN yet. You can request this book for review."
                );
                return;
            }

            const lookedUpBook = data.book;

            if (!lookedUpBook || typeof lookedUpBook !== "object") {
                console.error("Lookup response had no usable book object:", data);
                setCanRequestBook(true);
                setError(
                    "We couldn’t find enough information for that ISBN yet. You can request this book for review."
                );
                return;
            }

            if (!lookedUpBook.title) {
                setCanRequestBook(true);
                setError(
                    "We couldn’t find enough information for that ISBN yet. You can request this book for review."
                );
                return;
            }

            setError("");
            setBook(lookedUpBook);
        } catch (lookupError) {
            console.error("Book lookup failed:", lookupError);
            setCanRequestBook(true);
            setError("Something went wrong while looking up this book.");
        } finally {
            setLookupLoading(false);
        }
    }

    async function handleBookSearch() {
        const query = bookSearch.trim();
        setLibraryNotice(null);
        setBookSearchResults([]);
        setBookSearchError("");
        setError("");

        if (!query) {
            setBookSearchError("Enter a title or author to search.");
            return;
        }

        setBookSearchLoading(true);
        setCanRequestBook(false);

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
                setCanRequestBook(true);
                setBookSearchError("No matching book found. You can request this book for review.");
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
                    intendedLanguageCode: learnerTargetLanguageCode,
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
                    intendedLanguageCode: learnerTargetLanguageCode,
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

    async function handleRequestBook(bookToRequest?: BookSearchResult) {
        const cleanIsbn = (bookToRequest?.isbn13 ?? isbn).replace(/[\s-]/g, "").trim();
        const requestTitle = (bookToRequest?.title ?? bookSearch).trim();
        const requestAuthor = (bookToRequest?.author ?? "").trim();
        const isFallbackRequest = !!bookToRequest || (!!bookSearch.trim() && !cleanIsbn);
        const setRequestMessage = isFallbackRequest ? setBookSearchError : setError;

        if (!cleanIsbn && !requestTitle) {
            setRequestMessage("Search for a title or enter an ISBN before requesting review.");
            return;
        }

        setRequestingBookId(bookToRequest?.id ?? null);
        setRequestLoading(true);
        setError("");
        setBookSearchError("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setRequestMessage("You need to be signed in to request a book.");
                return;
            }

            if (!targetLibraryUserId) {
                setRequestMessage(`Sign in again before adding this pending book to ${targetLibraryShortLabel}.`);
                return;
            }

            let existingPendingRequest: { id: string } | null = null;

            if (cleanIsbn) {
                const { data, error: existingPendingRequestError } = await supabase
                    .from("book_requests")
                    .select("id")
                    .eq("user_id", user.id)
                    .or("status.eq.pending,status.is.null")
                    .eq("isbn13", cleanIsbn)
                    .limit(1)
                    .maybeSingle();

                if (existingPendingRequestError) throw existingPendingRequestError;
                existingPendingRequest = data;
            }

            if (existingPendingRequest) {
                setCanRequestBook(false);
                setRequestMessage("This book request is already waiting for review.");
                return;
            }

            const { error: requestError } = await supabase.from("book_requests").insert({
                user_id: user.id,
                title: requestTitle || (cleanIsbn ? "Book details pending" : null),
                author: requestAuthor || null,
                isbn13: cleanIsbn || null,
                status: "pending",
            });

            if (requestError) throw requestError;

            let pendingUserBookId: string | null = null;

            if (cleanIsbn) {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const addResponse = await fetch("/api/books/add-by-isbn", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(session?.access_token
                            ? { Authorization: `Bearer ${session.access_token}` }
                            : {}),
                    },
                    body: JSON.stringify({
                        isbn13: cleanIsbn,
                        mode: "add_to_library",
                        targetUserId: targetLibraryUserId,
                        allowPendingPlaceholder: true,
                        intendedLanguageCode: learnerTargetLanguageCode,
                    }),
                });

                const addData = await addResponse.json().catch(() => null);

                if (addResponse.ok && addData?.userBookId) {
                    pendingUserBookId = addData.userBookId;
                } else {
                    console.warn("Book request sent, but pending library copy was not added:", addData);
                }
            }

            setCanRequestBook(false);
            if (pendingUserBookId) {
                setLibraryNotice({
                    message: `Book request sent and a pending copy was added to ${targetLibraryShortLabel}.`,
                    detail: isStudentLessonBookContext
                        ? "An admin can fill in the book details later. Active Lesson Books will be linked after a real catalog book is ready."
                        : "You can start using it now. An admin can fill in the book details later.",
                    userBookId: isStudentLessonBookContext ? undefined : pendingUserBookId,
                    returnLabel: isStudentLessonBookContext ? "Back to Student Workspace" : undefined,
                    returnHref: isStudentLessonBookContext ? studentWorkspaceHref : undefined,
                });
            }
            setRequestMessage(
                pendingUserBookId
                    ? `Book request sent. A pending copy was added to ${targetLibraryShortLabel}.`
                    : isFallbackRequest
                    ? "Book request sent. An admin can review the title and author details."
                    : "Book request sent. An admin can review this ISBN and add the book details."
            );
        } catch (requestError) {
            console.error("Book request failed:", requestError);
            setRequestMessage("Could not send this book request. Please ask an admin or teacher to add it.");
        } finally {
            setRequestLoading(false);
            setRequestingBookId(null);
        }
    }

    const coverUrl = book ? getCoverUrl(book) : null;
    const displayAuthor = book ? getDisplayAuthor(book) : "";
    const publishedDate = book ? getPublishedDate(book) : null;
    const pageCount = book ? getPageCount(book) : null;
    const previewLanguageMismatch =
        !!book?.found_existing_book && isMismatchedForLearner(book.language_code);
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

            {!isTeacherFacingUser ? (
                <section className="mb-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Current learning language
                    </p>
                    {learnerTargetLanguageCode ? (
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                            You can add books in{" "}
                            <span className="font-black text-stone-950">
                                {learnerTargetLanguageLabel}
                            </span>
                            . Books in another language need a teacher or super-teacher to add them.
                        </p>
                    ) : (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                            Please set your learning language before adding books. You can update it in{" "}
                            <a
                                href="/community/profile/settings"
                                className="font-black underline underline-offset-2"
                            >
                                Profile Settings
                            </a>
                            .
                        </div>
                    )}
                </section>
            ) : null}

            <AddBookLookupCard
                isbn={isbn}
                lookupLoading={lookupLoading}
                lookupDisabled={!isbn.trim() || learnerLanguageMissing}
                libraryLabel={targetLibraryLabel}
                languageLabel={isTeacherFacingUser ? undefined : learnerTargetLanguageLabel}
                onIsbnChange={(value) => {
                    setIsbn(value);
                    setLibraryNotice(null);
                }}
                onLookup={handleLookup}
            >
                <AddBookMessagePanel
                    message={error}
                    canRequestBook={canRequestBook}
                    requestLoading={requestLoading}
                    onRequestBook={handleRequestBook}
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

            <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Fallback search
                </p>
                <h2 className="mt-2 text-xl font-black text-stone-950">
                    Search by title or author
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                    Use this when ISBN-13 lookup does not find the book, or when the
                    book does not have an ISBN. If Mekuru already has a complete
                    record, you can add it to {targetLibraryLabel}. If details are missing,
                    send a request so the book can be reviewed.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
                        placeholder="Title or author"
                        className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                    />

                    <button
                        type="button"
                        onClick={() => void handleBookSearch()}
                        disabled={bookSearchLoading || !bookSearch.trim() || learnerLanguageMissing}
                        className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
                    >
                        {bookSearchLoading ? "Searching..." : "Search"}
                    </button>
                </div>

                {bookSearchError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        <p>{bookSearchError}</p>

                        {canRequestBook && bookSearch.trim() ? (
                            <button
                                type="button"
                                onClick={() => void handleRequestBook()}
                                disabled={requestLoading}
                                className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {requestLoading ? "Sending..." : "Request this book for review"}
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {bookSearchResults.length > 0 ? (
                    <div className="mt-5 space-y-3">
                        {bookSearchResults.map((result) => {
                            const missingFields = missingGlobalBookFields(result);
                            const canAddExisting = isBookCompleteEnoughToAdd(result);
                            const languageMismatch = isMismatchedForLearner(result.language_code);
                            const addLabel = languageMismatch
                                ? "Wrong language"
                                : isStudentDestination
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
                                    languageMismatch={languageMismatch}
                                    adding={addingExistingBookId === result.id}
                                    requestLoading={requestLoading && requestingBookId === result.id}
                                    addLabel={addLabel}
                                    onAdd={() => void handleAddExistingBook(result.id)}
                                    onRequestReview={() => void handleRequestBook(result)}
                                />
                            );
                        })}
                    </div>
                ) : null}

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
                    {previewLanguageMismatch ? (
                        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
                            This book is not in your current learning language.
                        </p>
                    ) : null}
                    <AddBookActionRow
                        addLoading={addLoading}
                        disabled={previewLanguageMismatch || learnerLanguageMissing}
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
