// Reading Journal Page
//
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
import { wantsJapaneseLearning } from "@/lib/access/japaneseLearningIntent";
import { getBookIdentity } from "@/lib/books/bookIdentity";
import { supabase } from "@/lib/supabaseClient";
import ReadingJournalPanel from "../components/ReadingJournalPanel";
import TeacherNotebookPanel from "../../../teacher/components/TeacherNotebookPanel";
import {
  loadTeacherBookRelationship,
  type TeacherBookRelationship,
} from "@/lib/teacher/teacherBookRelationship";

type ProfileRole = "teacher" | "member" | "super_teacher" | "admin";

type BookRow = {
  title: string | null;
  title_reading: string | null;
  author: string | null;
  author_english_name: string | null;
  author_reading: string | null;
  cover_url: string | null;
  language_code: string | null;
  page_count: number | null;
};

type PersonalJournalRow = {
  id: string;
  user_id: string;
  book_id: string;
  favorite_quotes: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  book_id: string;
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
  const searchParams = useSearchParams();
  const isTeachingJournal = searchParams.get("mode") === "teaching";
  const journalName = isTeachingJournal ? "Teacher Journal" : "Reading Journal";
  const bookHubHref = `/books/${encodeURIComponent(userBookId ?? "")}${
    searchParams.get("mode") === "teaching" ? "?mode=teaching" : ""
  }`;

  const [personalJournal, setPersonalJournal] = useState<PersonalJournalRow | null>(null);
  const [personalJournalMessage, setPersonalJournalMessage] = useState("");
  const [teacherBook, setTeacherBook] = useState<TeacherBookRelationship | null>(null);
  const [loadedJournalMode, setLoadedJournalMode] = useState<boolean | null>(null);
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
      setTeacherBook(null);
      setPersonalJournal(null);
      setPersonalJournalMessage("");
      setLoadedJournalMode(isTeachingJournal);
      setCanUseJapaneseLearningJournal(false);
      setJapaneseLearningArchiveTabs(emptyJapaneseLearningJournalArchiveTabs);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user || !userBookId) {
        setAccessMessage(`Please sign in to use ${journalName}.`);
        setLoading(false);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, target_language, japanese_learning_enabled, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle();

      let profile: any = profileResult.data;
      let profileError = profileResult.error;

      if (isMissingAppAccessColumnError(profileError)) {
        const fallbackResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher, target_language, japanese_learning_enabled")
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
          book_id,
          books (
            title,
            title_reading,
            author,
            author_english_name,
            author_reading,
            cover_url,
            language_code,
            page_count
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
          .is("archived_at", null)
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

      let journalUserBookId: string | null = loadedRow.id;

      if (isTeachingJournal) {
        if (profileError || !(role === "teacher" || role === "admin" || isSuperTeacher)) {
          setAccessMessage("Teacher access is required.");
          setLoading(false);
          return;
        }

        try {
          const relationship = await loadTeacherBookRelationship({
            supabase,
            teacherId: user.id,
            bookId: loadedRow.book_id,
            userBookId: loadedRow.id,
          });
          if (cancelled) return;
          setTeacherBook(relationship);

          // Resolve personal ownership independently of the route and teacher-book link.
          // Either may refer to another person's user_book in a teaching context.
          const { data: ownBook, error: ownBookError } = await supabase
            .from("user_books")
            .select("id, user_id, book_id, favorite_quotes")
            .eq("user_id", user.id)
            .eq("book_id", loadedRow.book_id)
            .maybeSingle();

          if (cancelled) return;
          if (ownBookError) throw ownBookError;
          const personalRow = ownBook as PersonalJournalRow | null;
          if (personalRow && (personalRow.user_id !== user.id || personalRow.book_id !== loadedRow.book_id)) {
            throw new Error("Could not verify personal journal ownership.");
          }
          journalUserBookId = personalRow?.id ?? null;
          setPersonalJournal(personalRow);
          if (!personalRow) {
            setPersonalJournalMessage("Add this book to your own library to use your personal Book Journal. Teaching Notes are still available.");
          }
        } catch (error: any) {
          if (cancelled) return;
          setAccessMessage(error?.message ?? "Could not load Teacher Journal.");
          setLoading(false);
          return;
        }
      }

      const profileWantsJapaneseStudyTools = wantsJapaneseLearning(profile);
      const activeJapaneseLearningJournal =
        profileWantsJapaneseStudyTools &&
        canUseActiveJapaneseLearningJournal({
          bookLanguageCode: loadedRow.books?.language_code ?? null,
          featureAccess,
        });
      const archiveTabs =
        journalUserBookId &&
        profileWantsJapaneseStudyTools &&
        !activeJapaneseLearningJournal &&
        isJapaneseLearningBook(loadedRow.books?.language_code ?? null)
          ? await loadJapaneseLearningArchiveTabs(journalUserBookId)
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
  }, [userBookId, isTeachingJournal, journalName]);

  if (loading || loadedJournalMode !== isTeachingJournal) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-600">Loading {journalName}...</p>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <AccessDeniedMessage
        message={accessMessage || `You do not have access to ${journalName}.`}
        backHref={userBookId ? bookHubHref : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  if (isTeachingJournal) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <Link
            href={bookHubHref}
            className="inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← Back to Book Hub
          </Link>
          <h1 className="text-3xl font-black text-stone-950">
            {getBookIdentity(row.books).title}
          </h1>
          <TeacherNotebookPanel
            teacherBookId={teacherBook?.id ?? null}
            bookId={teacherBook?.book_id ?? row.book_id}
            userBookId={teacherBook ? teacherBook.user_book_id : row.id}
            mode="prep"
            bookJournalContent={personalJournal ? (
              <ReadingJournalPanel
                key={personalJournal.id}
                userBookId={personalJournal.id}
                ownerUserId={personalJournal.user_id}
                favoriteQuotes={personalJournal.favorite_quotes}
                bookLanguageCode={row.books?.language_code ?? null}
                pageCount={row.books?.page_count ?? null}
                canUseJapaneseLearningJournal={canUseJapaneseLearningJournal}
                japaneseLearningArchiveTabs={japaneseLearningArchiveTabs}
                onFavoriteQuotesChange={(value) =>
                  setPersonalJournal((prev) => prev ? { ...prev, favorite_quotes: value } : prev)
                }
              />
            ) : (
              <p className="text-sm font-semibold text-stone-600">{personalJournalMessage}</p>
            )}
          />
        </div>
      </main>
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
          href={bookHubHref}
          className="inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Book Hub
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
              {hasJapaneseLearningJournalTabs ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Reading Journal is available in split screen with Follow-Along, Save Words, and Read/Listen.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="hidden rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-semibold leading-6 text-sky-900 lg:block">
          Reading as you go? Open Reading Journal from Read / Listen to use the timer and journal side by side.
        </div>

        <ReadingJournalPanel
          userBookId={row.id}
          initialTab={searchParams.get("tab") === "review" ? "review" : undefined}
          ownerUserId={row.user_id}
          favoriteQuotes={row.favorite_quotes}
          bookLanguageCode={book?.language_code ?? null}
          pageCount={book?.page_count ?? null}
          canUseJapaneseLearningJournal={canUseJapaneseLearningJournal}
          japaneseLearningArchiveTabs={japaneseLearningArchiveTabs}
          vocabListHref={
            hasJapaneseLearningJournalTabs ? `/books/${row.id}/words` : undefined
          }
          onFavoriteQuotesChange={(value) =>
            setRow((prev) => (prev ? { ...prev, favorite_quotes: value } : prev))
          }
        />
      </div>
    </main>
  );
}
