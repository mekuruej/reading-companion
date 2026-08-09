// Listening
//

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { displayBookTitle } from "@/lib/books/bookIdentity";
import { getEnglishNativeTrackerBookMode } from "@/lib/books/englishNativeTracker";
import { supabase } from "@/lib/supabaseClient";
import { todayYmdAppTimeZone } from "@/lib/timeZone";
import ReadingJournalPanel from "../components/ReadingJournalPanel";
import SimpleTimedSessionPage from "../_shared/timed-session/SimpleTimedSessionPage";
import { CuriosityReadingExperience } from "../curiosity-reading/WordTimerExperience";

type ListeningViewMode = "listening" | "workspace";
type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

type ListeningBook = {
  title: string | null;
  language_code: string | null;
  edition_format: string | null;
  cover_url: string | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isAudiobookFormat(formatType: string | null | undefined, editionFormat: string | null | undefined) {
  return formatType === "audiobook" || editionFormat === "audiobook";
}

function NativeAudiobookProgressPanel({
  userBookId,
  book,
  currentLocation,
  startedAt,
  onSaved,
}: {
  userBookId: string;
  book: ListeningBook | null;
  currentLocation: string;
  startedAt: string | null;
  onSaved: (nextLocation: string, nextStartedAt: string | null) => void;
}) {
  const [location, setLocation] = useState(currentLocation);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const bookTitle = displayBookTitle(book);

  async function saveProgress() {
    const nextLocation = location.trim();
    if (!nextLocation) {
      setMessage("Add a timestamp, chapter, or percent before saving.");
      return;
    }

    setSaving(true);
    setMessage("");

    const nextStartedAt = startedAt || todayYmdAppTimeZone();
    const { error } = await supabase
      .from("user_books")
      .update({
        current_location: nextLocation,
        status: "reading",
        started_at: nextStartedAt,
      })
      .eq("id", userBookId);

    setSaving(false);

    if (error) {
      console.error("Error saving native audiobook progress:", error);
      setMessage("Could not save listening progress.");
      return;
    }

    onSaved(nextLocation, nextStartedAt);
    setMessage("Listening progress saved.");
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <Link
        href={`/books/${encodeURIComponent(userBookId)}`}
        className="inline-flex text-sm font-semibold text-stone-500 hover:text-stone-900"
      >
        &larr; Back to Book Hub
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        {book?.cover_url ? (
          <img
            src={book.cover_url}
            alt={`${bookTitle} cover`}
            className="h-32 w-24 shrink-0 rounded-2xl border border-stone-200 object-cover shadow-sm"
          />
        ) : null}

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
            Update Listening Progress
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-950">{bookTitle}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Save where you are in the audiobook without starting a timer or adding to reading pace.
          </p>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-semibold text-stone-900">Listening progress</span>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. 37%, chapter 8, or 3:12:45"
          className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
        />
      </label>

      {currentLocation ? (
        <p className="mt-2 text-sm text-stone-500">
          Current saved progress: <span className="font-semibold text-stone-700">{currentLocation}</span>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveProgress()}
          disabled={saving}
          className="rounded-2xl bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Listening Progress"}
        </button>
        {message ? (
          <span className="text-sm font-semibold text-stone-600">{message}</span>
        ) : null}
      </div>
    </section>
  );
}

export default function ListeningPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [canSaveWordsWhileListening, setCanSaveWordsWhileListening] = useState(false);
  const [canUseReadingJournal, setCanUseReadingJournal] = useState(false);
  const [journalOwnerUserId, setJournalOwnerUserId] = useState<string | null>(null);
  const [favoriteQuotes, setFavoriteQuotes] = useState<string | null>(null);
  const [bookLanguageCode, setBookLanguageCode] = useState<string | null>(null);
  const [book, setBook] = useState<ListeningBook | null>(null);
  const [currentLocation, setCurrentLocation] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [isNativeAudiobook, setIsNativeAudiobook] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [viewMode, setViewMode] = useState<ListeningViewMode>("listening");

  useEffect(() => {
    let cancelled = false;

    async function loadListeningAccess() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user || !userBookId) {
        setAccessMessage("Please sign in to use listening progress.");
        setCheckingAccess(false);
        return;
      }

      const { data: userBook, error: userBookError } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          favorite_quotes,
          current_location,
          started_at,
          format_type,
          books (
            title,
            language_code,
            edition_format,
            cover_url
          )
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (userBookError || !userBook) {
        if (userBookError) {
          console.error("Error loading Listening book for workspace access:", userBookError);
        }
        setCanUseReadingJournal(false);
        setJournalOwnerUserId(null);
        setFavoriteQuotes(null);
        setBookLanguageCode(null);
        setBook(null);
        setCurrentLocation("");
        setStartedAt(null);
        setIsNativeAudiobook(false);
        setAccessMessage("You do not have access to this book.");
        setCheckingAccess(false);
        return;
      }

      const book = Array.isArray((userBook as any).books)
        ? (userBook as any).books[0]
        : (userBook as any).books;
      setBookLanguageCode(book?.language_code ?? null);
      setBook(book ?? null);
      setCurrentLocation((userBook as any).current_location ?? "");
      setStartedAt((userBook as any).started_at ?? null);

      const trackerMode = await getEnglishNativeTrackerBookMode({ supabase, userBookId });

      if (cancelled) return;
      const nativeAudiobook =
        trackerMode.isEnglishNativeTrackerBook &&
        isAudiobookFormat((userBook as any).format_type ?? null, book?.edition_format ?? null);

      const profileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at, trial_ends_at")
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

      if (cancelled) return;

      const role = (profile?.role as ProfileRole | null) ?? "member";
      const isSuperTeacher = role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);
      const ownerUserId = (userBook as any).user_id as string | null;
      let canAccessBook = ownerUserId === user.id || isSuperTeacher || role === "admin";

      if (!canAccessBook && role === "teacher" && ownerUserId) {
        const { data: teacherStudentLink, error: teacherStudentError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("student_id", ownerUserId)
          .limit(1)
          .maybeSingle();

        if (teacherStudentError) {
          console.error("Error checking Listening workspace teacher access:", teacherStudentError);
        }

        canAccessBook = !!teacherStudentLink;
      }

      if (!profileError && profile) {
        const appAccessStatus = getAppAccessStatus({
          role: isSuperTeacher ? "super_teacher" : role,
          app_access_type: profile.app_access_type ?? null,
          app_access_expires_at: profile.app_access_expires_at ?? null,
        });
        const featureAccess = getFeatureAccess({
          role: isSuperTeacher ? "super_teacher" : role,
          isSuperTeacher: profile.is_super_teacher,
          hasFullAccess: appAccessStatus.hasFullAccess,
          isTrialActive: appAccessStatus.reason === "trial",
        });

        setCanSaveWordsWhileListening(
          !trackerMode.isEnglishNativeTrackerBook && featureAccess.canUseListeningWordCapture
        );
        setCanUseReadingJournal(
          Boolean(canAccessBook && ownerUserId && (trackerMode.isEnglishNativeTrackerBook || featureAccess.canUseStoryNotes))
        );
        setJournalOwnerUserId(canAccessBook ? ownerUserId : null);
        setFavoriteQuotes(canAccessBook ? ((userBook as any).favorite_quotes ?? null) : null);
        setIsNativeAudiobook(Boolean(canAccessBook && nativeAudiobook));
        setAccessMessage(canAccessBook ? "" : "You do not have access to this book.");
      } else {
        setCanSaveWordsWhileListening(false);
        setCanUseReadingJournal(false);
        setJournalOwnerUserId(null);
        setFavoriteQuotes(null);
        setBookLanguageCode(null);
        setBook(null);
        setCurrentLocation("");
        setStartedAt(null);
        setIsNativeAudiobook(false);
        setAccessMessage("Could not verify listening access.");
      }

      setCheckingAccess(false);
    }

    void loadListeningAccess();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  useEffect(() => {
    if (!canUseReadingJournal && viewMode === "workspace") {
      setViewMode("listening");
    }
  }, [canUseReadingJournal, viewMode]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
          Loading...
        </div>
      </main>
    );
  }

  if (accessMessage && !isNativeAudiobook && !canSaveWordsWhileListening) {
    return (
      <AccessDeniedMessage
        message={accessMessage}
        backHref={userBookId ? `/books/${encodeURIComponent(userBookId)}` : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  const showReadingWorkspace = viewMode === "workspace" && canUseReadingJournal && journalOwnerUserId;
  const listeningExperience = isNativeAudiobook ? (
    <NativeAudiobookProgressPanel
      userBookId={userBookId}
      book={book}
      currentLocation={currentLocation}
      startedAt={startedAt}
      onSaved={(nextLocation, nextStartedAt) => {
        setCurrentLocation(nextLocation);
        setStartedAt(nextStartedAt);
      }}
    />
  ) : canSaveWordsWhileListening ? (
    <CuriosityReadingExperience
      experienceMode="listening"
      embedded
      workspaceCompact={Boolean(showReadingWorkspace)}
    />
  ) : (
    <SimpleTimedSessionPage
      sessionMode="listening"
      eyebrow="Listening"
      title="Listening Timer"
      subtitle="Timer-only listening"
      description="Listen to this book or audiobook without word capture. Let the timer keep you company and log your listening time."
      saveSuccessMessage="Your listening session has been saved in Reading History."
      startLocationLabel="Start page optional"
      endLocationLabel="End page optional"
      sessionLocationNote="Progress is optional. If you leave it blank, only listening time will be saved."
      embedded
      workspaceCompact={Boolean(showReadingWorkspace)}
    />
  );

  return (
    <main
      className={[
        "min-h-screen",
        canSaveWordsWhileListening
          ? "bg-slate-100 px-3 py-4 sm:px-6 sm:py-8"
          : "bg-stone-50 p-6",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto space-y-4",
          showReadingWorkspace
            ? "max-w-[96rem]"
            : canSaveWordsWhileListening
              ? "max-w-5xl"
              : "max-w-4xl",
        ].join(" ")}
      >
        {canUseReadingJournal ? (
          <div className="hidden justify-end lg:flex">
            <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("listening")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  viewMode === "listening"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                Listening
              </button>
              <button
                type="button"
                onClick={() => setViewMode("workspace")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  viewMode === "workspace"
                    ? "bg-violet-700 text-white"
                    : "text-stone-600 hover:bg-violet-50"
                }`}
              >
                Reading Workspace
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={
            showReadingWorkspace
              ? "space-y-4 lg:grid lg:grid-cols-[minmax(24rem,30rem)_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(26rem,32rem)_minmax(0,1fr)]"
              : "space-y-4"
          }
        >
          <div className="min-w-0">{listeningExperience}</div>
          {showReadingWorkspace && journalOwnerUserId ? (
            <div className="hidden min-w-0 lg:block">
              <ReadingJournalPanel
                userBookId={userBookId}
                ownerUserId={journalOwnerUserId}
                favoriteQuotes={favoriteQuotes}
                bookLanguageCode={bookLanguageCode}
                compact
                vocabListHref={bookLanguageCode === "en" ? undefined : `/books/${encodeURIComponent(userBookId)}/words`}
                onFavoriteQuotesChange={setFavoriteQuotes}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
