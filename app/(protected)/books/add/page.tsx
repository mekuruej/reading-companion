// ISBN Add Book
// 
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AddBookLookupCard from "./components/AddBookLookupCard";
import AddBookMessagePanel from "./components/AddBookMessagePanel";
import AddBookLibraryNotice from "./components/AddBookLibraryNotice";
import LookupBookPreviewCard from "./components/LookupBookPreviewCard";
import AddBookActionRow from "./components/AddBookActionRow";
import AddBookDestinationPanel from "./components/AddBookDestinationPanel";

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
};

type DestinationUser = {
    id: string;
    display_name: string | null;
    username: string | null;
    level: string | null;
    role: string | null;
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
};

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

    const [isbn, setIsbn] = useState("");
    const [book, setBook] = useState<LookupBook | null>(null);
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);
    const [isTeacher, setIsTeacher] = useState(false);
    const [isSuperTeacher, setIsSuperTeacher] = useState(false);
    const [destinationMode, setDestinationMode] = useState<"me" | "student" | "user" | "global">("me");
    const [destinationUserId, setDestinationUserId] = useState("");
    const [studentOptions, setStudentOptions] = useState<DestinationUser[]>([]);
    const [userOptions, setUserOptions] = useState<DestinationUser[]>([]);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestingBookId, setRequestingBookId] = useState<string | null>(null);
    const [bookSearch, setBookSearch] = useState("");
    const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult[]>([]);
    const [bookSearchLoading, setBookSearchLoading] = useState(false);
    const [addingExistingBookId, setAddingExistingBookId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [canRequestBook, setCanRequestBook] = useState(false);
    const [libraryNotice, setLibraryNotice] = useState<{
        message: string;
        detail?: string;
        userBookId?: string;
        bookId?: string;
    } | null>(null);

    useEffect(() => {
        let alive = true;

        async function loadDestinations() {
            const params = new URLSearchParams(window.location.search);
            const requestedDestination = params.get("destination");
            const requestedTargetUserId = params.get("targetUserId") || params.get("userId");

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!alive || !user) return;

            setCurrentUserId(user.id);

            const { data: profile } = await supabase
                .from("profiles")
                .select("id, display_name, username, level, role, is_super_teacher")
                .eq("id", user.id)
                .maybeSingle();

            if (!alive) return;

            const profileRole = (profile?.role ?? "") as string;
            const superTeacher =
                profileRole === "super_teacher" ||
                profile?.is_super_teacher === true ||
                profile?.is_super_teacher === "true";
            const teacher = profileRole === "teacher" || superTeacher;

            setCurrentUsername((profile as any)?.username ?? null);
            setIsTeacher(teacher);
            setIsSuperTeacher(superTeacher);

            if (teacher) {
                const { data: links } = await supabase
                    .from("teacher_students")
                    .select("student_id")
                    .eq("teacher_id", user.id)
                    .is("archived_at", null);

                const studentIds = Array.from(
                    new Set(((links ?? []) as any[]).map((link) => link.student_id).filter(Boolean))
                );

                if (studentIds.length > 0) {
                    const { data: students } = await supabase
                        .from("profiles")
                        .select("id, display_name, username, level, role")
                        .in("id", studentIds)
                        .order("display_name", { ascending: true });

                    const nextStudentOptions = (students ?? []) as DestinationUser[];

                    if (alive) {
                        setStudentOptions(nextStudentOptions);

                        if (
                            requestedDestination === "student" &&
                            requestedTargetUserId &&
                            nextStudentOptions.some((student) => student.id === requestedTargetUserId)
                        ) {
                            setDestinationMode("student");
                            setDestinationUserId(requestedTargetUserId);
                        }
                    }
                }
            }

            if (superTeacher) {
                const { data: users } = await supabase
                    .from("profiles")
                    .select("id, display_name, username, level, role")
                    .order("display_name", { ascending: true });

                if (alive) {
                    setUserOptions(
                        ((users ?? []) as DestinationUser[]).filter((item) => item.id !== user.id)
                    );

                    if (
                        requestedDestination === "user" &&
                        requestedTargetUserId &&
                        ((users ?? []) as DestinationUser[]).some((item) => item.id === requestedTargetUserId)
                    ) {
                        setDestinationMode("user");
                        setDestinationUserId(requestedTargetUserId);
                    }
                }
            }
        }

        void loadDestinations();

        return () => {
            alive = false;
        };
    }, []);

    async function handleLookup() {
        setError("");
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

    function handleDestinationModeChange(mode: "me" | "student" | "user" | "global") {
        setDestinationMode(mode);

        if (mode === "student") {
            setDestinationUserId(studentOptions[0]?.id ?? "");
        } else if (mode === "user") {
            setDestinationUserId(userOptions[0]?.id ?? "");
        } else {
            setDestinationUserId("");
        }

        setLibraryNotice(null);
    }

    async function handleBookSearch() {
        const query = bookSearch.trim();
        setLibraryNotice(null);
        setBookSearchResults([]);

        if (!query) {
            setError("Enter a title, author, or ISBN to search.");
            return;
        }

        setBookSearchLoading(true);
        setError("");

        try {
            const escaped = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
            const { data, error: searchError } = await supabase
                .from("books")
                .select(
                    "id, title, author, cover_url, book_type, isbn13, publisher, published_date, page_count, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at, needs_review"
                )
                .or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%,isbn13.ilike.%${escaped}%`)
                .order("title", { ascending: true })
                .limit(12);

            if (searchError) throw searchError;

            const results = (data ?? []) as BookSearchResult[];
            setBookSearchResults(results);

            if (results.length === 0) {
                setCanRequestBook(true);
                setError("No matching book found. You can request this book for review.");
            }
        } catch (searchError) {
            console.error("Book title/author search failed:", searchError);
            setError("Something went wrong while searching books.");
        } finally {
            setBookSearchLoading(false);
        }
    }

    async function handleAddToLibrary() {
        if (!book?.isbn13) return;

        const selectedTargetUserId =
            destinationMode === "me"
                ? currentUserId
                : destinationMode === "student" || destinationMode === "user"
                    ? destinationUserId
                    : "";

        if (destinationMode !== "global" && !selectedTargetUserId) {
            setError("Choose who should receive this book.");
            return;
        }

        if (
            isNewToMekuru &&
            !window.confirm(
                "This book is new to Mekuru. An admin may need to review it before all book details show up. Add it to your library?"
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
                    mode: destinationMode === "global" ? "global_only" : "add_to_library",
                    targetUserId: selectedTargetUserId || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Add book route returned an error:", data);
                setError(data.error ?? "I couldn’t add this book to your library.");
                return;
            }

            if (destinationMode === "global") {
                if (!data.bookId) {
                    setError("The global book was created, but Mekuru could not open it for review.");
                    return;
                }

                router.push(`/teacher/books/add?bookId=${data.bookId}`);
                return;
            }

            if (!data.userBookId) {
                console.error("Add book response had no userBookId:", data);
                setError("The book was added, but Mekuru could not open the Book Hub.");
                return;
            }

            if (data.alreadyInLibrary) {
                setLibraryNotice({
                    message:
                        destinationMode === "me"
                            ? "This book is already in your library."
                            : "This book is already in that library.",
                    detail: "We found the existing copy.",
                    userBookId: data.userBookId,
                });
                return;
            }

            if (destinationMode === "me") {
                router.push(currentUsername ? `/users/${currentUsername}/books` : "/books");
                return;
            }

            setLibraryNotice({
                message: "Book added.",
                detail: "It was added to the selected user's library.",
                userBookId: data.userBookId,
            });
        } catch (addError) {
            console.error("Add book failed:", addError);
            setError("Something went wrong while adding this book to your library.");
        } finally {
            setAddLoading(false);
        }
    }

    async function handleAddExistingBook(bookId: string) {
        const selectedTargetUserId =
            destinationMode === "me"
                ? currentUserId
                : destinationMode === "student" || destinationMode === "user"
                    ? destinationUserId
                    : "";

        if (destinationMode === "global") {
            router.push(`/teacher/books/add?bookId=${bookId}`);
            return;
        }

        if (!selectedTargetUserId) {
            setError("Choose who should receive this book.");
            return;
        }

        setAddingExistingBookId(bookId);
        setError("");
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
                    targetUserId: selectedTargetUserId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error ?? "I couldn’t add this book to the selected library.");
                return;
            }

            if (data.alreadyInLibrary) {
                setLibraryNotice({
                    message:
                        destinationMode === "me"
                            ? "This book is already in your library."
                            : "This book is already in that library.",
                    detail: "We found the existing copy.",
                    userBookId: data.userBookId,
                });
                return;
            }

            if (destinationMode === "me") {
                router.push(currentUsername ? `/users/${currentUsername}/books` : "/books");
                return;
            }

            setLibraryNotice({
                message: "Book added.",
                detail: "It was added to the selected user's library.",
                userBookId: data.userBookId,
            });
        } catch (addError) {
            console.error("Add existing book failed:", addError);
            setError("Something went wrong while adding this book to the selected library.");
        } finally {
            setAddingExistingBookId(null);
        }
    }

    async function handleRequestBook(bookToRequest?: BookSearchResult) {
        const cleanIsbn = (bookToRequest?.isbn13 ?? isbn).replace(/[\s-]/g, "").trim();
        const requestTitle = (bookToRequest?.title ?? bookSearch).trim();
        const requestAuthor = (bookToRequest?.author ?? "").trim();
        if (!cleanIsbn && !requestTitle) {
            setError("Search for a title or enter an ISBN before requesting review.");
            return;
        }

        setRequestingBookId(bookToRequest?.id ?? null);
        setRequestLoading(true);
        setError("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("You need to be signed in to request a book.");
                return;
            }

            let existingPendingRequest: { id: string } | null = null;

            if (cleanIsbn) {
                const { data, error: existingPendingRequestError } = await supabase
                    .from("book_requests")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("status", "pending")
                    .eq("isbn13", cleanIsbn)
                    .limit(1)
                    .maybeSingle();

                if (existingPendingRequestError) throw existingPendingRequestError;
                existingPendingRequest = data;
            }

            if (existingPendingRequest) {
                setCanRequestBook(false);
                setError("This book request is already waiting for review.");
                return;
            }

            const { error: requestError } = await supabase.from("book_requests").insert({
                user_id: user.id,
                title: requestTitle || `ISBN ${cleanIsbn}`,
                author: requestAuthor || null,
                isbn13: cleanIsbn || null,
                status: "pending",
            });

            if (requestError) throw requestError;

            setCanRequestBook(false);
            setError("Book request sent. An admin can review this ISBN and add the book details.");
        } catch (requestError) {
            console.error("Book request failed:", requestError);
            setError("Could not send this book request. Please ask an admin or teacher to add it.");
        } finally {
            setRequestLoading(false);
            setRequestingBookId(null);
        }
    }

    const coverUrl = book ? getCoverUrl(book) : null;
    const displayAuthor = book ? getDisplayAuthor(book) : "";
    const publishedDate = book ? getPublishedDate(book) : null;
    const pageCount = book ? getPageCount(book) : null;
    const selectedDestinationLabel = useMemo(() => {
        if (destinationMode === "global") return "Global catalog only";
        if (destinationMode === "me") return "My library";

        const options = destinationMode === "student" ? studentOptions : userOptions;
        const selected = options.find((item) => item.id === destinationUserId);
        return selected?.display_name || selected?.username || "selected user";
    }, [destinationMode, destinationUserId, studentOptions, userOptions]);
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
            <AddBookLookupCard
                isbn={isbn}
                lookupLoading={lookupLoading}
                lookupDisabled={!isbn.trim()}
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
                    />
                ) : null}
            </AddBookLookupCard>

            <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Search existing books
                </p>
                <h2 className="mt-2 text-xl font-black text-stone-950">
                    Search by title, author, or ISBN
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                    Use this when you are adding a book for another user and the book may
                    already be in Mekuru. Complete records can be added directly; incomplete
                    records should be requested for review.
                </p>

                <AddBookDestinationPanel
                    destinationMode={destinationMode}
                    destinationUserId={destinationUserId}
                    isTeacher={isTeacher}
                    isSuperTeacher={isSuperTeacher}
                    studentOptions={studentOptions}
                    userOptions={userOptions}
                    onDestinationModeChange={handleDestinationModeChange}
                    onDestinationUserChange={(userId) => {
                        setDestinationUserId(userId);
                        setLibraryNotice(null);
                    }}
                />

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                        value={bookSearch}
                        onChange={(event) => {
                            setBookSearch(event.target.value);
                            setLibraryNotice(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") void handleBookSearch();
                        }}
                        placeholder="Title, author, or ISBN"
                        className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                    />

                    <button
                        type="button"
                        onClick={() => void handleBookSearch()}
                        disabled={bookSearchLoading || !bookSearch.trim()}
                        className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
                    >
                        {bookSearchLoading ? "Searching..." : "Search"}
                    </button>
                </div>

                {bookSearchResults.length > 0 ? (
                    <div className="mt-5 space-y-3">
                        {bookSearchResults.map((result) => {
                            const missingFields = missingGlobalBookFields(result);
                            const canAddExisting = isBookCompleteEnoughToAdd(result);

                            return (
                                <div
                                    key={result.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:flex-row"
                                >
                                    {result.cover_url ? (
                                        <img
                                            src={result.cover_url}
                                            alt=""
                                            className="h-24 w-16 shrink-0 rounded-xl object-cover shadow-sm"
                                        />
                                    ) : (
                                        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-200 px-2 text-center text-[10px] font-bold text-stone-500">
                                            No cover
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-black text-stone-900">
                                            {result.title || "Untitled book"}
                                        </h3>
                                        <p className="mt-1 text-sm text-stone-600">
                                            {result.author || "Author not listed"}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                                            {result.book_type ? (
                                                <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-stone-600">
                                                    {result.book_type}
                                                </span>
                                            ) : null}
                                            {result.isbn13 ? (
                                                <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-stone-600">
                                                    ISBN {result.isbn13}
                                                </span>
                                            ) : null}
                                            {canAddExisting ? (
                                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
                                                    Ready to add
                                                </span>
                                            ) : (
                                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                                                    Needs review
                                                </span>
                                            )}
                                        </div>
                                        {!canAddExisting ? (
                                            <p className="mt-2 text-xs leading-5 text-amber-800">
                                                Missing: {missingFields.length > 0 ? missingFields.join(", ") : "review approval"}.
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 sm:w-40">
                                        {canAddExisting ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleAddExistingBook(result.id)}
                                                disabled={addingExistingBookId === result.id}
                                                className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
                                            >
                                                {addingExistingBookId === result.id
                                                    ? "Adding..."
                                                    : destinationMode === "global"
                                                        ? "Open Review"
                                                        : "Add Book"}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void handleRequestBook(result)}
                                                disabled={requestLoading && requestingBookId === result.id}
                                                className="rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
                                            >
                                                {requestLoading && requestingBookId === result.id
                                                    ? "Sending..."
                                                    : "Request review"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                {canRequestBook && bookSearch.trim() && bookSearchResults.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => void handleRequestBook()}
                        disabled={requestLoading}
                        className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                        {requestLoading ? "Sending..." : "Request this book for review"}
                    </button>
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
                    isNewToMekuru={isNewToMekuru}
                >
                    <AddBookDestinationPanel
                        destinationMode={destinationMode}
                        destinationUserId={destinationUserId}
                        isTeacher={isTeacher}
                        isSuperTeacher={isSuperTeacher}
                        studentOptions={studentOptions}
                        userOptions={userOptions}
                        onDestinationModeChange={handleDestinationModeChange}
                        onDestinationUserChange={(userId) => {
                            setDestinationUserId(userId);
                            setLibraryNotice(null);
                        }}
                    />

                    <AddBookActionRow
                        addLoading={addLoading}
                        destinationMode={destinationMode}
                        selectedDestinationLabel={selectedDestinationLabel}
                        onAdd={handleAddToLibrary}
                        onCancel={() => router.push("/dashboard")}
                    />
                </LookupBookPreviewCard>
            ) : null}
        </main >
    );
}
