// Teacher Library
//
// Teacher-use working view. Each Teacher Book links to a teacher-owned
// user_books row for personal library/study history, while prep content stays
// in teacher_book_items.

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTeacherBackLink } from "../components/teacherBackLink";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
  isbn13: string | null;
};

type TeacherUseStatus =
  | "want_to_test"
  | "testing"
  | "currently_using"
  | "approved_for_lesson"
  | "use_with_caution"
  | "do_not_use";

type TeacherBookRow = {
  id: string;
  teacher_id: string;
  book_id: string;
  user_book_id: string | null;
  teacher_use_status: TeacherUseStatus | null;
  teacher_use_note: string | null;
  created_at: string | null;
  books: BookMeta | BookMeta[] | null;
};

function isTeacherRole(profile: any) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function firstBook(book: TeacherBookRow["books"]) {
  if (Array.isArray(book)) return book[0] ?? null;
  return book ?? null;
}

const teacherUseStatusLabels: Record<TeacherUseStatus, string> = {
  want_to_test: "Want to Test",
  testing: "Testing",
  currently_using: "Currently Using",
  approved_for_lesson: "Approved for Lesson",
  use_with_caution: "Use with Caution",
  do_not_use: "Do Not Use",
};

function teacherUseStatusLabel(status: TeacherUseStatus | null | undefined) {
  return teacherUseStatusLabels[status ?? "want_to_test"];
}

