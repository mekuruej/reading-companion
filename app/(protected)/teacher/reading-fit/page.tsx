// Teacher Reading Fit Queue
//

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTeacherBackLink } from "../components/teacherBackLink";
import { ReadingFitSignalCard } from "./components/ReadingFitSignalCard";
import { TeacherReadingFitEmptyState } from "./components/TeacherReadingFitEmptyState";
import { TeacherReadingFitHeader } from "./components/TeacherReadingFitHeader";
import { TeacherReadingFitLoadingState } from "./components/TeacherReadingFitLoadingState";
import { TeacherReadingFitMessage } from "./components/TeacherReadingFitMessage";
import { TeacherReadingFitSummaryGrid } from "./components/TeacherReadingFitSummaryGrid";

type ProfileRole = "teacher" | "super_teacher" | "member" | "student" | string | null;

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  level?: string | null;
  role?: ProfileRole;
  is_super_teacher?: boolean | null;
};

type BookRow = {
  title: string | null;
  cover_url: string | null;
  book_type: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  finished_at: string | null;
  dnf_at: string | null;
  reader_level: string | null;
  rating_difficulty: number | null;
  rating_overall: number | null;
  teacher_review_cleared_at: string | null;
  books: BookRow | BookRow[] | null;
};

type ReadingFitItem = {
  id: string;
  userId: string;
  studentName: string;
  title: string;
  coverUrl: string | null;
  bookType: string | null;
  finishedAt: string | null;
  readerLevel: string | null;
  ratingDifficulty: number | null;
  ratingEntertainment: number | null;
  missingReaderLevel: boolean;
  missingDifficulty: boolean;
  missingEntertainment: boolean;
};

function getBook(bookRow: UserBookRow["books"]) {
  if (!bookRow) return null;
  return Array.isArray(bookRow) ? bookRow[0] ?? null : bookRow;
}

function displayName(profile: ProfileRow | null | undefined) {
  return profile?.display_name || profile?.username || "Unnamed reader";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function bookTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "picture_book":
      return "Picture Book";
    case "early_reader":
      return "Early Reader";
    case "chapter_book":
      return "Chapter Book";
    case "middle_grade":
      return "Middle Grade";
    case "ya":
      return "YA";
    case "novel":
      return "Novel";
    case "light_novel":
      return "Light Novel";
    case "short_story":
      return "Short Story";
    case "manga":
      return "Manga";
    case "nonfiction":
      return "Nonfiction";
    case "essay":
      return "Essay";
    case "memoir":
      return "Memoir";
    case "textbook":
      return "Textbook";
    case "other":
      return "Other";
    default:
      return "—";
  }
}

function formatRating(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";

  return Number(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/0$/, "");
}

function difficultyLabel(value: number | null) {
  if (value == null) return "Missing";

  const labels: Record<number, string> = {
    1: "Very easy",
    1.5: "Easy",
    2: "Comfortable overall",
    2.5: "Mostly okay",
    3: "A stretch, but okay",
    3.5: "A real stretch",
    4: "Hard, but manageable",
    4.5: "Hard and tiring",
    5: "Very hard",
  };

  return labels[value] ?? "Difficulty rating";
}

