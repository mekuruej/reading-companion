// Library Book Action Index
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BookInfo = {
    title: string | null;
    cover_url: string | null;
};

type LibraryBookRow = {
    id: string;
    status: string | null;
    started_at: string | null;
    finished_at: string | null;
    dnf_at: string | null;
    created_at: string | null;
    books: BookInfo | BookInfo[] | null;
};

type SavedWordCountRow = {
    user_book_id: string | null;
};

type LibraryBookActionIndexProps = {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
    actionDescription?: string;
    backHref?: string;
    backLabel?: string;
    emptyText?: string;
    accent?: "stone" | "rose" | "emerald" | "sky" | "violet" | "amber" | "indigo";
    requireSavedWords?: boolean;
    hrefForBook: (userBookId: string) => string;
};

function getBook(row: LibraryBookRow): BookInfo | null {
    if (!row.books) return null;
    if (Array.isArray(row.books)) return row.books[0] ?? null;
    return row.books;
}

function getBookTitle(row: LibraryBookRow) {
    return getBook(row)?.title?.trim() || "Untitled Book";
}

function getBookCover(row: LibraryBookRow) {
    return getBook(row)?.cover_url || null;
}

function isFinished(row: LibraryBookRow) {
    return row.status === "finished" || !!row.finished_at;
}

function isCurrentlyReading(row: LibraryBookRow) {
    return row.status === "reading" && !isFinished(row);
}

function themeClasses(
    accent: NonNullable<LibraryBookActionIndexProps["accent"]>
) {
    const themes = {
        stone: {
            shell: "border-stone-200 bg-white",
            badge: "bg-stone-100 text-stone-700",
            card: "border-stone-200 bg-white",
            action: "text-stone-500",
        },
        rose: {
            shell: "border-rose-200 bg-rose-50/35",
            badge: "bg-rose-100 text-rose-700",
            card: "border-rose-100 bg-white",
            action: "text-rose-600",
        },
        emerald: {
            shell: "border-emerald-200 bg-emerald-50/35",
            badge: "bg-emerald-100 text-emerald-700",
            card: "border-emerald-100 bg-white",
            action: "text-emerald-600",
        },
        sky: {
            shell: "border-sky-200 bg-sky-50/35",
            badge: "bg-sky-100 text-sky-700",
            card: "border-sky-100 bg-white",
            action: "text-sky-600",
        },
        violet: {
            shell: "border-violet-200 bg-violet-50/35",
            badge: "bg-violet-100 text-violet-700",
            card: "border-violet-100 bg-white",
            action: "text-violet-600",
        },
        amber: {
            shell: "border-amber-200 bg-amber-50/35",
            badge: "bg-amber-100 text-amber-700",
            card: "border-amber-100 bg-white",
            action: "text-amber-600",
        },
        indigo: {
            shell: "border-indigo-200 bg-indigo-50/35",
            badge: "bg-indigo-100 text-indigo-700",
            card: "border-indigo-100 bg-white",
            action: "text-indigo-600",
        },
    };

    return themes[accent];
}

