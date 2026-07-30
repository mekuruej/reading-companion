// Reading Journal Page
//
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { getFullAccessRequiredCopy } from "@/lib/access/requireFullAccess";
import { supabase } from "@/lib/supabaseClient";
import ReadingJournalPanel from "../components/ReadingJournalPanel";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

type BookRow = {
  title: string | null;
  title_reading: string | null;
  author: string | null;
  cover_url: string | null;
  language_code: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  favorite_quotes: string | null;
  books: BookRow | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export default function StoryNotesPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [row, setRow] = useState<UserBookRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAccessMessage("");
      setRow(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user || !userBookId) {
        setAccessMessage("Please sign in to use Reading Journal.");
        setLoading(false);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle();

      let profile: any = profileResult.data;
      let profileError = profileResult.error;

      if (isMissingAppAccessColumnError(profileError)) {
        const fallbackResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle();

        profile = fallbackResult.data;
        profileError = fallbackResult.error;
      }

      if (profileError) {
        console.error("Error loading Reading Journal profile:", profileError);
      }

      const role = (profile?.role as ProfileRole | null) ?? "member";
      const isSuperTeacher = role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

      const appAccessStatus = getAppAccessStatus({
        role: isSuperTeacher ? "super_teacher" : role,
        app_access_type: profile?.app_access_type ?? null,
        app_access_expires_at: profile?.app_access_expires_at ?? null,
      });

      const featureAccess = getFeatureAccess({
        role: isSuperTeacher ? "super_teacher" : role,
        isSuperTeacher: profile?.is_super_teacher,
        hasFullAccess: appAccessStatus.hasFullAccess,
        isTrialActive: appAccessStatus.reason === "trial",
      });

      if (!featureAccess.canUseStoryNotes) {
        const copy = getFullAccessRequiredCopy("story_notes");
        setAccessMessage(copy.message);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          books (
            title,
            title_reading,
            author,
            cover_url,
            language_code
          ),
          favorite_quotes
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading Reading Journal book:", error);
        setAccessMessage("This book could not be found.");
        setLoading(false);
        return;
      }

      if (!data) {
        setAccessMessage("You do not have access to this book.");
        setLoading(false);
        return;
      }

      const loadedRow = data as unknown as UserBookRow;
      let canAccessBook = loadedRow.user_id === user.id || isSuperTeacher || role === "admin";

      if (!canAccessBook && role === "teacher") {
        const { data: teacherStudentLink, error: teacherStudentError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("student_id", loadedRow.user_id)
          .limit(1)
          .maybeSingle();

        if (teacherStudentError) {
          console.error("Error checking Reading Journal teacher access:", teacherStudentError);
        }

        canAccessBook = !!teacherStudentLink;
      }

      if (!canAccessBook) {
        setAccessMessage("You do not have access to this book.");
        setLoading(false);
        return;
      }

      if (loadedRow.books?.language_code === "en") {
        setAccessMessage("Reading Journal is available for Japanese books.");
        setLoading(false);
        return;
      }

      setRow(loadedRow);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-600">Loading Reading Journal...</p>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <AccessDeniedMessage
        message={accessMessage || "You do not have access to Reading Journal."}
        backHref={userBookId ? `/books/${userBookId}` : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  const book = row.books;

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          href={`/books/${row.id}`}
          className="inline-flex text-sm font-semibold text-stone-500 hover:text-stone-900"
        >
          &larr; Back to Book Hub
        </Link>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt={`${book.title ?? "Book"} cover`}
                className="h-28 w-20 shrink-0 rounded-2xl border border-stone-200 object-cover shadow-sm"
              />
            ) : null}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
                Reading Journal
              </p>
              <h1 className="mt-1 text-3xl font-black text-stone-950">
                {book?.title ?? "Untitled book"}
              </h1>
              {book?.title_reading ? (
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  {book.title_reading}
                </p>
              ) : null}
              {book?.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-700">
                  {book.author}
                </p>
              ) : null}
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                Use this as your personal notebook while you read: detective notes,
                characters, plot points, settings, cultural details, and quotes you
                want to remember.
              </p>
            </div>
          </div>
        </section>

        <ReadingJournalPanel
          userBookId={row.id}
          ownerUserId={row.user_id}
          favoriteQuotes={row.favorite_quotes}
          onFavoriteQuotesChange={(value) =>
            setRow((prev) => (prev ? { ...prev, favorite_quotes: value } : prev))
          }
        />
      </div>
    </main>
  );
}
