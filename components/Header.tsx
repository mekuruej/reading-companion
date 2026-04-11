// components/Header.tsx
// App header

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type HeaderBook = {
  id: string;
  status: string | null;
  created_at: string;
  finished_at: string | null;
  books:
  | {
    title: string | null;
  }
  | {
    title: string | null;
  }[]
  | null;
};

function getBookTitle(
  books: { title: string | null } | { title: string | null }[] | null
) {
  if (!books) return null;
  if (Array.isArray(books)) return books[0]?.title ?? null;
  return books.title ?? null;
}

export default function Header() {
  const [showVocabMenu, setShowVocabMenu] = useState(false);
  const [books, setBooks] = useState<HeaderBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setShowVocabMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUsername(null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        setUsername(data?.username ?? null);
      } catch (error) {
        console.error("Failed to load profile:", error);
        setUsername(null);
      }
    }

    loadProfile();
  }, []);

  useEffect(() => {
    async function loadBooks() {
      setLoadingBooks(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setBooks([]);
          return;
        }

        const { data, error } = await supabase
          .from("user_books")
          .select(`
            id,
            status,
            created_at,
            finished_at,
            books:book_id (
              title
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        const loadedBooks = ((data as HeaderBook[]) ?? []).sort((a, b) => {
          const aIsReading = a.status === "reading" ? 0 : 1;
          const bIsReading = b.status === "reading" ? 0 : 1;

          if (aIsReading !== bIsReading) {
            return aIsReading - bIsReading;
          }

          const aTitle = getBookTitle(a.books) ?? "";
          const bTitle = getBookTitle(b.books) ?? "";

          return aTitle.localeCompare(bTitle, "ja");
        });

        setBooks(loadedBooks);
      } catch (error) {
        console.error("Failed to load header books:", error);
        setBooks([]);
      } finally {
        setLoadingBooks(false);
      }
    }

    loadBooks();
  }, []);

  const readingBooks = books.filter((book) => book.status === "reading");
  const finishedBooks = books.filter((book) => book.status === "finished");
  const dnfBooks = books.filter((book) => book.status === "did_not_finish");

  const quickReadingBooks = readingBooks;
  const remainingSlots = Math.max(0, 8 - quickReadingBooks.length);
  const quickFinishedBooks = finishedBooks.slice(0, remainingSlots);
  const quickDnfBooks = dnfBooks.slice(0, Math.max(0, 8 - quickReadingBooks.length - quickFinishedBooks.length));

  const hasReadingBooks = quickReadingBooks.length > 0;
  const hasFinishedBooks = quickFinishedBooks.length > 0;
  const hasDnfBooks = quickDnfBooks.length > 0;

  const libraryHref = username ? `/users/${username}/books` : "/books";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div className="text-center md:text-left">
            <Link
              href={libraryHref}
              className="block text-lg font-semibold tracking-tight text-stone-900 sm:text-2xl md:text-4xl"
            >
              MEKURU (Beta)
            </Link>
            <div className="mt-0 text-xs text-stone-500">
              ページをめくって、話しまくろう
            </div>
          </div>

          <nav className="mt-2 flex flex-col items-center gap-1 text-xs sm:text-sm md:flex-row md:justify-end md:gap-3 md:mt-1">
            {/* Row 1 — Books */}
            <div className="flex w-full items-center justify-center gap-4 md:w-auto md:justify-end">
              <Link
                href={libraryHref}
                className="text-base font-semibold text-stone-900 transition hover:text-black md:text-xl"
              >
                Library
              </Link>

              <Link
                href="/book-hubs"
                className="text-stone-700 transition hover:text-stone-900"
              >
                Book Hubs
              </Link>
            </div>

            {/* Row 2 — Words */}
            <div className="flex w-full items-center justify-center gap-4 md:w-auto md:justify-end">
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowVocabMenu((prev) => !prev)}
                  className="text-stone-700 transition hover:text-stone-900"
                >
                  Vocab Lists
                </button>

                {showVocabMenu ? (
                  <div className="absolute left-1/2 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:left-auto md:right-0 md:w-72 md:translate-x-0">
                    <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                      Jump to Vocab List
                    </div>

                    {loadingBooks ? (
                      <div className="px-2 py-2 text-sm text-stone-500">
                        Loading books...
                      </div>
                    ) : books.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-stone-500">
                        No books yet.
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {hasReadingBooks ? (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-400">
                              Currently Reading
                            </div>

                            {quickReadingBooks.map((book) => {
                              const title = getBookTitle(book.books);

                              return (
                                <Link
                                  key={book.id}
                                  href={`/books/${encodeURIComponent(book.id)}/words`}
                                  className="block rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                  onClick={() => setShowVocabMenu(false)}
                                >
                                  <div className="font-medium text-stone-900">
                                    {title || "Untitled Book"}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}

                        {hasFinishedBooks ? (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-400">
                              Recently Finished
                            </div>

                            {quickFinishedBooks.map((book) => {
                              const title = getBookTitle(book.books);

                              return (
                                <Link
                                  key={book.id}
                                  href={`/books/${encodeURIComponent(book.id)}/words`}
                                  className="block rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                  onClick={() => setShowVocabMenu(false)}
                                >
                                  <div className="font-medium text-stone-900">
                                    {title || "Untitled Book"}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}

                        {hasDnfBooks ? (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-400">
                              DNF
                            </div>

                            {quickDnfBooks.map((book) => {
                              const title = getBookTitle(book.books);

                              return (
                                <Link
                                  key={book.id}
                                  href={`/books/${encodeURIComponent(book.id)}/words`}
                                  className="block rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                  onClick={() => setShowVocabMenu(false)}
                                >
                                  <div className="font-medium text-stone-900">
                                    {title || "Untitled Book"}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}

                        <div className="mt-1 border-t border-stone-200 pt-2">
                          <Link
                            href="/vocab"
                            className="block rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                            onClick={() => setShowVocabMenu(false)}
                          >
                            All Vocab Lists
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <Link
                href="/vocab/history"
                className="text-stone-700 transition hover:text-stone-900"
              >
                Word History
              </Link>

              <button
                type="button"
                onClick={() =>
                  alert(
                    "Full study mode is coming soon. For now, open a book from your Library to study."
                  )
                }
                className="text-stone-700 transition hover:text-stone-900"
              >
                Daily Study
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}