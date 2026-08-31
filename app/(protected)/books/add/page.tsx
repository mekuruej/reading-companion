// ISBN Add Book
// 
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    edition_format?: string | null;
    edition_note?: string | null;
};

type AddBookSearchMode = "title" | "isbn" | "asin";
type AddBookDestinationKey = "catalog" | "teaching" | "my" | "student";

type TeacherStudentOption = {
    id: string;
    display_name: string | null;
    username: string | null;
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
    const sourceParam = searchParams.get("from");
    const targetUserIdParam = searchParams.get("targetUserId")?.trim() ?? "";
    const opensTeachingBooksDestination =
        addBookContext === "teacher-global" ||
        destination === "teacher-global" ||
        destination === "teaching";
    const isTeacherGlobalContext =
        opensTeachingBooksDestination;

    const [activeMode, setActiveMode] = useState<AddBookSearchMode>("title");
    const [isbn, setIsbn] = useState("");
    const [asin, setAsin] = useState("");
    const [asinEditionFormat, setAsinEditionFormat] = useState("");
    const [asinEditionNote, setAsinEditionNote] = useState("");
    const [identifierRequestTitle, setIdentifierRequestTitle] = useState("");
    const [fallbackRequestFormat, setFallbackRequestFormat] = useState("");
    const [fallbackRequestFormatNote, setFallbackRequestFormatNote] = useState("");
    const [confirmedEditionLanguageCode, setConfirmedEditionLanguageCode] = useState("");
    const [manualAddMode, setManualAddMode] = useState<ManualEditionMode | null>(null);
    const [manualTitle, setManualTitle] = useState("");
    const [manualAuthor, setManualAuthor] = useState("");
    const [manualEditionFormat, setManualEditionFormat] = useState("");
    const [manualEditionNote, setManualEditionNote] = useState("");
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
    const [addToCatalogOnly, setAddToCatalogOnly] = useState(false);
    const [addToTeachingBooks, setAddToTeachingBooks] = useState(opensTeachingBooksDestination);
    const [addToMyLibrary, setAddToMyLibrary] = useState(
        destination === "my-library" || (!opensTeachingBooksDestination && destination !== "student")
    );
    const [addToStudentLibrary, setAddToStudentLibrary] = useState(
        destination === "student" && !!targetUserIdParam
    );
    const [selectedTeacherStudentId, setSelectedTeacherStudentId] = useState(targetUserIdParam);
    const canChooseTeacherDestinations =
        !addBookContext.includes("student-lesson-book") &&
        (currentUserRole === "teacher" ||
            currentUserRole === "admin" ||
            currentUserRole === "super_teacher" ||
            currentUserIsSuperTeacher);
    const canUseCatalogOnly =
        currentUserRole === "admin" ||
        currentUserRole === "super_teacher" ||
        currentUserIsSuperTeacher;
    const [lookupLoading, setLookupLoading] = useState(false);
    const [asinLookupLoading, setAsinLookupLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestingBookId, setRequestingBookId] = useState<string | null>(null);
    const [bookSearch, setBookSearch] = useState("");
    const [bookSearchAuthor, setBookSearchAuthor] = useState("");
    const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult[]>([]);
    const [bookSearchLoading, setBookSearchLoading] = useState(false);
    const [lastBookSearchQuery, setLastBookSearchQuery] = useState("");
    const [bookSearchHadNoResults, setBookSearchHadNoResults] = useState(false);
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
    const [successfulActionSignature, setSuccessfulActionSignature] = useState("");
    const [existingDestinationStatus, setExistingDestinationStatus] = useState<
        Record<string, Partial<Record<AddBookDestinationKey, boolean>>>
    >({});

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
        if (!canUseCatalogOnly && addToCatalogOnly) {
            setAddToCatalogOnly(false);
        }
    }, [addToCatalogOnly, canUseCatalogOnly]);

    useEffect(() => {
        let alive = true;

        async function loadTeacherStudents() {
            if (!canChooseTeacherDestinations || !currentUserId) {
                setTeacherStudents([]);
                return;
            }

            setTeacherStudentLoading(true);

            try {
                if (
                    currentUserRole !== "teacher" &&
                    currentUserRole !== "admin" &&
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
    }, [canChooseTeacherDestinations, currentUserId, currentUserIsSuperTeacher, currentUserRole]);

    const selectedTeacherStudent = teacherStudents.find(
        (student) => student.id === selectedTeacherStudentId
    );
    const selectedTeacherStudentName =
        selectedTeacherStudent?.display_name ||
        selectedTeacherStudent?.username ||
        targetDisplayName ||
        "this student";
    const teacherDestinationSummary = [
        addToCatalogOnly ? "MEKURU Catalog" : null,
        addToTeachingBooks ? "My Teaching Books" : null,
        addToMyLibrary ? "My Library" : null,
        addToStudentLibrary ? `${selectedTeacherStudentName}'s Library` : null,
    ].filter(Boolean);
    const isTeacherStudentDestination = canChooseTeacherDestinations && addToStudentLibrary;
    const targetLibraryUserId = isTeacherStudentDestination
        ? selectedTeacherStudentId
        : targetUserIdParam || currentUserId;
    const isStudentDestination =
        destination === "student" && !!targetUserIdParam && targetUserIdParam !== currentUserId;
    const isOtherUserDestination =
        !isStudentDestination && !!targetUserIdParam && targetUserIdParam !== currentUserId;
    const targetLibraryLabel = canChooseTeacherDestinations
        ? teacherDestinationSummary.length > 0
            ? teacherDestinationSummary.join(", ")
            : "the selected destinations"
        : isStudentDestination
        ? `${targetDisplayName ?? "this student"}’s library`
        : isOtherUserDestination
        ? `${targetDisplayName ?? "this user"}’s library`
        : "your library";
    const targetLibraryShortLabel = canChooseTeacherDestinations
        ? teacherDestinationSummary.length > 0
            ? teacherDestinationSummary.join(", ")
            : "the selected destinations"
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
    const teacherGlobalBackLink =
        sourceParam === "site-upkeep"
            ? { href: "/teacher/general-upkeep", label: "← Back to Site Upkeep" }
            : sourceParam === "teacher-books"
            ? { href: "/teacher/books", label: "← Back to Teaching Books" }
            : sourceParam === "teacher-library"
            ? { href: "/teacher/library", label: "← Back to Teaching Books" }
            : { href: "/teacher/books", label: "← Back to Teaching Books" };
    const pageBackLink = isTeacherGlobalContext
        ? teacherGlobalBackLink
        : { href: "/library", label: "← Back to Library" };
    function studentLessonBookPayload() {
        if (!isStudentLessonBookContext) return {};
        return {
            context: "student-lesson-book",
            studentId: targetUserIdParam,
        };
    }

    function handleCatalogOnlyChange(checked: boolean) {
        setAddToCatalogOnly(checked);
        if (checked) {
            setAddToTeachingBooks(false);
            setAddToMyLibrary(false);
            setAddToStudentLibrary(false);
        }
    }

    function handleRelationshipDestinationChange(
        setter: (checked: boolean) => void,
        checked: boolean
    ) {
        setter(checked);
        if (checked) {
            setAddToCatalogOnly(false);
        }
    }

    function selectedDestinationKeys(): AddBookDestinationKey[] {
        if (canChooseTeacherDestinations) {
            if (addToCatalogOnly) return ["catalog"];
            return [
                addToTeachingBooks ? "teaching" : null,
                addToMyLibrary ? "my" : null,
                addToStudentLibrary ? "student" : null,
            ].filter(Boolean) as AddBookDestinationKey[];
        }

        if (isStudentDestination || isOtherUserDestination) return ["student"];
        return ["my"];
    }

    function destinationLabel(key: AddBookDestinationKey) {
        if (key === "catalog") return "MEKURU Catalog";
        if (key === "teaching") return "My Teaching Books";
        if (key === "my") return "My Library";
        return `${selectedTeacherStudentName}'s Library`;
    }

    function actionSignature(actionKey: string) {
        return [
            actionKey,
            selectedDestinationKeys().join("+"),
            addToStudentLibrary ? selectedTeacherStudentId : "",
        ].join("|");
    }

    function satisfiedDestinationLabels(actionKey: string) {
        const status = existingDestinationStatus[actionKey] ?? {};
        return selectedDestinationKeys()
            .filter((key) => status[key])
            .map(destinationLabel);
    }

    function selectedDestinationsSatisfied(actionKey: string) {
        const keys = selectedDestinationKeys();
        if (keys.length === 0) return false;
        const status = existingDestinationStatus[actionKey] ?? {};
        return keys.every((key) => status[key]);
    }

    function mergedStatusFromAdd(data: any) {
        return {
            catalog: data?.addedToCatalogOnly === true || data?.globalOnly === true,
            teaching: data?.addedToTeachingBooks === true,
            my: data?.addedToMyLibrary === true,
            student: data?.addedToStudentLibrary === true,
        };
    }

    function markActionSatisfied(actionKey: string, data: any) {
        const nextStatus = mergedStatusFromAdd(data);
        setExistingDestinationStatus((current) => ({
            ...current,
            [actionKey]: {
                ...(current[actionKey] ?? {}),
                ...nextStatus,
            },
        }));
        setSuccessfulActionSignature(actionSignature(actionKey));
    }

    function addButtonState(actionKey: string, baseLabel = finalAddLabel()) {
        if (successfulActionSignature && successfulActionSignature === actionSignature(actionKey)) {
            return { label: "✓ Book Added", disabled: true };
        }

        if (selectedDestinationsSatisfied(actionKey)) {
            return { label: "✓ Already Added", disabled: true };
        }

        if (satisfiedDestinationLabels(actionKey).length > 0) {
            return { label: "Add to Selected Places", disabled: false };
        }

        return { label: baseLabel, disabled: false };
    }

    function addModePayload() {
        if (canChooseTeacherDestinations) {
            if (addToCatalogOnly) {
                return {
                    mode: "add_to_library",
                    destinations: {
                        catalogOnly: true,
                        teachingBooks: false,
                        myLibrary: false,
                        studentLibrary: false,
                    },
                };
            }

            return {
                mode: "add_to_library",
                targetUserId: addToStudentLibrary ? selectedTeacherStudentId : currentUserId,
                destinations: {
                    catalogOnly: false,
                    teachingBooks: addToTeachingBooks,
                    myLibrary: addToMyLibrary,
                    studentLibrary: addToStudentLibrary,
                },
            };
        }

        if (!isTeacherGlobalContext) {
            return {
                mode: "add_to_library",
                targetUserId: targetLibraryUserId,
                ...studentLessonBookPayload(),
            };
        }

        return {
            mode: "add_to_library",
            targetUserId: targetLibraryUserId,
        };
    }

    function validateDestinationReady(setMessage: (message: string) => void) {
        if (canChooseTeacherDestinations && !addToCatalogOnly && !addToTeachingBooks && !addToMyLibrary && !addToStudentLibrary) {
            setMessage("Choose at least one place to add this book.");
            return false;
        }

        if (canChooseTeacherDestinations && addToCatalogOnly && !canUseCatalogOnly) {
            setMessage("Only super teachers and admins can add to the MEKURU Catalog only.");
            return false;
        }

        if (canChooseTeacherDestinations && addToStudentLibrary && !selectedTeacherStudentId) {
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
        if (canChooseTeacherDestinations) {
            if (addToCatalogOnly) return "Add to MEKURU Catalog";
            return "Add Book";
        }
        if (!isTeacherGlobalContext) {
            return isStudentDestination
                ? "Add to Student Library"
                : isOtherUserDestination
                ? "Add to User Library"
                : "Add to My Library";
        }

        return "Add Book";
    }

    function resetManualAdd() {
        setManualAddMode(null);
        setManualTitle("");
        setManualAuthor("");
        setManualEditionFormat("");
        setManualEditionNote("");
        setManualLanguageCode("");
        setManualPageCount("");
        setManualAddError("");
        setManualPossibleMatches([]);
    }

    function openManualAdd(
        mode: ManualEditionMode,
        seed?: { title?: string; author?: string; format?: string; editionNote?: string }
    ) {
        setManualAddMode(mode);
        setManualTitle(seed?.title ?? "");
        setManualAuthor(seed?.author ?? "");
        setManualEditionFormat(seed?.format ?? "");
        setManualEditionNote(seed?.format === "other" ? seed?.editionNote ?? "" : "");
        setManualLanguageCode("");
        setManualPageCount("");
        setManualAddError("");
        setManualPossibleMatches([]);
    }

    function handleSuccessfulAdd(data: any, actionKey: string) {
        markActionSatisfied(actionKey, data);

        if (isStudentLessonBookContext) {
            const notice = data?.alreadyInLibrary
                ? "lesson-book-existing"
                : "lesson-book-added";
            router.push(`${studentWorkspaceHref}?notice=${notice}`);
            return;
        }

        if (canChooseTeacherDestinations || isTeacherGlobalContext) {
            const addedDestinations = [
                data?.addedToCatalogOnly || data?.globalOnly ? "MEKURU Catalog" : null,
                data?.addedToTeachingBooks ? "My Teaching Books" : null,
                data?.addedToMyLibrary ? "My Library" : null,
                data?.addedToStudentLibrary ? `${selectedTeacherStudentName}'s Library` : null,
            ].filter(Boolean);
            setLibraryNotice({
                message: `Added to ${addedDestinations.length > 0 ? addedDestinations.join(", ") : targetLibraryLabel}`,
                detail: data?.addedToStudentLibrary
                    ? "No Active Lesson Book relationship was created."
                    : undefined,
                userBookId: data.userBookId ?? data.teacherUserBookId ?? data.studentUserBookId,
                bookId: data.bookId,
                returnLabel: teacherGlobalBackLink.label.replace(/^←\s*/, ""),
                returnHref: teacherGlobalBackLink.href,
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
                    editionNote: fallbackRequestFormatNote,
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
                    editionNote: fallbackRequestFormatNote,
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
                    editionNote: fallbackRequestFormatNote,
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
                    "id, title, author, cover_url, book_type, isbn13, asin, publisher, published_date, page_count, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at, language_code, edition_format, edition_note"
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
                editionNote:
                    (asinEditionFormat || fallbackRequestFormat) === "other"
                        ? asinEditionFormat === "other"
                            ? asinEditionNote
                            : fallbackRequestFormatNote
                        : "",
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
        setLastBookSearchQuery("");
        setBookSearchHadNoResults(false);
        setConfirmedEditionLanguageCode("");
        resetManualAdd();
        setBookSearchError("");
        setError("");

        if (!query) {
            setBookSearchError("Enter a title to search.");
            return;
        }

        setLastBookSearchQuery(query);
        setBookSearchLoading(true);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch(
                `/api/books/search?q=${encodeURIComponent(query)}&preserveEditions=1`,
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
                setBookSearchHadNoResults(true);
                openManualAdd("manual", {
                    title: query,
                    author: bookSearchAuthor,
                    format: fallbackRequestFormat,
                    editionNote: fallbackRequestFormatNote,
                });
            }
        } catch (searchError) {
            console.error("Book title/author search failed:", searchError);
            setBookSearchError("Something went wrong while searching books.");
        } finally {
            setBookSearchLoading(false);
        }
    }

    async function handleAddToLibrary(actionKey: string) {
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

            if (!canChooseTeacherDestinations && !isTeacherGlobalContext && !data.userBookId) {
                console.error("Add book response had no userBookId:", data);
                setError("The book was added, but Mekuru could not open the Book Hub.");
                return;
            }

            handleSuccessfulAdd(data, actionKey);
        } catch (addError) {
            console.error("Add book failed:", addError);
            setError(`Something went wrong while adding this book to ${targetLibraryShortLabel}.`);
        } finally {
            setAddLoading(false);
        }
    }

    async function handleAddExistingBook(bookId: string, actionKey = `book:${bookId}`) {
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

            handleSuccessfulAdd(data, actionKey);
        } catch (addError) {
            console.error("Add existing book failed:", addError);
            setBookSearchError(`Something went wrong while adding this book to ${targetLibraryShortLabel}.`);
        } finally {
            setAddingExistingBookId(null);
        }
    }

    async function handleManualAdd(actionKey: string, confirmDifferentEdition = false) {
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
                    editionNote: manualEditionFormat === "other" ? manualEditionNote : null,
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

            if (!canChooseTeacherDestinations && !isTeacherGlobalContext) {
                resetManualAdd();
            }
            handleSuccessfulAdd(data, actionKey);
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

    useEffect(() => {
        if (!currentUserId) return;

        const pairs = new Map<string, string>();
        for (const result of bookSearchResults) {
            pairs.set(`book:${result.id}`, result.id);
        }
        for (const result of manualPossibleMatches) {
            pairs.set(`book:${result.id}`, result.id);
        }
        if (book?.existing_book_id) {
            pairs.set(`book:${book.existing_book_id}`, book.existing_book_id);
        }

        if (pairs.size === 0) return;

        let alive = true;

        async function loadStatuses() {
            const nextStatuses: Record<string, Partial<Record<AddBookDestinationKey, boolean>>> = {};

            for (const [actionKey, bookId] of pairs) {
                const status: Partial<Record<AddBookDestinationKey, boolean>> = {
                    catalog: true,
                };

                try {
                    const { data: myBook } = await supabase
                        .from("user_books")
                        .select("id")
                        .eq("user_id", currentUserId)
                        .eq("book_id", bookId)
                        .maybeSingle();
                    status.my = Boolean(myBook?.id);

                    if (canChooseTeacherDestinations) {
                        const { data: teacherBook } = await supabase
                            .from("teacher_books")
                            .select("id")
                            .eq("teacher_id", currentUserId)
                            .eq("book_id", bookId)
                            .maybeSingle();
                        status.teaching = Boolean(teacherBook?.id);
                    }

                    if (selectedTeacherStudentId) {
                        const { data: studentBook } = await supabase
                            .from("user_books")
                            .select("id")
                            .eq("user_id", selectedTeacherStudentId)
                            .eq("book_id", bookId)
                            .maybeSingle();
                        status.student = Boolean(studentBook?.id);
                    }
                } catch (statusError) {
                    console.warn("Could not load Add Book destination status:", statusError);
                }

                nextStatuses[actionKey] = status;
            }

            if (!alive) return;
            setExistingDestinationStatus((current) => ({
                ...current,
                ...nextStatuses,
            }));
        }

        void loadStatuses();

        return () => {
            alive = false;
        };
    }, [
        book?.existing_book_id,
        bookSearchResults,
        canChooseTeacherDestinations,
        currentUserId,
        manualPossibleMatches,
        selectedTeacherStudentId,
    ]);

    const pageEyebrow = isTeacherGlobalContext
        ? "Teaching Books"
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
    const isbnActionKey = book?.existing_book_id
        ? `book:${book.existing_book_id}`
        : book?.isbn13
        ? `isbn:${book.isbn13}`
        : "isbn-preview";
    const manualActionKey = manualAddMode
        ? `manual:${manualAddMode}:${manualTitle.trim()}:${manualAuthor.trim()}:${manualEditionFormat}:${manualLanguageCode}:${manualPageCount}`
        : "manual";
    const isbnButtonState = addButtonState(isbnActionKey);
    const manualButtonState = addButtonState(manualActionKey);
    const manualSatisfiedLabels = satisfiedDestinationLabels(manualActionKey);

    return (
        <main className="mx-auto max-w-4xl px-4 py-8">
            <Link
                href={pageBackLink.href}
                className="mb-3 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
                {pageBackLink.label}
            </Link>

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
                                        setBookSearchHadNoResults(false);
                                        setLastBookSearchQuery("");
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
                                        setBookSearchHadNoResults(false);
                                        setLastBookSearchQuery("");
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
                                        if (event.target.value !== "other") {
                                            setFallbackRequestFormatNote("");
                                        }
                                        setBookSearchError("");
                                        setBookSearchHadNoResults(false);
                                        setLastBookSearchQuery("");
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
                            {fallbackRequestFormat === "other" ? (
                                <label className="mt-3 block">
                                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                                        Other format note
                                    </span>
                                    <input
                                        value={fallbackRequestFormatNote}
                                        onChange={(event) => {
                                            setFallbackRequestFormatNote(event.target.value);
                                            setBookSearchError("");
                                            setBookSearchHadNoResults(false);
                                            setLastBookSearchQuery("");
                                        }}
                                        placeholder="Short note, e.g. large print, magazine, special edition"
                                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                    />
                                </label>
                            ) : null}
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
                                    onChange={(event) => {
                                        setAsinEditionFormat(event.target.value);
                                        if (event.target.value !== "other") {
                                            setAsinEditionNote("");
                                        }
                                    }}
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
                            {asinEditionFormat === "other" ? (
                                <label className="mt-3 block">
                                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                                        Other format note
                                    </span>
                                    <input
                                        value={asinEditionNote}
                                        onChange={(event) => setAsinEditionNote(event.target.value)}
                                        placeholder="Short note, e.g. large print, magazine, special edition"
                                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                                    />
                                </label>
                            ) : null}
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
                                    editionNote: fallbackRequestFormatNote,
                                })
                            }
                            className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
                        >
                            Can't find it?
                        </button>
                    ) : null}
                </div>

                {canChooseTeacherDestinations && hasEditionToActOn ? (
                    <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                            Add this edition to
                        </p>
                        <AddBookTeacherDestinationOptions
                            canUseCatalogOnly={canUseCatalogOnly}
                            addToCatalogOnly={addToCatalogOnly}
                            addToTeachingBooks={addToTeachingBooks}
                            addToMyLibrary={addToMyLibrary}
                            addToStudentLibrary={addToStudentLibrary}
                            onCatalogOnlyChange={handleCatalogOnlyChange}
                            onTeachingBooksChange={(checked) =>
                                handleRelationshipDestinationChange(setAddToTeachingBooks, checked)
                            }
                            onMyLibraryChange={(checked) =>
                                handleRelationshipDestinationChange(setAddToMyLibrary, checked)
                            }
                            onStudentLibraryChange={(checked) =>
                                handleRelationshipDestinationChange(setAddToStudentLibrary, checked)
                            }
                        />
                        {addToStudentLibrary && !addToCatalogOnly ? (
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
                                    onChange={(event) => setSelectedTeacherStudentId(event.target.value)}
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
                            disabled={
                                isbnButtonState.disabled ||
                                (needsEditionLanguageConfirmation && !selectedEditionLanguageCode)
                            }
                            addLabel={isbnButtonState.label}
                            onAdd={() => void handleAddToLibrary(isbnActionKey)}
                            onCancel={() => router.push(targetLibraryHref)}
                        />
                        {satisfiedDestinationLabels(isbnActionKey).length > 0 ? (
                            <div className="mt-3 space-y-1 text-xs font-bold text-emerald-800">
                                {satisfiedDestinationLabels(isbnActionKey).map((label) => (
                                    <p key={label}>✓ Already in {label}</p>
                                ))}
                            </div>
                        ) : null}
                    </LookupBookPreviewCard>
                ) : null}

                {bookSearchHadNoResults ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                            Search complete
                        </p>
                        <h3 className="mt-1 text-base font-black text-stone-950">
                            No MEKURU catalog match for “{lastBookSearchQuery}”
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                            The manual details form is ready below with your search filled in.
                        </p>
                    </div>
                ) : null}

                {manualAddMode ? (
                    <ManualEditionForm
                        mode={manualAddMode}
                        identifierLabel={manualIdentifierLabel}
                        title={manualTitle}
                        author={manualAuthor}
                        editionFormat={manualEditionFormat}
                        editionNote={manualEditionNote}
                        languageCode={manualLanguageCode}
                        pageCount={manualPageCount}
                        error={manualAddError}
                        loading={manualAddLoading}
                        addLabel={manualButtonState.label}
                        addDisabled={manualButtonState.disabled}
                        candidates={manualPossibleMatches.map((result) => ({
                            result,
                            missingFields: missingGlobalBookFields(result),
                            adding: addingExistingBookId === result.id,
                            addLabel: addButtonState(`book:${result.id}`).label,
                            disabled: addButtonState(`book:${result.id}`).disabled,
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
                            if (value !== "other") {
                                setManualEditionNote("");
                            }
                            setManualAddError("");
                            setManualPossibleMatches([]);
                        }}
                        onEditionNoteChange={(value) => {
                            setManualEditionNote(value);
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
                        onSubmit={() => void handleManualAdd(manualActionKey, false)}
                        onSubmitDifferentEdition={() => void handleManualAdd(manualActionKey, true)}
                        onCancel={resetManualAdd}
                        onUseExistingEdition={(bookId) => void handleAddExistingBook(bookId, `book:${bookId}`)}
                        onCheckDetails={(result) => void handleRequestBookDetails(result)}
                    />
                ) : null}

                {manualAddMode && manualSatisfiedLabels.length > 0 ? (
                    <div className="mt-3 space-y-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                        {manualSatisfiedLabels.map((label) => (
                            <p key={label}>✓ Already in {label}</p>
                        ))}
                    </div>
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
                            const resultActionKey = `book:${result.id}`;
                            const resultButtonState = addButtonState(resultActionKey);
                            const resultSatisfiedLabels = satisfiedDestinationLabels(resultActionKey);

                            return (
                                <div key={result.id}>
                                    <AddBookCatalogResult
                                        result={result}
                                        missingFields={missingFields}
                                        adding={addingExistingBookId === result.id}
                                        requestLoading={requestLoading && requestingBookId === result.id}
                                        addLabel={resultButtonState.label}
                                        disabled={resultButtonState.disabled}
                                        onAdd={() => void handleAddExistingBook(result.id, resultActionKey)}
                                        onRequestReview={() => void handleRequestBookDetails(result)}
                                    />
                                    {resultSatisfiedLabels.length > 0 ? (
                                        <div className="mt-2 space-y-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                                            {resultSatisfiedLabels.map((label) => (
                                                <p key={label}>✓ Already in {label}</p>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
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