export default function TeacherReadingFitPage() {
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));

  const [errorMessage, setErrorMessage] = useState("");
  const [items, setItems] = useState<ReadingFitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => {
    void loadReadingFitQueue();
  }, []);

  async function loadReadingFitQueue() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Please sign in to see reading-fit work.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, username, level, role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const isTeacher =
        profile?.role === "teacher" ||
        profile?.role === "super_teacher" ||
        !!profile?.is_super_teacher;

      if (!isTeacher) {
        setErrorMessage("Teacher access is required.");
        setLoading(false);
        return;
      }

      const { data: teacherLinks, error: teacherLinksError } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id)
        .is("archived_at", null);

      if (teacherLinksError) throw teacherLinksError;

      const studentIds = Array.from(
        new Set([
          user.id,
          ...((teacherLinks ?? [])
            .map((row: any) => row.student_id)
            .filter(Boolean) as string[]),
        ])
      );

      const [{ data: profilesData, error: profilesError }, { data: userBooksData, error: userBooksError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, username, level")
            .in("id", studentIds),
          supabase
            .from("user_books")
            .select(`
              id,
              user_id,
              finished_at,
              dnf_at,
              reader_level,
              rating_difficulty,
              rating_overall,
              teacher_review_cleared_at,
              books (
                title,
                cover_url,
                book_type
              )
            `)
            .in("user_id", studentIds)
            .not("finished_at", "is", null)
            .is("dnf_at", null)
            .is("teacher_review_cleared_at", null)
            .order("finished_at", { ascending: false }),
        ]);

      if (profilesError) throw profilesError;
      if (userBooksError) throw userBooksError;

      const profileById = new Map<string, ProfileRow>();
      for (const item of (profilesData ?? []) as ProfileRow[]) {
        profileById.set(item.id, item);
      }

      const nextItems = ((userBooksData ?? []) as UserBookRow[])
        .map((row) => {
          const book = getBook(row.books);
          const profile = profileById.get(row.user_id);
          const studentName =
            profile?.display_name ||
            profile?.username ||
            "Unknown student";

          const effectiveReaderLevel = row.reader_level || profile?.level || null;
          const missingReaderLevel = !String(effectiveReaderLevel ?? "").trim();
          const missingDifficulty = row.rating_difficulty == null;
          const missingEntertainment = row.rating_overall == null;

          return {
            id: row.id,
            userId: row.user_id,
            studentName,
            title: book?.title ?? "Untitled Book",
            coverUrl: book?.cover_url ?? "",
            bookType: bookTypeLabel(book?.book_type),
            finishedAt: row.finished_at,
            readerLevel: effectiveReaderLevel,
            ratingDifficulty: row.rating_difficulty,
            ratingEntertainment: row.rating_overall,
            missingReaderLevel,
            missingDifficulty,
            missingEntertainment,
          };
        })
        .filter(
          (item) =>
            item.missingReaderLevel ||
            item.missingDifficulty ||
            item.missingEntertainment
        );

      setItems(nextItems);
    } catch (error: any) {
      console.error("Error loading reading-fit queue:", error);
      setErrorMessage(error?.message ?? "Could not load reading-fit queue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsReviewed(itemId: string) {
    const confirmed = window.confirm(
      "Clear this book from the Teacher Review Index? Missing ratings will stay blank, but the book will leave this review queue."
    );

    if (!confirmed) return;

    setClearingId(itemId);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const user = auth?.user;

      if (!user) {
        throw new Error("Please sign in to clear review items.");
      }

      const { error } = await supabase
        .from("user_books")
        .update({
          teacher_review_cleared_at: new Date().toISOString(),
          teacher_review_cleared_by: user.id,
          teacher_review_clear_note: "Manually cleared from Teacher Review Index.",
        })
        .eq("id", itemId);

      if (error) throw error;

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== itemId)
      );
    } catch (error: any) {
      console.error("Error clearing Teacher Review Index item:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        raw: error,
      });

      window.alert(error?.message ?? "Could not clear this review item.");
    } finally {
      setClearingId(null);
    }
  }

  const summary = useMemo(() => {
    return {
      total: items.length,
      missingReaderLevel: items.filter((item) => item.missingReaderLevel).length,
      missingDifficulty: items.filter((item) => item.missingDifficulty).length,
      missingEntertainment: items.filter((item) => item.missingEntertainment)
        .length,
    };
  }, [items]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <TeacherReadingFitHeader backHref={backLink.href} backLabel={backLink.label} />
        <TeacherReadingFitSummaryGrid summary={summary} />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-3xl font-black text-stone-900">{summary.total}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              books need fit signals
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-3xl font-black text-stone-900">
              {summary.missingReaderLevel}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              missing reader level
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-3xl font-black text-stone-900">
              {summary.missingDifficulty}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              missing ease rating
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="text-2xl font-black text-stone-900">
              {summary.missingEntertainment}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              missing entertainment rating
            </div>
          </div>
        </div>
      </section>

      <TeacherReadingFitMessage message={errorMessage} />

      <section className="mt-6">
        {loading ? (
          <TeacherReadingFitLoadingState />
        ) : items.length === 0 ? (
          <TeacherReadingFitEmptyState />
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="w-24 shrink-0">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={`${item.title} cover`}
                        className="w-24 rounded-2xl border border-stone-200 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex aspect-[2/3] w-24 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-xs text-stone-400">
                        No cover
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                        {item.studentName}
                      </span>

                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                        Finished {formatDate(item.finishedAt)}
                      </span>

                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                        {bookTypeLabel(item.bookType)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-black text-stone-900">
                      {item.title}
                    </h2>

                    <div className="mt-4 grid gap-2 md:grid-cols-3">
                      <ReadingFitSignalCard
                        title="Reader Level"
                        isMissing={item.missingReaderLevel}
                        value={item.readerLevel || "Missing"}
                      />

                      <ReadingFitSignalCard
                        title="Difficulty Rating"
                        isMissing={item.missingDifficulty}
                        value={
                          item.ratingDifficulty != null
                            ? `${formatRating(item.ratingDifficulty)}/5 · ${difficultyLabel(
                              item.ratingDifficulty
                            )}`
                            : "Missing"
                        }
                      />

                      <ReadingFitSignalCard
                        title="Entertainment Rating"
                        isMissing={item.missingEntertainment}
                        value={
                          item.ratingEntertainment != null
                            ? `${formatRating(item.ratingEntertainment)}/5`
                            : "Missing"
                        }
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/books/${item.id}`}
                        className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                      >
                        Open Book Hub →
                      </Link>

                      <Link
                        href={`/teacher/books/${item.id}`}
                        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                      >
                        Teacher Review →
                      </Link>

                      <button
                        type="button"
                        onClick={() => markAsReviewed(item.id)}
                        disabled={clearingId === item.id}
                        className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        {clearingId === item.id ? "Clearing..." : "Mark as Reviewed"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