function BookSection({
    title,
    books,
    emptyText,
    actionLabel,
    hrefForBook,
    cardClass,
    actionClass,
}: {
    title: string;
    books: LibraryBookRow[];
    emptyText: string;
    actionLabel: string;
    hrefForBook: (userBookId: string) => string;
    cardClass: string;
    actionClass: string;
}) {
    return (
        <section className="mt-7">
            <h2 className="mb-3 text-base font-black text-slate-950">{title}</h2>

            {books.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                    {emptyText}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {books.map((row) => {
                        const bookTitle = getBookTitle(row);
                        const coverUrl = getBookCover(row);

                        return (
                            <Link
                                key={row.id}
                                href={hrefForBook(row.id)}
                                className={`group overflow-hidden rounded-3xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardClass}`}
                            >
                                <div className="flex gap-3">
                                    <div className="h-28 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                                        {coverUrl ? (
                                            <img
                                                src={coverUrl}
                                                alt={`${bookTitle} cover`}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-slate-400">
                                                No cover
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                            {actionLabel}
                                        </div>

                                        <h3 className="mt-2 line-clamp-3 text-s font-semibold leading-snug text-slate-950">
                                            {bookTitle}
                                        </h3>

                                        <div
                                            className={`mt-3 text-xs font-semibold ${actionClass}`}
                                        >
                                            Open →
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function LibraryBookActionIndex({
    eyebrow,
    title,
    description,
    actionLabel,
    actionDescription,
    backHref = "/users/me/books",
    backLabel = "Back to Library",
    emptyText = "No books in this section yet.",
    accent = "stone",
    requireSavedWords = false,
    hrefForBook,
}: LibraryBookActionIndexProps) {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [rows, setRows] = useState<LibraryBookRow[]>([]);
    const [search, setSearch] = useState("");

    const theme = themeClasses(accent);

    useEffect(() => {
        let isMounted = true;

        async function loadBooks() {
            setLoading(true);
            setErrorMsg("");

            try {
                const {
                    data: { user },
                    error: authError,
                } = await supabase.auth.getUser();

                if (authError) throw authError;

                if (!user) {
                    if (!isMounted) return;
                    setRows([]);
                    setErrorMsg("Please sign in to view your library.");
                    return;
                }

                const { data, error } = await supabase
                    .from("user_books")
                    .select(
                        `
              id,
              status,
              started_at,
              finished_at,
              dnf_at,
              created_at,
              books:book_id (
                title,
                cover_url
              )
            `
                    )
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                if (!isMounted) return;

                let nextRows = (data ?? []) as LibraryBookRow[];

                if (requireSavedWords && nextRows.length > 0) {
                    const userBookIds = nextRows.map((row) => row.id);
                    const { data: wordRows, error: wordError } = await supabase
                        .from("user_book_words")
                        .select("user_book_id")
                        .in("user_book_id", userBookIds);

                    if (wordError) throw wordError;

                    const userBookIdsWithWords = new Set(
                        ((wordRows ?? []) as SavedWordCountRow[])
                            .map((row) => row.user_book_id)
                            .filter((id): id is string => Boolean(id))
                    );

                    nextRows = nextRows.filter((row) => userBookIdsWithWords.has(row.id));
                }

                setRows(nextRows);
            } catch (error: any) {
                console.error("Error loading library book action index:", {
                    message: error?.message,
                    details: error?.details,
                    hint: error?.hint,
                    code: error?.code,
                    raw: error,
                });

                if (!isMounted) return;

                setRows([]);
                setErrorMsg(error?.message ?? "Could not load your books.");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        void loadBooks();

        return () => {
            isMounted = false;
        };
    }, [requireSavedWords]);

    const filteredRows = useMemo(() => {
        const cleanSearch = search.trim().toLowerCase();

        return [...rows]
            .filter((row) => {
                if (!cleanSearch) return true;
                return getBookTitle(row).toLowerCase().includes(cleanSearch);
            })
            .sort((a, b) => getBookTitle(a).localeCompare(getBookTitle(b), "ja"));
    }, [rows, search]);

    const currentlyReading = useMemo(
        () => filteredRows.filter((row) => isCurrentlyReading(row)),
        [filteredRows]
    );

    const finished = useMemo(
        () => filteredRows.filter((row) => isFinished(row)),
        [filteredRows]
    );

    const otherBooks = useMemo(
        () =>
            filteredRows.filter(
                (row) => !isCurrentlyReading(row) && !isFinished(row)
            ),
        [filteredRows]
    );

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-5 sm:py-8">
                <div className="mx-auto max-w-6xl text-sm text-slate-600">
                    Loading books…
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-5 sm:py-8">
            <div className="mx-auto max-w-6xl">
                <Link
                    href={backHref}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                >
                    ← {backLabel}
                </Link>

                <div className={`mt-4 rounded-2xl border p-3 shadow-sm sm:p-4 ${theme.shell}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
                                {eyebrow}
                            </p>

                            <h1 className="mt-1 text-xl font-black text-slate-950 sm:text-3xl">
                                {title}
                            </h1>

                            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                                {description}
                            </p>

                            {actionDescription ? (
                                <div
                                    className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${theme.badge}`}
                                >
                                    {actionDescription}
                                </div>
                            ) : null}
                        </div>

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search books…"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400 sm:max-w-xs"
                        />
                    </div>
                </div>

                {errorMsg ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {errorMsg}
                    </div>
                ) : null}

                <BookSection
                    title="Currently Reading"
                    books={currentlyReading}
                    emptyText={emptyText}
                    actionLabel={actionLabel}
                    hrefForBook={hrefForBook}
                    cardClass={theme.card}
                    actionClass={theme.action}
                />

                <BookSection
                    title="Finished"
                    books={finished}
                    emptyText={emptyText}
                    actionLabel={actionLabel}
                    hrefForBook={hrefForBook}
                    cardClass={theme.card}
                    actionClass={theme.action}
                />

                <BookSection
                    title="Other Books"
                    books={otherBooks}
                    emptyText={emptyText}
                    actionLabel={actionLabel}
                    hrefForBook={hrefForBook}
                    cardClass={theme.card}
                    actionClass={theme.action}
                />
            </div>
        </main>
    );
}
