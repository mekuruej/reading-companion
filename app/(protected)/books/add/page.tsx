"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    const [lookupLoading, setLookupLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLookup() {
        setError("");
        setBook(null);
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
                setError(data.error ?? "I couldn’t find that book.");
                return;
            }

            const lookedUpBook = data.book;

            if (!lookedUpBook || typeof lookedUpBook !== "object") {
                console.error("Lookup response had no usable book object:", data);
                setError("The lookup worked, but no book data came back.");
                return;
            }

            if (!lookedUpBook.title) {
                console.error("Lookup response had a book object, but no title:", data);
                setError("The lookup worked, but the book data was missing a title.");
                return;
            }

            setBook(lookedUpBook);
        } catch (lookupError) {
            console.error("Book lookup failed:", lookupError);
            setError("Something went wrong while looking up this book.");
        } finally {
            setLookupLoading(false);
        }
    }

    async function handleAddToLibrary() {
        if (!book?.isbn13) return;

        setError("");
        setAddLoading(true);

        try {
            const response = await fetch("/api/books/add-by-isbn", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    isbn13: book.isbn13,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Add book route returned an error:", data);
                setError(data.error ?? "I couldn’t add this book to your library.");
                return;
            }

            if (!data.userBookId) {
                console.error("Add book response had no userBookId:", data);
                setError("The book was added, but Mekuru could not open the Book Hub.");
                return;
            }

            router.push(`/books/${data.userBookId}`);
        } catch (addError) {
            console.error("Add book failed:", addError);
            setError("Something went wrong while adding this book to your library.");
        } finally {
            setAddLoading(false);
        }
    }

    const coverUrl = book ? getCoverUrl(book) : null;
    const displayAuthor = book ? getDisplayAuthor(book) : "";
    const publishedDate = book ? getPublishedDate(book) : null;
    const pageCount = book ? getPageCount(book) : null;

    return (
        <main className="mx-auto max-w-3xl px-4 py-8">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                    Add a book
                </p>

                <h1 className="mt-2 text-3xl font-black text-stone-900">
                    Add a book by ISBN
                </h1>

                <p className="mt-3 text-sm leading-6 text-stone-700">
                    Enter the ISBN-13 from your book. Mekuru will look up the book details
                    first, then you can confirm before adding it to your library.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <input
                        value={isbn}
                        onChange={(event) => setIsbn(event.target.value)}
                        placeholder="9784094071733"
                        className="min-h-12 flex-1 rounded-2xl border border-amber-200 bg-white px-4 text-base text-stone-900 shadow-sm outline-none focus:border-amber-400"
                    />

                    <button
                        type="button"
                        onClick={handleLookup}
                        disabled={lookupLoading || !isbn.trim()}
                        className="min-h-12 rounded-2xl bg-stone-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {lookupLoading ? "Looking..." : "Look up book"}
                    </button>
                </div>

                {error ? (
                    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                    </p>
                ) : null}
            </div>

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

                            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                                Some imported book details may need review later, especially
                                authors, editors, translators, or short story collections.
                            </p>

                            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleAddToLibrary}
                                    disabled={addLoading}
                                    className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {addLoading ? "Adding..." : "Add to My Library"}
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
