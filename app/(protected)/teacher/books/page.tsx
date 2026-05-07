// Teacher Books Queue
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BookFlag = {
  id: string;
  user_book_id: string | null;
  message: string | null;
  created_at: string | null;
  bookTitle: string;
  coverUrl: string | null;
};

export default function TeacherBooksQueuePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [flags, setFlags] = useState<BookFlag[]>([]);

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
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const canAccess =
        profile?.role === "super_teacher" || !!profile?.is_super_teacher;

      if (!canAccess) {
        setMessage("Super teacher access is required for book attention flags.");
        setFlags([]);
        return;
      }

      const { data: alerts, error: alertsError } = await supabase
        .from("user_alerts")
        .select("id, user_book_id, message, created_at")
        .eq("user_id", user.id)
        .eq("type", "book_flag")
        .order("created_at", { ascending: false });

      if (alertsError) throw alertsError;

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

      setFlags(
        ((alerts ?? []) as any[]).map((alert) => {
          const book = alert.user_book_id
            ? bookByUserBookId.get(alert.user_book_id)
            : null;

          return {
            id: alert.id,
            user_book_id: alert.user_book_id,
            message: alert.message,
            created_at: alert.created_at,
            bookTitle: book?.title ?? "Book needing attention",
            coverUrl: book?.coverUrl ?? null,
          };
        })
      );
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load book flags.");
      setFlags([]);
    } finally {
      setLoading(false);
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
          Books marked for teacher review from the Book Hub.
        </p>
      </section>

      {message ? <p className="mt-4 text-sm text-amber-700">{message}</p> : null}

      <section className="mt-6 space-y-3">
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
                <p className="mt-1 text-sm text-stone-600">{flag.message ?? "Needs review."}</p>
                <p className="mt-2 text-xs text-stone-400">
                  {flag.created_at ? new Date(flag.created_at).toLocaleString() : ""}
                </p>

                {flag.user_book_id ? (
                  <Link
                    href={`/books/${flag.user_book_id}`}
                    className="mt-3 inline-flex rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Open Book Hub
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
