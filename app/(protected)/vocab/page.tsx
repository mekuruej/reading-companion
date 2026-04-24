//Global Serach helper page
// 

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type VocabBookRow = {
  id: string;
  status: string | null;
  finished_at: string | null;
  created_at: string;
  books:
  | {
    title: string | null;
    cover_url: string | null;
  }
  | {
    title: string | null;
    cover_url: string | null;
  }[]
  | null;
};

function getBookTitle(
  books:
    | { title: string | null; cover_url: string | null }
    | { title: string | null; cover_url: string | null }[]
    | null
) {
  if (!books) return "Untitled Book";
  if (Array.isArray(books)) return books[0]?.title || "Untitled Book";
  return books.title || "Untitled Book";
}

function getBookCover(
  books:
    | { title: string | null; cover_url: string | null }
    | { title: string | null; cover_url: string | null }[]
    | null
) {
  if (!books) return null;
  if (Array.isArray(books)) return books[0]?.cover_url ?? null;
  return books.cover_url ?? null;
}

function matchesSearch(
  book: VocabBookRow,
  search: string
) {
  const title = getBookTitle(book.books).toLowerCase();
  return title.includes(search.trim().toLowerCase());
}

export default function AllVocabListsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [books, setBooks] = useState<VocabBookRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          setErrorMsg("You need to sign in to view your vocab lists.");
          setBooks([]);
          return;
        }

        const { data, error } = await supabase
          .from("user_books")
          .select(`
            id,
            status,
            finished_at,
            created_at,
            books:book_id (
              title,
              cover_url
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        setBooks((data as VocabBookRow[]) ?? []);
      } catch (e: any) {
        console.error("Failed to load vocab lists:", e);
        setErrorMsg(e?.message ?? "Failed to load vocab lists.");
        setBooks([]);
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
  }, []);

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      const aTitle = getBookTitle(a.books);
      const bTitle = getBookTitle(b.books);
      return aTitle.localeCompare(bTitle, "ja");
    });
  }, [books]);

  const currentlyReading = useMemo(
    () =>
      sortedBooks.filter(
        (book) => book.status === "reading" && matchesSearch(book, search)
      ),
    [sortedBooks, search]
  );

  const finishedBooks = useMemo(
    () =>
      sortedBooks.filter(
        (book) =>
          book.status !== "reading" &&
          !!book.finished_at &&
          matchesSearch(book, search)
      ),
    [sortedBooks, search]
  );

  const otherBooks = useMemo(
    () =>
      sortedBooks.filter(
        (book) =>
          book.status !== "reading" &&
          !book.finished_at &&
          matchesSearch(book, search)
      ),
    [sortedBooks, search]
  );

  function renderBookGrid(items: VocabBookRow[]) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-stone-500">
          {search.trim() ? "No matching books found." : "No books in this section yet."}
        </p>
      );
    }

    if (items.length === 0) {
      return <p className="text-sm text-stone-500">No books in this section yet.</p>;
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((book) => {
          const title = getBookTitle(book.books);
          const cover = getBookCover(book.books);

          return (
            <Link
              key={book.id}
              href={`/books/${encodeURIComponent(book.id)}/words`}
              className="rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-stone-50"
            >
              <div className="flex items-start gap-3">
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-stone-100 text-xs text-stone-400">
                    No cover
                  </div>
                )}

                <div className="min-w-0">
                  <div className="font-medium text-stone-900">{title}</div>

                  {book.status ? (
                    <div className="mt-1 text-xs text-stone-500">
                      {book.status === "reading"
                        ? "Currently Reading"
                        : book.finished_at
                          ? "Finished"
                          : book.status}
                    </div>
                  ) : book.finished_at ? (
                    <div className="mt-1 text-xs text-stone-500">Finished</div>
                  ) : null}

                  <div className="mt-3 text-sm text-stone-600">
                    Open Vocab List
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 pb-10 pt-30">
        <p className="text-lg text-stone-500">Loading vocab lists…</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 pb-10 pt-30">
        <h1 className="text-2xl font-semibold">All Vocab Lists</h1>
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pb-10 pt-15">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-xl">
          📝
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            All Vocab Lists
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Open any book’s saved word list and review the words you’ve collected.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search book titles..."
          className="w-full max-w-md rounded-xl border bg-white px-3 py-2 text-sm"
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Currently Reading</h2>
        {renderBookGrid(currentlyReading)}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Finished</h2>
        {renderBookGrid(finishedBooks)}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Other Books</h2>
        {renderBookGrid(otherBooks)}
      </section>
    </main>
  );
}