"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  isTeacherProfile,
  loadSharedTeacherVocabulary,
  loadTeacherBookContext,
  type SharedTeacherVocabularyWord,
  type TeacherBookContext,
} from "@/lib/teacher/teacherBookVocabulary";

type BookMeta = {
  title: string | null;
  author: string | null;
};

function OriginBadges({ word }: { word: SharedTeacherVocabularyWord }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {word.origins.includes("my_library") ? (
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
          My Library
        </span>
      ) : null}
      {word.origins.includes("teaching") ? (
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-800">
          Teaching
        </span>
      ) : null}
    </div>
  );
}

export default function TeacherFlashcardsPage() {
  const params = useParams<{ teacherBookId: string }>();
  const teacherBookId = params.teacherBookId ?? "";

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [context, setContext] = useState<TeacherBookContext | null>(null);
  const [book, setBook] = useState<BookMeta | null>(null);
  const [words, setWords] = useState<SharedTeacherVocabularyWord[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    void loadPage();
  }, [teacherBookId]);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setMessage("Please sign in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!isTeacherProfile(profile)) {
        setMessage("Teacher access is required.");
        return;
      }

      const nextContext = await loadTeacherBookContext(supabase, teacherBookId, user.id);
      setContext(nextContext);

      const { data: teacherBook, error: bookError } = await supabase
        .from("teacher_books")
        .select("books:book_id ( title, author )")
        .eq("id", teacherBookId)
        .maybeSingle();

      if (bookError) throw bookError;
      const maybeBook = (teacherBook as any)?.books;
      setBook(Array.isArray(maybeBook) ? maybeBook[0] ?? null : maybeBook ?? null);

      const sharedWords = await loadSharedTeacherVocabulary(supabase, nextContext, {
        view: "teaching",
      });
      setWords(sharedWords.filter((word) => word.surface.trim() && (word.reading || word.meaning)));
      setIndex(0);
      setRevealed(false);
    } catch (error: any) {
      console.error("Error loading Teacher Flashcards:", error);
      setMessage(error?.message ?? "Could not load Teacher Flashcards.");
    } finally {
      setLoading(false);
    }
  }

  const card = words[index] ?? null;
  const progressLabel = useMemo(() => {
    if (words.length === 0) return "0 / 0";
    return `${index + 1} / ${words.length}`;
  }, [index, words.length]);

  function move(delta: number) {
    if (words.length === 0) return;
    setIndex((current) => (current + delta + words.length) % words.length);
    setRevealed(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href={`/teacher/library/${encodeURIComponent(teacherBookId)}/book-workspace`} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          ← Back to Teacher Book Workspace
        </Link>

        <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Teacher Flashcards
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950">
            {book?.title ?? "Lesson Deck"}
          </h1>
          {book?.author ? <p className="mt-1 text-sm font-semibold text-stone-600">{book.author}</p> : null}
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Lesson display deck. It does not write personal SRS progress, skip dates, reading sessions, or student vocabulary.
          </p>
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {message}
          </div>
        ) : null}

        {loading ? (
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
            Loading Teacher Flashcards...
          </section>
        ) : !context || !card ? (
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
            No teaching-visible words are ready yet. Add words in Teacher Vocabulary or capture them from this book's contexts.
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-black text-stone-500">{progressLabel}</span>
              <OriginBadges word={card} />
            </div>

            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              className="mt-6 flex min-h-[22rem] w-full flex-col items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 px-6 py-10 text-center transition hover:bg-blue-100"
            >
              <span className="text-5xl font-black leading-tight text-stone-950">
                {card.surface}
              </span>
              {card.reading ? (
                <span className="mt-4 text-2xl font-bold text-stone-600">
                  {revealed ? card.reading : "Tap to reveal"}
                </span>
              ) : null}
              {revealed ? (
                <span className="mt-5 max-w-2xl text-2xl font-black leading-snug text-blue-900">
                  {card.meaning || "No meaning saved."}
                </span>
              ) : null}
              {revealed && card.followAlongSupportNote ? (
                <span className="mt-4 max-w-2xl rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
                  {card.followAlongSupportNote}
                </span>
              ) : null}
            </button>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => move(-1)} className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-black text-stone-700 hover:bg-stone-50">
                Previous
              </button>
              <button type="button" onClick={() => setRevealed((value) => !value)} className="rounded-2xl border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                {revealed ? "Hide" : "Reveal"}
              </button>
              <button type="button" onClick={() => move(1)} className="rounded-2xl border border-stone-900 bg-stone-900 px-5 py-3 text-sm font-black text-white hover:bg-black">
                Next
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
