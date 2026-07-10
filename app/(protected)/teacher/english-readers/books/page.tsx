"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EnglishReaderBookCard from "./components/EnglishReaderBookCard";
import EnglishReaderBooksEmptyState from "./components/EnglishReaderBooksEmptyState";
import EnglishReaderBooksHeader from "./components/EnglishReaderBooksHeader";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  language_code: string | null;
  related_links: any[] | null;
};

type UserBookMeta = {
  id: string;
  recommended_level: string | null;
};

type TeacherBookRow = {
  id: string;
  book_id: string;
  user_book_id: string | null;
  created_at: string | null;
  books: BookMeta | BookMeta[] | null;
  user_books: UserBookMeta | UserBookMeta[] | null;
};

type DisplayBook = {
  id: string;
  title: string;
  author: string | null;
  recommendedLevel: string | null;
  isbn13: string | null;
  externalLink: { label: string; url: string } | null;
};

function isTeacherRole(profile: any) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function firstValue<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeExternalLink(links: any[] | null | undefined) {
  if (!Array.isArray(links)) return null;

  for (const link of links) {
    const url =
      typeof link === "string"
        ? link.trim()
        : typeof link === "object" && link != null
          ? String(link.url ?? "").trim()
          : "";

    if (!/^https?:\/\/\S+/i.test(url)) continue;

    const label =
      typeof link === "object" && link != null
        ? String(link.label ?? "").trim()
        : "";

    return {
      label: label || "External source",
      url,
    };
  }

  return null;
}

function toDisplayBook(row: TeacherBookRow): DisplayBook | null {
  const book = firstValue(row.books);
  if (!book || book.language_code !== "en") return null;

  return {
    id: row.id,
    title: book.title?.trim() || "Untitled English book",
    author: book.author?.trim() || null,
    recommendedLevel: firstValue(row.user_books)?.recommended_level?.trim() || null,
    isbn13: book.isbn13?.trim() || null,
    externalLink: safeExternalLink(book.related_links),
  };
}

export default function EnglishReaderBooksPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [books, setBooks] = useState<DisplayBook[]>([]);

  useEffect(() => {
    void loadBooks();
  }, []);

  async function loadBooks() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        router.replace("/login");
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
        setMessage("Teacher access is required.");
        setBooks([]);
        return;
      }

      setCanAccess(true);

      const { data, error } = await supabase
        .from("teacher_books")
        .select(
          `
          id,
          book_id,
          user_book_id,
          created_at,
          books:book_id!inner (
            id,
            title,
            author,
            isbn13,
            language_code,
            related_links
          ),
          user_books:user_book_id (
            id,
            recommended_level
          )
        `
        )
        .eq("teacher_id", user.id)
        .not("user_book_id", "is", null)
        .eq("books.language_code", "en")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBooks(((data ?? []) as TeacherBookRow[]).map(toDisplayBook).filter(Boolean) as DisplayBook[]);
    } catch (error: any) {
      console.error("Error loading English Reader books:", error);
      setMessage(error?.message ?? "Could not load English Reader books.");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <EnglishReaderBooksHeader count={books.length} />

      <div className="mt-6 space-y-5">
        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
            Loading English Reader books...
          </div>
        ) : null}

        {!loading && message ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
          </div>
        ) : null}

        {!loading && canAccess && books.length === 0 ? (
          <EnglishReaderBooksEmptyState />
        ) : null}

        {!loading && canAccess && books.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {books.map((book) => (
              <EnglishReaderBookCard
                key={book.id}
                title={book.title}
                author={book.author}
                recommendedLevel={book.recommendedLevel}
                isbn13={book.isbn13}
                externalLink={book.externalLink}
                workspaceHref={`/teacher/library/${book.id}/book-workspace`}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
