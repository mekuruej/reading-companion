"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BookKanjiRow = {
  id: string;
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

function matchesSearch(book: BookKanjiRow, search: string) {
  const title = getBookTitle(book.books).toLowerCase();
  return title.includes(search.trim().toLowerCase());
}

export default function BookKanjiReadingsIndexPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [books, setBooks] = useState<BookKanjiRow[]>([]);
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
          setErrorMsg("You need to sign in to view your book kanji readings.");
          setBooks([]);
          return;
        }

        const { data, error } = await supabase
          .from("user_books")
          .select(
            `
            id,
            books:book_id (
              title,
              cover_url
            )
          `
          )
          .eq("user_id", user.id);

        if (error) throw error;
        setBooks((data as BookKanjiRow[]) ?? []);
      } catch (e: any) {
        console.error("Failed to load book kanji readings:", e);
        setErrorMsg(e?.message ?? "Failed to load book kanji readings.");
        setBooks([]);
      } finally {
        setLoading(false);
      }
    }

    void loadBooks();
  }, []);

  const filteredBooks = useMemo(() => {
    return [...books]
      .sort((a, b) => getBookTitle(a.books).localeCompare(getBookTitle(b.books), "ja"))
      .filter((book) => matchesSearch(book, search));
  }, [books, search]);

  function renderGrid(items: BookKanjiRow[]) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-stone-500">
          {search.trim() ? "No matching books found." : "No books yet."}
        </p>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((book) => {
          const title = getBookTitle(book.books);
          const cover = getBookCover(book.books);

          return (
            <Link
              key={book.id}
              href={`/books/${encodeURIComponent(book.id)}/weekly-readings`}
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
                  <div className="mt-3 text-sm text-stone-600">Open Kanji Readings</div>
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
      <main className="mx-auto min-h-screen max-w-6xl px-6 pb-10 pt-15">
        <p className="text-lg text-stone-500">Loading kanji readings…</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 pb-10 pt-15">
        <h1 className="text-2xl font-semibold">Book Kanji Readings</h1>
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pb-10 pt-15">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-xl">
          漢
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Book Kanji Readings
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Open any book's kanji readings practice and study onyomi and kunyomi from that book.
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

      <section className="mt-8">{renderGrid(filteredBooks)}</section>
    </main>
  );
}
