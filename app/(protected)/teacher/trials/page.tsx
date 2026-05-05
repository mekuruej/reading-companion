// Teacher Trial Prep
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TrialPrepBook = {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string | null;
  books:
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
        page_count: number | null;
        book_type: string | null;
      }
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
        page_count: number | null;
        book_type: string | null;
      }[]
    | null;
};

const workflowCards = [
  {
    title: "Key Words",
    description:
      "Prepare words that are likely to matter during the trial and compare them with what learners actually know.",
  },
  {
    title: "Kanji Readings",
    description:
      "Connect trial texts to the global Teacher Kanji Queue so readings can be prepped before lessons.",
  },
  {
    title: "Teacher Notes",
    description:
      "Keep notes about confusing lines, cultural references, grammar questions, and things to check later.",
  },
  {
    title: "Learner Unknown Data",
    description:
      "Track what each learner did not know so you can gradually see which texts fit which levels.",
  },
];

function getBook(bookRow: TrialPrepBook["books"]) {
  if (Array.isArray(bookRow)) return bookRow[0] ?? null;
  return bookRow ?? null;
}

function formatBookType(value: string | null | undefined) {
  if (!value) return "Trial text";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function TeacherTrialsPage() {
  const [loading, setLoading] = useState(true);
  const [trialBooks, setTrialBooks] = useState<TrialPrepBook[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadTrialBooks() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setTrialBooks([]);
        setError("Please sign in.");
        return;
      }

      const { data, error: trialBooksError } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          book_id,
          created_at,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            page_count,
            book_type
          )
        `
        )
        .eq("user_id", user.id)
        .eq("is_teacher_prep", true)
        .eq("teacher_prep_kind", "trial")
        .order("created_at", { ascending: false });

      if (trialBooksError) throw trialBooksError;

      setTrialBooks((data ?? []) as TrialPrepBook[]);
    } catch (err: any) {
      console.error("Error loading trial prep books:", err);
      setError(err?.message ?? "Could not load trial prep books.");
      setTrialBooks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrialBooks();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Teacher Prep
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
              Trial Prep
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Build a small, reusable shelf of trial reading options. Each trial text can
              eventually hold key words, kanji readings, teacher notes, and learner unknown-word
              data so you can choose the right level more confidently.
            </p>
          </div>

          <Link
            href="/teacher"
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            ← Teacher Home
          </Link>
        </div>
      </section>

      {error ? (
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Trial shelf</p>
          <p className="mt-1 text-2xl font-black text-stone-900">
            {loading ? "…" : trialBooks.length}
          </p>
          <p className="mt-1 text-xs text-stone-500">Prepared trial texts.</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700">Main purpose</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">Level fit</p>
          <p className="mt-1 text-xs text-emerald-700">Find the learner’s best reading zone.</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700">Prep focus</p>
          <p className="mt-1 text-2xl font-black text-amber-900">Support</p>
          <p className="mt-1 text-xs text-amber-700">Words, kanji, notes, and questions.</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Future data</p>
          <p className="mt-1 text-2xl font-black text-stone-900">Unknowns</p>
          <p className="mt-1 text-xs text-stone-500">What learners actually did not know.</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-stone-900">Trial Reading Shelf</h2>
            <p className="mt-1 text-sm text-stone-500">
              Your prepared trial books live here instead of in the main Library.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-400"
          >
            Add trial text later
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
            Loading trial prep books…
          </div>
        ) : trialBooks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <p className="text-lg font-black text-stone-900">No trial prep books yet.</p>
            <p className="mt-2 text-sm text-stone-500">
              Trial prep books you add will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trialBooks.map((row) => {
              const book = getBook(row.books);

              return (
                <article
                  key={row.id}
                  className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex gap-4">
                    <Link href={`/books/${row.id}`} className="shrink-0">
                      {book?.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={`${book.title ?? "Book"} cover`}
                          className="h-36 w-24 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="flex h-36 w-24 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-400">
                          No cover
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                        {formatBookType(book?.book_type)}
                      </p>

                      <h3 className="mt-2 text-xl font-black leading-tight text-stone-900">
                        {book?.title ?? "Untitled"}
                      </h3>

                      {book?.author ? (
                        <p className="mt-1 text-sm text-stone-500">{book.author}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Trial prep
                        </span>

                        {book?.page_count ? (
                          <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600">
                            {book.page_count} pages
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/books/${row.id}`}
                      className="rounded-2xl border border-stone-900 bg-stone-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-black"
                    >
                      Open Prep Hub
                    </Link>

                    <Link
                      href="/teacher/kanji"
                      className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      Kanji Queue
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">What each trial prep can hold</h2>
          <p className="mt-1 text-sm text-stone-500">
            These are placeholders for the future workflow.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflowCards.map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-black text-stone-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">Trial History</h2>
          <p className="mt-1 text-sm text-stone-500">
            A future log of learners who took trial readings, what text they used,
            and what the trial revealed about their level.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-0 divide-y divide-stone-100 md:grid-cols-[1.1fr_1.3fr_0.8fr_1fr_1.4fr] md:divide-y-0">
            <div className="bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Learner
            </div>
            <div className="bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Trial text
            </div>
            <div className="bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Level fit
            </div>
            <div className="bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Result
            </div>
            <div className="bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Notes
            </div>
          </div>

          <div className="border-t border-stone-100 p-5">
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
              <p className="text-sm font-semibold text-stone-700">
                No trial history yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                Later, this can track who took each trial, what they struggled with,
                what words they did not know, and which reading path you recommended next.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}