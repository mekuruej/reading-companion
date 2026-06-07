// ISBN Add Book
// 
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AddBookLookupCard from "./components/AddBookLookupCard";
import AddBookMessagePanel from "./components/AddBookMessagePanel";
import AddBookLibraryNotice from "./components/AddBookLibraryNotice";

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

                    if (alive) setStudentOptions((students ?? []) as DestinationUser[]);
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

    async function handleRequestBook() {
        const cleanIsbn = isbn.replace(/[\s-]/g, "").trim();
        if (!cleanIsbn) return;

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

            const { data: existingPendingRequest, error: existingPendingRequestError } =
                await supabase
                    .from("book_requests")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("status", "pending")
                    .eq("isbn13", cleanIsbn)
                    .limit(1)
                    .maybeSingle();

            if (existingPendingRequestError) throw existingPendingRequestError;

            if (existingPendingRequest) {
                setCanRequestBook(false);
                setError("This book request is already waiting for review.");
                return;
            }

            const { error: requestError } = await supabase.from("book_requests").insert({
                user_id: user.id,
                title: `ISBN ${cleanIsbn}`,
                author: null,
                isbn13: cleanIsbn,
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

            {book ? (
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
                                {book.title}
                            </h2>

                            {book.subtitle ? (
                                <p className="mt-1 text-sm font-medium text-stone-600">
                                    {book.subtitle}
                                </p>
                            ) : null}

                            <p className="mt-3 text-sm leading-6 text-stone-700">
                                {displayAuthor}
                            </p>

                            <div className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                                {book.publisher ? (
                                    <p>
                                        <span className="font-bold text-stone-800">Publisher:</span>{" "}
                                        {book.publisher}
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
                                    {book.isbn13}
                                </p>
                            </div>

                            {isNewToMekuru ? (
                                <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                                    This book is not in Mekuru’s database yet. You can still add it to your library now, but an admin may need to review it before all book details show up.
                                </p>
                            ) : null}

                            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                                    Destination
                                </p>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                                        <input
                                            type="radio"
                                            checked={destinationMode === "me"}
                                            onChange={() => {
                                                setDestinationMode("me");
                                                setDestinationUserId("");
                                                setLibraryNotice(null);
                                            }}
                                        />
                                        My library
                                    </label>

                                    {isTeacher ? (
                                        <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                                            <input
                                                type="radio"
                                                checked={destinationMode === "student"}
                                                onChange={() => {
                                                    setDestinationMode("student");
                                                    setDestinationUserId(studentOptions[0]?.id ?? "");
                                                    setLibraryNotice(null);
                                                }}
                                            />
                                            Linked student
                                        </label>
                                    ) : null}

                                    {isSuperTeacher ? (
                                        <>
                                            <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                                                <input
                                                    type="radio"
                                                    checked={destinationMode === "user"}
                                                    onChange={() => {
                                                        setDestinationMode("user");
                                                        setDestinationUserId(userOptions[0]?.id ?? "");
                                                        setLibraryNotice(null);
                                                    }}
                                                />
                                                Any user
                                            </label>

                                            <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                                                <input
                                                    type="radio"
                                                    checked={destinationMode === "global"}
                                                    onChange={() => {
                                                        setDestinationMode("global");
                                                        setDestinationUserId("");
                                                        setLibraryNotice(null);
                                                    }}
                                                />
                                                Global catalog only
                                            </label>
                                        </>
                                    ) : null}
                                </div>

                                {destinationMode === "student" ? (
                                    <select
                                        value={destinationUserId}
                                        onChange={(event) => {
                                            setDestinationUserId(event.target.value);
                                            setLibraryNotice(null);
                                        }}
                                        className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"
                                    >
                                        {studentOptions.length === 0 ? (
                                            <option value="">No active linked students</option>
                                        ) : null}
                                        {studentOptions.map((student) => (
                                            <option key={student.id} value={student.id}>
                                                {student.display_name || student.username || student.id}
                                                {student.level ? ` · ${student.level}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                ) : null}

                                {destinationMode === "user" ? (
                                    <select
                                        value={destinationUserId}
                                        onChange={(event) => {
                                            setDestinationUserId(event.target.value);
                                            setLibraryNotice(null);
                                        }}
                                        className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"
                                    >
                                        {userOptions.length === 0 ? (
                                            <option value="">No users found</option>
                                        ) : null}
                                        {userOptions.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.display_name || user.username || user.id}
                                                {user.level ? ` · ${user.level}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                ) : null}
                            </div>

                            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleAddToLibrary}
                                    disabled={addLoading}
                                    className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {addLoading
                                        ? "Adding..."
                                        : destinationMode === "global"
                                            ? "Open Global Review"
                                            : `Add to ${selectedDestinationLabel}`}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.push("/dashboard")}
                                    className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            ) : null}
        </main>
    );
}
