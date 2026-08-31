"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import JapaneseDictionaryCapture, {
  type JapaneseDictionaryCaptureValue,
} from "@/components/vocabulary/JapaneseDictionaryCapture";
import {
  isTeacherProfile,
  loadSharedTeacherVocabulary,
  loadTeacherBookContext,
  saveTeacherVocabularyAndInclude,
  type SharedTeacherVocabularyWord,
  type TeacherBookContext,
  updateTeachingVocabularyVisibility,
} from "@/lib/teacher/teacherBookVocabulary";

type BookMeta = {
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

function OriginBadges({ word }: { word: SharedTeacherVocabularyWord }) {
  return (
    <div className="flex flex-wrap gap-1.5">
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

export default function TeacherVocabularyPage() {
  const params = useParams<{ teacherBookId: string }>();
  const teacherBookId = params.teacherBookId ?? "";

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [context, setContext] = useState<TeacherBookContext | null>(null);
  const [book, setBook] = useState<BookMeta | null>(null);
  const [words, setWords] = useState<SharedTeacherVocabularyWord[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadPage();
  }, [teacherBookId, showHidden]);

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
        .select("books:book_id ( title, author, cover_url )")
        .eq("id", teacherBookId)
        .maybeSingle();

      if (bookError) throw bookError;
      const maybeBook = (teacherBook as any)?.books;
      setBook(Array.isArray(maybeBook) ? maybeBook[0] ?? null : maybeBook ?? null);

      setWords(
        await loadSharedTeacherVocabulary(supabase, nextContext, {
          view: "teaching",
          showHidden,
        })
      );
    } catch (error: any) {
      console.error("Error loading Teacher Vocabulary:", error);
      setMessage(error?.message ?? "Could not load Teacher Vocabulary.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCapturedWord(value: JapaneseDictionaryCaptureValue) {
    if (!context) throw new Error("Teacher Vocabulary is still loading.");
    setMessage("");

    const result = await saveTeacherVocabularyAndInclude(supabase, context, value);
    await loadPage();
    return result.status;
  }

  async function updateWord(
    word: SharedTeacherVocabularyWord,
    patch: Parameters<typeof updateTeachingVocabularyVisibility>[2]
  ) {
    if (!context) return;

    setMessage("");
    try {
      await updateTeachingVocabularyVisibility(supabase, word, patch, context);
      await loadPage();
    } catch (error: any) {
      setMessage(error?.message ?? "Could not update this word.");
    }
  }

  const filteredWords = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return words;
    return words.filter((word) =>
      [word.surface, word.reading, word.meaning, word.chapterName, word.pageNumber]
        .join(" ")
        .toLowerCase()
        .includes(clean)
    );
  }, [query, words]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href={`/teacher/library/${encodeURIComponent(teacherBookId)}/book-workspace`} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          ← Back to Teacher Book Workspace
        </Link>

        <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Teacher Vocabulary
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950">
            {book?.title ?? "Teacher Vocabulary"}
          </h1>
          {book?.author ? <p className="mt-1 text-sm font-semibold text-stone-600">{book.author}</p> : null}
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
            Teaching words and personal saved words for this catalog book appear together here. Hiding from Teaching does not delete the word from My Library.
          </p>
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {message}
          </div>
        ) : null}

        <div className="mt-5">
          <JapaneseDictionaryCapture
            title="Add a teaching word"
            description="Search dictionary candidates, choose the meaning that fits this book, and save it directly into Follow-Along."
            onSave={saveCapturedWord}
          />
        </div>

        <section className="mt-5">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-stone-950">Saved words</h2>
              <p className="mt-1 text-sm text-stone-500">{filteredWords.length} words shown.</p>
              <Link
                href={`/teacher/library/${encodeURIComponent(teacherBookId)}/follow`}
                className="mt-2 inline-flex text-sm font-black text-blue-700 hover:text-blue-900"
              >
                Open Follow-Along
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search words" className="rounded-2xl border border-stone-300 px-4 py-2 text-sm" />
              <button type="button" onClick={() => setShowHidden((value) => !value)} className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-700">
                {showHidden ? "Hide Hidden" : "Show Hidden"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-stone-500">Loading vocabulary...</div>
          ) : filteredWords.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
              No words yet. Add words here or capture them from a personal book context.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredWords.map((word) => (
                <article key={word.id} className={`rounded-3xl border bg-white p-4 shadow-sm ${word.hiddenFromTeaching ? "opacity-55" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-black text-stone-950">{word.surface}</h3>
                      {word.reading ? <p className="mt-1 text-sm font-semibold text-stone-500">{word.reading}</p> : null}
                    </div>
                    <OriginBadges word={word} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-700">{word.meaning || "No meaning saved."}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-stone-500">
                    {word.pageNumber != null ? <span>p. {word.pageNumber}</span> : null}
                    {word.includedInFollowAlong ? <span className="text-blue-700">In Follow-Along</span> : null}
                    {!word.includedInFollowAlong ? <span>Not in Follow-Along</span> : null}
                    {word.hiddenFromTeaching ? <span className="text-rose-700">Hidden from Teaching</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateWord(word, { hidden_from_teaching: !word.hiddenFromTeaching })} className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-xs font-black text-stone-700">
                      {word.hiddenFromTeaching ? "Restore to Teaching view" : "Hide from Teaching"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
