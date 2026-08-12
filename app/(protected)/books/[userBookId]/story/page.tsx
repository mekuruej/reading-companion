// Reading Journal Page
//
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseActiveJapaneseLearningJournal,
  canUseReadingCompanionJournal,
  emptyJapaneseLearningJournalArchiveTabs,
  isJapaneseLearningBook,
  type JapaneseLearningJournalArchiveTabs,
  type JapaneseLearningJournalTab,
} from "@/lib/access/readingCompanion";
import { getBookIdentity } from "@/lib/books/bookIdentity";
import { supabase } from "@/lib/supabaseClient";
import ReadingJournalPanel from "../components/ReadingJournalPanel";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

type BookRow = {
  title: string | null;
  title_reading: string | null;
  author: string | null;
  author_english_name: string | null;
  author_reading: string | null;
  cover_url: string | null;
  language_code: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  favorite_quotes: string | null;
  books: BookRow | null;
};

const japaneseLearningArchiveTables: Record<JapaneseLearningJournalTab, string> = {
  detective: "user_book_detective_entries",
  setting: "user_book_setting_items",
  cultural: "user_book_cultural_items",
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

async function hasJapaneseLearningArchiveRows({
  userBookId,
  table,
}: {
  userBookId: string;
  table: string;
}) {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq("user_book_id", userBookId);

  if (error) {
    console.error("Error checking Reading Journal learning archive:", { table, error });
    return false;
  }

  return (count ?? 0) > 0;
}

async function loadJapaneseLearningArchiveTabs(userBookId: string) {
  const [detective, setting, cultural] = await Promise.all([
    hasJapaneseLearningArchiveRows({
      userBookId,
      table: japaneseLearningArchiveTables.detective,
    }),
    hasJapaneseLearningArchiveRows({
      userBookId,
      table: japaneseLearningArchiveTables.setting,
    }),
    hasJapaneseLearningArchiveRows({
      userBookId,
      table: japaneseLearningArchiveTables.cultural,
    }),
  ]);

  return { detective, setting, cultural };
}

export default function StoryNotesPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [row, setRow] = useState<UserBookRow | null>(null);
  const [canUseJapaneseLearningJournal, setCanUseJapaneseLearningJournal] = useState(false);
  const [japaneseLearningArchiveTabs, setJapaneseLearningArchiveTabs] =
    useState<JapaneseLearningJournalArchiveTabs>(emptyJapaneseLearningJournalArchiveTabs);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAccessMessage("");
      setRow(null);
      setCanUseJapaneseLearningJournal(false);
      setJapaneseLearningArchiveTabs(emptyJapaneseLearningJournalArchiveTabs);

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
            author_english_name,
            author_reading,
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

      if (!canUseReadingCompanionJournal({ canAccessBook })) {
        setAccessMessage("You do not have access to Reading Journal.");
        setLoading(false);
        return;
      }

      const activeJapaneseLearningJournal = canUseActiveJapaneseLearningJournal({
        bookLanguageCode: loadedRow.books?.language_code ?? null,
        featureAccess,
      });
      const archiveTabs =
        !activeJapaneseLearningJournal && isJapaneseLearningBook(loadedRow.books?.language_code ?? null)
          ? await loadJapaneseLearningArchiveTabs(loadedRow.id)
          : emptyJapaneseLearningJournalArchiveTabs;

      if (cancelled) return;

      setCanUseJapaneseLearningJournal(activeJapaneseLearningJournal);
      setJapaneseLearningArchiveTabs(archiveTabs);
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
  const bookIdentity = getBookIdentity(book);
  const hasJapaneseLearningJournalTabs =
    canUseJapaneseLearningJournal || Object.values(japaneseLearningArchiveTabs).some(Boolean);

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
                alt={`${bookIdentity.title} cover`}
                className="h-28 w-20 shrink-0 rounded-2xl border border-stone-200 object-cover shadow-sm"
              />
            ) : null}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
                Reading Journal
              </p>
              <h1 className="mt-1 text-3xl font-black text-stone-950">
                {bookIdentity.title}
              </h1>
              {bookIdentity.titleReading ? (
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  {bookIdentity.titleReading}
                </p>
              ) : null}
              {bookIdentity.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-700">
                  {bookIdentity.author}
                </p>
              ) : null}
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                {hasJapaneseLearningJournalTabs
                  ? "Use this as your personal notebook while you read: characters, plot points, detective notes, settings, cultural details, quotes, and notes you want to remember."
                  : "Use this as your personal notebook while you read: characters, plot points, quotes, notes, and anything else you want to remember."}
              </p>
            </div>
          </div>
        </section>

        <ReadingJournalPanel
          userBookId={row.id}
          ownerUserId={row.user_id}
          favoriteQuotes={row.favorite_quotes}
          bookLanguageCode={book?.language_code ?? null}
          canUseJapaneseLearningJournal={canUseJapaneseLearningJournal}
          japaneseLearningArchiveTabs={japaneseLearningArchiveTabs}
          vocabListHref={book?.language_code === "en" ? undefined : `/books/${row.id}/words`}
          onFavoriteQuotesChange={(value) =>
            setRow((prev) => (prev ? { ...prev, favorite_quotes: value } : prev))
          }
        />
      </div>
    </main>
  );
}
