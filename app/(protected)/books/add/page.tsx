// ISBN Add Book
// 
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AddBookMessagePanel from "./components/AddBookMessagePanel";
import AddBookLibraryNotice from "./components/AddBookLibraryNotice";
import LookupBookPreviewCard from "./components/LookupBookPreviewCard";
import AddBookActionRow from "./components/AddBookActionRow";
import AddBookDestinationSummary from "./components/AddBookDestinationSummary";
import AddBookCatalogResult from "./components/AddBookCatalogResult";
import ManualEditionForm, { type ManualEditionMode } from "./components/ManualEditionForm";
import AddBookModeButton from "./components/AddBookModeButton";
import AddBookTeacherDestinationOptions from "./components/AddBookTeacherDestinationOptions";
import AddBookEditionLanguageConfirmation from "./components/AddBookEditionLanguageConfirmation";
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

type AddBookSearchMode = "title" | "isbn" | "asin";
type TeacherGlobalDestination = "catalog_only" | "student_only" | "teacher_and_student";

type TeacherStudentOption = {
    id: string;
    display_name: string | null;
    username: string | null;
};

type TeacherUserSearchResult = {
    id: string;
    displayName: string | null;
    username: string | null;
    email: string | null;
};

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
        "Author not listed"
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


export default function AddBookPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const destination = searchParams.get("destination") ?? "";
    const addBookContext = searchParams.get("context") ?? "";
    const targetUserIdParam = searchParams.get("targetUserId")?.trim() ?? "";
    const isTeacherGlobalContext =
        addBookContext === "teacher-global" || destination === "teacher-global";

    const [activeMode, setActiveMode] = useState<AddBookSearchMode>("title");
    const [isbn, setIsbn] = useState("");
    const [asin, setAsin] = useState("");
    const [asinEditionFormat, setAsinEditionFormat] = useState("");
    const [identifierRequestTitle, setIdentifierRequestTitle] = useState("");
    const [fallbackRequestFormat, setFallbackRequestFormat] = useState("");
    const [confirmedEditionLanguageCode, setConfirmedEditionLanguageCode] = useState("");
    const [manualAddMode, setManualAddMode] = useState<ManualEditionMode | null>(null);
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
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [currentUserIsSuperTeacher, setCurrentUserIsSuperTeacher] = useState(false);
    const [targetUsername, setTargetUsername] = useState<string | null>(null);
    const [targetDisplayName, setTargetDisplayName] = useState<string | null>(null);
    const [teacherStudents, setTeacherStudents] = useState<TeacherStudentOption[]>([]);
    const [teacherStudentLoading, setTeacherStudentLoading] = useState(false);
    const [teacherStudentSearch, setTeacherStudentSearch] = useState("");
    const [allUserSearch, setAllUserSearch] = useState("");
    const [allUserSearchResults, setAllUserSearchResults] = useState<TeacherUserSearchResult[]>([]);
    const [allUserSearchLoading, setAllUserSearchLoading] = useState(false);
    const [allUserSearchError, setAllUserSearchError] = useState("");
    const [selectedAllUser, setSelectedAllUser] = useState<TeacherUserSearchResult | null>(null);
    const [teacherDestination, setTeacherDestination] =
        useState<TeacherGlobalDestination>("catalog_only");
    const [selectedTeacherStudentId, setSelectedTeacherStudentId] = useState(targetUserIdParam);
    const canUseCatalogOnly =
        currentUserRole === "super_teacher" || currentUserIsSuperTeacher;
    const canSearchAllUsers =
        isTeacherGlobalContext &&
        (currentUserRole === "super_teacher" || currentUserIsSuperTeacher);
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
                .select("id, username, role, is_super_teacher")
                .eq("id", user.id)
                .maybeSingle();

            if (!alive) return;

            setCurrentUsername((profile as any)?.username ?? null);
            setCurrentUserRole((profile as any)?.role ?? null);
            setCurrentUserIsSuperTeacher(
                (profile as any)?.is_super_teacher === true ||
                (profile as any)?.is_super_teacher === "true"
            );
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

    useEffect(() => {
        setSelectedTeacherStudentId(targetUserIdParam);
    }, [targetUserIdParam]);

    useEffect(() => {
        if (!currentUserId) return;
        if (isTeacherGlobalContext && !canUseCatalogOnly && teacherDestination === "catalog_only") {
            setTeacherDestination("student_only");
        }
    }, [canUseCatalogOnly, currentUserId, isTeacherGlobalContext, teacherDestination]);

    useEffect(() => {
        let alive = true;

        async function loadTeacherStudents() {
            if (!isTeacherGlobalContext || !currentUserId) {
                setTeacherStudents([]);
                return;
            }

            setTeacherStudentLoading(true);

            try {
                if (
                    currentUserRole !== "teacher" &&
                    currentUserRole !== "super_teacher" &&
                    !currentUserIsSuperTeacher
                ) {
                    if (alive) setTeacherStudents([]);
                    return;
                }

                const { data: links, error: linkError } = await supabase
                    .from("teacher_students")
                    .select("student_id")
                    .eq("teacher_id", currentUserId)
                    .is("archived_at", null);

                if (linkError) throw linkError;

                const studentIds = (links ?? [])
                    .map((link: any) => link.student_id)
                    .filter(Boolean);

                if (studentIds.length === 0) {
                    if (alive) setTeacherStudents([]);
                    return;
                }

                const { data: students, error: studentsError } = await supabase
                    .from("profiles")
                    .select("id, display_name, username")
                    .in("id", studentIds)
                    .order("display_name", { ascending: true });

                if (studentsError) throw studentsError;
                if (!alive) return;
                setTeacherStudents((students ?? []) as TeacherStudentOption[]);
            } catch (studentError) {
                console.error("Could not load teacher students for Add Book:", studentError);
                if (alive) setTeacherStudents([]);
            } finally {
                if (alive) setTeacherStudentLoading(false);
            }
        }

        void loadTeacherStudents();

        return () => {
            alive = false;
        };
    }, [currentUserId, currentUserIsSuperTeacher, currentUserRole, isTeacherGlobalContext]);

    const isTeacherGlobalStudentDestination =
        isTeacherGlobalContext &&
        (teacherDestination === "student_only" || teacherDestination === "teacher_and_student");

    useEffect(() => {
        let alive = true;
        const query = allUserSearch.trim();

        if (!canSearchAllUsers || !isTeacherGlobalStudentDestination || query.length < 2) {
            setAllUserSearchResults([]);
            setAllUserSearchLoading(false);
            setAllUserSearchError("");
            return;
        }

        setAllUserSearchLoading(true);
        setAllUserSearchError("");

        const timeout = window.setTimeout(async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const response = await fetch(
                    `/api/teacher/users/search?q=${encodeURIComponent(query)}&limit=12`,
                    {
                        headers: session?.access_token
                            ? { Authorization: `Bearer ${session.access_token}` }
                            : {},
                    }
                );

                const data = await response.json().catch(() => null);

                if (!alive) return;

                if (!response.ok) {
                    setAllUserSearchResults([]);
                    setAllUserSearchError(data?.error ?? "Could not search users.");
                    return;
                }

                setAllUserSearchResults((data?.users ?? []) as TeacherUserSearchResult[]);
            } catch (searchError) {
                console.error("All-user search failed:", searchError);
                if (alive) {
                    setAllUserSearchResults([]);
                    setAllUserSearchError("Could not search users.");
                }
            } finally {
                if (alive) setAllUserSearchLoading(false);
            }
        }, 300);

        return () => {
            alive = false;
            window.clearTimeout(timeout);
        };
    }, [allUserSearch, canSearchAllUsers, isTeacherGlobalStudentDestination]);

    const selectedTeacherStudent = teacherStudents.find(
        (student) => student.id === selectedTeacherStudentId
    );
    const selectedSearchUser =
        selectedAllUser?.id === selectedTeacherStudentId ? selectedAllUser : null;
    const selectedTeacherStudentName =
        selectedTeacherStudent?.display_name ||
        selectedTeacherStudent?.username ||
        selectedSearchUser?.displayName ||
        selectedSearchUser?.username ||
        selectedSearchUser?.email ||
        targetDisplayName ||
        "this student";
    const targetLibraryUserId = isTeacherGlobalStudentDestination
        ? selectedTeacherStudentId
        : targetUserIdParam || currentUserId;
    const isStudentDestination =
        destination === "student" && !!targetUserIdParam && targetUserIdParam !== currentUserId;
    const isOtherUserDestination =
        !isStudentDestination && !!targetUserIdParam && targetUserIdParam !== currentUserId;
    const targetLibraryLabel = isTeacherGlobalContext
        ? teacherDestination === "catalog_only"
            ? "the MEKURU Catalog"
            : teacherDestination === "teacher_and_student"
            ? `your library and ${selectedTeacherStudentName}'s library`
            : `${selectedTeacherStudentName}'s library`
        : isStudentDestination
        ? `${targetDisplayName ?? "this student"}’s library`
        : isOtherUserDestination
        ? `${targetDisplayName ?? "this user"}’s library`
        : "your library";
    const targetLibraryShortLabel = isTeacherGlobalContext
        ? teacherDestination === "catalog_only"
            ? "the MEKURU Catalog"
            : teacherDestination === "teacher_and_student"
            ? "your library and the student's library"
            : "student library"
        : isStudentDestination
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

    function addModePayload() {
        if (!isTeacherGlobalContext) {
            return {
                mode: "add_to_library",
                targetUserId: targetLibraryUserId,
                ...studentLessonBookPayload(),
            };
        }

        if (teacherDestination === "catalog_only") {
            return {
                mode: "global_only",
            };
        }

        return {
            mode: teacherDestination === "teacher_and_student" ? "teacher_and_student" : "add_to_library",
            targetUserId: selectedTeacherStudentId,
        };
    }

    function validateDestinationReady(setMessage: (message: string) => void) {
        if (isTeacherGlobalStudentDestination && !selectedTeacherStudentId) {
            setMessage("Choose a student before adding this book.");
            return false;
        }

        if (!isTeacherGlobalContext && !targetLibraryUserId) {
            setMessage(`Sign in again before adding this book to ${targetLibraryShortLabel}.`);
            return false;
        }

        return true;
    }

    function finalAddLabel() {
        if (isStudentLessonBookContext) return `Add Lesson Book for ${targetDisplayName ?? "Student"}`;
        if (!isTeacherGlobalContext) {
            return isStudentDestination
                ? "Add to Student Library"
                : isOtherUserDestination
                ? "Add to User Library"
                : "Add to My Library";
        }

        if (teacherDestination === "catalog_only") return "Add to MEKURU Catalog";
        if (teacherDestination === "teacher_and_student") return "Add to My Library + Student's Library";
        return "Add to Student's Library";
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

    function openManualAdd(mode: ManualEditionMode, seed?: { title?: string; author?: string; format?: string }) {
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

        if (isTeacherGlobalContext) {
            if (data?.globalOnly) {
                setLibraryNotice({
                    message: "Added to the MEKURU Catalog",
                    detail: "No personal Library copy was created.",
                    bookId: data.bookId,
                    returnLabel: "Back to Teacher Books",
                    returnHref: "/teacher/books",
                });
                return;
            }

            if (data?.teacherAndStudent) {
                setLibraryNotice({
                    message: `Added to your Library and ${selectedTeacherStudentName}'s Library`,
                    detail: "No Active Lesson Book relationship was created.",
                    userBookId: data.studentUserBookId,
                    returnLabel: "Back to Teacher Books",
                    returnHref: "/teacher/books",
                });
                return;
            }

            setLibraryNotice({
                message: `Added to ${selectedTeacherStudentName}'s Library`,
                detail: "No Active Lesson Book relationship was created.",
                userBookId: data.userBookId,
                returnLabel: "Back to Teacher Books",
                returnHref: "/teacher/books",
            });
            return;
        }

        if (data?.alreadyInLibrary) {
            setLibraryNotice({
                message: `In ${targetLibraryShortLabel}`,
                detail: "Open the existing copy.",
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

        if (!validateDestinationReady(setError)) return;

        if (needsEditionLanguageConfirmation && !selectedEditionLanguageCode) {
            setError("Choose the language of this edition before adding it.");
            return;
        }

        if (
            isNewToMekuru &&
            !window.confirm(
                `This edition is new to Mekuru. Some shared details may be filled in later. Add it to ${targetLibraryLabel}?`
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
                    ...addModePayload(),
                    languageCode: needsEditionLanguageConfirmation
                        ? selectedEditionLanguageCode
                        : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Add book route returned an error:", data);
                setError(data.error ?? `I couldn’t add this book to ${targetLibraryShortLabel}.`);
                return;
            }

            if (!isTeacherGlobalContext && !data.userBookId) {
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
        if (!validateDestinationReady(setBookSearchError)) return;

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
                    ...addModePayload(),
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

        if (!validateDestinationReady(setManualAddError)) return;

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
                    ...addModePayload(),
                    confirmDifferentEdition,
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
    const manualIdentifierLabel =
        manualAddMode === "isbn"
            ? `ISBN ${isbn.replace(/[\s-]/g, "").trim()}`
            : manualAddMode === "asin"
            ? `ASIN ${normalizeAsin(asin) ?? asin.trim()}`
            : "No ISBN or ASIN";
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
    const filteredTeacherStudents = useMemo(() => {
        const query = teacherStudentSearch.trim().toLowerCase();
        if (!query) return teacherStudents;

        return teacherStudents.filter((student) => {
            const displayName = student.display_name ?? "";
            const username = student.username ?? "";
            return `${displayName} ${username}`.toLowerCase().includes(query);
        });
    }, [teacherStudentSearch, teacherStudents]);
    const pageEyebrow = isTeacherGlobalContext
        ? "Teacher Global Add"
        : isStudentLessonBookContext
        ? "Student Lesson Book"
        : "MEKURU Library";
    const pageDescription = isTeacherGlobalContext
        ? "Find the edition first, then choose where it should go."
        : isStudentLessonBookContext
        ? `Adding lesson book for ${targetDisplayName ?? "this student"}.`
        : "Find an edition by title, ISBN, or ASIN.";
    const showContextSummary = !isTeacherGlobalContext || isStudentLessonBookContext;
    const hasEditionToActOn =
        Boolean(book) || Boolean(manualAddMode) || bookSearchResults.length > 0;

    return (
        <main className="mx-auto max-w-4xl px-4 py-8">
            <header className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    {pageEyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-black text-stone-950">
                    Add a Book
                </h1>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                    {pageDescription}
                </p>
            </header>

            {showContextSummary ? (
                <AddBookDestinationSummary
                    destinationKind={destinationKind}
                    displayName={destinationDisplayName}
                    contextDescription={studentLessonContextDescription}
                />
            ) : null}

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Find by
                        </p>
                        <h2 className="mt-2 text-xl font-black text-stone-950">
                            Choose how to identify the edition
                        </h2>
                    </div>
                    <div
                        role="tablist"
                        aria-label="Add book search mode"
                        className="grid grid-cols-3 gap-1 rounded-[1.35rem] border border-stone-200 bg-stone-100 p-1 sm:min-w-[330px]"
                    >
                        <AddBookModeButton mode="title" activeMode={activeMode} onSelect={setActiveMode}>
                            Title
                        </AddBookModeButton>
                        <AddBookModeButton mode="isbn" activeMode={activeMode} onSelect={setActiveMode}>
                            ISBN
                        </AddBookModeButton>
                        <AddBookModeButton mode="asin" activeMode={activeMode} onSelect={setActiveMode}>
                            ASIN
                        </AddBookModeButton>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50 p-4">
                    {activeMode === "title" ? (
                        <>
                            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_200px_auto]">
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
                                    placeholder="Author (helps manual fallback)"
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
                                    <option value="">Format if known</option>
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
                                Title search checks the MEKURU catalog. Author and format help if you need to add the edition manually.
                            </p>
                        </>
                    ) : null}

                    {activeMode === "isbn" ? (
                        <>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <input
                                    value={isbn}
                                    onChange={(event) => {
                                        setIsbn(event.target.value);
                                        setLibraryNotice(null);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && isbn.trim()) void handleLookup();
                                    }}
                                    placeholder="ISBN-13, e.g. 978..."
                                    inputMode="numeric"
                                    className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                />

                                <button
                                    type="button"
                                    onClick={() => void handleLookup()}
                                    disabled={lookupLoading || !isbn.trim()}
                                    className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
                                >
                                    {lookupLoading ? "Looking..." : "Look Up"}
                                </button>
                            </div>

                            <label className="mt-3 block">
                                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                                    Title if lookup misses
                                </span>
                                <input
                                    value={identifierRequestTitle}
                                    onChange={(event) => {
                                        setIdentifierRequestTitle(event.target.value);
                                        setLibraryNotice(null);
                                    }}
                                    placeholder="Optional title to prefill manual details"
                                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                />
                            </label>
                        </>
                    ) : null}

                    {activeMode === "asin" ? (
                        <>
                            <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
                                <input
                                    value={asin}
                                    onChange={(event) => {
                                        setAsin(event.target.value);
                                        setLibraryNotice(null);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && asin.trim()) void handleAsinLookup();
                                    }}
                                    placeholder="Amazon ASIN, e.g. B0D4V5K3M8"
                                    className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                />

                                <select
                                    value={asinEditionFormat}
                                    onChange={(event) => setAsinEditionFormat(event.target.value)}
                                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                >
                                    <option value="">Format if known</option>
                                    <option value="ebook">Kindle eBook</option>
                                    <option value="audiobook">Audiobook</option>
                                    <option value="paperback">Paperback</option>
                                    <option value="hardcover">Hardcover</option>
                                    <option value="other">Other</option>
                                </select>

                                <button
                                    type="button"
                                    onClick={() => void handleAsinLookup()}
                                    disabled={asinLookupLoading || !asin.trim()}
                                    className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
                                >
                                    {asinLookupLoading ? "Checking..." : "Check MEKURU"}
                                </button>
                            </div>
                            <label className="mt-3 block">
                                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                                    Title if this ASIN is new
                                </span>
                                <input
                                    value={identifierRequestTitle}
                                    onChange={(event) => {
                                        setIdentifierRequestTitle(event.target.value);
                                        setLibraryNotice(null);
                                    }}
                                    placeholder="Optional title to prefill manual details"
                                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                />
                            </label>
                            <p className="mt-2 text-xs leading-5 text-stone-500">
                                ASIN checks MEKURU for an existing edition. It does not search Amazon metadata.
                            </p>
                        </>
                    ) : null}
                </div>

                <AddBookMessagePanel message={error} />

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
            </section>

            <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Results / Edition
                        </p>
                        <h2 className="mt-2 text-xl font-black text-stone-950">
                            Confirm the edition
                        </h2>
                    </div>
                    {activeMode === "title" ? (
                        <button
                            type="button"
                            onClick={() =>
                                openManualAdd("manual", {
                                    title: bookSearch,
                                    author: bookSearchAuthor,
                                    format: fallbackRequestFormat,
                                })
                            }
                            className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
                        >
                            Can't find it?
                        </button>
                    ) : null}
                </div>

                {isTeacherGlobalContext && hasEditionToActOn ? (
                    <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                            Add this edition to
                        </p>
                        <AddBookTeacherDestinationOptions
                            teacherDestination={teacherDestination}
                            canUseCatalogOnly={canUseCatalogOnly}
                            onSelect={setTeacherDestination}
                        />
                        {isTeacherGlobalStudentDestination ? (
                            <div className="mt-4">
                                <label className="block text-sm font-black text-stone-900">
                                    Student
                                </label>
                                <input
                                    value={teacherStudentSearch}
                                    onChange={(event) => setTeacherStudentSearch(event.target.value)}
                                    placeholder="Search linked students"
                                    className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                />
                                <select
                                    value={selectedTeacherStudentId}
                                    onChange={(event) => {
                                        setSelectedTeacherStudentId(event.target.value);
                                        setSelectedAllUser(null);
                                    }}
                                    className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                >
                                    <option value="">
                                        {teacherStudentLoading ? "Loading linked students..." : "Choose a linked student"}
                                    </option>
                                    {selectedTeacherStudentId &&
                                    !filteredTeacherStudents.some((student) => student.id === selectedTeacherStudentId) ? (
                                        <option value={selectedTeacherStudentId}>
                                            {selectedTeacherStudentName}
                                        </option>
                                    ) : null}
                                    {filteredTeacherStudents.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.display_name || student.username || "Unnamed student"}
                                            {student.username ? ` (@${student.username})` : ""}
                                        </option>
                                    ))}
                                </select>
                                {selectedTeacherStudentId ? (
                                    <p className="mt-2 text-xs leading-5 text-stone-600">
                                        Selected: <span className="font-bold text-stone-900">{selectedTeacherStudentName}</span>
                                    </p>
                                ) : null}

                                {canSearchAllUsers ? (
                                    <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
                                        <label className="block text-sm font-black text-stone-900">
                                            Search all users
                                        </label>
                                        <input
                                            value={allUserSearch}
                                            onChange={(event) => setAllUserSearch(event.target.value)}
                                            placeholder="Type at least 2 characters"
                                            className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                        />
                                        {allUserSearch.trim().length > 0 && allUserSearch.trim().length < 2 ? (
                                            <p className="mt-2 text-xs leading-5 text-stone-500">
                                                Enter at least 2 characters to search.
                                            </p>
                                        ) : null}
                                        {allUserSearchLoading ? (
                                            <p className="mt-2 text-xs font-bold text-stone-500">Searching users...</p>
                                        ) : null}
                                        {allUserSearchError ? (
                                            <p className="mt-2 text-xs font-bold text-red-700">{allUserSearchError}</p>
                                        ) : null}
                                        {!allUserSearchLoading &&
                                        !allUserSearchError &&
                                        allUserSearch.trim().length >= 2 &&
                                        allUserSearchResults.length === 0 ? (
                                            <p className="mt-2 text-xs leading-5 text-stone-500">No matching users found.</p>
                                        ) : null}
                                        {allUserSearchResults.length > 0 ? (
                                            <div className="mt-3 grid gap-2">
                                                {allUserSearchResults.map((user) => {
                                                    const resultName =
                                                        user.displayName || user.username || user.email || "Unnamed user";
                                                    const resultDetail = [
                                                        user.email,
                                                        user.username ? `@${user.username}` : null,
                                                    ].filter(Boolean).join(" · ");
                                                    const selected = selectedTeacherStudentId === user.id;

                                                    return (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedTeacherStudentId(user.id);
                                                                setSelectedAllUser(user);
                                                            }}
                                                            className={[
                                                                "rounded-2xl border px-4 py-3 text-left transition",
                                                                selected
                                                                    ? "border-stone-900 bg-stone-50"
                                                                    : "border-stone-200 bg-white hover:bg-stone-50",
                                                            ].join(" ")}
                                                        >
                                                            <span className="block text-sm font-black text-stone-950">
                                                                {resultName}
                                                            </span>
                                                            {resultDetail ? (
                                                                <span className="mt-1 block text-xs leading-5 text-stone-600">
                                                                    {resultDetail}
                                                                </span>
                                                            ) : null}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}

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
                            <AddBookEditionLanguageConfirmation
                                selectedCommonEditionLanguageCode={selectedCommonEditionLanguageCode}
                                confirmedEditionLanguageCode={confirmedEditionLanguageCode}
                                selectedEditionLanguageLabel={selectedEditionLanguageLabel}
                                languageOptions={COMMON_BOOK_LANGUAGE_OPTIONS}
                                onLanguageCodeChange={(value) => {
                                    setConfirmedEditionLanguageCode(value);
                                    setError("");
                                }}
                            />
                        ) : null}
                        <AddBookActionRow
                            addLoading={addLoading}
                            disabled={needsEditionLanguageConfirmation && !selectedEditionLanguageCode}
                            addLabel={finalAddLabel()}
                            onAdd={handleAddToLibrary}
                            onCancel={() => router.push(targetLibraryHref)}
                        />
                    </LookupBookPreviewCard>
                ) : null}

                {manualAddMode ? (
                    <ManualEditionForm
                        mode={manualAddMode}
                        identifierLabel={manualIdentifierLabel}
                        title={manualTitle}
                        author={manualAuthor}
                        editionFormat={manualEditionFormat}
                        languageCode={manualLanguageCode}
                        pageCount={manualPageCount}
                        error={manualAddError}
                        loading={manualAddLoading}
                        addLabel={finalAddLabel()}
                        candidates={manualPossibleMatches.map((result) => ({
                            result,
                            missingFields: missingGlobalBookFields(result),
                            adding: addingExistingBookId === result.id,
                            requestLoading: requestLoading && requestingBookId === result.id,
                        }))}
                        editionFormatOptions={EDITION_FORMAT_OPTIONS}
                        onTitleChange={(value) => {
                            setManualTitle(value);
                            setManualAddError("");
                            setManualPossibleMatches([]);
                        }}
                        onAuthorChange={(value) => {
                            setManualAuthor(value);
                            setManualAddError("");
                            setManualPossibleMatches([]);
                        }}
                        onEditionFormatChange={(value) => {
                            setManualEditionFormat(value);
                            setManualAddError("");
                            setManualPossibleMatches([]);
                        }}
                        onLanguageCodeChange={(value) => {
                            setManualLanguageCode(value);
                            setManualAddError("");
                            setManualPossibleMatches([]);
                        }}
                        onPageCountChange={(value) => {
                            setManualPageCount(value);
                            setManualAddError("");
                        }}
                        onSubmit={() => void handleManualAdd(false)}
                        onSubmitDifferentEdition={() => void handleManualAdd(true)}
                        onCancel={resetManualAdd}
                        onUseExistingEdition={(bookId) => void handleAddExistingBook(bookId)}
                        onCheckDetails={(result) => void handleRequestBookDetails(result)}
                    />
                ) : null}

                {bookSearchError ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                        <p>{bookSearchError}</p>
                    </div>
                ) : null}

                {bookSearchResults.length > 0 ? (
                    <div className="mt-4 space-y-3">
                        {bookSearchResults.map((result) => {
                            const missingFields = missingGlobalBookFields(result);

                            return (
                                <AddBookCatalogResult
                                    key={result.id}
                                    result={result}
                                    missingFields={missingFields}
                                    adding={addingExistingBookId === result.id}
                                    requestLoading={requestLoading && requestingBookId === result.id}
                                    addLabel={finalAddLabel()}
                                    onAdd={() => void handleAddExistingBook(result.id)}
                                    onRequestReview={() => void handleRequestBookDetails(result)}
                                />
                            );
                        })}
                    </div>
                ) : null}

                {!book && !manualAddMode && bookSearchResults.length === 0 && !bookSearchError ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
                        <p className="text-sm font-bold text-stone-700">
                            Search first, then confirm the exact edition here.
                        </p>
                    </div>
                ) : null}
            </section>
        </main>
    );
}
