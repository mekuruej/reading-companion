// Teacher Words Queue
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type WordFlag = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  flag_note: string | null;
  flagged_at: string | null;
  bookTitle: string;
  coverUrl: string | null;
};

export default function TeacherWordsQueuePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [words, setWords] = useState<WordFlag[]>([]);
  const [resolvingWordId, setResolvingWordId] = useState<string | null>(null);

  useEffect(() => {
    void loadWords();
  }, []);

  async function loadWords() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setMessage("Please sign in.");
        setWords([]);
        return;
      }

      const { data: teacherLinks } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id);

      const studentIds = Array.from(
        new Set([
          user.id,
          ...((teacherLinks ?? [])
            .map((row: any) => row.student_id)
            .filter(Boolean) as string[]),
        ])
      );

      const { data: userBooks, error: userBooksError } = await supabase
        .from("user_books")
        .select("id, books:book_id(title, cover_url)")
        .in("user_id", studentIds);

      if (userBooksError) throw userBooksError;

      const userBookIds = (userBooks ?? []).map((book: any) => book.id).filter(Boolean);
      const bookByUserBookId = new Map<string, { title: string; coverUrl: string | null }>();

      for (const row of userBooks ?? []) {
        const book = Array.isArray((row as any).books)
          ? (row as any).books[0]
          : (row as any).books;
        bookByUserBookId.set((row as any).id, {
          title: book?.title ?? "Untitled Book",
          coverUrl: book?.cover_url ?? null,
        });
      }

      if (userBookIds.length === 0) {
        setWords([]);
        return;
      }

      const { data: flaggedWords, error: wordsError } = await supabase
        .from("user_book_words")
        .select("id, user_book_id, surface, reading, meaning, flag_note, flagged_at")
        .in("user_book_id", userBookIds)
        .eq("flagged_for_review", true)
        .order("flagged_at", { ascending: false });

      if (wordsError) throw wordsError;

      setWords(
        ((flaggedWords ?? []) as any[]).map((word) => {
          const book = bookByUserBookId.get(word.user_book_id);
          return {
            id: word.id,
            user_book_id: word.user_book_id,
            surface: word.surface ?? "",
            reading: word.reading ?? null,
            meaning: word.meaning ?? null,
            flag_note: word.flag_note ?? null,
            flagged_at: word.flagged_at ?? null,
            bookTitle: book?.title ?? "Untitled Book",
            coverUrl: book?.coverUrl ?? null,
          };
        })
      );
    } catch (error: any) {
      setMessage(error?.message ?? "Could not load word flags.");
      setWords([]);
    } finally {
      setLoading(false);
    }
  }

  async function resolveWordFlag(wordId: string) {
    const ok = window.confirm("Mark this word flag as resolved?");
    if (!ok) return;

    setResolvingWordId(wordId);
    setMessage("");

    const { error } = await supabase
      .from("user_book_words")
      .update({
        flagged_for_review: false,
      })
      .eq("id", wordId);

    setResolvingWordId(null);

    if (error) {
      console.error("Error resolving word flag:", error);
      setMessage(error.message || "Could not resolve this word flag.");
      return;
    }

    setWords((prev) => prev.filter((word) => word.id !== wordId));
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        ← Teacher Home
      </Link>

      <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Vocabulary review
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900">
          Words Needing My Attention
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Words flagged from study or vocabulary work. This is the first version of the
          vocabulary-cache problem queue.
        </p>
      </section>

      {message ? <p className="mt-4 text-sm text-amber-700">{message}</p> : null}

      <section className="mt-6 space-y-3">
        {loading ? <p className="text-sm text-stone-500">Loading word flags...</p> : null}

        {!loading && words.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
            No words are flagged right now.
          </div>
        ) : null}

        {words.map((word) => (
          <div key={word.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              {word.coverUrl ? (
                <img src={word.coverUrl} alt="" className="h-24 w-16 rounded-xl object-cover" />
              ) : (
                <div className="h-24 w-16 rounded-xl bg-stone-100" />
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black text-stone-900">{word.surface || "Untitled word"}</h2>
                {word.reading ? <p className="mt-1 text-sm text-stone-500">{word.reading}</p> : null}
                {word.meaning ? <p className="mt-1 text-sm text-stone-700">{word.meaning}</p> : null}
                <p className="mt-2 text-sm font-semibold text-stone-700">{word.bookTitle}</p>
                {word.flag_note ? <p className="mt-1 text-sm text-amber-700">{word.flag_note}</p> : null}
                <p className="mt-2 text-xs text-stone-400">
                  {word.flagged_at ? new Date(word.flagged_at).toLocaleString() : "Flagged for review"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/books/${word.user_book_id}`}
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Open Book Hub
                  </Link>

                  <Link
                    href={`/books/${word.user_book_id}/words`}
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Open Vocab List
                  </Link>

                  <button
                    type="button"
                    onClick={() => resolveWordFlag(word.id)}
                    disabled={resolvingWordId === word.id}
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {resolvingWordId === word.id ? "Resolving..." : "Mark Resolved"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
