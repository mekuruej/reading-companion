// Teacher Books Queue
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BookFlag = {
  id: string;
  type: "manual_flag" | "missing_book_info";
  user_book_id: string | null;
  book_id: string | null;
  message: string | null;
  created_at: string | null;
  bookTitle: string;
  coverUrl: string | null;
  href: string | null;
  actionLabel: string;
};

type GlobalBookRow = {
  id: string;
  title: string | null;
  isbn13: string | null;
  cover_url: string | null;
  book_type: string | null;
  author: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
};

type PendingBookRequest = {
  id: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  status: string | null;
  created_at: string | null;
  requestedBy: string;
};

function missingGlobalBookFields(book: GlobalBookRow) {
  const missing: string[] = [];
  if (!String(book.title ?? "").trim()) missing.push("title");
  if (!String(book.isbn13 ?? "").trim()) missing.push("ISBN-13");
  if (!String(book.cover_url ?? "").trim()) missing.push("cover");
  if (!String(book.book_type ?? "").trim()) missing.push("book type");
  if (!String(book.author ?? "").trim()) missing.push("author");
  if (!String(book.publisher ?? "").trim()) missing.push("publisher");
  if (!String(book.published_date ?? "").trim()) missing.push("published date");
  if (book.page_count == null) missing.push("page count");
  return missing;
}

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export default function TeacherBooksQueuePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [flags, setFlags] = useState<BookFlag[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingBookRequest[]>([]);

  useEffect(() => {
    void loadFlags();
  }, []);

  async function loadFlags() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setMessage("Please sign in.");
        setFlags([]);
        setPendingRequests([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const canAccess =
        profile?.role === "super_teacher" ||
        isSuperTeacherFlag(profile?.is_super_teacher);

      if (!canAccess) {
        setMessage("Super teacher access is required for book attention flags.");
        setFlags([]);
        setPendingRequests([]);
        return;
      }

      const { data: alerts, error: alertsError } = await supabase
        .from("user_alerts")
        .select("id, user_book_id, message, created_at")
        .eq("user_id", user.id)
        .eq("type", "book_flag")
        .order("created_at", { ascending: false });

      if (alertsError) throw alertsError;

      const nextFlags: BookFlag[] = [];
      const userBookIds = Array.from(
        new Set((alerts ?? []).map((alert: any) => alert.user_book_id).filter(Boolean))
      );

      const bookByUserBookId = new Map<string, { title: string; coverUrl: string | null }>();

      if (userBookIds.length > 0) {
        const { data: books, error: booksError } = await supabase
          .from("user_books")
          .select("id, books:book_id(title, cover_url)")
          .in("id", userBookIds);

        if (booksError) throw booksError;

        for (const row of books ?? []) {
          const book = Array.isArray((row as any).books)
            ? (row as any).books[0]
            : (row as any).books;
          bookByUserBookId.set((row as any).id, {
            title: book?.title ?? "Untitled Book",
            coverUrl: book?.cover_url ?? null,
          });
        }
      }

      for (const alert of (alerts ?? []) as any[]) {
        const book = alert.user_book_id
          ? bookByUserBookId.get(alert.user_book_id)
          : null;

        nextFlags.push({
          id: `manual:${alert.id}`,
          type: "manual_flag",
          user_book_id: alert.user_book_id,
          book_id: null,
          message: alert.message,
          created_at: alert.created_at,
          bookTitle: book?.title ?? "Book needing attention",
          coverUrl: book?.coverUrl ?? null,
          href: alert.user_book_id ? `/books/${alert.user_book_id}` : null,
          actionLabel: "Open Book Hub",
        });
      }

      const { data: globalBooks, error: globalBooksError } = await supabase
        .from("books")
        .select("id, title, isbn13, cover_url, book_type, author, publisher, published_date, page_count")
        .order("title", { ascending: true });

      if (globalBooksError) throw globalBooksError;

      for (const book of (globalBooks ?? []) as GlobalBookRow[]) {
        const missing = missingGlobalBookFields(book);
        if (missing.length === 0) continue;

        nextFlags.push({
          id: `missing-book-info:${book.id}`,
          type: "missing_book_info",
          user_book_id: null,
          book_id: book.id,
          message: `Missing book info: ${missing.join(", ")}.`,
          created_at: null,
          bookTitle: book.title ?? "Untitled global book",
          coverUrl: book.cover_url ?? null,
          href: `/teacher/books/add?bookId=${book.id}`,
          actionLabel: "Open Global Book Entry",
        });
      }

      const { data: requestRows, error: requestRowsError } = await supabase
        .from("book_requests")
        .select(`
          id,
          title,
          author,
          isbn13,
          status,
          created_at,
          profiles:user_id (
            display_name,
            username
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestRowsError) throw requestRowsError;

      const nextRequests = ((requestRows ?? []) as any[]).map((request) => {
        const profile = Array.isArray(request.profiles)
          ? request.profiles[0]
          : request.profiles;
        const requestedBy =
          profile?.display_name ||
          profile?.username ||
          "Unknown reader";

        return {
          id: request.id,
          title: request.title ?? null,
          author: request.author ?? null,
          isbn13: request.isbn13 ?? null,
          status: request.status ?? null,
          created_at: request.created_at ?? null,
          requestedBy,
        };
      });

      setFlags(nextFlags);
      setPendingRequests(nextRequests);
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load book flags.");
      setFlags([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function rejectBookRequest(requestId: string) {
    const confirmed = window.confirm(
      "Reject this book request? It will leave the pending list, but the request history will stay in Mekuru."
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("book_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      setMessage("Book request marked as rejected.");
      await loadFlags();
    } catch (error: any) {
      setMessage(error?.message ?? "Could not reject this book request.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        ← Teacher Home
      </Link>

      <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Book flags
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900">
          Books Needing My Attention
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Pending book requests are separate from global books missing core info.
        </p>
      </section>

      {message ? <p className="mt-4 text-sm text-amber-700">{message}</p> : null}

      <section className="mt-6 space-y-3">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Pending Book Requests
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-900">
                {pendingRequests.length} pending book request{pendingRequests.length === 1 ? "" : "s"}
              </h2>
            </div>
            <p className="text-sm text-stone-600">
              Failed ISBN lookups that need an admin to add book details.
            </p>
          </div>
        </div>

        {loading ? <p className="text-sm text-stone-500">Loading pending book requests...</p> : null}

        {!loading && pendingRequests.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
            No pending book requests right now.
          </div>
        ) : null}

        {pendingRequests.map((request) => {
          const displayTitle =
            String(request.title ?? "").trim() ||
            String(request.isbn13 ?? "").trim() ||
            "Untitled book request";

          return (
            <div key={request.id} className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-stone-900">{displayTitle}</h3>
                  <div className="mt-2 grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
                    <p>
                      <span className="font-semibold text-stone-800">Author:</span>{" "}
                      {request.author || "—"}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-800">ISBN:</span>{" "}
                      {request.isbn13 || "—"}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-800">Requested by:</span>{" "}
                      {request.requestedBy}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-800">Status:</span>{" "}
                      {request.status || "pending"}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-stone-400">
                    {request.created_at ? new Date(request.created_at).toLocaleString() : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/books/add?requestId=${request.id}`}
                    className="inline-flex rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Open Global Book Entry
                  </Link>
                  <button
                    type="button"
                    onClick={() => rejectBookRequest(request.id)}
                    className="inline-flex rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Reject Request
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 space-y-3">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Books Missing Information
          </p>
          <h2 className="mt-1 text-2xl font-black text-stone-900">
            {flags.length} book attention item{flags.length === 1 ? "" : "s"}
          </h2>
        </div>

        {loading ? <p className="text-sm text-stone-500">Loading book flags...</p> : null}

        {!loading && flags.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
            No books are flagged right now.
          </div>
        ) : null}

        {flags.map((flag) => (
          <div key={flag.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              {flag.coverUrl ? (
                <img src={flag.coverUrl} alt="" className="h-24 w-16 rounded-xl object-cover" />
              ) : (
                <div className="h-24 w-16 rounded-xl bg-stone-100" />
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-stone-900">{flag.bookTitle}</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  {flag.type === "manual_flag"
                    ? "Manual flag"
                    : "Missing book info"}
                </p>
                <p className="mt-1 text-sm text-stone-600">{flag.message ?? "Needs review."}</p>
                <p className="mt-2 text-xs text-stone-400">
                  {flag.created_at ? new Date(flag.created_at).toLocaleString() : ""}
                </p>

                {flag.href ? (
                  <Link
                    href={flag.href}
                    className="mt-3 inline-flex rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    {flag.actionLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