function teacherUseStatusBadgeClass(status: TeacherUseStatus | null | undefined) {
  switch (status ?? "want_to_test") {
    case "approved_for_lesson":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "currently_using":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "testing":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "use_with_caution":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "do_not_use":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

function bookTypeLabel(value: string | null | undefined) {
  if (!value) return "Book";
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function TeacherLibraryPage() {
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));

  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherBooks, setTeacherBooks] = useState<TeacherBookRow[]>([]);
  const [bookSearch, setBookSearch] = useState("");
  const [searchResults, setSearchResults] = useState<BookMeta[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);

  useEffect(() => {
    void loadTeacherLibrary();
  }, []);

  async function loadTeacherLibrary() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setCanAccess(false);
        setTeacherId(null);
        setTeacherBooks([]);
        setMessage("Please sign in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!isTeacherRole(profile)) {
        setCanAccess(false);
        setTeacherId(user.id);
        setTeacherBooks([]);
        setMessage("Teacher access is required.");
        return;
      }

      setCanAccess(true);
      setTeacherId(user.id);

      const { data, error } = await supabase
        .from("teacher_books")
        .select(
          `
          id,
          teacher_id,
          book_id,
          user_book_id,
          teacher_use_status,
          teacher_use_note,
          created_at,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type,
            isbn13
          )
        `
        )
        .eq("teacher_id", user.id)
        .or("teacher_use_status.is.null,teacher_use_status.neq.do_not_use")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeacherBooks((data ?? []) as TeacherBookRow[]);
    } catch (error: any) {
      console.error("Error loading teacher library:", error);
      setMessage(error?.message ?? "Could not load Teacher Library.");
      setTeacherBooks([]);
    } finally {
      setLoading(false);
    }
  }

  async function searchBooks() {
    const query = bookSearch.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setMessage("");

    try {
      const escaped = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, cover_url, book_type, isbn13")
        .or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%,isbn13.ilike.%${escaped}%`)
        .order("title", { ascending: true })
        .limit(12);

      if (error) throw error;
      setSearchResults((data ?? []) as BookMeta[]);
    } catch (error: any) {
      console.error("Error searching books for teacher library:", error);
      setMessage(error?.message ?? "Could not search books.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addBookToTeacherLibrary(bookId: string) {
    if (!teacherId) return;

    setAddingBookId(bookId);
    setMessage("");

    try {
      const { data: existingUserBook, error: existingUserBookError } = await supabase
        .from("user_books")
        .select("id")
        .eq("user_id", teacherId)
        .eq("book_id", bookId)
        .limit(1)
        .maybeSingle();

      if (existingUserBookError) throw existingUserBookError;

      let linkedUserBookId = existingUserBook?.id ?? null;

      if (!linkedUserBookId) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: insertedUserBook, error: insertUserBookError } = await supabase
          .from("user_books")
          .insert({
            user_id: teacherId,
            book_id: bookId,
            started_at: today,
          })
          .select("id")
          .single();

        if (insertUserBookError) throw insertUserBookError;
        linkedUserBookId = insertedUserBook.id;
      }

      const { error } = await supabase
        .from("teacher_books")
        .upsert(
          {
            teacher_id: teacherId,
            book_id: bookId,
            user_book_id: linkedUserBookId,
            teacher_use_status: "want_to_test",
          },
          { onConflict: "teacher_id,book_id" }
        );

      if (error) throw error;
      setMessage("Book marked for teaching. It remains in My Library for your reader history.");
      setBookSearch("");
      setSearchResults([]);
      await loadTeacherLibrary();
    } catch (error: any) {
      console.error("Error adding teacher library book:", error);
      setMessage(error?.message ?? "Could not add this book to Teacher Library.");
    } finally {
      setAddingBookId(null);
    }
  }

  const teacherBookIds = useMemo(
    () => new Set(teacherBooks.map((row) => row.book_id)),
    [teacherBooks]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        {backLink.label}
      </Link>

      <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Teacher Books
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900">
          Teacher Books
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Mark books from My Library for teaching. Progress, saved words, and reader history stay in My Library; teaching prep stays in the Teacher Workspace.
        </p>
      </section>

      {message ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          Loading Teacher Library...
        </section>
      ) : !canAccess ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Teacher access is required.
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-stone-900">Use a book for teaching</h2>
            <p className="mt-1 text-sm text-stone-500">
              Search the shared catalog. If the book is not already in My Library, Mekuru adds it there first, then marks it for teacher use.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={bookSearch}
                onChange={(event) => setBookSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchBooks();
                }}
                placeholder="Search title, author, or ISBN"
                className="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={() => void searchBooks()}
                disabled={searching}
                className="rounded-2xl border border-stone-900 bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {searchResults.map((book) => {
                  const alreadyAdded = teacherBookIds.has(book.id);
                  return (
                    <div
                      key={book.id}
                      className="flex gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3"
                    >
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt=""
                          className="h-20 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-20 w-14 rounded-lg bg-stone-200" />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          {bookTypeLabel(book.book_type)}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-stone-900">
                          {book.title ?? "Untitled book"}
                        </h3>
                        {book.author ? (
                          <p className="mt-1 text-sm text-stone-500">{book.author}</p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => void addBookToTeacherLibrary(book.id)}
                        disabled={alreadyAdded || addingBookId === book.id}
                        className="self-center rounded-2xl border border-stone-900 bg-white px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {alreadyAdded
                          ? "Marked for Teaching"
                          : addingBookId === book.id
                            ? "Adding..."
                            : "Use for Teaching"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="mt-6">
            <div className="mb-3">
              <h2 className="text-xl font-black text-stone-900">Books Marked for Teaching</h2>
              <p className="mt-1 text-sm text-stone-500">
                Open a teaching workspace. These books also remain in My Library as your reader books.
              </p>
            </div>

            {teacherBooks.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
                No teaching books yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teacherBooks.map((row) => {
                  const book = firstBook(row.books);
                  return (
                    <Link
                      key={row.id}
                      href={`/teacher/library/${row.id}/book-workspace`}
                      className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex gap-3">
                        {book?.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt=""
                            className="h-28 w-20 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="h-28 w-20 rounded-xl bg-stone-200" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                            {bookTypeLabel(book?.book_type)}
                          </p>
                          <h3 className="mt-1 line-clamp-3 text-lg font-black text-stone-900">
                            {book?.title ?? "Untitled book"}
                          </h3>
                          {book?.author ? (
                            <p className="mt-1 line-clamp-2 text-sm text-stone-500">
                              {book.author}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${teacherUseStatusBadgeClass(
                                row.teacher_use_status
                              )}`}
                            >
                              {teacherUseStatusLabel(row.teacher_use_status)}
                            </span>
                          </div>
                          {row.teacher_use_note ? (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">
                              {row.teacher_use_note}
                            </p>
                          ) : null}
                          <p className="mt-3 text-sm font-semibold text-stone-700">
                            Open Workspace
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
