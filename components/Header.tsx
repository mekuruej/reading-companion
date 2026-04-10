"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type HeaderBook = {
  id: string;
  status: string | null;
  created_at: string;
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
            books:book_id (
              title
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8);

        console.log("HEADER USER ID:", user.id);
        console.log("HEADER BOOKS RAW DATA:", data);
        console.log("HEADER BOOKS RAW ERROR:", error);

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

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-2.5">
        <div className="text-center md:text-left">
          <Link
            href="/books"
            className="text-base font-semibold tracking-tight text-stone-900 sm:text-lg md:text-3xl"
          >
            MEKURU (Beta)
          </Link>
        </div>

        <nav className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm md:justify-end">
          <Link
            href="/books"
            className="text-base font-semibold text-stone-900 transition hover:text-black md:text-lg"
          >
            Library
          </Link>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowVocabMenu((prev) => !prev)}
                className="text-stone-700 transition hover:text-stone-900"
              >
                Vocab Lists
              </button>

              {showVocabMenu ? (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                  <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                    Jump to a book
                  </div>

                  {loadingBooks ? (
                    <div className="px-2 py-2 text-sm text-stone-500">Loading books...</div>
                  ) : books.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-stone-500">
                      No books yet.
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {books.map((book) => {
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
                alert("Full study mode is coming soon. For now, open a book from your Library to study.")
              }
              className="text-stone-700 transition hover:text-stone-900"
            >
              Daily Study
            </button>
        </nav>

        <div className="mt-1 text-center text-xs text-stone-500 md:text-left">
          ページをめくって、話しまくろう
        </div>
      </div>
    </header>
  );
}