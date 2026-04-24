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
  const [showBookHubMenu, setShowBookHubMenu] = useState(false);
  const [books, setBooks] = useState<HeaderBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const bookHubMenuRef = useRef<HTMLDivElement | null>(null);
  const vocabMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (bookHubMenuRef.current && !bookHubMenuRef.current.contains(target)) {
        setShowBookHubMenu(false);
      }

      if (vocabMenuRef.current && !vocabMenuRef.current.contains(target)) {
        setShowVocabMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHeaderData() {
      setLoadingBooks(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setUsername(null);
          setBooks([]);
          return;
        }

        const [{ data: profile, error: profileError }, { data, error }] = await Promise.all([
          supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
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
            .eq("user_id", user.id),
        ]);

        if (cancelled) return;

        if (profileError) throw profileError;
        setUsername(profile?.username ?? null);

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
        if (!cancelled) {
          console.error("Failed to load header data:", error);
          setUsername(null);
          setBooks([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingBooks(false);
        }
      }
    }

    loadHeaderData();

    return () => {
      cancelled = true;
    };
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
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <Link
              href={libraryHref}
              className="block text-m font-semibold tracking-tight text-stone-900 sm:text-2xl md:text-4xl"
            >
              MEKURU <span className="align-middle text-xs font-semibold text-red-600 md:text-sm">(Beta)</span>
            </Link>
            <div className="mt-0 text-xs text-stone-500">
              ページをめくって、話しまくろう！
            </div>
            <div className="mt-1 text-xs text-stone-500">
              Every word carries the memory of where you met it.
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

              <>
                <Link
                  href="/book-hubs"
                  className="text-stone-700 transition hover:text-stone-900 md:hidden"
                >
                  Book Hubs
                </Link>

                <div className="relative hidden md:block" ref={bookHubMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookHubMenu((prev) => !prev);
                      setShowVocabMenu(false);
                    }}
                    className="text-stone-700 transition hover:text-stone-900"
                  >
                    Book Hubs
                  </button>

                  {showBookHubMenu ? (
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                      <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                        Book Hubs
                      </div>

                      {loadingBooks ? (
                        <div className="px-2 py-2 text-sm text-stone-500">
                          Loading...
                        </div>
                      ) : hasReadingBooks ? (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs text-stone-400">
                            Currently Reading
                          </div>

                          {quickReadingBooks.slice(0, 5).map((book) => {
                            const title = getBookTitle(book.books);

                            return (
                              <Link
                                key={book.id}
                                href={`/books/${encodeURIComponent(book.id)}`}
                                className="block rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                onClick={() => setShowBookHubMenu(false)}
                              >
                                {title || "Untitled Book"}
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-2 py-2 text-sm text-stone-500">
                          No active books
                        </div>
                      )}

                      <div className="border-t border-stone-200 pt-2">
                        <Link
                          href="/book-hubs"
                          className="block rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          onClick={() => setShowBookHubMenu(false)}
                        >
                          All Book Hubs
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            </div>

            {/* Row 2 — Words */}
            <div className="flex w-full items-center justify-center gap-4 md:w-auto md:justify-end">
              <>
                {/* Mobile / tablet: simple link */}
                <Link
                  href="/vocab"
                  className="text-stone-700 transition hover:text-stone-900 md:hidden"
                >
                  Vocab Lists
                </Link>

                {/* Desktop: dropdown */}
                <div className="relative hidden md:block" ref={vocabMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVocabMenu((prev) => !prev);
                      setShowBookHubMenu(false);
                    }}
                    className="text-stone-700 transition hover:text-stone-900"
                  >
                    Vocab Lists
                  </button>

                  {showVocabMenu ? (
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                      <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                        Vocab Lists
                      </div>

                      {loadingBooks ? (
                        <div className="px-2 py-2 text-sm text-stone-500">
                          Loading...
                        </div>
                      ) : hasReadingBooks ? (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs text-stone-400">
                            Currently Reading
                          </div>

                          {quickReadingBooks.slice(0, 5).map((book) => {
                            const title = getBookTitle(book.books);

                            return (
                              <Link
                                key={book.id}
                                href={`/books/${encodeURIComponent(book.id)}/words`}
                                className="block rounded-xl px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                onClick={() => setShowVocabMenu(false)}
                              >
                                {title || "Untitled Book"}
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-2 py-2 text-sm text-stone-500">
                          No active books
                        </div>
                      )}

                      <div className="border-t border-stone-200 pt-2">
                        <Link
                          href="/vocab"
                          className="block rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          onClick={() => setShowVocabMenu(false)}
                        >
                          All Vocab Lists
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>

              <Link
                href="/vocab/history"
                className="text-stone-700 transition hover:text-stone-900"
              >
                Word History
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
