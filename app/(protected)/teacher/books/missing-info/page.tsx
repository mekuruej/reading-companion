// Teacher Missing Book Info Queue
//
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTeacherBackLink } from "../../components/teacherBackLink";
import {
  type GlobalBookRow,
  missingGlobalBookFields,
  requireSuperTeacher,
} from "../_shared/bookAttentionHelpers";

type MissingBookInfoItem = {
  book: GlobalBookRow;
  missing: string[];
};

export default function TeacherMissingBookInfoPage() {
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [clearingBookId, setClearingBookId] = useState<string | null>(null);
  const [items, setItems] = useState<MissingBookInfoItem[]>([]);

  useEffect(() => {
    void loadMissingBooks();
  }, []);

  async function loadMissingBooks() {
    setLoading(true);
    setMessage("");

    try {
      const access = await requireSuperTeacher();
      if (access.error || !access.user) {
        setMessage(access.error ?? "Super teacher access is required.");
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("books")
        .select(
          "id, title, isbn13, cover_url, book_type, author, publisher, published_date, page_count, allow_missing_isbn, allow_missing_publisher, missing_info_cleared_at"
        )
        .order("title", { ascending: true });

      if (error) throw error;

      setItems(
        ((data ?? []) as GlobalBookRow[])
          .map((book) => ({ book, missing: missingGlobalBookFields(book) }))
          .filter((item) => item.missing.length > 0)
      );
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load missing book information.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function clearMissingBookInfoAlert(bookId: string) {
    const confirmed = window.confirm(
      "Clear this missing-info alert? The book record will stay in Mekuru, but it will stop appearing in the missing information queue."
    );

    if (!confirmed) return;

    setClearingBookId(bookId);
    setMessage("");

    try {
      const access = await requireSuperTeacher();
      if (access.error || !access.user) {
        setMessage(access.error ?? "Please sign in again.");
        return;
      }

      const { error } = await supabase
        .from("books")
        .update({
          missing_info_cleared_at: new Date().toISOString(),
          missing_info_cleared_by: access.user.id,
        })
        .eq("id", bookId);

      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.book.id !== bookId));
      setMessage("Missing-info alert cleared.");
    } catch (error: any) {
      setMessage(error?.message ?? "Could not clear this missing-info alert.");
    } finally {
      setClearingBookId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        {backLink.label}
      </Link>

      <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Missing Book Info
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900">
          {items.length} book attention item{items.length === 1 ? "" : "s"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Global book records missing core details such as author, cover, page count, or publication info.
        </p>
      </section>

      {message ? <p className="mt-4 text-sm text-amber-700">{message}</p> : null}
      {loading ? <p className="mt-6 text-sm text-stone-500">Loading missing book information...</p> : null}

      {!loading && items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          No global books are missing core information right now.
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {items.map(({ book, missing }) => (
          <div key={book.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              {book.cover_url ? (
                <img src={book.cover_url} alt="" className="h-24 w-16 rounded-xl object-cover" />
              ) : (
                <div className="h-24 w-16 rounded-xl bg-stone-100" />
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-stone-900">
                  {book.title ?? "Untitled global book"}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Missing book info: {missing.join(", ")}.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/books/add?bookId=${book.id}`}
                    className="inline-flex rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Open Global Book Entry
                  </Link>
                  <button
                    type="button"
                    onClick={() => void clearMissingBookInfoAlert(book.id)}
                    disabled={clearingBookId === book.id}
                    className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {clearingBookId === book.id ? "Clearing..." : "Clear alert"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
