// Teacher Book Workspace
//
// Launcher for teacher-owned books. Reader tools use the linked user_books row;
// teaching prep and follow-along stay anchored to teacher_books.

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
  isbn13: string | null;
  page_count: number | null;
};

type TeacherBookRow = {
  id: string;
  teacher_id: string;
  book_id: string;
  user_book_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  books: BookMeta | BookMeta[] | null;
};

type ToolCard = {
  title: string;
  subtitle?: string;
  description: string;
  href: string;
  tone: "blue" | "green" | "purple" | "stone";
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

function bookTypeLabel(value: string | null | undefined) {
  if (!value) return "Book";
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cardToneClass(tone: ToolCard["tone"]) {
  if (tone === "blue") return "border-sky-200 bg-sky-50 hover:bg-sky-100";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 hover:bg-emerald-100";
  if (tone === "purple") return "border-violet-200 bg-violet-50 hover:bg-violet-100";
  return "border-stone-200 bg-white hover:bg-stone-50";
}

function ToolCardLink({ tool }: { tool: ToolCard }) {
  return (
    <Link
      href={tool.href}
      className={`block rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardToneClass(tool.tone)}`}
    >
      <div className="flex min-h-28 flex-col justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-stone-950">{tool.title}</h3>
          {tool.subtitle ? (
            <p className="mt-0.5 text-sm font-black text-stone-700">{tool.subtitle}</p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-stone-600">{tool.description}</p>
        </div>
        <p className="text-sm font-black text-stone-900">Open</p>
      </div>
    </Link>
  );
}

export default function TeacherBookWorkspacePage() {
  const params = useParams<{ teacherBookId: string }>();
  const teacherBookId = params.teacherBookId ?? "";

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [canAccess, setCanAccess] = useState(false);
  const [teacherBook, setTeacherBook] = useState<TeacherBookRow | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, [teacherBookId]);

  async function loadWorkspace() {
    setLoading(true);
    setMessage("");
    setCanAccess(false);
    setTeacherBook(null);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
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
        setMessage("Teacher access is required.");
        return;
      }

      const { data, error } = await supabase
        .from("teacher_books")
        .select(
          `
          id,
          teacher_id,
          book_id,
          user_book_id,
          created_at,
          updated_at,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type,
            isbn13,
            page_count
          )
        `
        )
        .eq("id", teacherBookId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setMessage("This Teacher Book could not be found.");
        return;
      }

      setCanAccess(true);
      setTeacherBook(data as TeacherBookRow);
    } catch (error: any) {
      console.error("Error loading Teacher Book Workspace:", error);
      setMessage(error?.message ?? "Could not load Teacher Book Workspace.");
    } finally {
      setLoading(false);
    }
  }

  const book = firstBook(teacherBook?.books ?? null);
  const userBookId = teacherBook?.user_book_id ?? null;

  const readerTools = useMemo<ToolCard[]>(() => {
    if (!userBookId) return [];
    const encodedUserBookId = encodeURIComponent(userBookId);

    return [
      {
        title: "Curiosity Reading",
        subtitle: "Intensive",
        description: "Read while saving vocabulary and logging a slower session.",
        href: `/books/${encodedUserBookId}/curiosity-reading`,
        tone: "blue",
      },
      {
        title: "Supported Reading",
        subtitle: "Extensive Reading with Saved Words",
        description: "Reread with light support from words you already saved.",
        href: `/books/${encodedUserBookId}/readalong`,
        tone: "green",
      },
      {
        title: "Just Reading",
        subtitle: "Extensive Fluid Reading",
        description: "Read without support or lookups and log your time.",
        href: `/books/${encodedUserBookId}/just-reading`,
        tone: "purple",
      },
      {
        title: "Listening",
        subtitle: "Ear Training",
        description: "Listen to the book and log words you hear.",
        href: `/books/${encodedUserBookId}/listening`,
        tone: "purple",
      },
      {
        title: "Study Flashcards",
        description: "Review saved words from this book.",
        href: `/books/${encodedUserBookId}/study`,
        tone: "blue",
      },
      {
        title: "Vocabulary List",
        description: "Open saved words and vocabulary tools for this book.",
        href: `/books/${encodedUserBookId}/words`,
        tone: "green",
      },
    ];
  }, [userBookId]);

  const teacherTools = useMemo<ToolCard[]>(() => {
    const encodedTeacherBookId = encodeURIComponent(teacherBookId);
    return [
      {
        title: "Teaching Prep Items",
        description: "Add words, phrases, notes, translations, and lesson support.",
        href: `/teacher/library/${encodedTeacherBookId}`,
        tone: "stone",
      },
      {
        title: "Follow-Along Support",
        description: "Use your prepared support while reading with a learner.",
        href: `/teacher/library/${encodedTeacherBookId}/follow`,
        tone: "stone",
      },
    ];
  }, [teacherBookId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading Teacher Book Workspace...
        </div>
      </main>
    );
  }

  if (!canAccess || !teacherBook) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher/library" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            &lt;- Teacher Books
          </Link>
          <h1 className="mt-4 text-3xl font-black text-stone-950">Teacher Book Workspace</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "This Teacher Book could not be loaded."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/teacher/library" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          &lt;- Teacher Books
        </Link>

        <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-[120px_minmax(0,1fr)] md:items-start">
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt=""
                className="h-40 w-28 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-40 w-28 items-center justify-center rounded-2xl bg-stone-200 text-xs font-black uppercase tracking-wide text-stone-500">
                No cover
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                Teacher Book Workspace
              </p>
              <h1 className="mt-2 text-3xl font-black text-stone-950 md:text-4xl">
                {book?.title ?? "Untitled book"}
              </h1>
              {book?.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-600">{book.author}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-stone-500">
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                  {bookTypeLabel(book?.book_type)}
                </span>
                {book?.page_count != null ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                    {book.page_count} pages
                  </span>
                ) : null}
                {book?.isbn13 ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                    ISBN {book.isbn13}
                  </span>
                ) : null}
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">
                Reading tools use your My Mekuru Library history. Teaching Prep Items stays with this Teacher Book.
              </p>
            </div>
          </div>
        </section>

        {!userBookId ? (
          <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
            This Teacher Book is not linked to My Mekuru Library yet.
          </section>
        ) : (
          <section className="mt-6">
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                Reading Tools
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-950">Read and study</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {readerTools.map((tool) => (
                <ToolCardLink key={tool.href} tool={tool} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Teacher Tools
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Prepare and support</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {teacherTools.map((tool) => (
              <ToolCardLink key={tool.href} tool={tool} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
